import { Suspense } from "react";
import { PlanteamientoWorkspace } from "@/components/planteamiento/PlanteamientoWorkspace";

export default function BaquetonPage() {
  return (
    <Suspense fallback={<p>Cargando…</p>}>
      <PlanteamientoWorkspace mode="baqueton" />
    </Suspense>
  );
}
