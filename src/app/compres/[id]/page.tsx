"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import { apiJson } from "@/lib/api-client";
import type { Purchase } from "@/types";

const IVA_RATES = [0, 4, 10, 21];

function formatAmount(n: number) {
  return new Intl.NumberFormat("ca-ES", { style: "currency", currency: "EUR" }).format(n);
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function PurchaseDetailContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Camps editables
  const [concepte, setConcepte] = useState("");
  const [categoria, setCategoria] = useState("");
  const [notes, setNotes] = useState("");
  const [ivaRate, setIvaRate] = useState<string>("");
  const [subtotal, setSubtotal] = useState<string>("");
  const [iva, setIva] = useState<string>("");

  // Adjunt
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentPath, setAttachmentPath] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await apiJson<{ purchase: Purchase }>(`/api/purchases/${params.id}`);
        if (!active) return;
        const p = data.purchase;
        setPurchase(p);
        setConcepte(p.concepte ?? "");
        setCategoria(p.categoria ?? "");
        setNotes(p.notes ?? "");
        setIvaRate(p.ivaRate != null ? String(p.ivaRate) : "");
        setSubtotal(p.subtotal != null ? String(p.subtotal.toFixed(2)) : "");
        setIva(p.iva != null ? String(p.iva.toFixed(2)) : "");
        setAttachmentUrl(p.attachmentUrl ?? null);
        setAttachmentPath(p.attachmentPath ?? null);
      } catch (err: any) {
        if (active) setError(err?.message || "Error carregant la compra.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [params.id]);

  // Quan canvia ivaRate, recalcula subtotal i iva a partir del total
  function handleIvaRateChange(val: string) {
    setIvaRate(val);
    if (!purchase) return;
    const total = Math.abs(purchase.import);
    if (val === "") {
      setSubtotal("");
      setIva("");
    } else {
      const rate = Number(val);
      const sub = total / (1 + rate / 100);
      const ivaAmt = total - sub;
      setSubtotal(sub.toFixed(2));
      setIva(ivaAmt.toFixed(2));
    }
  }

  // Quan l'usuari edita subtotal manualment, recalcula iva
  function handleSubtotalChange(val: string) {
    setSubtotal(val);
    if (!purchase) return;
    const total = Math.abs(purchase.import);
    const sub = parseFloat(val);
    if (!isNaN(sub)) {
      setIva((total - sub).toFixed(2));
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await apiJson(`/api/purchases/${params.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          concepte,
          categoria,
          notes: notes || null,
          ivaRate: ivaRate !== "" ? Number(ivaRate) : null,
          subtotal: subtotal !== "" ? parseFloat(subtotal) : null,
          iva: iva !== "" ? parseFloat(iva) : null,
        }),
      });
      setSuccessMsg("Canvis desats correctament.");
    } catch (err: any) {
      setError(err?.message || "Error desant els canvis.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Segur que vols eliminar aquesta compra?")) return;
    setSaving(true);
    try {
      await apiJson(`/api/purchases/${params.id}`, { method: "DELETE" });
      router.push("/compres");
    } catch (err: any) {
      setError(err?.message || "Error eliminant la compra.");
      setSaving(false);
    }
  }

  async function handleAttachmentUpload(file: File) {
    setUploadingAttachment(true);
    setError(null);
    try {
      const base64 = await fileToBase64(file);
      await apiJson(`/api/purchases/${params.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          attachmentBase64: base64,
          attachmentMediaType: file.type,
          currentAttachmentPath: attachmentPath,
        }),
      });
      // Recarregar per obtenir nova URL signada
      const data = await apiJson<{ purchase: Purchase }>(`/api/purchases/${params.id}`);
      setAttachmentUrl(data.purchase.attachmentUrl ?? null);
      setAttachmentPath(data.purchase.attachmentPath ?? null);
      setSuccessMsg("Adjunt pujat correctament.");
    } catch (err: any) {
      setError(err?.message || "Error pujant l'adjunt.");
    } finally {
      setUploadingAttachment(false);
    }
  }

  async function handleAttachmentRemove() {
    if (!confirm("Eliminar l'adjunt?")) return;
    setUploadingAttachment(true);
    try {
      await apiJson(`/api/purchases/${params.id}`, {
        method: "PATCH",
        body: JSON.stringify({ removeAttachment: true, currentAttachmentPath: attachmentPath }),
      });
      setAttachmentUrl(null);
      setAttachmentPath(null);
    } catch (err: any) {
      setError(err?.message || "Error eliminant l'adjunt.");
    } finally {
      setUploadingAttachment(false);
    }
  }

  const total = purchase ? Math.abs(purchase.import) : 0;
  const isExpense = purchase ? purchase.import < 0 : true;

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Capçalera */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Link href="/compres" className="text-gray-400 hover:text-gray-700 text-sm">
              ← Compres
            </Link>
            <h1 className="text-xl font-semibold text-gray-900">Detall compra</h1>
          </div>
          <button
            onClick={handleDelete}
            disabled={saving}
            className="text-sm text-red-500 hover:text-red-700 border border-red-200 rounded px-3 py-1"
          >
            🗑 Eliminar
          </button>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}
        {successMsg && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">{successMsg}</p>}

        {loading || !purchase ? (
          <p className="text-sm text-gray-500">Carregant...</p>
        ) : (
          <div className="space-y-4">
            {/* Dades principals */}
            <div className="card space-y-4">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Informació</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500">Data</label>
                  <p className="font-medium text-gray-900">{purchase.date}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Compte / Targeta</label>
                  <p className="font-medium text-gray-900">{purchase.compteTarjeta || "—"}</p>
                </div>
              </div>

              <div>
                <label htmlFor="concepte" className="text-xs text-gray-500">Concepte</label>
                <input
                  id="concepte"
                  type="text"
                  value={concepte}
                  onChange={(e) => setConcepte(e.target.value)}
                  className="mt-0.5"
                />
              </div>

              <div>
                <label htmlFor="categoria" className="text-xs text-gray-500">Categoria</label>
                <input
                  id="categoria"
                  type="text"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="mt-0.5"
                  list="categories-list"
                />
                <datalist id="categories-list">
                  {["Alimentació","Restaurants","Transport","Salut","Llar","Roba","Lleure",
                    "Tecnologia","Subscripcions","Educació","Viatges","Gestoria",
                    "Otros servicios","Altres"].map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <div>
                <label htmlFor="notes" className="text-xs text-gray-500">Notes</label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="mt-0.5 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Notes addicionals..."
                />
              </div>
            </div>

            {/* Desglossament IVA */}
            <div className="card space-y-4">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Desglossament IVA</h2>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-gray-500">IVA %</label>
                  <select
                    value={ivaRate}
                    onChange={(e) => handleIvaRateChange(e.target.value)}
                    className="mt-0.5"
                  >
                    <option value="">—</option>
                    {IVA_RATES.map((r) => (
                      <option key={r} value={r}>{r}%</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Subtotal (base)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={subtotal}
                    onChange={(e) => handleSubtotalChange(e.target.value)}
                    placeholder="0.00"
                    className="mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">IVA €</label>
                  <input
                    type="number"
                    step="0.01"
                    value={iva}
                    onChange={(e) => setIva(e.target.value)}
                    placeholder="0.00"
                    className="mt-0.5"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                <span className="text-sm text-gray-600">Total</span>
                <span className={`text-lg font-semibold ${isExpense ? "text-red-600" : "text-green-700"}`}>
                  {isExpense ? "−" : "+"}{formatAmount(total)}
                </span>
              </div>
            </div>

            {/* Adjunt */}
            <div className="card space-y-3">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Adjunt (ticket / factura)</h2>

              {uploadingAttachment ? (
                <p className="text-sm text-gray-500">Pujant...</p>
              ) : attachmentUrl ? (
                <div className="space-y-2">
                  {/* Preview si és imatge */}
                  {attachmentPath && /\.(jpg|jpeg|png)$/i.test(attachmentPath) ? (
                    <img
                      src={attachmentUrl}
                      alt="Adjunt"
                      className="max-h-64 rounded border border-gray-200 object-contain"
                    />
                  ) : (
                    <a
                      href={attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                    >
                      📎 Veure PDF adjunt
                    </a>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="btn-secondary text-sm"
                    >
                      🔄 Substituir
                    </button>
                    <button
                      onClick={handleAttachmentRemove}
                      className="text-sm text-red-500 hover:text-red-700 border border-red-200 rounded px-3 py-1"
                    >
                      🗑 Eliminar adjunt
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-secondary"
                  >
                    ⬆️ Pujar PDF o imatge
                  </button>
                  <p className="text-xs text-gray-400 mt-1">PDF, JPG o PNG. Màx. 10 MB.</p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/jpg"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleAttachmentUpload(f);
                  e.target.value = "";
                }}
              />
            </div>

            {/* Fitxer origen (read-only) */}
            {purchase.sourceFile && (
              <p className="text-xs text-gray-400">Origen: {purchase.sourceFile}</p>
            )}

            {/* Botons acció */}
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary flex-1"
              >
                {saving ? "Desant..." : "💾 Desar canvis"}
              </button>
              <Link href="/compres" className="btn-secondary text-center">
                Cancel·lar
              </Link>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

export default function PurchaseDetailPage() {
  return (
    <AuthGuard>
      <PurchaseDetailContent />
    </AuthGuard>
  );
}
