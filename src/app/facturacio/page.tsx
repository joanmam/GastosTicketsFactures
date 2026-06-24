"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import { apiJson } from "@/lib/api-client";
import { AEAT_STATUS_LABEL, INVOICE_STATUS_LABEL } from "@/lib/invoice-constants";
import type { AeatStatus, InvoiceStatus } from "@/types";

interface QuarterSummary {
  quarter: number;
  invoiceCount: number;
  baseImposable: number;
  vatByRate: Record<string, number>;
  vatTotal: number;
  irpfAmount: number;
  total: number;
  ticketExpenses: number;
  purchaseExpenses: number;
  expenses: number;
  balance: number;
  ivaSuportat: number;
  ivaRepercutit: number;
  ivaBalance: number;
}

function quarterDateRange(year: number, q: number) {
  const ranges = [
    { from: `${year}-01-01`, to: `${year}-03-31` },
    { from: `${year}-04-01`, to: `${year}-06-30` },
    { from: `${year}-07-01`, to: `${year}-09-30` },
    { from: `${year}-10-01`, to: `${year}-12-31` },
  ];
  return ranges[q - 1];
}

interface Totals {
  baseImposable: number;
  vatTotal: number;
  irpfAmount: number;
  total: number;
  expenses: number;
  balance: number;
  ivaSuportat: number;
  ivaRepercutit: number;
  ivaBalance: number;
}

interface PendingPaymentItem {
  id: string;
  number?: string | null;
  client?: string | null;
  total: number;
  dueDate?: string | null;
  status?: string | null;
}

interface PendingAeatItem {
  id: string;
  number?: string | null;
  client?: string | null;
  date?: string | null;
}

interface PendingSendItem {
  id: string;
  number?: string | null;
  client?: string | null;
  aeatStatus?: string | null;
}

interface SummaryResponse {
  year: number;
  quarters: QuarterSummary[];
  totals: Totals;
  pendingPayment: PendingPaymentItem[];
  pendingAeat: PendingAeatItem[];
  pendingSendClient: PendingSendItem[];
}

function formatAmount(n: number) {
  return new Intl.NumberFormat("ca-ES", { style: "currency", currency: "EUR" }).format(n);
}

