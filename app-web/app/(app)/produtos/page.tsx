"use client";

import { useEffect, useMemo, useState } from "react";
import {
  listarProdutos,
  criarProduto,
  atualizarProduto,
  excluirProduto,
} from "@/lib/queries";
import type { Produto } from "@/lib/types";

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [nome, setNome] = useState("");
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // edição inline
  const [editId, setEditId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");

  async function carregar() {
    try {
      setProdutos(await listarProdutos());
    } catch {
      setErro("Não foi possível carregar os produtos.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return produtos;
    return produtos.filter((p) => p.nome.toLowerCase().includes(q));
  }, [produtos, busca]);

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    const limpo = nome.trim();
    if (!limpo) return;
    setSalvando(true);
    setErro(null);
    try {
      await criarProduto(limpo);
      setNome("");
      await carregar();
    } catch (err) {
      const code = (err as { code?: string })?.code;
      setErro(
        code === "23505"
          ? "Esse produto já está cadastrado."
          : "Não foi possível salvar o produto."
      );
    } finally {
      setSalvando(false);
    }
  }

  function comecarEdicao(p: Produto) {
    setEditId(p.id);
    setEditNome(p.nome);
    setErro(null);
  }

  async function salvarEdicao(id: string) {
    const limpo = editNome.trim();
    if (!limpo) return;
    const antes = produtos;
    setProdutos((ps) => ps.map((x) => (x.id === id ? { ...x, nome: limpo } : x)));
    setEditId(null);
    try {
      await atualizarProduto(id, limpo);
    } catch (err) {
      setProdutos(antes);
      const code = (err as { code?: string })?.code;
      setErro(
        code === "23505"
          ? "Já existe um produto com esse nome."
          : "Não foi possível salvar a alteração."
      );
    }
  }

  async function remover(id: string) {
    const antes = produtos;
    setProdutos((p) => p.filter((x) => x.id !== id));
    try {
      await excluirProduto(id);
    } catch {
      setProdutos(antes);
      setErro("Não foi possível excluir.");
    }
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Produtos
        </h1>
        <p className="mt-1 text-sm text-muted">
          Cadastre os artigos que seus clientes podem querer. Só o nome basta.
        </p>
      </header>

      <form onSubmit={adicionar} className="mb-4 flex gap-2">
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome do produto"
          className="flex-1 rounded-lg border border-line bg-surface px-3 py-2.5 text-sm outline-none transition focus:border-brand"
        />
        <button
          type="submit"
          disabled={salvando || !nome.trim()}
          className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
        >
          {salvando ? "Salvando…" : "Adicionar"}
        </button>
      </form>

      {/* busca — essencial com muitos produtos */}
      {produtos.length > 8 && (
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar produto…"
          className="mb-4 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none transition focus:border-brand"
        />
      )}

      {erro && <p className="mb-4 text-sm text-red-600">{erro}</p>}

      {carregando ? (
        <p className="text-sm text-muted">Carregando…</p>
      ) : produtos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-10 text-center">
          <p className="text-sm text-muted">
            Nenhum produto ainda. Adicione o primeiro acima.
          </p>
        </div>
      ) : (
        <>
          <p className="mb-2 text-xs text-muted">
            {filtrados.length} de {produtos.length}{" "}
            {produtos.length === 1 ? "produto" : "produtos"}
          </p>
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {filtrados.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                {editId === p.id ? (
                  <>
                    <input
                      value={editNome}
                      onChange={(e) => setEditNome(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") salvarEdicao(p.id);
                        if (e.key === "Escape") setEditId(null);
                      }}
                      autoFocus
                      className="flex-1 rounded-lg border border-brand bg-surface px-2 py-1.5 text-sm outline-none"
                    />
                    <button
                      onClick={() => salvarEdicao(p.id)}
                      className="text-xs font-medium text-brand"
                    >
                      Salvar
                    </button>
                    <button
                      onClick={() => setEditId(null)}
                      className="text-xs font-medium text-muted"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {p.nome}
                    </span>
                    <button
                      onClick={() => comecarEdicao(p)}
                      className="text-xs font-medium text-muted transition hover:text-brand"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => remover(p.id)}
                      className="text-xs font-medium text-muted transition hover:text-red-600"
                    >
                      Excluir
                    </button>
                  </>
                )}
              </li>
            ))}
            {filtrados.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-muted">
                Nenhum produto encontrado.
              </li>
            )}
          </ul>
        </>
      )}
    </div>
  );
}