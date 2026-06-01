import { useCallback, useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  resolveBaquetonInput,
  resolveLonaInput,
} from "@/components/planteamiento/planteamiento-initial";
import { PrintablePlan } from "@/components/print/PrintablePlan";
import { PrintActions } from "@/components/print/PrintActions";
import { BaquetonForm } from "@/components/forms/BaquetonForm";
import { LonaForm } from "@/components/forms/LonaForm";
import { OllaosEntryPanel } from "@/components/ollaos/OllaosEntryPanel";
import { calculateBaqueton } from "@/lib/calculations/baqueton";
import { calculateLonaRemolque } from "@/lib/calculations/lona-remolque";
import {
  createEmptyBaquetonInput,
  createEmptyLonaInput,
} from "@/lib/defaults/default-settings";
import { useSettings } from "@/lib/hooks/use-settings";
import type { OllaoSectionId } from "@/lib/print/ollaos-grid";
import {
  createId,
  loadMaterials,
} from "@/lib/storage/local-storage";
import {
  PLANTEAMIENTO_SCHEMA_VERSION,
  type BaquetonFormInput,
  type AppSettings,
  type LonaFormInput,
  type SavedBaqueton,
  type SavedLona,
  type SavedItem,
} from "@/lib/types";
import {
  issuesByField,
  validateBaquetonInput,
  validateLonaInput,
} from "@/lib/validation/planteamiento";

type Mode = "lona-remolque" | "baqueton";
type ViewMode = "edit" | "preview";

interface CustomerDto {
  id: string;
  name: string;
  default_material_id?: string | null;
  default_pickup_front_id?: string | null;
  default_pickup_back_id?: string | null;
}

