"use client";

import { useState, useEffect, useMemo } from "react";
import { BtnPrimary, BtnSecondary } from "@/components/ui/ActionBar";
import { inputClass, selectClass } from "@/components/ui/FormField";
import { DEFAULT_LONA_PARAMS, DEFAULT_BAQUETON_PROFILES } from "@/lib/defaults/default-settings";
import type { LonaParams, BaquetonProfile, RoundingMode } from "@/lib/types";

interface CustomerDto {
  id: string;
  name: string;
  active: boolean;
}

interface DBTrailerCanvasSettings {
  id?: string;
  customer_id: string;
  name: string;
  demasia_largo_ancho_lona_hecha: number;
  demasia_alto: number;
  demasia_largo_contorno_normal: number;
  demasia_largo_contorno_enfundar: number;
  aumento_curva_contorno: number;
  inicio_oreja_sin_curva: number;
  medida_oreja_goma: number;
  decimales: number;
  redondeo: string;
  active: boolean;
}

interface DBBaquetonProfile {
  id?: string;
  customer_id: string;
  name: string;
  demasia_largo_pieza_final: number;
  demasia_ancho_pieza_final: number;
  demasia_baqueton_picostura: number;
  demasia_baqueton_en_largo_delante: number;
  demasia_baqueton_en_largo_detras: number;
  demasia_baqueton_en_ancho_delante: number;
  demasia_baqueton_en_ancho_detras: number;
  active: boolean;
}

// Colores de la marca Toldos Gómez
const brandColors = {
  blue: "#004077", // Azul marino principal
  red: "#e21a22",  // Rojo secundario/acentos
};

