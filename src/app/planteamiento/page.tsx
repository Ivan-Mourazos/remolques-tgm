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
    if (rec) inicial = { id: rec.id, tipo: rec.tipo, input: rec.input };
  }
  return (
    <section>
      <div className="mb-2.5">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-gold-2">Oficina técnica</p>
        <h1 className="mt-0.5 text-[26px] font-extrabold tracking-[-0.045em] text-ink">Planteamientos por pedido</h1>
      </div>
      <Workspace inicial={inicial} key={desde ?? "nuevo"} />
    </section>
  );
}
