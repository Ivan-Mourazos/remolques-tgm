import { Workspace, type WorkspaceInicial } from "@/components/workspace/Workspace";
import { getStore } from "@/lib/store";

export default async function PlanteamientoPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string }>;
}) {
  const { desde } = await searchParams;
  let inicial: WorkspaceInicial | undefined;
  if (desde) {
    const rec = await getStore().get(desde);
    if (rec) inicial = { tipo: rec.tipo, input: rec.input }; // sin id: copia nueva
  }
  return (
    <section>
      <div className="mb-6">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-amber-600">Oficina técnica</p>
        <h1 className="mt-1 text-[28px] font-bold tracking-[-0.035em] text-slate-950">Nuevo planteamiento</h1>
      </div>
      <Workspace inicial={inicial} key={desde ?? "nuevo"} />
    </section>
  );
}