export function ClientesPanel() {
  const [customers, setCustomers] = useState<CustomerDto[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "lona" | "baqueton">("general");

  // Estados del modal de creación
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [createError, setCreateError] = useState("");

  // Estados del cliente seleccionado
  const [customerName, setCustomerName] = useState("");
  const [customerActive, setCustomerActive] = useState(true);
  const [canvasParams, setCanvasParams] = useState<LonaParams>({ ...DEFAULT_LONA_PARAMS });
  const [canvasRecordId, setCanvasRecordId] = useState<string | undefined>(undefined);
  const [baquetonProfiles, setBaquetonProfiles] = useState<BaquetonProfile[]>([]);
  const [originalBaquetonProfiles, setOriginalBaquetonProfiles] = useState<BaquetonProfile[]>([]);

  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [saving, setSaving] = useState(false);

  // Cargar lista de clientes al inicio
  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoadingList(true);
      const res = await fetch("/api/customers");
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
      }
    } catch (err) {
      console.error("Error al cargar clientes:", err);
    } finally {
      setLoadingList(false);
    }
  };

  // Cargar detalles cuando cambia el cliente seleccionado
  useEffect(() => {
    if (!selectedCustomerId) {
      setCustomerName("");
      setCustomerActive(true);
      setCanvasParams({ ...DEFAULT_LONA_PARAMS });
      setCanvasRecordId(undefined);
      setBaquetonProfiles([]);
      setOriginalBaquetonProfiles([]);
      return;
    }

    const customer = customers.find((c) => c.id === selectedCustomerId);
    if (customer) {
      setCustomerName(customer.name);
      setCustomerActive(customer.active);
    }

    const fetchSettings = async () => {
      try {
        setLoadingDetails(true);
        const res = await fetch(`/api/customers/${selectedCustomerId}/settings`);
        if (res.ok) {
          const { canvasSettings, baquetonProfiles: dbProfiles } = await res.json();

          // 1. Mapear parámetros de Lona
          if (canvasSettings && canvasSettings.length > 0) {
            const dbCanvas = canvasSettings[0];
            setCanvasRecordId(dbCanvas.id);
            setCanvasParams({
              demasiaLargoAnchoLonaHecha: dbCanvas.demasia_largo_ancho_lona_hecha,
              demasiaAlto: dbCanvas.demasia_alto,
              demasiaLargoContornoNormal: dbCanvas.demasia_largo_contorno_normal,
              demasiaLargoContornoEnfundar: dbCanvas.demasia_largo_contorno_enfundar,
              aumentoCurvaContorno: dbCanvas.aumento_curva_contorno,
              inicioOrejaSinCurva: dbCanvas.inicio_oreja_sin_curva,
              medidaOrejaGoma: dbCanvas.medida_oreja_goma,
              decimales: dbCanvas.decimales,
              redondeo: dbCanvas.redondeo as RoundingMode,
            });
          } else {
            setCanvasRecordId(undefined);
            setCanvasParams({ ...DEFAULT_LONA_PARAMS });
          }

          // 2. Mapear Perfiles de Baquetón
          const mappedProfiles: BaquetonProfile[] = (dbProfiles || []).map((dbP: any) => ({
            id: dbP.id,
            nombre: dbP.name,
            demasiaLargoPiezaFinal: dbP.demasia_largo_pieza_final,
            demasiaAnchoPiezaFinal: dbP.demasia_ancho_pieza_final,
            demasiaBaquetonPicostura: dbP.demasia_baqueton_picostura,
            demasiaBaquetonEnLargoDelante: dbP.demasia_baqueton_en_largo_delante,
            demasiaBaquetonEnLargoDetras: dbP.demasia_baqueton_en_largo_detras,
            demasiaBaquetonEnAnchoDelante: dbP.demasia_baqueton_en_ancho_delante,
            demasiaBaquetonEnAnchoDetras: dbP.demasia_baqueton_en_ancho_detras,
          }));

          // Si no hay ningún perfil en la BD, cargar la plantilla estándar por defecto
          if (mappedProfiles.length === 0) {
            setBaquetonProfiles(DEFAULT_BAQUETON_PROFILES.map(p => ({ ...p, id: `temp-${Date.now()}` })));
          } else {
            setBaquetonProfiles(mappedProfiles);
          }
          setOriginalBaquetonProfiles(mappedProfiles);
        }
      } catch (err) {
        console.error("Error al cargar configuraciones del cliente:", err);
      } finally {
        setLoadingDetails(false);
      }
    };

    fetchSettings();
  }, [selectedCustomerId, customers]);

  // Filtrado de clientes
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesActive = showInactive ? true : c.active;
      return matchesSearch && matchesActive;
    });
  }, [customers, searchQuery, showInactive]);

  // Confirmar creación de nuevo cliente desde el modal
  const handleConfirmCreate = async () => {
    if (!newCustomerName.trim()) return;

    try {
      setSaving(true);
      setCreateError("");
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCustomerName.trim() }),
      });
      if (res.ok) {
        const newCustomer = await res.json();
        setCustomers((prev) => [...prev, newCustomer]);
        setSelectedCustomerId(newCustomer.id);
        setActiveTab("general");
        setShowCreateModal(false);
        setNewCustomerName("");
      } else {
        const err = await res.json();
        setCreateError(err.error || "Error al crear cliente");
      }
    } catch (err: any) {
      setCreateError(err.message || "Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  // Guardar cambios del cliente actual
  const handleSaveChanges = async () => {
    if (!selectedCustomerId) return;
    if (!customerName.trim()) {
      alert("El nombre del cliente no puede estar vacío.");
      return;
    }

    try {
      setSaving(true);

      // 1. Guardar metadatos generales
      const custRes = await fetch(`/api/customers/${selectedCustomerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: customerName.trim(), active: customerActive }),
      });

      if (!custRes.ok) {
        const err = await custRes.json();
        throw new Error("Error en datos generales: " + err.error);
      }

      // Actualizar en el estado local de clientes
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === selectedCustomerId
            ? { ...c, name: customerName.trim(), active: customerActive }
            : c
        )
      );

      // 2. Guardar configuraciones y perfiles
      const payloadCanvas: DBTrailerCanvasSettings = {
        id: canvasRecordId,
        customer_id: selectedCustomerId,
        name: "Parámetros Lona",
        demasia_largo_ancho_lona_hecha: canvasParams.demasiaLargoAnchoLonaHecha,
        demasia_alto: canvasParams.demasiaAlto,
        demasia_largo_contorno_normal: canvasParams.demasiaLargoContornoNormal,
        demasia_largo_contorno_enfundar: canvasParams.demasiaLargoContornoEnfundar,
        aumento_curva_contorno: canvasParams.aumentoCurvaContorno,
        inicio_oreja_sin_curva: canvasParams.inicioOrejaSinCurva,
        medida_oreja_goma: canvasParams.medidaOrejaGoma,
        decimales: canvasParams.decimales,
        redondeo: canvasParams.redondeo,
        active: true,
      };

      const payloadBaquetones: DBBaquetonProfile[] = baquetonProfiles.map((p) => ({
        id: p.id.startsWith("temp-") ? undefined : p.id,
        customer_id: selectedCustomerId,
        name: p.nombre,
        demasia_largo_pieza_final: p.demasiaLargoPiezaFinal,
        demasia_ancho_pieza_final: p.demasiaAnchoPiezaFinal,
        demasia_baqueton_picostura: p.demasiaBaquetonPicostura,
        demasia_baqueton_en_largo_delante: p.demasiaBaquetonEnLargoDelante,
        demasia_baqueton_en_largo_detras: p.demasiaBaquetonEnLargoDetras,
        demasia_baqueton_en_ancho_delante: p.demasiaBaquetonEnAnchoDelante,
        demasia_baqueton_en_ancho_detras: p.demasiaBaquetonEnAnchoDetras,
        active: true,
      }));

      const settingsRes = await fetch(`/api/customers/${selectedCustomerId}/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          canvasSettings: payloadCanvas,
          baquetonProfiles: payloadBaquetones,
        }),
      });

      if (!settingsRes.ok) {
        const err = await settingsRes.json();
        throw new Error("Error en configuraciones de parámetros: " + err.error);
      }

      const settingsResult = await settingsRes.json();
      if (settingsResult.canvasSettings) {
        setCanvasRecordId(settingsResult.canvasSettings.id);
      }

      // Volver a mapear perfiles devueltos para actualizar IDs autogenerados de Supabase
      if (settingsResult.baquetonProfiles) {
        const updatedProfiles: BaquetonProfile[] = settingsResult.baquetonProfiles.map((dbP: any) => ({
          id: dbP.id,
          nombre: dbP.name,
          demasiaLargoPiezaFinal: dbP.demasia_largo_pieza_final,
          demasiaAnchoPiezaFinal: dbP.demasia_ancho_pieza_final,
          demasiaBaquetonPicostura: dbP.demasia_baqueton_picostura,
          demasiaBaquetonEnLargoDelante: dbP.demasia_baqueton_en_largo_delante,
          demasiaBaquetonEnLargoDetras: dbP.demasia_baqueton_en_largo_detras,
          demasiaBaquetonEnAnchoDelante: dbP.demasia_baqueton_en_ancho_delante,
          demasiaBaquetonEnAnchoDetras: dbP.demasia_baqueton_en_ancho_detras,
        }));
        setBaquetonProfiles(updatedProfiles);
        setOriginalBaquetonProfiles(updatedProfiles);
      }

      alert("Parámetros del cliente guardados correctamente.");
    } catch (err: any) {
      alert("Error al guardar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Eliminar cliente completo
  const handleDeleteCustomer = async () => {
    if (!selectedCustomerId) return;
    const confirm = window.confirm(
      `¿Estás seguro de que quieres eliminar completamente al cliente "${customerName}" y todos sus parámetros de cálculo asociados? Esta acción no se puede deshacer.`
    );
    if (!confirm) return;

    try {
      setSaving(true);
      const res = await fetch(`/api/customers/${selectedCustomerId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setCustomers((prev) => prev.filter((c) => c.id !== selectedCustomerId));
        setSelectedCustomerId(null);
        alert("Cliente eliminado.");
      } else {
        const err = await res.json();
        alert("Error al eliminar cliente: " + err.error);
      }
    } catch (err: any) {
      alert("Error de red: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Copiar configuración de otro cliente
  const handleCopySettings = async (sourceCustomerId: string) => {
    if (!sourceCustomerId) return;
    try {
      setLoadingDetails(true);
      const res = await fetch(`/api/customers/${sourceCustomerId}/settings`);
      if (res.ok) {
        const { canvasSettings, baquetonProfiles: dbProfiles } = await res.json();

        // Copiar Lonas
        if (canvasSettings && canvasSettings.length > 0) {
          const dbCanvas = canvasSettings[0];
          setCanvasParams({
            demasiaLargoAnchoLonaHecha: dbCanvas.demasia_largo_ancho_lona_hecha,
            demasiaAlto: dbCanvas.demasia_alto,
            demasiaLargoContornoNormal: dbCanvas.demasia_largo_contorno_normal,
            demasiaLargoContornoEnfundar: dbCanvas.demasia_largo_contorno_enfundar,
            aumentoCurvaContorno: dbCanvas.aumento_curva_contorno,
            inicioOrejaSinCurva: dbCanvas.inicio_oreja_sin_curva,
            medidaOrejaGoma: dbCanvas.medida_oreja_goma,
            decimales: dbCanvas.decimales,
            redondeo: dbCanvas.redondeo as RoundingMode,
          });
        }

        // Copiar Baquetones (generamos IDs temporales ya que son registros nuevos para el cliente destino)
        const mappedProfiles: BaquetonProfile[] = (dbProfiles || []).map((dbP: any) => ({
          id: `temp-${Math.random()}`,
          nombre: dbP.name,
          demasiaLargoPiezaFinal: dbP.demasia_largo_pieza_final,
          demasiaAnchoPiezaFinal: dbP.demasia_ancho_pieza_final,
          demasiaBaquetonPicostura: dbP.demasia_baqueton_picostura,
          demasiaBaquetonEnLargoDelante: dbP.demasia_baqueton_en_largo_delante,
          demasiaBaquetonEnLargoDetras: dbP.demasia_baqueton_en_largo_detras,
          demasiaBaquetonEnAnchoDelante: dbP.demasia_baqueton_en_ancho_delante,
          demasiaBaquetonEnAnchoDetras: dbP.demasia_baqueton_en_ancho_detras,
        }));
        setBaquetonProfiles(mappedProfiles);
        alert("Configuración copiada del cliente seleccionado. Recuerda guardar los cambios.");
      }
    } catch (err) {
      console.error("Error al copiar configuraciones:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Cargar valores por defecto
  const handleResetToDefaults = () => {
    const confirm = window.confirm(
      "¿Seguro que deseas restablecer todos los parámetros de este cliente a los valores por defecto del sistema?"
    );
    if (!confirm) return;

    setCanvasParams({ ...DEFAULT_LONA_PARAMS });
    setBaquetonProfiles(DEFAULT_BAQUETON_PROFILES.map(p => ({ ...p, id: `temp-${Date.now()}` })));
  };

  // Manejo de perfiles de baquetón
  const updateProfileField = (
    index: number,
    field: keyof BaquetonProfile,
    value: string | number
  ) => {
    const next = [...baquetonProfiles];
    next[index] = { ...next[index], [field]: value };
    setBaquetonProfiles(next);
  };

  const addBaquetonProfile = () => {
    const newProfile: BaquetonProfile = {
      id: `temp-${Date.now()}-${Math.random()}`,
      nombre: "NUEVO PERFIL",
      demasiaLargoPiezaFinal: 1,
      demasiaAnchoPiezaFinal: 1,
      demasiaBaquetonPicostura: 2,
      demasiaBaquetonEnLargoDelante: 1,
      demasiaBaquetonEnLargoDetras: 1,
      demasiaBaquetonEnAnchoDelante: 1,
      demasiaBaquetonEnAnchoDetras: 1,
    };
    setBaquetonProfiles([...baquetonProfiles, newProfile]);
  };

  const removeBaquetonProfile = (index: number) => {
    setBaquetonProfiles(baquetonProfiles.filter((_, i) => i !== index));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      {/* Columna Izquierda: Listado de Clientes */}
      <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4">
          <input
            type="text"
            placeholder="Buscar cliente..."
            className={inputClass}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <label className="mt-2 flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Mostrar inactivos
          </label>
        </div>

        <button
          type="button"
          onClick={() => {
            setNewCustomerName("");
            setCreateError("");
            setShowCreateModal(true);
          }}
          className="w-full rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all hover:opacity-90 flex items-center justify-center gap-1.5 shadow"
          style={{ backgroundColor: brandColors.blue }}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Cliente
        </button>

        <hr className="my-4 border-slate-100" />

        {loadingList ? (
          <p className="text-center text-sm text-slate-500 my-4">Cargando clientes...</p>
        ) : filteredCustomers.length === 0 ? (
          <p className="text-center text-sm text-slate-400 my-4">No hay clientes</p>
        ) : (
          <div className="space-y-1 max-h-[calc(100vh-22rem)] overflow-y-auto pr-1">
            {filteredCustomers.map((c) => {
              const isSelected = c.id === selectedCustomerId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCustomerId(c.id)}
                  className={`w-full text-left rounded-lg px-3 py-2 text-sm font-medium transition-all flex items-center justify-between border ${
                    isSelected
                      ? "bg-slate-50 shadow-sm font-semibold"
                      : "hover:bg-slate-50 text-slate-700 border-transparent"
                  }`}
                  style={isSelected ? { borderColor: brandColors.blue, color: brandColors.blue } : {}}
                >
                  <span className="truncate">{c.name}</span>
                  {!c.active && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                      INACTIVO
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </aside>

      {/* Columna Derecha: Formulario y Parámetros */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm min-w-0">
        {!selectedCustomerId ? (
          <div className="flex h-[350px] flex-col items-center justify-center text-slate-400">
            <svg className="h-12 w-12 stroke-slate-300" fill="none" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <p className="mt-4 text-sm font-medium">Selecciona un cliente para editar sus parámetros</p>
          </div>
        ) : loadingDetails ? (
          <div className="flex h-[350px] items-center justify-center text-slate-500">
            <p className="text-sm">Cargando configuraciones...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header del Cliente */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{customerName || "Cliente"}</h2>
                <p className="text-xs text-slate-500">ID: {selectedCustomerId}</p>
              </div>
              <div className="flex items-center gap-3">
                {/* Selector para copiar configuración de otro */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500 font-medium">Copiar de:</span>
                  <select
                    className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 focus:outline-none"
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        handleCopySettings(e.target.value);
                        e.target.value = "";
                      }
                    }}
                  >
                    <option value="">-- Seleccionar --</option>
                    {customers
                      .filter((c) => c.id !== selectedCustomerId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Pestañas (Tabs) con estilo premium de Toldos Gómez */}
            <div className="flex border-b border-slate-200">
              <button
                type="button"
                className="px-4 py-2.5 text-sm font-semibold transition-all border-b-2 -mb-[2px]"
                style={
                  activeTab === "general"
                    ? { borderBottomColor: brandColors.red, color: brandColors.blue }
                    : { borderBottomColor: "transparent", color: "#64748b" }
                }
                onClick={() => setActiveTab("general")}
              >
                Datos Generales
              </button>
              <button
                type="button"
                className="px-4 py-2.5 text-sm font-semibold transition-all border-b-2 -mb-[2px]"
                style={
                  activeTab === "lona"
                    ? { borderBottomColor: brandColors.red, color: brandColors.blue }
                    : { borderBottomColor: "transparent", color: "#64748b" }
                }
                onClick={() => setActiveTab("lona")}
              >
                Lonas de Remolque
              </button>
              <button
                type="button"
                className="px-4 py-2.5 text-sm font-semibold transition-all border-b-2 -mb-[2px]"
                style={
                  activeTab === "baqueton"
                    ? { borderBottomColor: brandColors.red, color: brandColors.blue }
                    : { borderBottomColor: "transparent", color: "#64748b" }
                }
                onClick={() => setActiveTab("baqueton")}
              >
                Perfiles de Baquetón ({baquetonProfiles.length})
              </button>
            </div>

            {/* Contenido Pestaña: General */}
            {activeTab === "general" && (
              <div className="space-y-4 max-w-lg">
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-slate-700">Nombre de empresa</span>
                  <input
                    type="text"
                    className={inputClass}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customerActive}
                    onChange={(e) => setCustomerActive(e.target.checked)}
                    className="h-4.5 w-4.5 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                  />
                  <div>
                    <span className="block text-sm font-semibold text-slate-800">Cliente Activo</span>
                    <span className="block text-xs text-slate-500">
                      Si se desactiva, no se sugerirá al dar de alta nuevos planteamientos.
                    </span>
                  </div>
                </label>
              </div>
            )}

            {/* Contenido Pestaña: Lonas de Remolque */}
            {activeTab === "lona" && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Demasía Largo/Ancho</span>
                  <input
                    className={inputClass}
                    type="number"
                    step="0.1"
                    value={canvasParams.demasiaLargoAnchoLonaHecha}
                    onChange={(e) =>
                      setCanvasParams({
                        ...canvasParams,
                        demasiaLargoAnchoLonaHecha: Number(e.target.value),
                      })
                    }
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Demasía Alto</span>
                  <input
                    className={inputClass}
                    type="number"
                    step="0.1"
                    value={canvasParams.demasiaAlto}
                    onChange={(e) =>
                      setCanvasParams({
                        ...canvasParams,
                        demasiaAlto: Number(e.target.value),
                      })
                    }
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Demasía Contorno Normal</span>
                  <input
                    className={inputClass}
                    type="number"
                    step="0.1"
                    value={canvasParams.demasiaLargoContornoNormal}
                    onChange={(e) =>
                      setCanvasParams({
                        ...canvasParams,
                        demasiaLargoContornoNormal: Number(e.target.value),
                      })
                    }
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Demasía Contorno Enfundar</span>
                  <input
                    className={inputClass}
                    type="number"
                    step="0.1"
                    value={canvasParams.demasiaLargoContornoEnfundar}
                    onChange={(e) =>
                      setCanvasParams({
                        ...canvasParams,
                        demasiaLargoContornoEnfundar: Number(e.target.value),
                      })
                    }
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Aumento Curva Contorno</span>
                  <input
                    className={inputClass}
                    type="number"
                    step="0.1"
                    value={canvasParams.aumentoCurvaContorno}
                    onChange={(e) =>
                      setCanvasParams({
                        ...canvasParams,
                        aumentoCurvaContorno: Number(e.target.value),
                      })
                    }
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Inicio Oreja sin Curva</span>
                  <input
                    className={inputClass}
                    type="number"
                    step="0.1"
                    value={canvasParams.inicioOrejaSinCurva}
                    onChange={(e) =>
                      setCanvasParams({
                        ...canvasParams,
                        inicioOrejaSinCurva: Number(e.target.value),
                      })
                    }
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Medida Oreja Goma</span>
                  <input
                    className={inputClass}
                    type="number"
                    step="0.1"
                    value={canvasParams.medidaOrejaGoma}
                    onChange={(e) =>
                      setCanvasParams({
                        ...canvasParams,
                        medidaOrejaGoma: Number(e.target.value),
                      })
                    }
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Decimales</span>
                  <input
                    className={inputClass}
                    type="number"
                    min="0"
                    max="3"
                    value={canvasParams.decimales}
                    onChange={(e) =>
                      setCanvasParams({
                        ...canvasParams,
                        decimales: Number(e.target.value),
                      })
                    }
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Redondeo</span>
                  <select
                    className={selectClass}
                    value={canvasParams.redondeo}
                    onChange={(e) =>
                      setCanvasParams({
                        ...canvasParams,
                        redondeo: e.target.value as RoundingMode,
                      })
                    }
                  >
                    <option value="normal">NORMAL (Al más cercano)</option>
                    <option value="up">ARRIBA (Techo)</option>
                    <option value="down">ABAJO (Suelo)</option>
                  </select>
                </label>
              </div>
            )}

            {/* Contenido Pestaña: Perfiles de Baquetón */}
            {activeTab === "baqueton" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800">Perfiles personalizados de baquetón</h3>
                  <button
                    type="button"
                    onClick={addBaquetonProfile}
                    className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Añadir Perfil
                  </button>
                </div>

                {baquetonProfiles.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-4 bg-slate-50 rounded-lg border border-dashed">
                    No hay perfiles configurados. El sistema utilizará los valores globales.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {baquetonProfiles.map((p, idx) => (
                      <div
                        key={p.id}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 relative group"
                      >
                        <button
                          type="button"
                          onClick={() => removeBaquetonProfile(idx)}
                          className="absolute top-4 right-4 text-xs font-semibold text-red-600 hover:text-red-700 opacity-60 group-hover:opacity-100 transition-opacity"
                        >
                          Eliminar
                        </button>

                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          <label className="block text-sm col-span-full max-w-sm">
                            <span className="mb-0.5 block text-xs font-semibold text-slate-700">Nombre del Perfil</span>
                            <input
                              type="text"
                              className={inputClass}
                              value={p.nombre}
                              onChange={(e) => updateProfileField(idx, "nombre", e.target.value)}
                            />
                          </label>

                          <label className="block text-sm">
                            <span className="mb-0.5 block text-xs font-medium text-slate-700">Demasía Largo Pieza Final</span>
                            <input
                              type="number"
                              step="0.1"
                              className={inputClass}
                              value={p.demasiaLargoPiezaFinal}
                              onChange={(e) =>
                                updateProfileField(idx, "demasiaLargoPiezaFinal", Number(e.target.value))
                              }
                            />
                          </label>

                          <label className="block text-sm">
                            <span className="mb-0.5 block text-xs font-medium text-slate-700">Demasía Ancho Pieza Final</span>
                            <input
                              type="number"
                              step="0.1"
                              className={inputClass}
                              value={p.demasiaAnchoPiezaFinal}
                              onChange={(e) =>
                                updateProfileField(idx, "demasiaAnchoPiezaFinal", Number(e.target.value))
                              }
                            />
                          </label>

                          <label className="block text-sm">
                            <span className="mb-0.5 block text-xs font-medium text-slate-700">Demasía Baquetón Picostura</span>
                            <input
                              type="number"
                              step="0.1"
                              className={inputClass}
                              value={p.demasiaBaquetonPicostura}
                              onChange={(e) =>
                                updateProfileField(idx, "demasiaBaquetonPicostura", Number(e.target.value))
                              }
                            />
                          </label>

                          <label className="block text-sm">
                            <span className="mb-0.5 block text-xs font-medium text-slate-700">Demasía Largo Delante</span>
                            <input
                              type="number"
                              step="0.1"
                              className={inputClass}
                              value={p.demasiaBaquetonEnLargoDelante}
                              onChange={(e) =>
                                updateProfileField(idx, "demasiaBaquetonEnLargoDelante", Number(e.target.value))
                              }
                            />
                          </label>

                          <label className="block text-sm">
                            <span className="mb-0.5 block text-xs font-medium text-slate-700">Demasía Largo Detrás</span>
                            <input
                              type="number"
                              step="0.1"
                              className={inputClass}
                              value={p.demasiaBaquetonEnLargoDetras}
                              onChange={(e) =>
                                updateProfileField(idx, "demasiaBaquetonEnLargoDetras", Number(e.target.value))
                              }
                            />
                          </label>

                          <label className="block text-sm">
                            <span className="mb-0.5 block text-xs font-medium text-slate-700">Demasía Ancho Delante</span>
                            <input
                              type="number"
                              step="0.1"
                              className={inputClass}
                              value={p.demasiaBaquetonEnAnchoDelante}
                              onChange={(e) =>
                                updateProfileField(idx, "demasiaBaquetonEnAnchoDelante", Number(e.target.value))
                              }
                            />
                          </label>

                          <label className="block text-sm">
                            <span className="mb-0.5 block text-xs font-medium text-slate-700">Demasía Ancho Detrás</span>
                            <input
                              type="number"
                              step="0.1"
                              className={inputClass}
                              value={p.demasiaBaquetonEnAnchoDetras}
                              onChange={(e) =>
                                updateProfileField(idx, "demasiaBaquetonEnAnchoDetras", Number(e.target.value))
                              }
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Barra de Acciones con Toldos Gómez Branding */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-5 mt-6">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveChanges}
                  disabled={saving}
                  className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-all shadow hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: brandColors.blue }}
                >
                  {saving ? "Guardando..." : "Guardar Parámetros"}
                </button>
                <BtnSecondary onClick={handleResetToDefaults}>
                  Restablecer por defecto
                </BtnSecondary>
              </div>

              <button
                type="button"
                onClick={handleDeleteCustomer}
                className="rounded-lg border border-red-200 bg-red-50/50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-all"
              >
                Eliminar Cliente
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Modal de creación de nuevo cliente */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs transition-opacity duration-200">
          <div className="w-full max-w-md scale-[1.01] rounded-xl border border-slate-200 bg-white p-6 shadow-xl transition-all duration-200">
            <h3 className="text-lg font-bold text-slate-900">Añadir Nuevo Cliente</h3>
            <p className="mt-1 text-xs text-slate-500 font-normal">
              Registra un nuevo cliente en la base de datos para configurar sus parámetros.
            </p>
            <div className="mt-4">
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-slate-700">Nombre del cliente</span>
                <input
                  type="text"
                  placeholder="Ej. Cliente TGM S.L."
                  className={inputClass}
                  value={newCustomerName}
                  onChange={(e) => {
                    setNewCustomerName(e.target.value);
                    if (createError) setCreateError("");
                  }}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleConfirmCreate();
                  }}
                />
              </label>
              {createError && <p className="mt-2 text-xs font-semibold text-red-600">{createError}</p>}
            </div>
            <div className="mt-6 flex justify-end gap-2.5">
              <BtnSecondary
                onClick={() => {
                  setShowCreateModal(false);
                  setNewCustomerName("");
                  setCreateError("");
                }}
                disabled={saving}
              >
                Cancelar
              </BtnSecondary>
              <button
                type="button"
                onClick={handleConfirmCreate}
                disabled={saving || !newCustomerName.trim()}
                className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow transition-all hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: brandColors.blue }}
              >
                {saving ? "Creando..." : "Crear Cliente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
