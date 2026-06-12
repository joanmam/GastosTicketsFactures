"use client";

import { useEffect, useState } from "react";
import { CATEGORIES, PAYMENT_METHODS } from "@/lib/categories";
import type { TicketInput, TicketItem } from "@/types";

export const STATUSES = [
  { value: "REVIEW", label: "Per revisar" },
  { value: "CONFIRMED", label: "Confirmat" },
];

interface TicketFormProps {
  initialData: TicketInput;
  onSubmit: (data: TicketInput) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
  submitLabel?: string;
  saving?: boolean;
}

function emptyItem(): TicketItem {
  return { description: "", quantity: 1, unitPrice: null, totalPrice: null };
}

export default function TicketForm({
  initialData,
  onSubmit,
  onDelete,
  submitLabel = "Desar",
  saving = false,
}: TicketFormProps) {
  const [form, setForm] = useState<TicketInput>(initialData);

  useEffect(() => {
    setForm(initialData);
  }, [initialData]);

  function update<K extends keyof TicketInput>(key: K, value: TicketInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateItem(index: number, patch: Partial<TicketItem>) {
    setForm((f) => {
      const items = [...(f.items || [])];
      items[index] = { ...items[index], ...patch };
      return { ...f, items };
    });
  }

  function addItem() {
    setForm((f) => ({ ...f, items: [...(f.items || []), emptyItem()] }));
  }

  function removeItem(index: number) {
    setForm((f) => ({ ...f, items: (f.items || []).filter((_, i) => i !== index) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="merchant">Comerç</label>
          <input
            id="merchant"
            type="text"
            value={form.merchant || ""}
            onChange={(e) => update("merchant", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="date">Data</label>
          <input
            id="date"
            type="date"
            value={form.date || ""}
            onChange={(e) => update("date", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="totalAmount">Import total</label>
          <input
            id="totalAmount"
            type="number"
            step="0.01"
            value={form.totalAmount ?? ""}
            onChange={(e) => update("totalAmount", e.target.value === "" ? null : Number(e.target.value))}
          />
        </div>
        <div>
          <label htmlFor="currency">Moneda</label>
          <input
            id="currency"
            type="text"
            value={form.currency || "EUR"}
            onChange={(e) => update("currency", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="taxAmount">Import IVA</label>
          <input
            id="taxAmount"
            type="number"
            step="0.01"
            value={form.taxAmount ?? ""}
            onChange={(e) => update("taxAmount", e.target.value === "" ? null : Number(e.target.value))}
          />
        </div>
        <div>
          <label htmlFor="taxRate">% IVA</label>
          <input
            id="taxRate"
            type="number"
            step="0.01"
            value={form.taxRate ?? ""}
            onChange={(e) => update("taxRate", e.target.value === "" ? null : Number(e.target.value))}
          />
        </div>
        <div>
          <label htmlFor="category">Categoria</label>
          <select
            id="category"
            value={form.category || ""}
            onChange={(e) => update("category", e.target.value)}
          >
            <option value="">Sense categoria</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="paymentMethod">Forma de pagament</label>
          <select
            id="paymentMethod"
            value={form.paymentMethod || ""}
            onChange={(e) => update("paymentMethod", e.target.value)}
          >
            <option value="">No especificat</option>
            {PAYMENT_METHODS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="status">Estat</label>
          <select id="status" value={form.status || "REVIEW"} onChange={(e) => update("status", e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="notes">Notes</label>
        <textarea
          id="notes"
          rows={2}
          value={form.notes || ""}
          onChange={(e) => update("notes", e.target.value)}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="mb-0">Línies de producte</label>
          <button type="button" className="btn-secondary text-xs" onClick={addItem}>
            + Afegir línia
          </button>
        </div>
        {(form.items || []).length === 0 && (
          <p className="text-sm text-gray-500">No hi ha línies de producte.</p>
        )}
        <div className="space-y-2">
          {(form.items || []).map((item, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-5">
                {i === 0 && <label className="text-xs">Descripció</label>}
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => updateItem(i, { description: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                {i === 0 && <label className="text-xs">Quantitat</label>}
                <input
                  type="number"
                  step="0.01"
                  value={item.quantity ?? ""}
                  onChange={(e) =>
                    updateItem(i, { quantity: e.target.value === "" ? null : Number(e.target.value) })
                  }
                />
              </div>
              <div className="col-span-2">
                {i === 0 && <label className="text-xs">Preu unitari</label>}
                <input
                  type="number"
                  step="0.01"
                  value={item.unitPrice ?? ""}
                  onChange={(e) =>
                    updateItem(i, { unitPrice: e.target.value === "" ? null : Number(e.target.value) })
                  }
                />
              </div>
              <div className="col-span-2">
                {i === 0 && <label className="text-xs">Total línia</label>}
                <input
                  type="number"
                  step="0.01"
                  value={item.totalPrice ?? ""}
                  onChange={(e) =>
                    updateItem(i, { totalPrice: e.target.value === "" ? null : Number(e.target.value) })
                  }
                />
              </div>
              <div className="col-span-1">
                <button
                  type="button"
                  className="btn-secondary text-xs w-full"
                  onClick={() => removeItem(i)}
                  aria-label="Eliminar línia"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-2">
        <div>
          {onDelete && (
            <button type="button" className="btn-danger" onClick={() => onDelete()} disabled={saving}>
              Eliminar
            </button>
          )}
        </div>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Desant..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
