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
    <main className="p-4">
      <h1 className="mb-4 text-lg font-semibold">Planteamiento</h1>
      <Workspace inicial={inicial} key={desde ?? "nuevo"} />
    </main>
  );
}
