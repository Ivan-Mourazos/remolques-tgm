import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import { ProveedorFeedback } from "@/components/feedback/ProveedorFeedback";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Remolques TGM — Planteamientos",
  description: "Planteamientos de fabricación para lonas y baquetones",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <ProveedorFeedback>
          <AppShell>{children}</AppShell>
        </ProveedorFeedback>
      </body>
    </html>
  );
}
