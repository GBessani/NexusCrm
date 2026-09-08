// Cálculo do preço final de um produto para um cliente específico.

const MARKUP_MAIS3 = 1.03; // tabela cheia +3%

export type PrecoCalculado = {
  base: number;       // preço da tabela do cliente (cheia ou +3%), sem desconto
  final: number;      // após aplicar o desconto do cliente
  temDesconto: boolean;
};

// preco = preço cheio do produto; usaMais3 = cliente usa tabela +3%; desconto = % (ex.: 12)
export function calcularPreco(
  preco: number | null,
  usaMais3: boolean,
  desconto: number
): PrecoCalculado | null {
  if (preco == null) return null;
  const base = usaMais3 ? preco * MARKUP_MAIS3 : preco;
  const final = base * (1 - (desconto || 0) / 100);
  return {
    base,
    final,
    temDesconto: (desconto || 0) > 0,
  };
}

export function formatarReal(v: number): string {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
