"use client";

import { useEffect, useState } from "react";
import { INVOICE_STATUSES, VAT_RATES, IRPF_RATES } from "@/lib/invoice-constants";
import { computeInvoiceTotals, emptyInvoiceItem, lineTotal } from "@/lib/invoice-calc";
import InvoiceAeatPanel from "@/components/InvoiceAeatPanel";
import InvoiceChecklist from "@/components/InvoiceChecklist";
import type { Client, InvoiceInput, InvoiceLineItem, InvoiceStatus } from "@/types";

interface InvoiceFormProps {
  initialData: InvoiceInput;
  clients: Client[];
  onSubmit: (data: InvoiceInput) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
  submitLabel?: string;
  saving?: boolean;
}

function formatAmount(n: number) {
  return new Intl.NumberFormat("ca-ES", { style: "currency", currency: "EUR" }).format(n);
}

export default function InvoiceForm({
  initialData,
  clients,
  onSubmit,
  onDelete,
  submitLabel = "Desar",
  saving = false,
}: InvoiceFormProps) {
  const [form, setForm] = useState<InvoiceInput>(initialData);
  const [pdfFile, setPdfFile] = useState<{ base64: string; mediaType: string } | null>(null);
  const [qrFile, setQrFile] = useState<{ base64: string; mediaType: string } | null>(null);

  useEffect(() => {
    setForm(initialData);
  }, [initialData]);

  function update<K extends keyof InvoiceInput>(key: K, value: InvoiceInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateItem(index: number, patch: Partial<InvoiceLineItem>) {
    setForm((f) => {
      const items = [...(f.items || [])];
      items[index] = { ...items[index], ...patch };
      return { ...f, items };
    });
  }

  function addItem() {
    setForm((f) => ({ ...f, items: [...(f.items || []), emptyInvoiceItem()] }));
  }

  function removeItem(index: number) {
    setForm((f) => ({ ...f, items: (f.items || []).filter((_, i) => i !== index) }));
  }

  function handleClientChange(clientId: string) {
    const client = clients.find((c) => c.id === clientId);
    setForm((f) => ({
      ...f,
      clientId: clientId || null,
      clientSnapshot: client
        ? {
            name: client.name,
            taxId: client.taxId,
            address: client.address,
            email: client.email,
            phone: client.phone,
          }
        : f.clientSnapshot,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: InvoiceInput = { ...form };
    if (pdfFile) {
      payload.aeatPdfBase64 = pdfFile.base64;
      payload.aeatPdfMediaType = pdfFile.mediaType;
    }
    if (qrFile) {
      payload.aeatQrBase64 = qrFile.base64;
      payload.aeatQrMediaType = qrFile.mediaType;
    }
    await onSubmit(payload);
  }

  const totals = computeInvoiceTotals(form.items || [], form.irpfRate);
  const snapshot = form.clientSnapshot;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div>
          <label htmlFor="number">Número de factura</label>
          <input
            id="number"
            type="text"
            value={form.number || ""}
            onChange={(e) => update("number", e.target.value)}
            placeholder="Es genera automàticament"
          />
        </div>
        <div>
          <label htmlFor="date">Data de factura</label>
          <input id="date" type="date" value={form.date || ""} onChange={(e) => update("date", e.target.value)} />
        </div>
        <div>
          <label htmlFor="dueDate">Data de venciment</label>
          <input
            id="dueDate"
            type="date"
            value={form.dueDate || ""}
            onChange={(e) => update("dueDate", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="status">Estat</label>
          <select id="status" value={form.status || "DRAFT"} onChange={(e) => update("status", e.target.value as InvoiceStatus)}>
            {INVOICE_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card space-y-3">
        <div>
          <label htmlFor="clientId">Client</label>
          <select id="clientId" value={form.clientId || ""} onChange={(e) => handleClientChange(e.target.value)}>
            <option value="">Selecciona un client...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.taxId ? `(${c.taxId})` : ""}
              </option>
            ))}
          </select>
        </div>
        {snapshot && (snapshot.name || snapshot.taxId) && (
          <div className="text-sm text-gray-600 bg-gray-50 rounded-md p-3 space-y-0.5">
            <p className="font-medium text-gray-800">{snapshot.name}</p>
            {snapshot.taxId && <p>NIF/CIF: {snapshot.taxId}</p>}
            {snapshot.address && <p>{snapshot.address}</p>}
            {(snapshot.email || snapshot.phone) && (
              <p>
                {snapshot.email} {snapshot.phone ? `· ${snapshot.phone}` : ""}
              </p>
            )}
          </div>
        )}
        {clients.length === 0 && (
          <p className="text-xs text-gray-500">
            No tens cap client creat. Crea&apos;n un primer a la secció Clients.
          </p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="mb-0">Línies de factura</label>
          <button type="button" className="btn-secondary text-xs" onClick={addItem}>
            + Afegir línia
          </button>
        </div>
        {(form.items || []).length === 0 && (
          <p className="text-sm text-gray-500">No hi ha línies. Afegeix-ne una.</p>
        )}
        <div className="space-y-2">
          {(form.items || []).map((item, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-12 sm:col-span-5">
                {i === 0 && <label className="text-xs">Descripció</label>}
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => updateItem(i, { description: e.target.value })}
                  required
                />
              </div>
              <div className="col-span-3 sm:col-span-2">
                {i === 0 && <label className="text-xs">Quantitat</label>}
                <input
                  type="number"
                  step="0.01"
                  value={item.quantity ?? ""}
                  onChange={(e) => updateItem(i, { quantity: e.target.value === "" ? 0 : Number(e.target.value) })}
                />
              </div>
              <div className="col-span-3 sm:col-span-2">
                {i === 0 && <label className="text-xs">Preu unitari</label>}
                <input
                  type="number"
                  step="0.01"
                  value={item.unitPrice ?? ""}
                  onChange={(e) => updateItem(i, { unitPrice: e.target.value === "" ? 0 : Number(e.target.value) })}
                />
              </div>
              <div className="col-span-3 sm:col-span-1">
                {i === 0 && <label className="text-xs">% IVA</label>}
                <select value={item.vatRate} onChange={(e) => updateItem(i, { vatRate: Number(e.target.value) })}>
                  {VAT_RATES.map((r) => (
                    <option key={r} value={r}>
                      {r}%
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2 sm:col-span-1">
                {i === 0 && <label className="text-xs">Total</label>}
                <p className="text-sm py-2 text-right pr-1">{formatAmount(lineTotal(item))}</p>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="irpfRate">% Retenció IRPF</label>
          <select
            id="irpfRate"
            value={form.irpfRate ?? 15}
            onChange={(e) => update("irpfRate", Number(e.target.value))}
          >
            {IRPF_RATES.map((r) => (
              <option key={r} value={r}>
                {r}%
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="notes">Notes / observacions</label>
          <input id="notes" type="text" value={form.notes || ""} onChange={(e) => update("notes", e.target.value)} />
        </div>
      </div>

      <div className="card bg-gray-50 space-y-1 text-sm">
        <div className="flex justify-between">
          <span>Base imposable</span>
          <span className="font-medium">{formatAmount(totals.baseImposable)}</span>
        </div>
        {Object.entries(totals.vatByRate).map(([rate, amount]) => (
          <div key={rate} className="flex justify-between text-gray-600">
            <span>IVA ({rate}%)</span>
            <span>{formatAmount(amount)}</span>
          </div>
        ))}
        <div className="flex justify-between">
          <span>Total IVA</span>
          <span className="font-medium">{formatAmount(totals.vatTotal)}</span>
        </div>
        <div className="flex justify-between text-red-600">
          <span>Retenció IRPF ({form.irpfRate ?? 0}%)</span>
          <span>−{formatAmount(totals.irpfAmount)}</span>
        </div>
        <div className="flex justify-between text-base font-semibold pt-1 border-t border-gray-200">
          <span>Total factura</span>
          <span>{formatAmount(totals.total)}</span>
        </div>
      </div>

      <div className="card">
        <InvoiceAeatPanel
          aeat={form.aeat || { status: "PENDING" }}
          onChange={(aeat) => update("aeat", aeat)}
          onPdfSelected={(base64, mediaType) => setPdfFile({ base64, mediaType })}
          onQrSelected={(base64, mediaType) => setQrFile({ base64, mediaType })}
        />
      </div>

      <div className="card">
        <InvoiceChecklist
          checklist={
            form.checklist || {
              createdInApp: true,
              dataEnteredAeat: false,
              aeatPdfSaved: false,
              sentToClient: false,
              paid: false,
            }
          }
          onChange={(checklist) => update("checklist", checklist)}
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
