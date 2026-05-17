import Link from "next/link";

export default function HomePage() {
  return (
    <section>
      <h1 className="mb-2 text-3xl font-bold text-slate-900">Remolques TGM</h1>
      <p className="mb-8 max-w-xl text-slate-600">
        Herramienta interna para planteamientos de fabricación. Selecciona un tipo para empezar.
      </p>
      <ul className="grid max-w-2xl list-none gap-4 p-0 sm:grid-cols-2">
        <li>
          <Link
            href="/nuevo/lona"
            className="block rounded-xl border-2 border-slate-800 bg-slate-800 p-8 text-center text-white shadow-md transition hover:bg-slate-700"
          >
            <span className="text-xl font-bold">Lona remolque alto</span>
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
