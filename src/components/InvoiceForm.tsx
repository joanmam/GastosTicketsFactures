"use client";

import { useEffect, useState } from "react";
import { INVOICE_STATUSES, INVOICE_TYPES, VAT_RATES, IRPF_RATES } from "@/lib/invoice-constants";
import { computeInvoiceTotals, emptyInvoiceItem, lineTotal } from "@/lib/invoice-calc";
import InvoiceAeatPanel from "@/components/InvoiceAeatPanel";
import InvoiceChecklist from "@/components/InvoiceChecklist";
import { apiJson } from "@/lib/api-client";
import type { Client, Invoice, InvoiceInput, InvoiceLineItem, InvoiceStatus, InvoiceType, LineItemCatalogEntry } from "@/types";

interface InvoiceFormProps {
  initialData: InvoiceInput;
  clients: Client[];
  onSubmit: (data: InvoiceInput) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
  submitLabel?: string;
  saving?: boolean;
  currentId?: string;
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
  currentId,
}: InvoiceFormProps) {
  const [form, setForm] = useState<InvoiceInput>(initialData);
  const [pdfFile, setPdfFile] = useState<{ base64: string; mediaType: string } | null>(null);
  const [qrFile, setQrFile] = useState<{ base64: string; mediaType: string } | null>(null);
  const [catalog, setCatalog] = useState<LineItemCatalogEntry[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    setForm(initialData);
  }, [initialData]);

  useEffect(() => {
    apiJson<{ items: LineItemCatalogEntry[] }>("/api/line-items")
      .then((d) => setCatalog(d.items))
      .catch(() => {});
  }, []);

  useEffect(() => {
    apiJson<{ invoices: Invoice[] }>("/api/invoices")
      .then((d) => setInvoices(d.invoices))
      .catch(() => {});
  }, []);

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

  function handleDescriptionChange(index: number, description: string) {
    const match = catalog.find((c) => (c.description || "").toLowerCase() === description.toLowerCase());
    if (match) {
      updateItem(index, {
        description,
        unitPrice: match.unitPrice ?? 0,
        vatRate: match.vatRate ?? 21,
      });
    } else {
      updateItem(index, { description });
    }
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
  const isLocked =
    form.checklist?.dataEnteredAeat === true ||
    ["SENT", "PAID", "OVERDUE"].includes(form.status || "");

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Banner de bloqueig */}
      {isLocked && (
        <div className="rounded-md bg-amber-50 border border-amber-300 px-4 py-3 flex items-center gap-2 text-sm text-amber-800">
          <span className="text-base">🔒</span>
          <span>
            Factura <strong>bloquejada</strong> — registrada a l&apos;AEAT o ja enviada al client. El contingut no es pot modificar.
            Pots canviar l&apos;estat, el panell AEAT i el checklist.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
        <div>
          <label htmlFor="number">Número de factura</label>
          <input
            id="number"
            type="text"
            value={form.number || ""}
            onChange={(e) => update("number", e.target.value)}
            placeholder="Es genera automàticament"
            readOnly={isLocked}
            className={isLocked ? "bg-gray-50 text-gray-500 cursor-not-allowed" : ""}
          />
        </div>
        <div>
          <label htmlFor="date">Data de factura</label>
          <input
            id="date"
            type="date"
            value={form.date || ""}
            onChange={(e) => update("date", e.target.value)}
            readOnly={isLocked}
            className={isLocked ? "bg-gray-50 text-gray-500 cursor-not-allowed" : ""}
          />
        </div>
        <div>
          <label htmlFor="dueDate">Data de venciment</label>
          <input
            id="dueDate"
            type="date"
            value={form.dueDate || ""}
            onChange={(e) => update("dueDate", e.target.value)}
            readOnly={isLocked}
            className={isLocked ? "bg-gray-50 text-gray-500 cursor-not-allowed" : ""}
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
        <div>
          <label htmlFor="invoiceType">Tipus de factura</label>
          <select
            id="invoiceType"
            value={form.invoiceType || "ORDINARY"}
            onChange={(e) => update("invoiceType", e.target.value as InvoiceType)}
            disabled={isLocked}
            className={isLocked ? "bg-gray-50 text-gray-500 cursor-not-allowed" : ""}
          >
            {INVOICE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {form.invoiceType === "RECTIFYING" && (
        <div className="card space-y-3 border-yellow-200 bg-yellow-50">
          <h3 className="font-semibold text-gray-900">Dades de la rectificació</h3>
          <div>
            <label htmlFor="rectifiesInvoiceId">Factura que rectifica</label>
            <select
              id="rectifiesInvoiceId"
              value={form.rectifiesInvoiceId || ""}
              onChange={(e) => update("rectifiesInvoiceId", e.target.value || null)}
              disabled={isLocked}
              className={isLocked ? "bg-gray-50 text-gray-500 cursor-not-allowed" : ""}
            >
              <option value="">Selecciona la factura original...</option>
              {invoices
                .filter((i) => i.id !== currentId)
                .map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.number} {i.clientSnapshot?.name ? `— ${i.clientSnapshot.name}` : ""} ({i.date})
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label htmlFor="rectificationReason">Motiu de la rectificació</label>
            <textarea
              id="rectificationReason"
              rows={2}
              value={form.rectificationReason || ""}
              onChange={(e) => update("rectificationReason", e.target.value)}
              placeholder="Ex: error en l'import, canvi de dades del client, devolució parcial..."
              readOnly={isLocked}
              className={isLocked ? "bg-gray-50 text-gray-500 cursor-not-allowed" : ""}
            />
          </div>
        </div>
      )}

      <div className="card space-y-3">
        <div>
          <label htmlFor="clientId">Client</label>
          <select
            id="clientId"
            value={form.clientId || ""}
            onChange={(e) => handleClientChange(e.target.value)}
            disabled={isLocked}
            className={isLocked ? "bg-gray-50 text-gray-500 cursor-not-allowed" : ""}
          >
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
          {!isLocked && (
            <button type="button" className="btn-secondary text-xs" onClick={addItem}>
              + Afegir línia
            </button>
          )}
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
                  onChange={(e) => handleDescriptionChange(i, e.target.value)}
                  list={isLocked ? undefined : "line-item-catalog"}
                  required
                  readOnly={isLocked}
                  className={isLocked ? "bg-gray-50 text-gray-500 cursor-not-allowed" : ""}
                />
              </div>
              <div className="col-span-3 sm:col-span-2">
                {i === 0 && <label className="text-xs">Quantitat</label>}
                <input
                  type="number"
                  step="0.01"
                  value={item.quantity ?? ""}
                  onChange={(e) => updateItem(i, { quantity: e.target.value === "" ? 0 : Number(e.target.value) })}
                  readOnly={isLocked}
                  className={isLocked ? "bg-gray-50 text-gray-500 cursor-not-allowed" : ""}
                />
              </div>
              <div className="col-span-3 sm:col-span-2">
                {i === 0 && <label className="text-xs">Preu unitari</label>}
                <input
                  type="number"
                  step="0.01"
                  value={item.unitPrice ?? ""}
                  onChange={(e) => updateItem(i, { unitPrice: e.target.value === "" ? 0 : Number(e.target.value) })}
                  readOnly={isLocked}
                  className={isLocked ? "bg-gray-50 text-gray-500 cursor-not-allowed" : ""}
                />
              </div>
              <div className="col-span-3 sm:col-span-1">
                {i === 0 && <label className="text-xs">% IVA</label>}
                <select
                  value={item.vatRate}
                  onChange={(e) => updateItem(i, { vatRate: Number(e.target.value) })}
                  disabled={isLocked}
                  className={isLocked ? "bg-gray-50 text-gray-500 cursor-not-allowed" : ""}
                >
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
                {!isLocked && (
                  <button
                    type="button"
                    className="btn-secondary text-xs w-full"
                    onClick={() => removeItem(i)}
                    aria-label="Eliminar línia"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        {!isLocked && (
          <datalist id="line-item-catalog">
            {catalog.map((c) => (
              <option key={c.id} value={c.description || ""} />
            ))}
          </datalist>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="irpfRate">% Retenció IRPF</label>
          <select
            id="irpfRate"
            value={form.irpfRate ?? 15}
            onChange={(e) => update("irpfRate", Number(e.target.value))}
            disabled={isLocked}
            className={isLocked ? "bg-gray-50 text-gray-500 cursor-not-allowed" : ""}
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
          <input
            id="notes"
            type="text"
            value={form.notes || ""}
            onChange={(e) => update("notes", e.target.value)}
            readOnly={isLocked}
            className={isLocked ? "bg-gray-50 text-gray-500 cursor-not-allowed" : ""}
          />
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
          {onDelete && !isLocked && (
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
