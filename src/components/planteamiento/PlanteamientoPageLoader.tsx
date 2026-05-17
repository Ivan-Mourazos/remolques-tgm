"use client";

import { useSearchParams } from "next/navigation";
import { PlanteamientoWorkspace } from "@/components/planteamiento/PlanteamientoWorkspace";

type Mode = "lona-remolque" | "baqueton";

export function PlanteamientoPageLoader({ mode }: { mode: Mode }) {
  const editId = useSearchParams().get("id");

  return (
    <PlanteamientoWorkspace mode={mode} editId={editId} key={editId ?? "new"} />
  );
}
