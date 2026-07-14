import path from "node:path";
import { FileStore } from "@/lib/store/file-store";
import { MssqlStore } from "@/lib/store/mssql-store";
import type { PlanteamientoStore } from "@/lib/store/types";

let store: PlanteamientoStore | null = null;

export function getStore(): PlanteamientoStore {
  if (!store) {
    store =
      process.env.DATASOURCE === "mssql"
        ? new MssqlStore()
        : new FileStore(path.join(process.cwd(), "data"));
  }
  return store;
}
