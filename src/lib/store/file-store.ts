import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { ListadoFiltro, PlanteamientoRecord, PlanteamientoStore } from "@/lib/store/types";
import { DEFAULT_PARAMS, type CalcParams } from "@/lib/calc/params";
import { normalizarParams } from "@/lib/calc/validar-params";

/** Driver de desarrollo: dos ficheros JSON en `data/`. */
export class FileStore implements PlanteamientoStore {
  constructor(private readonly dir: string) {}

  private file(name: string) { return path.join(this.dir, name); }

  private readAll(): PlanteamientoRecord[] {
    const f = this.file("planteamientos.json");
    if (!existsSync(f)) return [];
    return JSON.parse(readFileSync(f, "utf8")) as PlanteamientoRecord[];
  }

  private writeAll(recs: PlanteamientoRecord[]) {
    mkdirSync(this.dir, { recursive: true });
    writeFileSync(this.file("planteamientos.json"), JSON.stringify(recs, null, 1), "utf8");
  }

  async list(filtro?: ListadoFiltro): Promise<PlanteamientoRecord[]> {
    let recs = this.readAll();
    if (filtro?.tipo) recs = recs.filter((r) => r.tipo === filtro.tipo);
    if (filtro?.pedido) recs = recs.filter((r) => r.numeroPedido === filtro.pedido);
    if (filtro?.texto) {
      const t = filtro.texto.toLowerCase();
      recs = recs.filter(
        (r) => r.numeroPedido.toLowerCase().includes(t) || r.cliente.toLowerCase().includes(t),
      );
    }
    recs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return recs.slice(0, filtro?.limit ?? 200);
  }

  async get(id: string): Promise<PlanteamientoRecord | null> {
    return this.readAll().find((r) => r.id === id) ?? null;
  }

  async save(
    rec: Omit<PlanteamientoRecord, "id" | "createdAt" | "updatedAt"> & { id?: string },
  ): Promise<PlanteamientoRecord> {
    const recs = this.readAll();
    const now = new Date().toISOString();
    const existing = rec.id ? recs.find((r) => r.id === rec.id) : undefined;
    const saved: PlanteamientoRecord = {
      ...rec,
      id: existing?.id ?? rec.id ?? randomUUID(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    this.writeAll([...recs.filter((r) => r.id !== saved.id), saved]);
    return saved;
  }

  async getParams(): Promise<CalcParams> {
    const f = this.file("parametros.json");
    if (!existsSync(f)) return DEFAULT_PARAMS;
    return normalizarParams(JSON.parse(readFileSync(f, "utf8")));
  }

  async saveParams(p: CalcParams): Promise<void> {
    mkdirSync(this.dir, { recursive: true });
    writeFileSync(this.file("parametros.json"), JSON.stringify(p, null, 1), "utf8");
  }
}
