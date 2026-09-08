import type { LineaFicha } from "@/lib/revision/ficha-pedido";

const lados = [
  { clave: "laterales", nombre: "Laterales", sentido: "Atrás → delante" },
  { clave: "atras", nombre: "Atrás", sentido: "Izquierda → derecha" },
  { clave: "delante", nombre: "Delante", sentido: "Izquierda → derecha" },
] as const;

const fmt = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 2 });

function TablaOllaosRevision({ reparto }: { reparto: LineaFicha["reparto"] }) {
  const columnas = Math.max(1, ...lados.map(({ clave }) => reparto[clave].length));

  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line bg-surface-2 px-4 py-3">
        <h3 className="text-sm font-extrabold text-ink">Ollaos</h3>
        <p className="text-xs font-medium text-ink-2">Posiciones desde el borde · cm</p>
      </div>
      <div
        role="region"
        aria-label="Tabla de posiciones de ollaos"
        tabIndex={0}
        className="overflow-x-auto focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold"
      >
        <table className="w-full border-collapse text-sm tabular-nums">
          <caption className="sr-only">Posiciones de los ollaos en centímetros y total por lado</caption>
          <thead>
            <tr className="bg-surface-2/60 text-ink-2">
              <th scope="col" className="min-w-44 px-4 py-2.5 text-left text-xs font-bold">Lado / sentido</th>
              {Array.from({ length: columnas }, (_, i) => (
                <th scope="col" key={i} className="min-w-14 px-2 py-2.5 text-center text-xs font-bold">{i + 1}</th>
              ))}
              <th scope="col" className="px-4 py-2.5 text-center text-xs font-extrabold">Total</th>
            </tr>
          </thead>
          <tbody>
            {lados.map(({ clave, nombre, sentido }) => (
              <tr key={clave} className="border-t border-line even:bg-surface-2/40">
                <th scope="row" className="px-4 py-3 text-left">
                  <span className="block font-bold text-ink">{nombre}</span>
                  <span className="mt-0.5 block whitespace-nowrap text-[11px] font-medium text-ink-2">{sentido}</span>
                </th>
                {Array.from({ length: columnas }, (_, i) => (
                  <td key={i} className="whitespace-nowrap px-2 py-3 text-center font-semibold text-ink">
                    {reparto[clave][i] != null ? fmt(reparto[clave][i]) : "—"}
                  </td>
                ))}
                <td className="bg-surface-2/70 px-4 py-3 text-center font-extrabold text-ink">{reparto[clave].length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function DetalleLineaRevision({ linea }: { linea: LineaFicha }) {
  return (
    <section className="mb-6 min-w-0 overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_10px_28px_rgb(14_45_49/0.045)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-2 px-4 py-4 sm:px-5">
        <h2 className="text-lg font-extrabold tracking-tight text-ink">{linea.nombre}</h2>
        <span className="text-xs font-semibold text-ink-2">Ficha de revisión · Medidas en cm</span>
      </div>

      <div className="space-y-5 p-3 sm:p-5">
        {linea.snapshotSvg && (
          <div
            className="overflow-hidden rounded-xl border border-line bg-white [&>svg]:h-auto [&>svg]:w-full"
            // SVG generado por la aplicación y guardado con el planteamiento.
            dangerouslySetInnerHTML={{ __html: linea.snapshotSvg }}
          />
        )}

        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
          {linea.secciones.map((seccion) => {
            const material = seccion.titulo === "Material y observaciones";
            return (
              <section key={seccion.titulo} className={`min-w-0 overflow-hidden rounded-xl border border-line ${material ? (linea.tipo === "baqueton" ? "md:col-span-2 xl:col-span-1" : "md:col-span-2") : ""}`}>
                <h3 className="border-b border-line bg-surface-2 px-4 py-3 text-xs font-extrabold uppercase tracking-[0.08em] text-ink-2">
                  {seccion.titulo}{seccion.titulo === "Medidas" || seccion.titulo === "Perfil" ? " · cm" : ""}
                </h3>
                <dl className="divide-y divide-line/70 px-4">
                  {seccion.campos.map((campo) => (
                    <div key={campo.etiqueta} className={material ? "py-3" : "grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] items-baseline gap-3 py-2.5"}>
                      <dt className="text-xs font-medium leading-5 text-ink-2">{campo.etiqueta}</dt>
                      <dd className={`min-w-0 whitespace-pre-wrap break-words text-sm font-bold leading-5 tabular-nums text-ink ${material ? "mt-1" : "text-right"}`}>
                        {campo.valor}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            );
          })}
        </div>

        <TablaOllaosRevision reparto={linea.reparto} />

        <section className="rounded-xl border border-line bg-surface-2/60 p-4">
          <h3 className="mb-3 text-xs font-extrabold uppercase tracking-[0.08em] text-ink-2">Corte y confección · cm</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {linea.corte.map((celda) => (
              <div key={celda.titulo} className="min-w-0 border-l-2 border-gold pl-3">
                <h4 className="mb-1.5 text-[11px] font-bold tracking-wide text-ink-2">{celda.titulo}</h4>
                {celda.lineas.map((texto, indice) => (
                  <p key={indice} className="break-words text-sm font-semibold leading-6 tabular-nums text-ink">{texto}</p>
                ))}
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
