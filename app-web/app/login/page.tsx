"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Modo = "entrar" | "criar";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [modo, setModo] = useState<Modo>("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  async function comEmail(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setAviso(null);
    setCarregando(true);

    if (modo === "entrar") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });
      if (error) {
        setErro("E-mail ou senha incorretos.");
        setCarregando(false);
        return;
      }
      router.push("/");
      router.refresh();
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: { emailRedirectTo: `${location.origin}/auth/callback` },
      });
      if (error) {
        setErro("Não foi possível criar a conta. Tente outro e-mail.");
        setCarregando(false);
        return;
      }
      setAviso("Conta criada. Confira seu e-mail para confirmar o acesso.");
      setCarregando(false);
    }
  }

  async function comGoogle() {
    setErro(null);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      {/* painel da marca (assinatura: trama textil) */}
      <aside className="trama relative hidden flex-col justify-between bg-brand p-12 text-white lg:flex">
        <div className="font-display text-xl font-semibold tracking-tight">
          Nexus
        </div>
        <div className="max-w-sm">
          <p className="font-display text-4xl font-semibold leading-tight">
            Chegou.
            <br />
            Seu cliente já sabe.
          </p>
          <p className="mt-4 text-sm text-white/70">
            Suba a nota, e quem esperava o artigo recebe o aviso no WhatsApp —
            sem você procurar nome por nome.
          </p>
        </div>
        <div className="text-xs text-white/50">
          Eurotextil · representação comercial
        </div>
      </aside>

      {/* formulario */}
      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <span className="font-display text-xl font-semibold tracking-tight text-brand">
              Nexus
            </span>
          </div>

          <h1 className="font-display text-2xl font-semibold tracking-tight">
            {modo === "entrar" ? "Entrar" : "Criar conta"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {modo === "entrar"
              ? "Acesse o painel para gerenciar produtos e avisos."
              : "Comece a cadastrar produtos, contatos e listas de desejo."}
          </p>

          <button
            onClick={comGoogle}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-medium transition hover:bg-paper"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"
              />
            </svg>
            Continuar com Google
          </button>

          <div className="my-5 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-line" />
            ou
            <span className="h-px flex-1 bg-line" />
          </div>

          <form onSubmit={comEmail} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                E-mail
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm outline-none transition focus:border-brand"
                placeholder="voce@email.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                Senha
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm outline-none transition focus:border-brand"
                placeholder="••••••••"
              />
            </div>

            {erro && <p className="text-sm text-red-600">{erro}</p>}
            {aviso && <p className="text-sm text-brand">{aviso}</p>}

            <button
              type="submit"
              disabled={carregando}
              className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
            >
              {carregando
                ? "Aguarde…"
                : modo === "entrar"
                  ? "Entrar"
                  : "Criar conta"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            {modo === "entrar" ? "Ainda não tem conta? " : "Já tem conta? "}
            <button
              onClick={() => {
                setModo(modo === "entrar" ? "criar" : "entrar");
                setErro(null);
                setAviso(null);
              }}
              className="font-medium text-brand underline-offset-2 hover:underline"
            >
              {modo === "entrar" ? "Criar conta" : "Entrar"}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}