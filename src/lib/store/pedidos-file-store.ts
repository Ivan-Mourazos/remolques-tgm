import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import type { EstadoPedido } from "@/lib/pedidos/estado-pedido";
import type { PedidosStore } from "@/lib/store/pedidos-types";
import { normalizarNumeroPedido } from "@/lib/pedidos/numero-pedido";

/** Driver de desarrollo: un fichero JSON en `data/`, como `FileStore`. */
export class PedidosFileStore implements PedidosStore {
  constructor(private readonly dir: string) {}

  private file() { return path.join(this.dir, "pedidos.json"); }

  private leer(): EstadoPedido[] {
    if (!existsSync(this.file())) return [];
    return JSON.parse(readFileSync(this.file(), "utf8")) as EstadoPedido[];
  }

  private escribir(estados: EstadoPedido[]) {
    mkdirSync(this.dir, { recursive: true });
    writeFileSync(this.file(), JSON.stringify(estados, null, 1), "utf8");
  }

  async get(pedido: string): Promise<EstadoPedido | null> {
    const clave = normalizarNumeroPedido(pedido);
    return this.leer().find((estado) => estado.pedido === clave) ?? null;
  }

  async list(): Promise<EstadoPedido[]> {
    return this.leer().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async save(estado: EstadoPedido): Promise<EstadoPedido> {
    // La clave manda sobre lo que traiga el objeto: un estado construido a mano
    // con el número sin normalizar duplicaría la fila del mismo pedido.
    const guardado: EstadoPedido = {
      ...estado,
      pedido: normalizarNumeroPedido(estado.pedido || estado.numeroPedido),
    };
    const otros = this.leer().filter((previo) => previo.pedido !== guardado.pedido);
    this.escribir([...otros, guardado]);
    return guardado;
  }
}