export function PlanteamientoWorkspace({
  mode,
  editId = null,
}: {
  mode: Mode;
  editId?: string | null;
}) {
  const { settings, ready } = useSettings();
  const router = useRouter();

  const [lonaInput, setLonaInput] = useState<LonaFormInput>(() =>
    createEmptyLonaInput(),
  );
  const [baquetonInput, setBaquetonInput] = useState<BaquetonFormInput>(() =>
    createEmptyBaquetonInput(settings),
  );
  const [savedId, setSavedId] = useState<string | null>(editId);
  const [viewMode, setViewMode] = useState<ViewMode>("edit");
  const [settingsSnapshot, setSettingsSnapshot] = useState<AppSettings | null>(null);
  const [customers, setCustomers] = useState<CustomerDto[]>([]);
  const [materials, setMaterials] = useState<string[]>([]);
  const [plansHistory, setPlansHistory] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const calculationSettings = settingsSnapshot ?? settings;

  // Cargar datos de la BD al montar
  useEffect(() => {
    async function loadDbData() {
      try {
        setLoading(true);
        // 1. Cargar clientes
        const custRes = await fetch("/api/customers");
        if (custRes.ok) {
          const custData = await custRes.json();
          setCustomers(custData);
        }

        // 2. Cargar materiales
        const matRes = await fetch("/api/materials");
        if (matRes.ok) {
          const matData = await matRes.json();
          setMaterials(matData.map((m: any) => m.name));
        } else {
          // Fallback a locales
          setMaterials(loadMaterials().filter(m => m.activo).map(m => m.nombre));
        }

        // 3. Cargar historial completo de planes
        const plansRes = await fetch("/api/plans");
        if (plansRes.ok) {
          const plansData = await plansRes.json();
          setPlansHistory(plansData);
        }

        // 4. Si hay editId, cargar el plan de la BD
        if (editId) {
          const planRes = await fetch(`/api/plans/${editId}`);
          if (planRes.ok) {
            const planData = await planRes.json();
            if (planData.type === "lona-remolque") {
              setLonaInput(planData.input);
            } else if (planData.type === "baqueton") {
              setBaquetonInput(planData.input);
            }
            setSettingsSnapshot(planData.settingsSnapshot);
          }
        }
      } catch (err) {
        console.error("Error al cargar datos de la BD:", err);
      } finally {
        setLoading(false);
      }
    }

    if (ready) {
      loadDbData();
    }
  }, [editId, ready]);

  const lonaResult = useMemo(
    () => (ready ? calculateLonaRemolque(lonaInput, calculationSettings) : null),
    [lonaInput, calculationSettings, ready],
  );

  const baquetonResult = useMemo(
    () => (ready ? calculateBaqueton(baquetonInput, calculationSettings) : null),
    [baquetonInput, calculationSettings, ready],
  );

  const lonaFieldWarnings = useMemo(
    () => issuesByField(validateLonaInput(lonaInput)),
    [lonaInput],
  );
  const baquetonFieldWarnings = useMemo(
    () => issuesByField(validateBaquetonInput(baquetonInput)),
    [baquetonInput],
  );

  // Callback al seleccionar/cambiar cliente
  const handleCustomerChange = useCallback(async (customerId: string | null, customerName: string) => {
    if (mode === "lona-remolque") {
      setLonaInput(prev => ({ ...prev, cliente: customerName }));
    } else {
      setBaquetonInput(prev => ({ ...prev, cliente: customerName }));
    }

    if (!customerId) return;

    // Buscar en el historial de planes el último de este cliente para autocompletar
    const lastCustomerPlan = plansHistory.find(p => p.input.cliente === customerName);
    
    if (lastCustomerPlan) {
      if (mode === "lona-remolque" && lastCustomerPlan.type === "lona-remolque") {
        setLonaInput(prev => ({
          ...prev,
          ...lastCustomerPlan.input,
          cliente: customerName, // Mantener nombre limpio
          numeroPedido: prev.numeroPedido, // Mantener datos del nuevo pedido
          ordenFabricacion: prev.ordenFabricacion,
          revision: prev.revision,
          fecha: prev.fecha,
          fechaSalida: prev.fechaSalida
        }));
      } else if (mode === "baqueton" && lastCustomerPlan.type === "baqueton") {
        setBaquetonInput(prev => ({
          ...prev,
          ...lastCustomerPlan.input,
          cliente: customerName,
          numeroPedido: prev.numeroPedido,
          ordenFabricacion: prev.ordenFabricacion,
          revision: prev.revision,
          fecha: prev.fecha,
          fechaSalida: prev.fechaSalida
        }));
      }
      return;
    }

    // Si no hay plan previo, hacer fetch de la configuración por defecto del cliente de la BD
    try {
      const settingsRes = await fetch(`/api/customers/${customerId}/settings`);
      if (settingsRes.ok) {
        const { canvasSettings, baquetonProfiles } = await settingsRes.json();
        
        if (mode === "lona-remolque" && canvasSettings && canvasSettings.length > 0) {
          const cs = canvasSettings[0];
          // Si el cliente tiene dimensiones o parámetros por defecto mapeados
          // (los mapeamos a lonaParams del settings local o directamente al input si aplica)
          // Nota: El cliente general puede precargar material por defecto y recogidas si están en el objeto customer
          const customerObj = customers.find(c => c.id === customerId);
          if (customerObj) {
            // Resolver material
            if (customerObj.default_material_id) {
              const matRes = await fetch("/api/materials");
              if (matRes.ok) {
                const mats = await matRes.json();
                const matchedMat = mats.find((m: any) => m.id === customerObj.default_material_id);
                if (matchedMat) {
                  setLonaInput(prev => ({ ...prev, material: matchedMat.name }));
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("Error al cargar configuraciones del cliente:", err);
    }
  }, [mode, plansHistory, customers]);

  const handleSave = useCallback(async () => {
    const now = new Date().toISOString();
    const id = savedId ?? null;

    try {
      // 1. Si el cliente no existe en la BD (es manual), lo registramos primero
      let clienteNombre = mode === "lona-remolque" ? lonaInput.cliente : baquetonInput.cliente;
      if (clienteNombre.trim() && !customers.some(c => c.name.toLowerCase() === clienteNombre.toLowerCase())) {
        const createCustRes = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: clienteNombre })
        });
        if (createCustRes.ok) {
          const newCust = await createCustRes.json();
          setCustomers(prev => [...prev, newCust]);
        }
      }

      // 2. Guardar plan
      const payload = {
        id,
        type: mode,
        input: mode === "lona-remolque" ? lonaInput : baquetonInput,
        result: mode === "lona-remolque" ? lonaResult : baquetonResult,
        settingsSnapshot: calculationSettings
      };

      const savePlanRes = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (savePlanRes.ok) {
        const savedData = await savePlanRes.json();
        setSavedId(savedData.id);
        alert("Planteamiento guardado con éxito en la base de datos.");
        
        // Actualizar el historial local
        const histRes = await fetch("/api/plans");
        if (histRes.ok) {
          const histData = await histRes.json();
          setPlansHistory(histData);
        }
      } else {
        const errText = await savePlanRes.text();
        alert("Error al guardar: " + errText);
      }
    } catch (err: any) {
      alert("Error de conexión al guardar: " + err.message);
    }
  }, [
    mode,
    lonaResult,
    baquetonResult,
    lonaInput,
    baquetonInput,
    calculationSettings,
    savedId,
    customers
  ]);

  const handleNew = () => {
    if (mode === "lona-remolque") setLonaInput(createEmptyLonaInput());
    else setBaquetonInput(createEmptyBaquetonInput(settings));
    setSavedId(null);
    setSettingsSnapshot(null);
    setViewMode("edit");
    router.replace(mode === "lona-remolque" ? "/nuevo/lona" : "/nuevo/baqueton");
  };

  const handleDuplicate = () => {
    setSavedId(null);
    setViewMode("edit");
    alert("Duplicado. Guarda para crear una copia nueva en la base de datos.");
  };

  const setLonaOllaoSection = useCallback(
    (section: OllaoSectionId, text: string) => {
      setLonaInput((prev) => {
        if (section === "laterales") return { ...prev, ollaosLaterales: text };
        if (section === "atras") return { ...prev, ollaosAtras: text };
        return { ...prev, ollaosDelante: text };
      });
    },
    [],
  );

  const setBaquetonOllaoSection = useCallback(
    (section: OllaoSectionId, text: string) => {
      setBaquetonInput((prev) => {
        if (section === "laterales") return { ...prev, ollaosLaterales: text };
        if (section === "atras") return { ...prev, ollaosAtras: text };
        return { ...prev, ollaosDelante: text };
      });
    },
    [],
  );

  const title =
    mode === "lona-remolque" ? "Lona remolque alto" : "Baquetón";

  if (!ready) {
    return <p className="text-slate-600">Cargando parámetros…</p>;
  }

  const previewBlock =
    mode === "lona-remolque" && lonaResult ? (
      <PrintablePlan
        type="lona-remolque"
        input={lonaInput}
        result={lonaResult}
        settings={calculationSettings}
      />
    ) : mode === "baqueton" && baquetonResult ? (
      <PrintablePlan
        type="baqueton"
        input={baquetonInput}
        result={baquetonResult}
        settings={calculationSettings}
      />
    ) : null;

  const ollaosPanel =
    mode === "lona-remolque" ? (
      <OllaosEntryPanel
        colocacionOllaos={lonaInput.colocacionOllaos}
        laterales={lonaInput.ollaosLaterales}
        atras={lonaInput.ollaosAtras}
        delante={lonaInput.ollaosDelante}
        onChange={setLonaOllaoSection}
      />
    ) : (
      <OllaosEntryPanel
        colocacionOllaos={baquetonInput.colocacionOllaos}
        laterales={baquetonInput.ollaosLaterales}
        atras={baquetonInput.ollaosAtras}
        delante={baquetonInput.ollaosDelante}
        onChange={setBaquetonOllaoSection}
      />
    );

  return (
    <section>
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {viewMode === "edit" ? (
          <button
            type="button"
            onClick={() => setViewMode("preview")}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Vista impresión
          </button>
        ) : null}
      </div>

      {viewMode === "edit" ? (
        <div className="no-print grid items-start gap-6 lg:grid-cols-[minmax(300px,360px)_minmax(0,1fr)]">
          <aside className="sticky top-4 max-h-[calc(100vh-6rem)] overflow-y-auto p-1">
            {mode === "lona-remolque" ? (
              <LonaForm
                input={lonaInput}
                settings={settings}
                materials={materials}
                customers={customers}
                fieldWarnings={lonaFieldWarnings}
                onChange={setLonaInput}
                onCustomerChange={handleCustomerChange}
              />
            ) : (
              <BaquetonForm
                input={baquetonInput}
                settings={settings}
                materials={materials}
                customers={customers}
                fieldWarnings={baquetonFieldWarnings}
                onChange={setBaquetonInput}
                onCustomerChange={handleCustomerChange}
              />
            )}
          </aside>

          <section className="flex min-w-0 flex-col gap-4">
            {previewBlock}
            {ollaosPanel}
          </section>
        </div>
      ) : (
        <section className="flex flex-col items-center gap-4">
          <section className="w-full max-w-[297mm] overflow-x-auto">
            {previewBlock}
          </section>
          {ollaosPanel}
        </section>
      )}

      <PrintActions
        onSave={handleSave}
        onDuplicate={handleDuplicate}
        onNew={handleNew}
        onEdit={() => setViewMode("edit")}
        showEdit={viewMode === "preview"}
      />
    </section>
  );
}
