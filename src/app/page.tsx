import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold">Planteamientos TGM</h1>
      <p className="text-sm text-neutral-500">Lonas de remolque y baquetones</p>
      <div className="flex gap-4">
        <Link href="/planteamiento" className="rounded-xl bg-neutral-900 px-6 py-3 font-medium text-white">
          Nuevo planteamiento
        </Link>
        <Link href="/historial" className="rounded-xl border border-neutral-300 px-6 py-3 font-medium">
          Historial
        </Link>
      </div>
    </main>
  );
}
