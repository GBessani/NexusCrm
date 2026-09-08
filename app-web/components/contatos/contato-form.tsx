"use client";

import { useState } from "react";
import { criarContato } from "@/lib/queries";
import type { Contato } from "@/lib/types";

// normaliza p/ o formato que o WhatsApp espera (55 + DDD + numero)
function normalizarTelBR(input: string): string {
  const d = input.replace(/\D/g, "");
  if (d.length === 10 || d.length === 11) return "55" + d; // veio so com DDD
  return d; // assume que ja inclui o codigo do pais
}

export function ContatoForm({
  onCriado,
}: {
  onCriado: (c: Contato) => void;
}) {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [usaMais3, setUsaMais3] = useState(false);
  const [desconto, setDesconto] = useState("");
  const [optIn, setOptIn] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !telefone.trim()) return;
    setSalvando(true);
    setErro(null);
    try {
      const c = await criarContato({
        nome,
        telefone: normalizarTelBR(telefone),
        empresa,
        opt_in: optIn,
        usa_mais3: usaMais3,
        desconto: desconto ? parseFloat(desconto.replace(",", ".")) : 0,
      });
      onCriado(c);
      setNome("");
      setTelefone("");
      setEmpresa("");
      setUsaMais3(false);
      setDesconto("");
      setOptIn(true);
    } catch (err) {
      const code = (err as { code?: string })?.code;
      setErro(
        code === "23505"
          ? "Já existe um contato com esse telefone."
          : "Não foi possível salvar o contato."
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form
      onSubmit={enviar}
      className="rounded-xl border border-line bg-surface p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">
            Nome
          </label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Maria Confecções"
            className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm outline-none transition focus:border-brand"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">
            Telefone (com DDD)
          </label>
          <input
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="44 99999-8888"
            inputMode="tel"
            className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm outline-none transition focus:border-brand"
          />
        </div>
      </div>

      <div className="mt-3">
        <label className="mb-1 block text-xs font-medium text-muted">
          Empresa (opcional)
        </label>
        <input
          value={empresa}
          onChange={(e) => setEmpresa(e.target.value)}
          placeholder="Mega Malhas"
          className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm outline-none transition focus:border-brand"
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-2 rounded-lg border border-line bg-paper px-3 py-2.5 text-sm">
          <input
            type="checkbox"
            checked={usaMais3}
            onChange={(e) => setUsaMais3(e.target.checked)}
            className="h-4 w-4 accent-[var(--color-brand)]"
          />
          Usa tabela +3%
        </label>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">
            Desconto (%)
          </label>
          <input
            value={desconto}
            onChange={(e) => setDesconto(e.target.value)}
            placeholder="0"
            inputMode="decimal"
            className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm outline-none transition focus:border-brand"
          />
        </div>
      </div>

      <label className="mt-3 flex items-center gap-2 text-sm text-muted">
        <input
          type="checkbox"
          checked={optIn}
          onChange={(e) => setOptIn(e.target.checked)}
          className="h-4 w-4 accent-[var(--color-brand)]"
        />
        O cliente aceitou receber avisos no WhatsApp
      </label>

      {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}

      <button
        type="submit"
        disabled={salvando || !nome.trim() || !telefone.trim()}
        className="mt-4 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
      >
        {salvando ? "Salvando…" : "Adicionar contato"}
      </button>
    </form>
  );
}