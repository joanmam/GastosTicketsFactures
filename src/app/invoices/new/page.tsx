"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import InvoiceForm from "@/components/InvoiceForm";
import { apiJson } from "@/lib/api-client";
import { defaultAeatInfo, defaultInvoiceChecklist } from "@/lib/invoice-calc";
import { DEFAULT_IRPF_RATE } from "@/lib/invoice-constants";
import type { Client, Invoice, InvoiceInput } from "@/types";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function emptyInvoice(): InvoiceInput {
  return {
    number: "",
    clientId: null,
    clientSnapshot: null,
    date: todayIso(),
    dueDate: "",
    items: [],
    irpfRate: DEFAULT_IRPF_RATE,
    notes: "",
    status: "DRAFT",
    aeat: defaultAeatInfo(),
    checklist: defaultInvoiceChecklist(),
  };
}

function NewInvoiceContent() {
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

  async function handleSubmit(data: InvoiceInput) {
    setSaving(true);
    setError(null);
    try {
      const res = await apiJson<{ invoice: Invoice }>("/api/invoices", {
        method: "POST",
        body: JSON.stringify(data),
      });
      router.push(`/invoices/${res.invoice.id}`);
    } catch (err: any) {
      setError(err?.message || "Error creant la factura.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <h1 className="text-xl font-semibold text-gray-900">Nova factura</h1>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {loading ? (
          <p className="text-sm text-gray-500">Carregant...</p>
        ) : (
          <div className="card">
            <InvoiceForm
              initialData={emptyInvoice()}
              clients={clients}
              onSubmit={handleSubmit}
              saving={saving}
              submitLabel="Crear factura"
            />
          </div>
        )}
      </main>
    </>
  );
}

export default function NewInvoicePage() {
  return (
    <AuthGuard>
      <NewInvoiceContent />
    </AuthGuard>
  );
}
