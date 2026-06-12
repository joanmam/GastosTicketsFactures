"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import CameraCapture from "@/components/CameraCapture";
import TicketForm from "@/components/TicketForm";
import { apiJson } from "@/lib/api-client";
import type { Ticket, TicketInput } from "@/types";

function TicketDetailContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMediaType, setImageMediaType] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await apiJson<{ ticket: Ticket }>(`/api/tickets/${params.id}`);
        if (!active) return;
        setTicket(data.ticket);
        setPreviewUrl(data.ticket.imageUrl || null);
      } catch (err: any) {
        if (active) setError(err?.message || "Error carregant el ticket.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [params.id]);

  function handleImageSelected(base64: string, mediaType: string, preview: string) {
    setImageBase64(base64);
    setImageMediaType(mediaType);
    setPreviewUrl(preview);
  }

  async function handleSubmit(data: TicketInput) {
    setSaving(true);
    setError(null);
    try {
      const payload: TicketInput = {
        ...data,
        ...(imageBase64 ? { imageBase64, imageMediaType: imageMediaType || undefined } : {}),
      };
      await apiJson(`/api/tickets/${params.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      router.push("/tickets");
    } catch (err: any) {
      setError(err?.message || "Error desant els canvis.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Segur que vols eliminar aquest ticket?")) return;
    setSaving(true);
    setError(null);
    try {
      await apiJson(`/api/tickets/${params.id}`, { method: "DELETE" });
      router.push("/tickets");
    } catch (err: any) {
      setError(err?.message || "Error eliminant el ticket.");
      setSaving(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <h1 className="text-xl font-semibold text-gray-900">Detall del ticket</h1>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {loading || !ticket ? (
          <p className="text-sm text-gray-500">Carregant...</p>
        ) : (
          <>
            <div className="card space-y-3">
              <CameraCapture imagePreviewUrl={previewUrl} onImageSelected={handleImageSelected} />
            </div>

            <div className="card">
              <TicketForm
                initialData={ticket}
                onSubmit={handleSubmit}
                onDelete={handleDelete}
                saving={saving}
                submitLabel="Desar canvis"
              />
            </div>
          </>
        )}
      </main>
    </>
  );
}

export default function TicketDetailPage() {
  return (
    <AuthGuard>
      <TicketDetailContent />
    </AuthGuard>
  );
}
