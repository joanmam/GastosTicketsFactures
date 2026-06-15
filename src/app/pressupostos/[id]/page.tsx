"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import QuoteForm from "@/components/QuoteForm";
import { apiJson } from "@/lib/api-client";
import type { Client, Invoice, Quote, QuoteInput } from "@/types";

function QuoteDetailContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [quoteData, clientsData] = await Promise.all([
          apiJson<{ quote: Quote }>(`/api/quotes/${params.id}`),
          apiJson<{ clients: Client[] }>("/api/clients"),
        ]);
        if (active) {
          setQuote(quoteData.quote);
          setClients(clientsData.clients);
        }
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

  async function handleSubmit(data: QuoteInput) {
    setSaving(true);
    setError(null);
    try {
      const res = await apiJson<{ quote: Quote }>(`/api/quotes/${params.id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      setQuote(res.quote);
    } catch (err: any) {
      setError(err?.message || "Error desant els canvis.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Segur que vols eliminar aquest pressupost?")) return;
    setSaving(true);
    setError(null);
    try {
      await apiJson(`/api/quotes/${params.id}`, { method: "DELETE" });
      router.push("/pressupostos");
    } catch (err: any) {
      setError(err?.message || "Error eliminant el pressupost.");
      setSaving(false);
    }
  }

  async function handleConvert() {
    if (!confirm("Vols convertir aquest pressupost en una factura nova?")) return;
    setConverting(true);
    setError(null);
    try {
      const res = await apiJson<{ quote: Quote; invoice: Invoice }>(`/api/quotes/${params.id}/convert`, {
        method: "POST",
      });
      setQuote(res.quote);
      router.push(`/invoices/${res.invoice.id}`);
    } catch (err: any) {
      setError(err?.message || "Error convertint el pressupost en factura.");
    } finally {
      setConverting(false);
    }
  }

  const isConverted = quote?.status === "CONVERTED";

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-xl font-semibold text-gray-900">
            Pressupost {quote?.number ? `#${quote.number}` : ""}
          </h1>
          <div className="flex gap-2">
            {quote && (
              <Link href={`/pressupostos/${quote.id}/preview`} className="btn-secondary">
                👁️ Vista prèvia / PDF
              </Link>
            )}
            {quote && quote.status === "ACCEPTED" && !isConverted && (
              <button className="btn-primary" onClick={handleConvert} disabled={converting}>
                {converting ? "Convertint..." : "✅ Converteix a factura"}
              </button>
            )}
          </div>
        </div>

        {isConverted && quote?.convertedInvoiceId && (
          <div className="rounded-md border border-purple-200 bg-purple-50 text-purple-800 text-sm px-4 py-2">
            Aquest pressupost s&apos;ha convertit en la factura{" "}
            <Link href={`/invoices/${quote.convertedInvoiceId}`} className="underline font-medium">
              corresponent
            </Link>
            .
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        {loading || !quote ? (
          <p className="text-sm text-gray-500">Carregant...</p>
        ) : (
          <div className="card">
            <QuoteForm
              initialData={quote}
              clients={clients}
              onSubmit={handleSubmit}
              onDelete={handleDelete}
              saving={saving}
              submitLabel="Desar canvis"
              readOnly={isConverted}
            />
          </div>
        )}
      </main>
    </>
  );
}

export default function QuoteDetailPage() {
  return (
    <AuthGuard>
      <QuoteDetailContent />
    </AuthGuard>
  );
}
