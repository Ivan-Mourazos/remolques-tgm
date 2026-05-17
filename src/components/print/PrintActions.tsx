"use client";

import { BtnPrimary, BtnSecondary } from "@/components/ui/ActionBar";

export function PrintActions({
  onSave,
  onDuplicate,
  onNew,
  onEdit,
  showEdit = true,
}: {
  onSave: () => void;
  onDuplicate: () => void;
  onNew: () => void;
  onEdit?: () => void;
  showEdit?: boolean;
}) {
  return (
    <div className="no-print mt-6 flex flex-wrap gap-3 border-t border-slate-200 pt-4">
      <BtnPrimary onClick={onSave}>Guardar planteamiento</BtnPrimary>
      <BtnSecondary onClick={() => window.print()}>
        Imprimir / Guardar PDF
      </BtnSecondary>
      <BtnSecondary onClick={onDuplicate}>Duplicar</BtnSecondary>
      <BtnSecondary onClick={onNew}>Nuevo planteamiento</BtnSecondary>
      {showEdit && onEdit && (
        <BtnSecondary onClick={onEdit}>Volver a editar</BtnSecondary>
      )}
    </div>
  );
}
