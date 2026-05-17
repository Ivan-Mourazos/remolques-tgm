import { Suspense } from "react";
import { PlanteamientoPageLoader } from "@/components/planteamiento/PlanteamientoPageLoader";

export default function BaquetonPage() {
  return (
    <Suspense fallback={<p>Cargando…</p>}>
      <PlanteamientoPageLoader mode="baqueton" />
    </Suspense>
  );
}
