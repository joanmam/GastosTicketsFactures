"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import { apiFetch, apiJson } from "@/lib/api-client";
import { CATEGORIES } from "@/lib/categories";
import type { Ticket } from "@/types";

function formatAmount(amount: number | null | undefined, currency?: string) {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("ca-ES", { style: "currency", currency: currency || "EUR" }).format(amount);
}

function TicketsPageContent() {
  const searchParams = useSearchParams();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [from, setFrom] = useState(() => searchParams.get("from") || "");
  const [to, setTo] = useState(() => searchParams.get("to") || "");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (category) params.set("category", category);
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const data = await apiJson<{ tickets: Ticket[] }>(`/api/tickets?${params.toString()}`);
      setTickets(data.tickets);
    } catch (err: any) {
      setError(err?.message || "Error carregant els tickets.");
    } finally {
      setLoading(false);
    }
  }, [search, category, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleExport() {
    setExporting(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (category) params.set("category", category);
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const res = await apiFetch(`/api/export?${params.toString()}`);
      if (!res.ok) throw new Error("Error generant l'Excel.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tickets_${new Date().toISOString().slice(0, 10)}.xlsx`;
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

  const total = tickets.reduce((sum, t) => sum + (t.totalAmount || 0), 0);

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-xl font-semibold text-gray-900">Tickets</h1>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={handleExport} disabled={exporting}>
              {exporting ? "Generant..." : "⬇️ Exportar a Excel"}
            </button>
            <Link href="/tickets/new" className="btn-primary">
              + Nou ticket
            </Link>
          </div>
        </div>

        <div className="card grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label htmlFor="search">Cerca</label>
            <input
              id="search"
              type="text"
              placeholder="Comerç o notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="category">Categoria</label>
            <select id="category" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Totes</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="from">Des de</label>
            <input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label htmlFor="to">Fins a</label>
            <input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {loading ? (
          <p className="text-sm text-gray-500">Carregant...</p>
        ) : tickets.length === 0 ? (
          <div className="card text-center text-sm text-gray-500">No s'ha trobat cap ticket.</div>
        ) : (
          <div className="card overflow-x-auto p-0">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-4 py-2 font-medium">Data</th>
                  <th className="px-4 py-2 font-medium">Comerç</th>
                  <th className="px-4 py-2 font-medium">Categoria</th>
                  <th className="px-4 py-2 font-medium text-right">Import</th>
                  <th className="px-4 py-2 font-medium">Usuari</th>
                  <th className="px-4 py-2 font-medium">Estat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 cursor-pointer">
                    <td className="px-0">
                      <Link href={`/tickets/${t.id}`} className="flex">
                        <span className="px-4 py-2 block w-full whitespace-nowrap">{t.date || "—"}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-2">
                      <Link href={`/tickets/${t.id}`}>{t.merchant || "—"}</Link>
                    </td>
                    <td className="px-4 py-2">
                      <Link href={`/tickets/${t.id}`}>{t.category || "—"}</Link>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Link href={`/tickets/${t.id}`}>{formatAmount(t.totalAmount, t.currency)}</Link>
                    </td>
                    <td className="px-4 py-2">
                      <Link href={`/tickets/${t.id}`}>{t.userName || "—"}</Link>
                    </td>
                    <td className="px-4 py-2">
                      <Link href={`/tickets/${t.id}`}>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                            t.status === "CONFIRMED"
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {t.status === "CONFIRMED" ? "Confirmat" : "Per revisar"}
                        </span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 font-medium">
                  <td className="px-4 py-2" colSpan={3}>
                    Total
                  </td>
                  <td className="px-4 py-2 text-right">{formatAmount(total, tickets[0]?.currency)}</td>
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

export default function TicketsPage() {
  return (
    <AuthGuard>
      <TicketsPageContent />
    </AuthGuard>
  );
}
