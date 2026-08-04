import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODELO = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

export type ProdutoParaMatch = { id: string; nome: string };

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function limparTexto(texto: string): string {
  const linhas = texto
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const freq = new Map<string, number>();
  for (const l of linhas) freq.set(l, (freq.get(l) ?? 0) + 1);

  const limpas = linhas.filter((l) => {
    const repete = freq.get(l) ?? 0;
    if (repete >= 4 && l.length < 60) return false;
    return true;
  });

  // limita o tamanho do texto que vai à IA (protege o orçamento de tokens)
  const texto2 = limpas.join("\n");
  return texto2.length > 6000 ? texto2.slice(0, 6000) : texto2;
}

// pré-seleção LOCAL: escolhe os candidatos plausíveis pra não mandar a lista inteira
function preSelecionar(
  texto: string,
  produtos: ProdutoParaMatch[],
  limite = 25
): ProdutoParaMatch[] {
  const textoNorm = normalizar(texto);
  const ignorar = new Set([
    "DE","DO","DA","E","COM","TINTO","ESTAMPADO","RAMADO","PECAS","PECA",
    "FIO","CASAL","QUEEN","KING","SOLTEIRO","CM","L","100","001","002","003",
  ]);

  const pontuados = produtos.map((p) => {
    const palavras = normalizar(p.nome)
      .split(/[^A-Z0-9]+/)
      .filter((w) => w.length >= 3 && !ignorar.has(w));
    if (palavras.length === 0) {
      return { p, score: textoNorm.includes(normalizar(p.nome)) ? 1 : 0 };
    }
    let acertos = 0;
    for (const w of palavras) {
      if (textoNorm.includes(w)) acertos++;
    }
    return { p, score: acertos / palavras.length };
  });

  return pontuados
    .filter((x) => x.score >= 0.5) // só candidatos com semelhança real
    .sort((a, b) => b.score - a.score)
    .slice(0, limite)
    .map((x) => x.p);
}

function parseIds(conteudo: string, validos: Set<string>): string[] {
  try {
    const match = conteudo.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : conteudo);
    const ids: unknown[] = Array.isArray(parsed.ids) ? parsed.ids : [];
    return ids.filter(
      (id): id is string => typeof id === "string" && validos.has(id)
    );
  } catch {
    return [];
  }
}

export async function identificarProdutos(
  textoPDF: string,
  produtos: ProdutoParaMatch[]
): Promise<string[]> {
  if (produtos.length === 0) return [];

  const texto = limparTexto(textoPDF);
  const candidatos = preSelecionar(texto, produtos);
  if (candidatos.length === 0) return [];

  // índice curto: manda um número no lugar do id longo (economiza tokens)
  const porIndice = new Map<number, string>();
  const lista = candidatos
    .map((p, i) => {
      porIndice.set(i + 1, p.id);
      return `${i + 1}. ${p.nome}`;
    })
    .join("\n");

  const prompt = `Você recebe o TEXTO extraído de um book/nota têxtil e uma LISTA numerada de produtos. Diga quais produtos da lista aparecem no texto.

O texto foi extraído de um PDF e pode estar fragmentado: nomes quebrados em linhas, com códigos numéricos, medidas (1,47 L) e composição (100% Poliéster) ao redor. Ignore códigos/números/medidas e junte as partes do nome. Compare por significado (aceite abreviação, ordem trocada, sem acento). Entre produtos parecidos, escolha o que melhor corresponde.

TEXTO:
"""
${texto}
"""

LISTA:
${lista}

Responda SOMENTE com JSON no formato {"n": [números dos produtos que aparecem]}. Ex.: {"n": [1, 4]}. Se nenhum, {"n": []}.`;

  const params = {
    model: MODELO,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0,
    reasoning_effort: "low",
    reasoning_format: "hidden",
  } as unknown as Parameters<typeof groq.chat.completions.create>[0];

  const resp = await groq.chat.completions.create(params);
  const conteudo =
    "choices" in resp ? (resp.choices[0]?.message?.content ?? "{}") : "{}";

  // parseia os números e converte de volta pros ids
  let numeros: number[] = [];
  try {
    const match = conteudo.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : conteudo);
    if (Array.isArray(parsed.n)) {
      numeros = parsed.n.filter((x: unknown): x is number => typeof x === "number");
    }
  } catch {
    return [];
  }

  const ids: string[] = [];
  for (const n of numeros) {
    const id = porIndice.get(n);
    if (id) ids.push(id);
  }
  return ids;
}