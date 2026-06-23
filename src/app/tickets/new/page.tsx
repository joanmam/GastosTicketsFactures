"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import CameraCapture from "@/components/CameraCapture";
import TicketForm from "@/components/TicketForm";
import { apiJson } from "@/lib/api-client";
import type { TicketInput } from "@/types";

const EMPTY: TicketInput = {
  merchant: "",
  date: new Date().toISOString().slice(0, 10),
  totalAmount: null,
  taxAmount: null,
  taxRate: null,
  currency: "EUR",
  category: "",
  paymentMethod: "",
  notes: "",
  status: "REVIEW",
  items: [],
};

function NewTicketContent() {
  const router = useRouter();
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMediaType, setImageMediaType] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState<TicketInput>(EMPTY);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleImageSelected(base64: string, mediaType: string, preview: string) {
    setImageBase64(base64);
    setImageMediaType(mediaType);
    setPreviewUrl(preview);
  }

  async function handleExtract() {
    if (!imageBase64 || !imageMediaType) return;
    setExtracting(true);
    setError(null);
    try {
      const data = await apiJson<{ data: any }>("/api/tickets/extract", {
        method: "POST",
        body: JSON.stringify({ imageBase64, mediaType: imageMediaType }),
      });
      setFormData((f) => ({
        ...f,
        ...data.data,
        date: data.data?.date || f.date,
        currency: data.data?.currency || f.currency,
        status: "REVIEW",
      }));
    } catch (err: any) {
      setError(err?.message || "Error extraient les dades del ticket.");
    } finally {
      setExtracting(false);
    }
  }

  async function handleSubmit(data: TicketInput) {
    setSaving(true);
    setError(null);
    try {
      const payload: TicketInput = {
        ...data,
        imageBase64: imageBase64 || undefined,
        imageMediaType: imageMediaType || undefined,
      };
      const res = await apiJson<{ ticket: { id: string } }>("/api/tickets", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      router.push(`/compres`);
    } catch (err: any) {
      setError(err?.message || "Error desant el ticket.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <h1 className="text-xl font-semibold text-gray-900">Nou ticket</h1>

        <div className="card space-y-3">
          <CameraCapture imagePreviewUrl={previewUrl} onImageSelected={handleImageSelected} />
          {imageBase64 && (
            <button type="button" className="btn-primary w-full" onClick={handleExtract} disabled={extracting}>
              {extracting ? "Analitzant amb IA..." : "🪄 Extreu dades amb IA"}
            </button>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="card">
          <TicketForm initialData={formData} onSubmit={handleSubmit} saving={saving} submitLabel="Crear ticket" />
        </div>
      </main>
    </>
  );
}

export default function NewTicketPage() {
  return (
    <AuthGuard>
      <NewTicketContent />
    </AuthGuard>
  );
}
