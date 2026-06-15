"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import ClientForm from "@/components/ClientForm";
import { apiJson } from "@/lib/api-client";
import type { ClientInput } from "@/types";

const EMPTY: ClientInput = {
  name: "",
  taxId: "",
  address: "",
  email: "",
  phone: "",
  notes: "",
};

function NewClientContent() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(data: ClientInput) {
    setSaving(true);
    setError(null);
    try {
      await apiJson("/api/clients", { method: "POST", body: JSON.stringify(data) });
      router.push("/clients");
    } catch (err: any) {
      setError(err?.message || "Error desant el client.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <h1 className="text-xl font-semibold text-gray-900">Nou client</h1>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="card">
          <ClientForm initialData={EMPTY} onSubmit={handleSubmit} saving={saving} submitLabel="Crear client" />
        </div>
      </main>
    </>
  );
}

export default function NewClientPage() {
  return (
    <AuthGuard>
      <NewClientContent />
    </AuthGuard>
  );
}
