"use client";

import { useState } from "react";
import { importarContatos, type ContatoImportar } from "@/lib/queries";

type ContatoWa = { numero: string; nome: string | null };

export default function ImportarContatosPage() {
  const [contatos, setContatos] = useState<ContatoWa[]>([]);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<number | null>(null);

  async function buscar() {
    setCarregando(true);
    setErro(null);
    setResultado(null);
    try {
      const r = await fetch("/api/wa/contatos", { cache: "no-store" });
      const data = await r.json();
      if (!r.ok) {
        setErro(
          r.status === 503
            ? "WhatsApp não conectado. Conecte na aba Conexão primeiro."
            : data.error || "Falha ao buscar contatos."
        );
        return;
      }
      setContatos(data.contatos || []);
      if ((data.contatos || []).length === 0) {
        setErro(
          "Nenhum contato foi recebido do WhatsApp ainda. Aguarde alguns instantes após conectar e tente de novo."
        );
      }
    } catch {
      setErro("Erro de conexão.");
    } finally {
      setCarregando(false);
    }
  }

  function toggle(numero: string) {
    const novo = new Set(marcados);
    if (novo.has(numero)) novo.delete(numero);
    else novo.add(numero);
    setMarcados(novo);
  }

  const filtrados = contatos.filter((c) => {
    const q = busca.trim().toLowerCase();
    if (!q) return true;
    return (
      (c.nome || "").toLowerCase().includes(q) || c.numero.includes(q)
    );
  });

  function marcarTodosVisiveis() {
    const novo = new Set(marcados);
    filtrados.forEach((c) => novo.add(c.numero));
    setMarcados(novo);
  }

  function limparSelecao() {
    setMarcados(new Set());
  }

  async function importar() {
    if (marcados.size === 0) return;
    setImportando(true);
    setErro(null);
    try {
      const lista: ContatoImportar[] = contatos
        .filter((c) => marcados.has(c.numero))
        .map((c) => ({ nome: c.nome || c.numero, telefone: c.numero }));
      const { inseridos } = await importarContatos(lista);
      setResultado(inseridos);
      setMarcados(new Set());
    } catch {
      setErro("Falha ao importar. Tente novamente.");
    } finally {
      setImportando(false);
    }
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Importar do WhatsApp
        </h1>
        <p className="mt-1 text-sm text-muted">
          Traga seus contatos do WhatsApp e escolha quais virar clientes.
        </p>
      </header>

      {resultado !== null && (
        <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-center">
          <p className="font-display text-2xl font-semibold text-green-700">
            {resultado}
          </p>
          <p className="text-sm text-green-700/80">
            {resultado === 1
              ? "contato importado"
              : "contatos importados"}{" "}
            — já aparecem na aba Contatos.
          </p>
        </div>
      )}

      {contatos.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface p-6 text-center">
          <p className="mb-4 text-sm text-muted">
            Com o WhatsApp conectado, busque a lista de contatos.
          </p>
          <button
            onClick={buscar}
            disabled={carregando}
            className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
          >
            {carregando ? "Buscando…" : "Buscar contatos do WhatsApp"}
          </button>
          {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}
        </div>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou número…"
              className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none transition focus:border-brand"
            />
            <button
              onClick={marcarTodosVisiveis}
              className="rounded-lg border border-line px-3 py-2 text-xs font-medium text-muted transition hover:text-ink"
            >
              Marcar todos
            </button>
            <button
              onClick={limparSelecao}
              className="rounded-lg border border-line px-3 py-2 text-xs font-medium text-muted transition hover:text-ink"
            >
              Limpar
            </button>
          </div>

          <p className="mb-2 text-xs text-muted">
            {filtrados.length} contatos · {marcados.size} selecionados
          </p>

          <ul className="max-h-[55dvh] divide-y divide-line overflow-y-auto rounded-xl border border-line bg-surface">
            {filtrados.map((c) => (
              <li key={c.numero}>
                <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5">
                  <input
                    type="checkbox"
                    checked={marcados.has(c.numero)}
                    onChange={() => toggle(c.numero)}
                    className="h-4 w-4 accent-[var(--color-accent)]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">
                      {c.nome || "(sem nome)"}
                    </span>
                    <span className="block font-mono text-xs text-muted">
                      +{c.numero}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>

          {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}

          <button
            onClick={importar}
            disabled={importando || marcados.size === 0}
            className="mt-4 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
          >
            {importando
              ? "Importando…"
              : `Importar ${marcados.size} ${marcados.size === 1 ? "contato" : "contatos"}`}
          </button>
        </>
      )}
    </div>
  );
}
