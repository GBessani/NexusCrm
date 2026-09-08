"use client";

import { useEffect, useMemo, useState } from "react";
import type { Contato, Produto } from "@/lib/types";
import { calcularPreco, formatarReal } from "@/lib/precos";

export function TabelaPrecos({
  contato,
  produtos,
  onFechar,
}: {
  contato: Contato;
  produtos: Produto[];
  onFechar: () => void;
}) {
  const [busca, setBusca] = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onFechar();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onFechar]);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return produtos
      .filter((p) => !q || p.nome.toLowerCase().includes(q))
      .map((p) => ({
        produto: p,
        calc: calcularPreco(p.preco, contato.usa_mais3, contato.desconto),
      }));
  }, [produtos, busca, contato.usa_mais3, contato.desconto]);

  const semPreco = lista.filter((x) => x.calc === null).length;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onClick={onFechar}
    >
      <div
        className="flex max-h-[88dvh] w-full max-w-lg flex-col rounded-t-2xl bg-surface sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="border-b border-line p-5">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                Tabela de preços
              </p>
              <h2 className="font-display text-lg font-semibold tracking-tight">
                {contato.nome}
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                {contato.usa_mais3 ? "Tabela +3%" : "Tabela cheia"}
                {contato.desconto > 0
                  ? ` · desconto de ${contato.desconto}%`
                  : " · sem desconto"}
              </p>
            </div>
            <button
              onClick={onFechar}
              className="ml-2 rounded-lg p-1 text-muted transition hover:bg-paper hover:text-ink"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar produto…"
            className="mt-4 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none transition focus:border-brand"
          />
        </header>

        <ul className="flex-1 divide-y divide-line overflow-y-auto">
          {lista.map(({ produto, calc }) => (
            <li
              key={produto.id}
              className="flex items-center justify-between gap-3 px-5 py-2.5"
            >
              <span className="min-w-0 flex-1 truncate text-sm">
                {produto.nome}
              </span>
              {calc ? (
                <div className="shrink-0 text-right">
                  <span className="font-display text-sm font-semibold text-brand">
                    {formatarReal(calc.final)}
                  </span>
                  {calc.temDesconto && (
                    <span className="ml-1 text-xs text-muted line-through">
                      {formatarReal(calc.base)}
                    </span>
                  )}
                </div>
              ) : (
                <span className="shrink-0 text-xs text-muted">sem preço</span>
              )}
            </li>
          ))}
        </ul>

        <footer className="border-t border-line px-5 py-3">
          <p className="text-xs text-muted">
            {lista.length} produtos
            {semPreco > 0 && ` · ${semPreco} sem preço cadastrado`}
          </p>
        </footer>
      </div>
    </div>
  );
}
