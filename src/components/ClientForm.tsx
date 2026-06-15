"use client";

import { useEffect, useState } from "react";
import type { ClientInput } from "@/types";

interface ClientFormProps {
  initialData: ClientInput;
  onSubmit: (data: ClientInput) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
  submitLabel?: string;
  saving?: boolean;
}

export default function ClientForm({
  initialData,
  onSubmit,
  onDelete,
  submitLabel = "Desar",
  saving = false,
}: ClientFormProps) {
  const [form, setForm] = useState<ClientInput>(initialData);

  useEffect(() => {
    setForm(initialData);
  }, [initialData]);

  function update<K extends keyof ClientInput>(key: K, value: ClientInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label htmlFor="name">Nom / Raó social</label>
          <input
            id="name"
            type="text"
            value={form.name || ""}
            onChange={(e) => update("name", e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="taxId">NIF / CIF</label>
          <input
            id="taxId"
            type="text"
            value={form.taxId || ""}
            onChange={(e) => update("taxId", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={form.email || ""}
            onChange={(e) => update("email", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="phone">Telèfon</label>
          <input
            id="phone"
            type="text"
            value={form.phone || ""}
            onChange={(e) => update("phone", e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="address">Adreça</label>
          <input
            id="address"
            type="text"
            value={form.address || ""}
            onChange={(e) => update("address", e.target.value)}
          />
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
