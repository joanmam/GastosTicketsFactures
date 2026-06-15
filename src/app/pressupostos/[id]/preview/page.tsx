"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import { apiJson } from "@/lib/api-client";
import { computeInvoiceTotals, lineBase, lineTotal, lineVat } from "@/lib/invoice-calc";
import { QUOTE_STATUS_LABEL } from "@/lib/invoice-constants";
import type { Quote, QuoteStatus } from "@/types";

function formatAmount(n: number) {
  return new Intl.NumberFormat("ca-ES", { style: "currency", currency: "EUR" }).format(n);
}

function PreviewContent() {
  const params = useParams<{ id: string }>();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await apiJson<{ quote: Quote }>(`/api/quotes/${params.id}`);
        if (active) setQuote(data.quote);
      } catch (err: any) {
        if (active) setError(err?.message || "Error carregant el pressupost.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [params.id]);

  if (loading || !quote) {
    return (
      <>
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 py-6">
          {error ? <p className="text-sm text-red-600">{error}</p> : <p className="text-sm text-gray-500">Carregant...</p>}
        </main>
      </>
    );
  }

  const totals = computeInvoiceTotals(quote.items || [], quote.irpfRate);
  const snapshot = quote.clientSnapshot;

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-card { box-shadow: none !important; border: none !important; }
        }
      `}</style>
      <div className="no-print">
        <Navbar />
      </div>
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="no-print flex items-center justify-between flex-wrap gap-2">
          <Link href={`/pressupostos/${quote.id}`} className="btn-secondary">
            ← Tornar
          </Link>
          <button className="btn-primary" onClick={() => window.print()}>
            🖨️ Imprimir / Desar com a PDF
          </button>
        </div>

        <div className="card print-card space-y-6">
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Pressupost {quote.number}</h1>
              <p className="text-sm text-gray-600">Data: {quote.date || "—"}</p>
              {quote.validUntil && <p className="text-sm text-gray-600">Vàlid fins a: {quote.validUntil}</p>}
            </div>
            <div className="text-right text-sm">
              <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                {QUOTE_STATUS_LABEL[(quote.status || "DRAFT") as QuoteStatus]}
              </span>
            </div>
          </div>

          {snapshot && (
            <div>
              <h2 className="text-sm font-medium text-gray-500 uppercase mb-1">Client</h2>
              <p className="font-medium text-gray-900">{snapshot.name}</p>
              {snapshot.taxId && <p className="text-sm text-gray-600">NIF/CIF: {snapshot.taxId}</p>}
              {snapshot.address && <p className="text-sm text-gray-600">{snapshot.address}</p>}
              {(snapshot.email || snapshot.phone) && (
                <p className="text-sm text-gray-600">
                  {snapshot.email} {snapshot.phone ? `· ${snapshot.phone}` : ""}
                </p>
              )}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-3 py-2 font-medium">Descripció</th>
                  <th className="px-3 py-2 font-medium text-right">Quantitat</th>
                  <th className="px-3 py-2 font-medium text-right">Preu unitari</th>
                  <th className="px-3 py-2 font-medium text-right">% IVA</th>
                  <th className="px-3 py-2 font-medium text-right">Base</th>
                  <th className="px-3 py-2 font-medium text-right">IVA</th>
                  <th className="px-3 py-2 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(quote.items || []).map((item, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2">{item.description}</td>
                    <td className="px-3 py-2 text-right">{item.quantity}</td>
                    <td className="px-3 py-2 text-right">{formatAmount(item.unitPrice)}</td>
                    <td className="px-3 py-2 text-right">{item.vatRate}%</td>
                    <td className="px-3 py-2 text-right">{formatAmount(lineBase(item))}</td>
                    <td className="px-3 py-2 text-right">{formatAmount(lineVat(item))}</td>
                    <td className="px-3 py-2 text-right">{formatAmount(lineTotal(item))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <div className="w-full sm:w-64 space-y-1 text-sm">
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
                <span>Retenció IRPF ({quote.irpfRate ?? 0}%)</span>
                <span>−{formatAmount(totals.irpfAmount)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold pt-1 border-t border-gray-200">
                <span>Total pressupost</span>
                <span>{formatAmount(totals.total)}</span>
              </div>
            </div>
          </div>

          {quote.notes && (
            <div>
              <h2 className="text-sm font-medium text-gray-500 uppercase mb-1">Notes</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{quote.notes}</p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

export default function QuotePreviewPage() {
  return (
    <AuthGuard>
      <PreviewContent />
    </AuthGuard>
  );
}
