"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import InvoiceForm from "@/components/InvoiceForm";
import { apiJson } from "@/lib/api-client";
import type { Client, Invoice, InvoiceInput } from "@/types";

function InvoiceDetailContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [invoiceData, clientsData] = await Promise.all([
          apiJson<{ invoice: Invoice }>(`/api/invoices/${params.id}`),
          apiJson<{ clients: Client[] }>("/api/clients"),
        ]);
        if (active) {
          setInvoice(invoiceData.invoice);
          setClients(clientsData.clients);
        }
      } catch (err: any) {
        if (active) setError(err?.message || "Error carregant la factura.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [params.id]);

  async function handleSubmit(data: InvoiceInput) {
    setSaving(true);
    setError(null);
    try {
      const res = await apiJson<{ invoice: Invoice }>(`/api/invoices/${params.id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      setInvoice(res.invoice);
    } catch (err: any) {
      setError(err?.message || "Error desant els canvis.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Segur que vols eliminar aquesta factura?")) return;
    setSaving(true);
    setError(null);
    try {
      await apiJson(`/api/invoices/${params.id}`, { method: "DELETE" });
      router.push("/invoices");
    } catch (err: any) {
      setError(err?.message || "Error eliminant la factura.");
      setSaving(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-xl font-semibold text-gray-900">
            Factura {invoice?.number ? `#${invoice.number}` : ""}
          </h1>
          {invoice && (
            <Link href={`/invoices/${invoice.id}/preview`} className="btn-secondary">
              👁️ Vista prèvia
            </Link>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {loading || !invoice ? (
          <p className="text-sm text-gray-500">Carregant...</p>
        ) : (
          <div className="card">
            <InvoiceForm
              initialData={invoice}
              clients={clients}
              onSubmit={handleSubmit}
              onDelete={handleDelete}
              saving={saving}
              submitLabel="Desar canvis"
            />
          </div>
        )}
      </main>
    </>
  );
}

export default function InvoiceDetailPage() {
  return (
    <AuthGuard>
      <InvoiceDetailContent />
    </AuthGuard>
  );
}
