import path from "node:path";
import { PedidosFileStore } from "@/lib/store/pedidos-file-store";
import { PedidosMssqlStore } from "@/lib/store/pedidos-mssql-store";
import type { PedidosStore } from "@/lib/store/pedidos-types";

let store: PedidosStore | null = null;

/** El mismo interruptor que `getStore()`: los dos almacenes van juntos. */
export function getPedidosStore(): PedidosStore {
  if (!store) {
    store =
      process.env.DATASOURCE === "mssql"
        ? new PedidosMssqlStore()
        : new PedidosFileStore(path.join(process.cwd(), "data"));
  }
  return store;
}
