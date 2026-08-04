"use client";

import { useEffect, useState } from "react";
import {
  adicionarDesejo,
  removerDesejo,
  atualizarContato,
} from "@/lib/queries";
import type { Contato, Produto } from "@/lib/types";

function normalizarTelBR(input: string): string {
  const d = input.replace(/\D/g, "");
  if (d.length === 10 || d.length === 11) return "55" + d;
  return d;
}

export function WishlistEditor({
  contato,
  produtos,
  desejosIniciais,
  onFechar,
}: {
  contato: Contato;
  produtos: Produto[];
  desejosIniciais: string[];
  onFechar: () => void;
}) {
  const [marcados, setMarcados] = useState<Set<string>>(
    new Set(desejosIniciais)
  );
  const [busca, setBusca] = useState("");

  // edição dos dados do contato
  const [editandoDados, setEditandoDados] = useState(false);
  const [nome, setNome] = useState(contato.nome);
  const [telefone, setTelefone] = useState(contato.telefone);
  const [optIn, setOptIn] = useState(contato.opt_in);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onFechar();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onFechar]);

  async function toggle(produtoId: string) {
    const tinha = marcados.has(produtoId);
    const novo = new Set(marcados);
    if (tinha) novo.delete(produtoId);
    else novo.add(produtoId);
    setMarcados(novo);
    try {
      if (tinha) await removerDesejo(contato.id, produtoId);
      else await adicionarDesejo(contato.id, produtoId);
    } catch {
      setMarcados(new Set(marcados));
    }
  }

  async function salvarDados() {
    if (!nome.trim() || !telefone.trim()) return;
    setSalvando(true);
    setErro(null);
    try {
      await atualizarContato(contato.id, {
        nome: nome.trim(),
        telefone: normalizarTelBR(telefone),
        opt_in: optIn,
      });
      setEditandoDados(false);
    } catch (err) {
      const code = (err as { code?: string })?.code;
      setErro(
        code === "23505"
          ? "Já existe um contato com esse telefone."
          : "Não foi possível salvar os dados."
      );
    } finally {
      setSalvando(false);
    }
  }

  const filtrados = produtos.filter((p) =>
    p.nome.toLowerCase().includes(busca.trim().toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onClick={onFechar}
    >
      <div
        className="flex max-h-[85dvh] w-full max-w-md flex-col rounded-t-2xl bg-surface sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between border-b border-line p-5">
          <div className="min-w-0 flex-1">
            {editandoDados ? (
              <div className="space-y-2">
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome"
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
                />
                <input
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="Telefone com DDD"
                  inputMode="tel"
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
                />
                <label className="flex items-center gap-2 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={optIn}
                    onChange={(e) => setOptIn(e.target.checked)}
                    className="h-4 w-4 accent-[var(--color-brand)]"
                  />
                  Aceitou receber avisos no WhatsApp
                </label>
                {erro && <p className="text-xs text-red-600">{erro}</p>}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={salvarDados}
                    disabled={salvando}
                    className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    {salvando ? "Salvando…" : "Salvar dados"}
                  </button>
                  <button
                    onClick={() => {
                      setEditandoDados(false);
                      setNome(contato.nome);
                      setTelefone(contato.telefone);
                      setOptIn(contato.opt_in);
                      setErro(null);
                    }}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-xs font-medium uppercase tracking-wide text-muted">
                  Contato
                </p>
                <h2 className="font-display text-lg font-semibold tracking-tight">
                  {nome}
                </h2>
                <p className="font-mono text-xs text-muted">+{telefone}</p>
                <button
                  onClick={() => setEditandoDados(true)}
                  className="mt-1 text-xs font-medium text-brand"
                >
                  Editar dados
                </button>
              </>
            )}
          </div>
          <button
            onClick={onFechar}
            className="ml-2 rounded-lg p-1 text-muted transition hover:bg-paper hover:text-ink"
            aria-label="Fechar"
          >
            ✕
          </button>
        </header>

        {produtos.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted">
            Cadastre produtos primeiro para montar a lista de desejo.
          </div>
        ) : (
          <>
            <div className="p-4 pb-2">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                Lista de desejo — {marcados.size}{" "}
                {marcados.size === 1 ? "produto" : "produtos"}
              </p>
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar produto…"
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none transition focus:border-brand"
              />
            </div>
            <ul className="flex-1 divide-y divide-line overflow-y-auto px-4 pb-4">
              {filtrados.map((p) => {
                const marcado = marcados.has(p.id);
                return (
                  <li key={p.id}>
                    <label className="flex cursor-pointer items-center gap-3 py-3">
                      <input
                        type="checkbox"
                        checked={marcado}
                        onChange={() => toggle(p.id)}
                        className="h-4 w-4 accent-[var(--color-accent)]"
                      />
                      <span
                        className={`text-sm ${marcado ? "text-ink" : "text-muted"}`}
                      >
                        {p.nome}
                      </span>
                    </label>
                  </li>
                );
              })}
              {filtrados.length === 0 && (
                <li className="py-6 text-center text-sm text-muted">
                  Nenhum produto encontrado.
                </li>
              )}
            </ul>
          </>
        )}

        <footer className="border-t border-line p-4">
          <button
            onClick={onFechar}
            className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            Concluir
          </button>
        </footer>
      </div>
    </div>
  );
}