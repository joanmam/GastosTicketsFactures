"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import ClientForm from "@/components/ClientForm";
import { apiJson } from "@/lib/api-client";
import type { Client, ClientInput } from "@/types";

function ClientDetailContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await apiJson<{ client: Client }>(`/api/clients/${params.id}`);
        if (active) setClient(data.client);
      } catch (err: any) {
        if (active) setError(err?.message || "Error carregant el client.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [params.id]);

  async function handleSubmit(data: ClientInput) {
    setSaving(true);
    setError(null);
    try {
      await apiJson(`/api/clients/${params.id}`, { method: "PATCH", body: JSON.stringify(data) });
      router.push("/clients");
    } catch (err: any) {
      setError(err?.message || "Error desant els canvis.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Segur que vols eliminar aquest client?")) return;
    setSaving(true);
    setError(null);
    try {
      await apiJson(`/api/clients/${params.id}`, { method: "DELETE" });
      router.push("/clients");
    } catch (err: any) {
      setError(err?.message || "Error eliminant el client.");
      setSaving(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <h1 className="text-xl font-semibold text-gray-900">Detall del client</h1>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {loading || !client ? (
          <p className="text-sm text-gray-500">Carregant...</p>
        ) : (
          <div className="card">
            <ClientForm
              initialData={client}
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

export default function ClientDetailPage() {
  return (
    <AuthGuard>
      <ClientDetailContent />
    </AuthGuard>
  );
}
