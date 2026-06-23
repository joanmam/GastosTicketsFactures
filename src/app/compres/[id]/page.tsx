"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import { apiJson } from "@/lib/api-client";
import type { Purchase, IvaLine } from "@/types";

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

function emptyIvaLine(): IvaLine {
  return { ivaRate: 21, subtotal: 0, iva: 0 };
}

// Migra camps antics (subtotal/ivaRate/iva) a ivaLines si cal
function initIvaLines(p: Purchase): IvaLine[] {
  if (p.ivaLines && p.ivaLines.length > 0) return p.ivaLines;
  if (p.subtotal != null && p.ivaRate != null) {
    return [{ ivaRate: p.ivaRate, subtotal: p.subtotal, iva: p.iva ?? 0 }];
  }
  return [];
}

// ── Editor de línies IVA ─────────────────────────────────────────────────────
function IvaLinesEditor({
  lines,
  onChange,
  total,
}: {
  lines: IvaLine[];
  onChange: (lines: IvaLine[]) => void;
  total: number;
}) {
  function updateLine(i: number, field: keyof IvaLine, raw: string) {
    const val = raw === "" ? 0 : parseFloat(raw);
    const updated = lines.map((l, idx) => {
      if (idx !== i) return l;
      const next = { ...l, [field]: isNaN(val) ? 0 : val };
      // recalcula IVA quan canvia subtotal o ivaRate
      if (field === "subtotal" || field === "ivaRate") {
        next.iva = parseFloat((next.subtotal * next.ivaRate / 100).toFixed(2));
      }
      return next;
    });
    onChange(updated);
  }

  function addLine() {
    const defaultRate = 21;
    // Calcula el romanent que queda per cobrir
    const covered = lines.reduce((s, l) => s + l.subtotal + l.iva, 0);
    const remaining = Math.max(0, parseFloat((total - covered).toFixed(2)));
    const subtotal = parseFloat((remaining / (1 + defaultRate / 100)).toFixed(2));
    const iva = parseFloat((subtotal * defaultRate / 100).toFixed(2));
    onChange([...lines, { ivaRate: defaultRate, subtotal, iva }]);
  }

  function removeLine(i: number) {
    onChange(lines.filter((_, idx) => idx !== i));
  }

  const totalBase = lines.reduce((s, l) => s + l.subtotal, 0);
  const totalIva = lines.reduce((s, l) => s + l.iva, 0);
  const totalGeneral = totalBase + totalIva;

  return (
    <div className="space-y-2">
      {lines.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 text-left">
                <th className="pb-1 font-medium">Base imposable</th>
                <th className="pb-1 font-medium">IVA %</th>
                <th className="pb-1 font-medium">IVA €</th>
                <th className="pb-1" />
              </tr>
            </thead>
            <tbody className="space-y-1">
              {lines.map((line, i) => (
                <tr key={i} className="align-middle">
                  <td className="pr-2 py-1">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.subtotal || ""}
                      onChange={(e) => updateLine(i, "subtotal", e.target.value)}
                      placeholder="0.00"
                      className="w-28"
                    />
                  </td>
                  <td className="pr-2 py-1">
                    <select
                      value={line.ivaRate}
                      onChange={(e) => updateLine(i, "ivaRate", e.target.value)}
                      className="w-20"
                    >
                      {IVA_RATES.map((r) => (
                        <option key={r} value={r}>{r}%</option>
                      ))}
                    </select>
                  </td>
                  <td className="pr-2 py-1">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.iva || ""}
                      onChange={(e) => updateLine(i, "iva", e.target.value)}
                      placeholder="0.00"
                      className="w-24"
                    />
                  </td>
                  <td className="py-1">
                    <button
                      type="button"
                      onClick={() => removeLine(i)}
                      className="text-gray-300 hover:text-red-500 text-sm px-1"
                      title="Eliminar línia"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button
        type="button"
        onClick={addLine}
        className="btn-secondary text-sm"
      >
        + Afegir línia IVA
      </button>

      {lines.length > 0 && (
        <div className="mt-2 grid grid-cols-3 gap-2 text-sm bg-gray-50 rounded-lg px-3 py-2">
          <div>
            <p className="text-xs text-gray-500">Total base</p>
            <p className="font-medium">{formatAmount(totalBase)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Total IVA</p>
            <p className="font-medium text-orange-600">{formatAmount(totalIva)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Total</p>
            <p className="font-semibold">{formatAmount(totalGeneral)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Pàgina de detall ─────────────────────────────────────────────────────────
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
  const [ivaLines, setIvaLines] = useState<IvaLine[]>([]);

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
        setIvaLines(initIvaLines(p));
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

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      // Calcula totals agregats per compatibilitat amb vista llista
      const totalSubtotal = ivaLines.reduce((s, l) => s + l.subtotal, 0);
      const totalIva = ivaLines.reduce((s, l) => s + l.iva, 0);

      await apiJson(`/api/purchases/${params.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          concepte,
          categoria,
          notes: notes || null,
          ivaLines: ivaLines.length > 0 ? ivaLines : null,
          // camps legacy per compatibilitat amb la llista
          subtotal: ivaLines.length > 0 ? totalSubtotal : null,
          iva: ivaLines.length > 0 ? totalIva : null,
          ivaRate: ivaLines.length === 1 ? ivaLines[0].ivaRate : null,
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
            <div className="card space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Desglossament IVA</h2>
                <span className={`text-base font-semibold ${isExpense ? "text-red-600" : "text-green-700"}`}>
                  Total: {isExpense ? "−" : "+"}{formatAmount(total)}
                </span>
              </div>

              <IvaLinesEditor lines={ivaLines} onChange={setIvaLines} total={total} />

              {ivaLines.length > 0 && (() => {
                const sumTotal = ivaLines.reduce((s, l) => s + l.subtotal + l.iva, 0);
                const diff = Math.abs(total - sumTotal);
                if (diff > 0.05) {
                  return (
                    <p className="text-xs text-amber-600 bg-amber-50 rounded px-2 py-1">
                      ⚠️ La suma de les línies ({formatAmount(sumTotal)}) no coincideix amb el total ({formatAmount(total)}). Diferència: {formatAmount(diff)}
                    </p>
                  );
                }
                return null;
              })()}
            </div>

            {/* Adjunt */}
            <div className="card space-y-3">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Adjunt (ticket / factura)</h2>

              {uploadingAttachment ? (
                <p className="text-sm text-gray-500">Pujant...</p>
              ) : attachmentUrl ? (
                <div className="space-y-2">
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
                    <button onClick={() => fileInputRef.current?.click()} className="btn-secondary text-sm">
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
                  <button onClick={() => fileInputRef.current?.click()} className="btn-secondary">
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

            {purchase.sourceFile && (
              <p className="text-xs text-gray-400">Origen: {purchase.sourceFile}</p>
            )}

            {/* Botons */}
            <div className="flex gap-3">
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
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
