"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
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
  expenses: number;
  balance: number;
}

interface Totals {
  baseImposable: number;
  vatTotal: number;
  irpfAmount: number;
  total: number;
  expenses: number;
  balance: number;
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
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
            <label htmlFor="year" className="sr-only">
              Any
            </label>
            <select id="year" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-auto">
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
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
            </div>

            <div className="card space-y-3">
              <h2 className="text-sm font-medium text-gray-500 uppercase">Ingressos vs. despeses per trimestre</h2>
              <div className="space-y-3">
                {data.quarters.map((q) => (
                  <div key={q.quarter} className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>T{q.quarter}</span>
                      <span>
                        {formatAmount(q.baseImposable)} / −{formatAmount(q.expenses)}
                      </span>
                    </div>
                    <div className="flex gap-1 h-3">
                      <div
                        className="bg-brand-500 rounded-sm"
                        style={{ width: `${(q.baseImposable / maxScale) * 100}%` }}
                        title={`Ingressos: ${formatAmount(q.baseImposable)}`}
                      />
                    </div>
                    <div className="flex gap-1 h-3">
                      <div
                        className="bg-red-300 rounded-sm"
                        style={{ width: `${(q.expenses / maxScale) * 100}%` }}
                        title={`Despeses: ${formatAmount(q.expenses)}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 text-xs text-gray-500 pt-1">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-sm bg-brand-500" /> Ingressos (base imposable)
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-sm bg-red-300" /> Despeses
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
