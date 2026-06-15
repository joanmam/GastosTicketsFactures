"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import { apiJson } from "@/lib/api-client";
import { QUOTE_STATUSES, QUOTE_STATUS_COLOR, QUOTE_STATUS_LABEL } from "@/lib/invoice-constants";
import { computeInvoiceTotals } from "@/lib/invoice-calc";
import type { Client, Quote, QuoteStatus } from "@/types";

function formatAmount(amount: number) {
  return new Intl.NumberFormat("ca-ES", { style: "currency", currency: "EUR" }).format(amount);
}

function PressupostosPageContent() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [clientId, setClientId] = useState("");

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

      const data = await apiJson<{ quotes: Quote[] }>(`/api/quotes?${params.toString()}`);
      setQuotes(data.quotes);
    } catch (err: any) {
      setError(err?.message || "Error carregant els pressupostos.");
    } finally {
      setLoading(false);
    }
  }, [search, status, clientId]);

  useEffect(() => {
    load();
  }, [load]);

  const total = quotes.reduce((sum, q) => sum + computeInvoiceTotals(q.items || [], q.irpfRate).total, 0);

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-xl font-semibold text-gray-900">Pressupostos</h1>
          <Link href="/pressupostos/new" className="btn-primary">
            + Nou pressupost
          </Link>
        </div>

        <div className="card grid grid-cols-1 sm:grid-cols-3 gap-3">
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
              {QUOTE_STATUSES.map((s) => (
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
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {loading ? (
          <p className="text-sm text-gray-500">Carregant...</p>
        ) : quotes.length === 0 ? (
          <div className="card text-center text-sm text-gray-500">No s&apos;ha trobat cap pressupost.</div>
        ) : (
          <div className="card overflow-x-auto p-0">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-4 py-2 font-medium">Número</th>
                  <th className="px-4 py-2 font-medium">Data</th>
                  <th className="px-4 py-2 font-medium">Client</th>
                  <th className="px-4 py-2 font-medium text-right">Total</th>
                  <th className="px-4 py-2 font-medium">Vàlid fins a</th>
                  <th className="px-4 py-2 font-medium">Estat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {quotes.map((q) => {
                  const totals = computeInvoiceTotals(q.items || [], q.irpfRate);
                  return (
                    <tr key={q.id} className="hover:bg-gray-50 cursor-pointer">
                      <td className="px-0">
                        <Link href={`/pressupostos/${q.id}`} className="flex">
                          <span className="px-4 py-2 block w-full whitespace-nowrap font-medium text-gray-900">
                            {q.number || "—"}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-2">
                        <Link href={`/pressupostos/${q.id}`}>{q.date || "—"}</Link>
                      </td>
                      <td className="px-4 py-2">
                        <Link href={`/pressupostos/${q.id}`}>{q.clientSnapshot?.name || "—"}</Link>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Link href={`/pressupostos/${q.id}`}>{formatAmount(totals.total)}</Link>
                      </td>
                      <td className="px-4 py-2">
                        <Link href={`/pressupostos/${q.id}`}>{q.validUntil || "—"}</Link>
                      </td>
                      <td className="px-4 py-2">
                        <Link href={`/pressupostos/${q.id}`}>
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                              QUOTE_STATUS_COLOR[(q.status || "DRAFT") as QuoteStatus]
                            }`}
                          >
                            {QUOTE_STATUS_LABEL[(q.status || "DRAFT") as QuoteStatus]}
                          </span>
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
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </main>
    </>
  );
}

export default function PressupostosPage() {
  return (
    <AuthGuard>
      <PressupostosPageContent />
    </AuthGuard>
  );
}
