import { ClientesPanel } from "@/components/settings/ClientesPanel";

export default function ClientesPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>
        <p className="mt-1 text-slate-600 text-sm">
          Administración de parámetros específicos y perfiles por cliente para los cálculos de fabricación.
        </p>
      </header>
      <ClientesPanel />
    </div>
  );
}
