"use client";

import { useEffect, useMemo, useState } from "react";
import { listarNotificacoes, type AvisoHistorico } from "@/lib/queries";
import type { NotificacaoStatus } from "@/lib/types";

const ROTULO_STATUS: Record<NotificacaoStatus, string> = {
  pendente: "Pendente",
  enviado: "Enviado",
  erro: "Falhou",
  ignorado: "Ignorado",
};

const COR_STATUS: Record<NotificacaoStatus, string> = {
  pendente: "bg-amber-50 text-amber-700",
  enviado: "bg-green-50 text-green-700",
  erro: "bg-red-50 text-red-700",
  ignorado: "bg-gray-100 text-gray-500",
};

function formatarData(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatarHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificacoesPage() {
  const [avisos, setAvisos] = useState<AvisoHistorico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"todos" | NotificacaoStatus>("todos");

  useEffect(() => {
    (async () => {
      try {
        setAvisos(await listarNotificacoes());
      } catch {
        setErro("Não foi possível carregar o histórico.");
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  const filtrados = useMemo(
    () => (filtro === "todos" ? avisos : avisos.filter((a) => a.status === filtro)),
    [avisos, filtro]
  );

  // agrupa por dia
  const porDia = useMemo(() => {
    const mapa = new Map<string, AvisoHistorico[]>();
    for (const a of filtrados) {
      const dia = formatarData(a.created_at);
      if (!mapa.has(dia)) mapa.set(dia, []);
      mapa.get(dia)!.push(a);
    }
    return Array.from(mapa.entries());
  }, [filtrados]);

  const totalEnviados = avisos.filter((a) => a.status === "enviado").length;

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Avisos
        </h1>
        <p className="mt-1 text-sm text-muted">
          Histórico de tudo que foi enviado aos clientes.
        </p>
      </header>

      {/* filtros */}
      <div className="mb-5 flex flex-wrap gap-2">
        {(["todos", "enviado", "erro"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              filtro === f
                ? "bg-accent-soft text-brand"
                : "text-muted hover:text-ink"
            }`}
          >
            {f === "todos" ? "Todos" : ROTULO_STATUS[f]}
          </button>
        ))}
      </div>

      {erro && <p className="mb-4 text-sm text-red-600">{erro}</p>}

      {carregando ? (
        <p className="text-sm text-muted">Carregando…</p>
      ) : avisos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-10 text-center">
          <p className="text-sm text-muted">
            Nenhum aviso enviado ainda. Quando você disparar avisos na
            importação, eles aparecem aqui.
          </p>
        </div>
      ) : (
        <>
          <p className="mb-4 text-xs text-muted">
            {totalEnviados} {totalEnviados === 1 ? "aviso enviado" : "avisos enviados"} no total
          </p>

          <div className="space-y-6">
            {porDia.map(([dia, itens]) => (
              <div key={dia}>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                  {dia}
                </p>
                <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
                  {itens.map((a) => (
                    <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {a.contato_nome ?? "Contato removido"}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {a.produto_nome ?? "Produto removido"}
                          {a.pdf_origem ? ` · ${a.pdf_origem}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${COR_STATUS[a.status]}`}
                        >
                          {ROTULO_STATUS[a.status]}
                        </span>
                        <span className="text-xs text-muted">
                          {formatarHora(a.enviado_em ?? a.created_at)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {filtrados.length === 0 && (
            <div className="rounded-xl border border-dashed border-line p-10 text-center">
              <p className="text-sm text-muted">
                Nenhum aviso com esse status.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
