import { AppNav } from "@/components/layout/AppNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <section className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_88%_0%,rgba(204,220,215,0.72),transparent_32%),linear-gradient(135deg,#f5f7f5_0%,#e9efed_100%)] text-ink lg:flex-row">
      <a href="#contenido-principal" className="fixed left-3 top-3 z-[100] -translate-y-20 rounded-lg bg-white px-3 py-2 text-sm font-bold text-deep shadow-lg transition-transform focus:translate-y-0">
        Saltar al contenido
      </a>
      <aside className="w-full shrink-0 border-b border-white/8 bg-nav shadow-[0_8px_24px_rgb(8_31_35/0.10)] lg:w-[204px] lg:border-b-0 lg:border-r lg:shadow-[10px_0_34px_rgb(8_31_35/0.10)]">
        <AppNav />
      </aside>
      <main id="contenido-principal" className="min-w-0 flex-1 overflow-auto p-3 sm:p-4">{children}</main>
    </section>
  );
}
