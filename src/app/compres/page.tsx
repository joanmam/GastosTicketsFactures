"use client";

import { useEffect, useState, useCallback } from "react";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import { apiJson } from "@/lib/api-client";
import type { Purchase } from "@/types";

function formatAmount(n: number) {
  return new Intl.NumberFormat("ca-ES", { style: "currency", currency: "EUR" }).format(n);
}

function CompresContent() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [categoria, setCategoria] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

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

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
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
          <div className="card grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Total despeses</p>
              <p className="font-semibold text-red-600">−{formatAmount(totalDespeses)}</p>
            </div>
            <div>
              <p className="text-gray-500">Abonaments</p>
              <p className="font-semibold text-green-700">+{formatAmount(totalAbonaments)}</p>
            </div>
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
                  <th className="px-4 py-2 font-medium text-right">Import</th>
                  <th className="px-4 py-2 font-medium">Compte/Targeta</th>
                  <th className="px-4 py-2 font-medium">Fitxer</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {purchases.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 whitespace-nowrap">{p.date}</td>
                    <td className="px-4 py-2">{p.concepte}</td>
                    <td className="px-4 py-2">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                        {p.categoria}
                      </span>
                    </td>
                    <td
                      className={`px-4 py-2 text-right font-medium whitespace-nowrap ${
                        p.import < 0 ? "text-red-600" : "text-green-700"
                      }`}
                    >
                      {p.import < 0 ? "−" : "+"}
                      {formatAmount(Math.abs(p.import))}
                    </td>
                    <td className="px-4 py-2 text-gray-600">{p.compteTarjeta}</td>
                    <td className="px-4 py-2 text-xs text-gray-400 truncate max-w-[160px]">
                      {p.sourceFile}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-xs text-gray-400 hover:text-red-600"
                        title="Eliminar"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 font-medium">
                  <td className="px-4 py-2" colSpan={3}>
                    Total ({purchases.length} moviments)
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
