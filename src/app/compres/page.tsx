"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import QuarterFilter, { quarterToDateRange } from "@/components/QuarterFilter";
import { apiJson } from "@/lib/api-client";
import type { Purchase } from "@/types";

function formatAmount(n: number) {
  return new Intl.NumberFormat("ca-ES", { style: "currency", currency: "EUR" }).format(n);
}

const IVA_RATES = [null, 0, 4, 10, 21];

// ── Editor inline d'IVA ──────────────────────────────────────────────────────
function IvaEditor({
  purchase,
  onSaved,
}: {
  purchase: Purchase;
  onSaved: (updated: Partial<Purchase>) => void;
}) {
  const total = Math.abs(purchase.import);
  const [rate, setRate] = useState<number | null>(purchase.ivaRate ?? null);
  const [saving, setSaving] = useState(false);

  async function handleChange(newRate: number | null) {
    setRate(newRate);
    setSaving(true);
    let subtotal: number | null = null;
    let iva: number | null = null;
    if (newRate !== null) {
      subtotal = total / (1 + newRate / 100);
      iva = total - subtotal;
    }
    try {
      await apiJson(`/api/purchases/${purchase.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ivaRate: newRate, subtotal, iva }),
      });
      onSaved({ ivaRate: newRate, subtotal, iva });
    } finally {
      setSaving(false);
    }
  }

  return (
    <select
      value={rate ?? ""}
      onChange={(e) => {
        const v = e.target.value;
        handleChange(v === "" ? null : Number(v));
      }}
      disabled={saving}
      className="text-xs border border-gray-200 rounded px-1 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
      title="Selecciona el tipus d'IVA"
    >
      <option value="">—</option>
      {[0, 4, 10, 21].map((r) => (
        <option key={r} value={r}>
          {r}%
        </option>
      ))}
    </select>
  );
}

// ── Columna adjunt ───────────────────────────────────────────────────────────
function AttachmentCell({
  purchase,
  onSaved,
}: {
  purchase: Purchase;
  onSaved: (updated: Partial<Purchase>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const base64 = await fileToBase64(file);
      const res = await apiJson<{ ok: boolean }>(`/api/purchases/${purchase.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          attachmentBase64: base64,
          attachmentMediaType: file.type,
          currentAttachmentPath: purchase.attachmentPath ?? null,
        }),
      });
      if (res.ok) {
        // Recarregar URL signada recarregant la pàgina no és necessari;
        // indiquem que hi ha adjunt perquè el pare actualitzi l'estat
        onSaved({ attachmentPath: "__pending__", attachmentUrl: null });
      }
    } catch {
      setError("Error pujant el fitxer");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    if (!confirm("Eliminar l'adjunt?")) return;
    setUploading(true);
    try {
      await apiJson(`/api/purchases/${purchase.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          removeAttachment: true,
          currentAttachmentPath: purchase.attachmentPath,
        }),
      });
      onSaved({ attachmentPath: null, attachmentUrl: null });
    } finally {
      setUploading(false);
    }
  }

  if (uploading) {
    return <span className="text-xs text-gray-400">Pujant…</span>;
  }

  if (purchase.attachmentUrl) {
    return (
      <div className="flex items-center gap-1">
        <a
          href={purchase.attachmentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 text-base"
          title="Veure adjunt"
        >
          📎
        </a>
        <button
          onClick={handleRemove}
          className="text-[10px] text-gray-300 hover:text-red-500"
          title="Eliminar adjunt"
        >
          ✕
        </button>
      </div>
    );
  }

  if (purchase.attachmentPath && purchase.attachmentPath !== "__pending__") {
    // Té path però URL no disponible (expirada, recarrega)
    return (
      <span className="text-xs text-gray-400" title="Adjunt desat (recarrega per veure)">
        📎
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => inputRef.current?.click()}
        className="text-gray-300 hover:text-blue-500 text-base"
        title="Pujar PDF o imatge"
      >
        ⬆
      </button>
      {error && <span className="text-[10px] text-red-500">{error}</span>}
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/jpg"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Pàgina principal ─────────────────────────────────────────────────────────
function CompresContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [categoria, setCategoria] = useState("");
  const [from, setFrom] = useState(() => searchParams.get("from") || "");
  const [to, setTo] = useState(() => searchParams.get("to") || "");
  const [activeQuarter, setActiveQuarter] = useState("");

  function handleQuarterChange(val: string) {
    setActiveQuarter(val);
    const range = quarterToDateRange(val);
    if (range) {
      setFrom(range.from);
      setTo(range.to);
    } else {
      setFrom("");
      setTo("");
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (categoria) params.set("categoria", categoria);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const data = await apiJson<{ purchases: Purchase[] }>(`/api/purchases?${params}`);
      setPurchases(data.purchases);
    } catch (err: any) {
      setError(err?.message || "Error carregant les compres.");
    } finally {
      setLoading(false);
    }
  }, [categoria, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleImport() {
    setImporting(true);
    setImportMsg(null);
    setError(null);
    try {
      const res = await apiJson<{ imported: number; skipped: number; message: string }>(
        "/api/purchases/import",
        { method: "POST" }
      );
      setImportMsg(res.message);
      await load();
    } catch (err: any) {
      setError(err?.message || "Error important els fitxers XML.");
    } finally {
      setImporting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminar aquest moviment?")) return;
    try {
      await apiJson(`/api/purchases/${id}`, { method: "DELETE" });
      setPurchases((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      setError(err?.message || "Error eliminant el moviment.");
    }
  }

  function updatePurchaseLocal(id: string, fields: Partial<Purchase>) {
    setPurchases((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...fields } : p))
    );
  }

  // Categories úniques per al filtre
  const categories = Array.from(new Set(purchases.map((p) => p.categoria))).sort();

  // Totals filtrats
  const totalDespeses = purchases
    .filter((p) => p.import < 0)
    .reduce((s, p) => s + Math.abs(p.import), 0);
  const totalAbonaments = purchases
    .filter((p) => p.import > 0)
    .reduce((s, p) => s + p.import, 0);
  const netDespeses = totalDespeses - totalAbonaments;

  const totalSubtotal = purchases
    .filter((p) => p.import < 0 && p.subtotal != null)
    .reduce((s, p) => s + Math.abs(p.subtotal!), 0);
  const totalIva = purchases
    .filter((p) => p.import < 0 && p.iva != null)
    .reduce((s, p) => s + Math.abs(p.iva!), 0);
  const ivaDesglossat = purchases.filter((p) => p.subtotal != null).length;

  return (
    <>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-xl font-semibold text-gray-900">Compres amb targeta</h1>
          <button
            className="btn-primary"
            onClick={handleImport}
            disabled={importing}
          >
            {importing ? "Important..." : "⬆️ Importa XML CompresCaixa"}
          </button>
        </div>

        {importMsg && (
          <div className="rounded-md bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-2">
            {importMsg}
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Pills trimestre */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500">Trimestre:</span>
          <QuarterFilter value={activeQuarter} onChange={handleQuarterChange} />
        </div>

        {/* Filtres */}
        <div className="card grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="categoria">Categoria</label>
            <select
              id="categoria"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            >
              <option value="">Totes</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="from">Des de</label>
            <input
              id="from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="to">Fins a</label>
            <input
              id="to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </div>

        {/* Resum */}
        {!loading && purchases.length > 0 && (
          <div className="card flex flex-wrap gap-6 text-sm">
            <div>
              <p className="text-gray-500">Total despeses</p>
              <p className="font-semibold text-red-600">−{formatAmount(totalDespeses)}</p>
            </div>
            <div>
              <p className="text-gray-500">Abonaments</p>
              <p className="font-semibold text-green-700">+{formatAmount(totalAbonaments)}</p>
            </div>
            {ivaDesglossat > 0 && (
              <>
                <div>
                  <p className="text-gray-500">Base imposable ({ivaDesglossat} mov.)</p>
                  <p className="font-semibold text-gray-800">−{formatAmount(totalSubtotal)}</p>
                </div>
                <div>
                  <p className="text-gray-500">IVA suportat</p>
                  <p className="font-semibold text-orange-600">−{formatAmount(totalIva)}</p>
                </div>
              </>
            )}
            <div>
              <p className="text-gray-500">Net</p>
              <p className={`font-semibold ${netDespeses <= 0 ? "text-green-700" : "text-red-600"}`}>
                −{formatAmount(netDespeses)}
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-gray-500">Carregant...</p>
        ) : purchases.length === 0 ? (
          <div className="card text-center text-sm text-gray-500">
            Cap moviment. Importa un fitxer XML des de &quot;Les Meves Finances&quot; de CaixaBank.
          </div>
        ) : (
          <div className="card overflow-x-auto p-0">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-4 py-2 font-medium">Data</th>
                  <th className="px-4 py-2 font-medium">Concepte</th>
                  <th className="px-4 py-2 font-medium">Categoria</th>
                  <th className="px-4 py-2 font-medium text-right">Subtotal</th>
                  <th className="px-4 py-2 font-medium text-center">IVA%</th>
                  <th className="px-4 py-2 font-medium text-right">IVA€</th>
                  <th className="px-4 py-2 font-medium text-right">Total</th>
                  <th className="px-4 py-2 font-medium">Compte</th>
                  <th className="px-4 py-2 font-medium text-center">Adjunt</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {purchases.map((p) => {
                  const total = Math.abs(p.import);
                  const isExpense = p.import < 0;
                  return (
                    <tr key={p.id} className="hover:bg-blue-50 cursor-pointer" onClick={() => router.push(`/compres/${p.id}`)}>
                      <td className="px-4 py-2 whitespace-nowrap">{p.date}</td>
                      <td className="px-4 py-2">{p.concepte}</td>
                      <td className="px-4 py-2">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                          {p.categoria}
                        </span>
                        {(p as any).importSource === "Holded" && (
                          <span className="ml-1 inline-block px-1.5 py-0.5 rounded-full text-[10px] bg-purple-100 text-purple-700">
                            Holded
                          </span>
                        )}
                      </td>
                      {/* Subtotal */}
                      <td className="px-4 py-2 text-right text-gray-700 whitespace-nowrap">
                        {p.subtotal != null
                          ? <span>{isExpense ? "−" : "+"}{formatAmount(Math.abs(p.subtotal))}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      {/* IVA% selector */}
                      <td className="px-4 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <IvaEditor
                          purchase={p}
                          onSaved={(fields) => updatePurchaseLocal(p.id, fields)}
                        />
                      </td>
                      {/* IVA€ */}
                      <td className="px-4 py-2 text-right text-orange-600 whitespace-nowrap">
                        {p.iva != null
                          ? <span>{isExpense ? "−" : "+"}{formatAmount(Math.abs(p.iva))}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      {/* Total */}
                      <td
                        className={`px-4 py-2 text-right font-medium whitespace-nowrap ${
                          isExpense ? "text-red-600" : "text-green-700"
                        }`}
                      >
                        {isExpense ? "−" : "+"}
                        {formatAmount(total)}
                      </td>
                      <td className="px-4 py-2 text-gray-600 text-xs">{p.compteTarjeta}</td>
                      {/* Adjunt */}
                      <td className="px-4 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <AttachmentCell
                          purchase={p}
                          onSaved={(fields) => updatePurchaseLocal(p.id, fields)}
                        />
                      </td>
                      <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="text-xs text-gray-400 hover:text-red-600"
                          title="Eliminar"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 font-medium bg-gray-50">
                  <td className="px-4 py-2" colSpan={3}>
                    Total ({purchases.length} moviments)
                  </td>
                  <td className="px-4 py-2 text-right text-gray-700">
                    {ivaDesglossat > 0 ? `−${formatAmount(totalSubtotal)}` : ""}
                  </td>
                  <td />
                  <td className="px-4 py-2 text-right text-orange-600">
                    {ivaDesglossat > 0 ? `−${formatAmount(totalIva)}` : ""}
                  </td>
                  <td className="px-4 py-2 text-right text-red-600">
                    −{formatAmount(netDespeses)}
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </main>
    </>
  );
}

export default function CompresPage() {
  return (
    <AuthGuard>
      <CompresContent />
    </AuthGuard>
  );
}
