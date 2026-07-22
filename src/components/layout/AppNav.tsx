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
    <nav aria-label="Navegación principal" className="flex items-center gap-1.5 overflow-x-auto p-2.5 lg:flex-col lg:items-stretch lg:p-3.5">
      <div className="mr-1 flex shrink-0 items-center gap-2.5 rounded-xl border border-white/6 bg-white/[0.035] px-2 py-1.5 lg:mb-5 lg:mr-0 lg:rounded-2xl lg:py-2.5">
        <Image
          src="/logo-tgm-transparent.png"
          alt="TGM Toldos Gómez"
          width={72}
          height={55}
          className="h-8 w-10 shrink-0 object-contain lg:h-11 lg:w-[58px]"
          priority
        />
        <div className="hidden lg:block">
          <p className="text-[13px] font-extrabold uppercase tracking-[0.09em] text-white">
            Remolques
          </p>
          <p className="text-xs font-semibold text-[#9fb4b5]">Planteamientos</p>
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
            aria-current={active ? "page" : undefined}
            className={`shrink-0 rounded-xl px-3 py-2 text-[12px] font-bold transition-[color,background-color,box-shadow] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/30 lg:px-3.5 lg:py-2.5 lg:text-[13px] ${
              active
                ? "bg-gold text-ink shadow-[0_7px_20px_rgb(0_0_0/0.16)]"
                : "text-[#b9c9c9] hover:bg-white/[0.07] hover:text-white"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
