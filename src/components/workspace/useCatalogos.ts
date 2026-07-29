"use client";
import { useEffect, useRef, useState } from "react";
import type { Material } from "@/lib/calc/materiales-seed";
import { DEFAULT_PARAMS, type CalcParams } from "@/lib/calc/params";

/**
 * Catálogos que se cargan una vez. No disparan transiciones del reducer por
 * sí mismos, pero `params` es dependencia de `aplicarPedidoRps`, así que sí
 * participa en la reprogramación del debounce de la consulta RPS.
 */
export function useCatalogos() {
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [params, setParams] = useState<CalcParams>(DEFAULT_PARAMS);
  const materialesRef = useRef<Material[]>([]);

  useEffect(() => {
    fetch("/api/materiales").then((r) => r.json()).then((data: Material[]) => {
      materialesRef.current = data;
      setMateriales(data);
    }).catch(() => setMateriales([]));
  }, []);

  useEffect(() => {
    fetch("/api/parametros").then((r) => r.json()).then(setParams).catch(() => {});
  }, []);

  return { materiales, params, materialesRef, setMateriales };
}
