"use client";

import { useEffect, useMemo, useState } from "react";
import {
  listarContatosComDesejos,
  listarProdutos,
  excluirContato,
  marcarAtendimento,
} from "@/lib/queries";
import type { ContatoComDesejos, Produto } from "@/lib/types";
import { statusAtendimento, textoTempo, DIAS_PENDENTE } from "@/lib/crm";
import { ContatoForm } from "@/components/contatos/contato-form";
import { WishlistEditor } from "@/components/contatos/wishlist-editor";

export default function ContatosPage() {
  const [contatos, setContatos] = useState<ContatoComDesejos[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState<ContatoComDesejos | null>(null);
  const [filtro, setFiltro] = useState<"todos" | "pendentes">("todos");
  const [busca, setBusca] = useState("");

  async function carregar() {
    const [cs, ps] = await Promise.all([
      listarContatosComDesejos(),
      listarProdutos(),
    ]);
    setContatos(cs);
    setProdutos(ps);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function remover(id: string) {
    const antes = contatos;
    setContatos((c) => c.filter((x) => x.id !== id));
    try {
      await excluirContato(id);
    } catch {
      setContatos(antes);
    }
  }

  async function atender(c: ContatoComDesejos) {
    const agora = new Date().toISOString();
    setContatos((cs) =>
      cs.map((x) => (x.id === c.id ? { ...x, ultimo_atendimento: agora } : x))
    );
    try {
      await marcarAtendimento(c.id);
    } catch {
      carregar();
    }
  }

  const pendentesCount = useMemo(
    () =>
      contatos.filter(
        (c) => statusAtendimento(c.ultimo_atendimento).status === "pendente"
      ).length,
    [contatos]
  );

  const visiveis = useMemo(() => {
    let lista = contatos;
    if (filtro === "pendentes") {
      lista = lista.filter(
        (c) => statusAtendimento(c.ultimo_atendimento).status === "pendente"
      );
    }
    const q = busca.trim().toLowerCase();
    if (q) lista = lista.filter((c) => c.nome.toLowerCase().includes(q));
    return [...lista].sort((a, b) => {
      const sa = statusAtendimento(a.ultimo_atendimento);
      const sb = statusAtendimento(b.ultimo_atendimento);
      if (sa.status !== sb.status) return sa.status === "pendente" ? -1 : 1;
      const da = sa.diasDesde ?? Infinity;
      const db = sb.diasDesde ?? Infinity;
      return db - da;
    });
  }, [contatos, filtro, busca]);

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Contatos
        </h1>
        <p className="mt-1 text-sm text-muted">
          Clientes sem atendimento há {DIAS_PENDENTE} dias aparecem como
          pendentes.
        </p>
      </header>

      <div className="mb-6">
        <ContatoForm onCriado={() => carregar()} />
      </div>

      {contatos.length > 0 && (
        <div className="mb-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFiltro("todos")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                filtro === "todos"
                  ? "bg-accent-soft text-brand"
                  : "text-muted hover:text-ink"
              }`}
            >
              Todos ({contatos.length})
            </button>
            <button
              onClick={() => setFiltro("pendentes")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                filtro === "pendentes"
                  ? "bg-red-50 text-red-700"
                  : "text-muted hover:text-ink"
              }`}
            >
              Pendentes ({pendentesCount})
            </button>
          </div>
          {contatos.length > 8 && (
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar cliente…"
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none transition focus:border-brand"
            />
          )}
        </div>
      )}

      {carregando ? (
        <p className="text-sm text-muted">Carregando…</p>
      ) : contatos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-10 text-center">
          <p className="text-sm text-muted">
            Nenhum contato ainda. Adicione o primeiro acima.
          </p>
        </div>
      ) : visiveis.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-10 text-center">
          <p className="text-sm text-muted">
            {filtro === "pendentes"
              ? "Nenhum cliente pendente. Tudo em dia! 🎉"
              : "Nenhum cliente encontrado."}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {visiveis.map((c) => {
            const st = statusAtendimento(c.ultimo_atendimento);
            const pendente = st.status === "pendente";
            return (
              <li key={c.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={() => setEditando(c)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{c.nome}</p>
                      {pendente && (
                        <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                          Pendente
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-xs text-muted">+{c.telefone}</p>
                    <p
                      className={`mt-0.5 text-xs ${
                        pendente ? "text-red-600" : "text-muted"
                      }`}
                    >
                      {textoTempo(st.diasDesde)}
                    </p>
                  </button>

                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <button
                      onClick={() => atender(c)}
                      className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-dark"
                    >
                      Atendi
                    </button>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-brand">
                        {c.desejos.length}{" "}
                        {c.desejos.length === 1 ? "desejo" : "desejos"}
                      </span>
                      <button
                        onClick={() => remover(c.id)}
                        className="text-xs font-medium text-muted transition hover:text-red-600"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editando && (
        <WishlistEditor
          contato={editando}
          produtos={produtos}
          desejosIniciais={editando.desejos.map((d) => d.id)}
          onFechar={() => {
            setEditando(null);
            carregar();
          }}
        />
      )}
    </div>
  );
}