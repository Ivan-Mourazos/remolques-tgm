import { AppNav } from "@/components/layout/AppNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <section className="flex min-h-screen bg-[#f4f5f7] text-slate-900">
      <aside className="no-print w-60 shrink-0 border-r border-white/5 bg-[#101827] shadow-[8px_0_32px_rgb(15_23_42/0.08)]">
        <AppNav />
      </aside>
      <main className="flex-1 overflow-auto p-6 xl:p-8">{children}</main>
    </section>
  );
}
