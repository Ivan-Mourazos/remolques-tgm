import { AppNav } from "@/components/layout/AppNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <section className="flex min-h-screen bg-[radial-gradient(circle_at_88%_0%,rgba(204,220,215,0.72),transparent_32%),linear-gradient(135deg,#f5f7f5_0%,#e9efed_100%)] text-[#102a2f]">
      <aside className="no-print w-[204px] shrink-0 border-r border-white/8 bg-[#0b2328] shadow-[10px_0_34px_rgb(8_31_35/0.10)]">
        <AppNav />
      </aside>
      <main className="flex-1 overflow-auto p-4">{children}</main>
    </section>
  );
}
