import { Suspense } from "react";
import { PlanteamientoWorkspace } from "@/components/planteamiento/PlanteamientoWorkspace";

export default function LonaPage() {
  return (
    <Suspense fallback={<p>Cargando…</p>}>
      <PlanteamientoWorkspace mode="lona-remolque" />
    </Suspense>
  );
}
