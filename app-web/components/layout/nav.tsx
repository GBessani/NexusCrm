"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "./logout-button";

const links = [
  { href: "/", label: "Início" },
  { href: "/produtos", label: "Produtos" },
  { href: "/contatos", label: "Contatos" },
  { href: "/importar", label: "Importar" },
  { href: "/notificacoes", label: "Avisos" },
  { href: "/conexao", label: "Conexão" },
];

export function Nav() {
  const path = usePathname();

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-5 py-3">
        <Link
          href="/"
          className="font-display text-lg font-semibold tracking-tight text-brand"
        >
          Nexus
        </Link>
        <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
          {links.map((l) => {
            const ativo =
              l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  ativo
                    ? "bg-accent-soft text-brand"
                    : "text-muted hover:text-ink"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <LogoutButton />
      </div>
    </header>
  );
}