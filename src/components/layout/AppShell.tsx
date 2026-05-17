import { AppNav } from "@/components/layout/AppNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <section className="flex min-h-screen bg-slate-100 text-slate-900">
      <aside className="no-print w-56 shrink-0 border-r border-slate-200 bg-slate-900">
        <AppNav />
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </section>
  );
}
