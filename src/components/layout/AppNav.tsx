"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/planteamiento", label: "Planteamiento" },
  { href: "/historial", label: "Historial" },
  { href: "/parametros", label: "Parámetros" },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-4">
      <div className="mb-4 px-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Remolques TGM
        </p>
        <p className="text-sm text-slate-400">Planteamientos</p>
      </div>
      {links.map((link) => {
        const active =
          link.href === "/"
            ? pathname === "/"
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-slate-800 text-white"
                : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
