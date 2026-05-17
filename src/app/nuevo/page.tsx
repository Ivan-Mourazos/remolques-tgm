import Link from "next/link";

export default function NuevoPage() {
  return (
    <section>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">Nuevo planteamiento</h1>
      <p className="mb-8 text-slate-600">Selecciona el tipo de planteamiento.</p>
      <ul className="grid list-none gap-4 p-0 sm:grid-cols-2">
        <li>
          <Link
            href="/nuevo/lona"
            className="block rounded-xl border-2 border-slate-200 bg-white p-8 text-center shadow-sm transition hover:border-slate-800 hover:shadow-md"
          >
            <span className="text-xl font-bold text-slate-900">Lona remolque alto</span>
          </Link>
        </li>
        <li>
          <Link
            href="/nuevo/baqueton"
            className="block rounded-xl border-2 border-slate-200 bg-white p-8 text-center shadow-sm transition hover:border-slate-800 hover:shadow-md"
          >
            <span className="text-xl font-bold text-slate-900">Baquetón</span>
          </Link>
        </li>
      </ul>
    </section>
  );
}
