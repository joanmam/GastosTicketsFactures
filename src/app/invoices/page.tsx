"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import { apiFetch, apiJson } from "@/lib/api-client";
import { AEAT_STATUS_LABEL, INVOICE_STATUSES, INVOICE_STATUS_COLOR, INVOICE_STATUS_LABEL } from "@/lib/invoice-constants";
import { computeInvoiceTotals } from "@/lib/invoice-calc";
import type { Client, Invoice, InvoiceStatus, AeatStatus } from "@/types";

function formatAmount(amount: number) {
  return new Intl.NumberFormat("ca-ES", { style: "currency", currency: "EUR" }).format(amount);
}

function InvoicesPageContent() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [clientId, setClientId] = useState("");
  const [quarter, setQuarter] = useState("");

  const currentYear = new Date().getFullYear();
  const quarterOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    for (const y of [currentYear - 1, currentYear, currentYear + 1]) {
      for (const q of [1, 2, 3, 4]) {
        opts.push({ value: `${y}-${q}`, label: `T${q} ${y}` });
      }
    }
    return opts;
  }, [currentYear]);

  useEffect(() => {
    apiJson<{ clients: Client[] }>("/api/clients")
      .then((d) => setClients(d.clients))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      if (clientId) params.set("clientId", clientId);
      if (quarter) params.set("quarter", quarter);

      const data = await apiJson<{ invoices: Invoice[] }>(`/api/invoices?${params.toString()}`);
      setInvoices(data.invoices);
    } catch (err: any) {
      setError(err?.message || "Error carregant les factures.");
    } finally {
      setLoading(false);
    }
  }, [search, status, clientId, quarter]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleExport() {
    setExporting(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      if (clientId) params.set("clientId", clientId);
      if (quarter) params.set("quarter", quarter);

      const res = await apiFetch(`/api/invoices/export?${params.toString()}`);
      if (!res.ok) throw new Error("Error generant l'Excel.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `factures_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.message || "Error exportant les dades.");
    } finally {
      setExporting(false);
    }
  }

  const pendingAeatCount = invoices.filter((i) => i.aeat?.status === "PENDING").length;
  const total = invoices.reduce((sum, i) => sum + computeInvoiceTotals(i.items || [], i.irpfRate).total, 0);

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-xl font-semibold text-gray-900">Factures</h1>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={handleExport} disabled={exporting}>
              {exporting ? "Generant..." : "⬇️ Exportar a Excel"}
            </button>
            <Link href="/invoices/new" className="btn-primary">
              + Nova factura
            </Link>
          </div>
        </div>

        {pendingAeatCount > 0 && (
          <div className="rounded-md border border-yellow-200 bg-yellow-50 text-yellow-800 text-sm px-4 py-2">
            ⚠️ Tens {pendingAeatCount} factura{pendingAeatCount > 1 ? "s" : ""} pendent
            {pendingAeatCount > 1 ? "s" : ""} de generar a la AEAT.
          </div>
        )}

        <div className="card grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label htmlFor="search">Cerca</label>
            <input
              id="search"
              type="text"
              placeholder="Número, client, notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="status">Estat</label>
            <select id="status" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Tots</option>
              {INVOICE_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="clientId">Client</label>
            <select id="clientId" value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">Tots</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="quarter">Trimestre</label>
            <select id="quarter" value={quarter} onChange={(e) => setQuarter(e.target.value)}>
              <option value="">Tots</option>
              {quarterOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {loading ? (
          <p className="text-sm text-gray-500">Carregant...</p>
        ) : invoices.length === 0 ? (
          <div className="card text-center text-sm text-gray-500">No s&apos;ha trobat cap factura.</div>
        ) : (
          <div className="card overflow-x-auto p-0">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-4 py-2 font-medium">Número</th>
                  <th className="px-4 py-2 font-medium">Data</th>
                  <th className="px-4 py-2 font-medium">Client</th>
                  <th className="px-4 py-2 font-medium text-right">Total</th>
                  <th className="px-4 py-2 font-medium">Venciment</th>
                  <th className="px-4 py-2 font-medium">Estat</th>
                  <th className="px-4 py-2 font-medium">AEAT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((inv) => {
                  const totals = computeInvoiceTotals(inv.items || [], inv.irpfRate);
                  const aeatStatus = (inv.aeat?.status || "PENDING") as AeatStatus;
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50 cursor-pointer">
                      <td className="px-0">
                        <Link href={`/invoices/${inv.id}`} className="flex">
                          <span className="px-4 py-2 block w-full whitespace-nowrap font-medium text-gray-900">
                            {inv.number || "—"}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-2">
                        <Link href={`/invoices/${inv.id}`}>{inv.date || "—"}</Link>
                      </td>
                      <td className="px-4 py-2">
                        <Link href={`/invoices/${inv.id}`}>{inv.clientSnapshot?.name || "—"}</Link>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Link href={`/invoices/${inv.id}`}>{formatAmount(totals.total)}</Link>
                      </td>
                      <td className="px-4 py-2">
                        <Link href={`/invoices/${inv.id}`}>{inv.dueDate || "—"}</Link>
                      </td>
                      <td className="px-4 py-2">
                        <Link href={`/invoices/${inv.id}`}>
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                              INVOICE_STATUS_COLOR[(inv.status || "DRAFT") as InvoiceStatus]
                            }`}
                          >
                            {INVOICE_STATUS_LABEL[(inv.status || "DRAFT") as InvoiceStatus]}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-2">
                        <Link href={`/invoices/${inv.id}`} title={AEAT_STATUS_LABEL[aeatStatus]}>
                          {aeatStatus === "PENDING" ? "⚠️" : aeatStatus === "OBTAINED" ? "✅" : "📤"}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 font-medium">
                  <td className="px-4 py-2" colSpan={3}>
                    Total
                  </td>
                  <td className="px-4 py-2 text-right">{formatAmount(total)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </main>
    </>
  );
}

export default function InvoicesPage() {
  return (
    <AuthGuard>
      <InvoicesPageContent />
    </AuthGuard>
  );
}
