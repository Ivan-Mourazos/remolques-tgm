import { Suspense } from "react";
import { PlanteamientoPageLoader } from "@/components/planteamiento/PlanteamientoPageLoader";

export default function LonaPage() {
  return (
    <Suspense fallback={<p>Cargando…</p>}>
      <PlanteamientoPageLoader mode="lona-remolque" />
    </Suspense>
  );
}
