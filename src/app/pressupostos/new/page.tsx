"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import QuoteForm from "@/components/QuoteForm";
import { apiJson } from "@/lib/api-client";
import { DEFAULT_IRPF_RATE } from "@/lib/invoice-constants";
import type { Client, Quote, QuoteInput } from "@/types";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function emptyQuote(): QuoteInput {
  return {
    number: "",
    clientId: null,
    clientSnapshot: null,
    date: todayIso(),
    validUntil: "",
    items: [],
    irpfRate: DEFAULT_IRPF_RATE,
    notes: "",
    status: "DRAFT",
  };
}

function NewQuoteContent() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await apiJson<{ clients: Client[] }>("/api/clients");
        if (active) setClients(data.clients);
      } catch (err: any) {
        if (active) setError(err?.message || "Error carregant els clients.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(data: QuoteInput) {
    setSaving(true);
    setError(null);
    try {
      const res = await apiJson<{ quote: Quote }>("/api/quotes", {
        method: "POST",
        body: JSON.stringify(data),
      });
      router.push(`/pressupostos/${res.quote.id}`);
    } catch (err: any) {
      setError(err?.message || "Error creant el pressupost.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <h1 className="text-xl font-semibold text-gray-900">Nou pressupost</h1>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {loading ? (
          <p className="text-sm text-gray-500">Carregant...</p>
        ) : (
          <div className="card">
            <QuoteForm
              initialData={emptyQuote()}
              clients={clients}
              onSubmit={handleSubmit}
              saving={saving}
              submitLabel="Crear pressupost"
            />
          </div>
        )}
      </main>
    </>
  );
}

export default function NewQuotePage() {
  return (
    <AuthGuard>
      <NewQuoteContent />
    </AuthGuard>
  );
}
