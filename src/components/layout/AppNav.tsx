"use client";

import Link from "next/link";
import Image from "next/image";
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
      <div className="mb-5 flex items-center gap-3 px-1">
        <Image
          src="/logo-tgm-transparent.png"
          alt="TGM Toldos Gómez"
          width={72}
          height={55}
          className="h-11 w-[58px] shrink-0 object-contain"
          priority
        />
        <div>
          <p className="text-sm font-extrabold uppercase tracking-[0.08em] text-white">
            Remolques
          </p>
          <p className="text-sm font-medium text-slate-400">Planteamientos</p>
        </div>
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
