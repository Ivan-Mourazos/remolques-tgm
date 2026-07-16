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
    <nav className="flex flex-col gap-1.5 p-3.5">
      <div className="mb-5 flex items-center gap-2.5 rounded-2xl border border-white/6 bg-white/[0.035] px-2 py-2.5">
        <Image
          src="/logo-tgm-transparent.png"
          alt="TGM Toldos Gómez"
          width={72}
          height={55}
          className="h-11 w-[58px] shrink-0 object-contain"
          priority
        />
        <div>
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
            className={`rounded-xl px-3.5 py-2.5 text-[13px] font-bold transition-all ${
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