function DashboardContent() {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedQ, setExpandedQ] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiJson<SummaryResponse>(`/api/invoices/summary?year=${year}`);
      setData(res);
    } catch (err: any) {
      setError(err?.message || "Error carregant el resum.");
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    load();
  }, [load]);

  const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

  const maxScale = data
    ? Math.max(1, ...data.quarters.map((q) => Math.max(q.baseImposable, q.expenses)))
    : 1;

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-xl font-semibold text-gray-900">Resum de facturació</h1>
          <div>
            <label htmlFor="year" className="sr-only">Any</label>
            <select id="year" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-auto">
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {loading || !data ? (
          <p className="text-sm text-gray-500">Carregant...</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {data.quarters.map((q) => (
                <div key={q.quarter} className="card space-y-2">
                  <h2 className="text-sm font-medium text-gray-500 uppercase">
                    T{q.quarter} {data.year}
                  </h2>
                  <div className="text-2xl font-semibold text-gray-900">{formatAmount(q.baseImposable)}</div>
                  <p className="text-xs text-gray-500">Base imposable (Model 130)</p>

                  <div className="text-sm pt-2 space-y-0.5 border-t border-gray-100">
                    {Object.entries(q.vatByRate).map(([rate, amount]) => (
                      <div key={rate} className="flex justify-between text-gray-600">
                        <span>IVA ({rate}%)</span>
                        <span>{formatAmount(amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-medium">
                      <span>IVA total (Model 303)</span>
                      <span>{formatAmount(q.vatTotal)}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>IRPF retingut</span>
                      <span>−{formatAmount(q.irpfAmount)}</span>
                    </div>
                    <div className="flex justify-between font-semibold pt-1 border-t border-gray-100">
                      <span>Total facturat</span>
                      <span>{formatAmount(q.total)}</span>
                    </div>
                  </div>

                  <div className="text-sm pt-2 space-y-0.5 border-t border-gray-100">
                    <div className="flex justify-between text-gray-600">
                      <span>Despeses</span>
                      <span>−{formatAmount(q.expenses)}</span>
                    </div>
                    <div className={`flex justify-between font-semibold ${q.balance >= 0 ? "text-green-700" : "text-red-600"}`}>
                      <span>Balanç</span>
                      <span>{formatAmount(q.balance)}</span>
                    </div>
                  </div>

                  {/* Model 303 — IVA */}
                  <div className="text-sm pt-2 space-y-0.5 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Model 303 (IVA)</p>
                    <div className="flex justify-between text-gray-600">
                      <span>IVA repercutit</span>
                      <span className="text-green-700">+{formatAmount(q.ivaRepercutit)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>IVA suportat</span>
                      <span className="text-orange-600">−{formatAmount(q.ivaSuportat)}</span>
                    </div>
                    <div className={`flex justify-between font-semibold pt-0.5 border-t border-gray-100 ${q.ivaBalance >= 0 ? "text-red-600" : "text-green-700"}`}>
                      <span>{q.ivaBalance >= 0 ? "A pagar" : "A retornar"}</span>
                      <span>{formatAmount(Math.abs(q.ivaBalance))}</span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-400">{q.invoiceCount} factura{q.invoiceCount !== 1 ? "s" : ""}</p>
                </div>
              ))}
            </div>

            <div className="card space-y-3">
              <h2 className="text-sm font-medium text-gray-500 uppercase">Total anual {data.year}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">Base imposable</p>
                  <p className="font-semibold text-gray-900">{formatAmount(data.totals.baseImposable)}</p>
                </div>
                <div>
                  <p className="text-gray-500">IVA total</p>
                  <p className="font-semibold text-gray-900">{formatAmount(data.totals.vatTotal)}</p>
                </div>
                <div>
                  <p className="text-gray-500">IRPF retingut</p>
                  <p className="font-semibold text-red-600">−{formatAmount(data.totals.irpfAmount)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Total facturat</p>
                  <p className="font-semibold text-gray-900">{formatAmount(data.totals.total)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Despeses</p>
                  <p className="font-semibold text-gray-900">−{formatAmount(data.totals.expenses)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Balanç</p>
                  <p className={`font-semibold ${data.totals.balance >= 0 ? "text-green-700" : "text-red-600"}`}>
                    {formatAmount(data.totals.balance)}
                  </p>
                </div>
              </div>
              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Model 303 (IVA anual)</p>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">IVA repercutit</p>
                    <p className="font-semibold text-green-700">+{formatAmount(data.totals.ivaRepercutit)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">IVA suportat</p>
                    <p className="font-semibold text-orange-600">−{formatAmount(data.totals.ivaSuportat)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">{data.totals.ivaBalance >= 0 ? "Total a pagar" : "Total a retornar"}</p>
                    <p className={`font-semibold ${data.totals.ivaBalance >= 0 ? "text-red-600" : "text-green-700"}`}>
                      {formatAmount(Math.abs(data.totals.ivaBalance))}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card space-y-3">
              <h2 className="text-sm font-medium text-gray-500 uppercase">Ingressos vs. despeses per trimestre</h2>
              <div className="space-y-3">
                {data.quarters.map((q) => {
                  const qKey = `${data.year}-${q.quarter}`;
                  const { from, to } = quarterDateRange(data.year, q.quarter);
                  const isExpanded = expandedQ === q.quarter;
                  return (
                    <div key={q.quarter} className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>T{q.quarter}</span>
                        <span>{formatAmount(q.baseImposable)} / −{formatAmount(q.expenses)}</span>
                      </div>
                      <div className="flex h-3">
                        <button
                          className="bg-brand-500 hover:bg-brand-600 rounded-sm transition-colors cursor-pointer h-full"
                          style={{ width: `${(q.baseImposable / maxScale) * 100}%`, minWidth: q.baseImposable > 0 ? "4px" : "0" }}
                          title={`Ingressos T${q.quarter}: ${formatAmount(q.baseImposable)} — clic per veure factures`}
                          onClick={() => router.push(`/invoices?quarter=${qKey}`)}
                        />
                      </div>
                      <div className="flex h-3">
                        <button
                          className={`rounded-sm transition-colors cursor-pointer h-full ${isExpanded ? "bg-red-400" : "bg-red-300 hover:bg-red-400"}`}
                          style={{ width: `${(q.expenses / maxScale) * 100}%`, minWidth: q.expenses > 0 ? "4px" : "0" }}
                          title={`Despeses T${q.quarter}: ${formatAmount(q.expenses)} — clic per veure detall`}
                          onClick={() => setExpandedQ(isExpanded ? null : q.quarter)}
                        />
                      </div>
                      {isExpanded && (
                        <div className="rounded-md bg-gray-50 border border-gray-200 p-2 text-xs space-y-1.5 mt-1">
                          <div className="flex justify-between items-center">
                            <button
                              className="text-brand-700 hover:underline text-left"
                              onClick={() => router.push(`/tickets?from=${from}&to=${to}`)}
                            >
                              🧾 Tickets (rebuts escanejats)
                            </button>
                            <span className="text-gray-600 font-medium">−{formatAmount(q.ticketExpenses)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <button
                              className="text-brand-700 hover:underline text-left"
                              onClick={() => router.push(`/compres?from=${from}&to=${to}`)}
                            >
                              🛒 Compres amb targeta
                            </button>
                            <span className="text-gray-600 font-medium">−{formatAmount(q.purchaseExpenses)}</span>
                          </div>
                          <div className="flex justify-between items-center border-t border-gray-200 pt-1">
                            <span className="text-gray-500">Total despeses T{q.quarter}</span>
                            <span className="font-semibold text-red-600">−{formatAmount(q.expenses)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-4 text-xs text-gray-500 pt-1">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-sm bg-brand-500" /> Ingressos (clic → factures)
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-sm bg-red-300" /> Despeses (clic → detall)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="card space-y-2">
                <h2 className="text-sm font-medium text-gray-500 uppercase">Pendents de cobrament</h2>
                {data.pendingPayment.length === 0 ? (
                  <p className="text-sm text-gray-500">Cap factura pendent de cobrament.</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {data.pendingPayment.map((i) => (
                      <li key={i.id} className="flex justify-between">
                        <Link href={`/invoices/${i.id}`} className="text-brand-700 hover:underline">
                          {i.number} — {i.client || "—"}
                        </Link>
                        <span className="text-gray-600">
                          {formatAmount(i.total)}
                          {i.status && (
                            <span className="text-gray-400">
                              {" "}
                              ({INVOICE_STATUS_LABEL[i.status as InvoiceStatus] || i.status})
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="card space-y-2">
                <h2 className="text-sm font-medium text-gray-500 uppercase">Pendents de generar a la AEAT</h2>
                {data.pendingAeat.length === 0 ? (
                  <p className="text-sm text-gray-500">Cap factura pendent.</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {data.pendingAeat.map((i) => (
                      <li key={i.id} className="flex justify-between">
                        <Link href={`/invoices/${i.id}`} className="text-brand-700 hover:underline">
                          {i.number} — {i.client || "—"}
                        </Link>
                        <span className="text-gray-600">{i.date}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="card space-y-2">
                <h2 className="text-sm font-medium text-gray-500 uppercase">Pendents d&apos;enviar al client</h2>
                {data.pendingSendClient.length === 0 ? (
                  <p className="text-sm text-gray-500">Cap factura pendent d&apos;enviar.</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {data.pendingSendClient.map((i) => (
                      <li key={i.id} className="flex justify-between">
                        <Link href={`/invoices/${i.id}`} className="text-brand-700 hover:underline">
                          {i.number} — {i.client || "—"}
                        </Link>
                        <span className="text-gray-600">
                          {i.aeatStatus ? AEAT_STATUS_LABEL[i.aeatStatus as AeatStatus] : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
