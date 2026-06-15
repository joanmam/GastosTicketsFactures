"use client";

import { useEffect, useState, useCallback } from "react";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import { apiJson } from "@/lib/api-client";
import { VAT_RATES } from "@/lib/invoice-constants";
import type { LineItemCatalogEntry } from "@/types";

function formatAmount(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("ca-ES", { style: "currency", currency: "EUR" }).format(n);
}

function ConceptesPageContent() {
  const [items, setItems] = useState<LineItemCatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ description: string; unitPrice: number; vatRate: number } | null>(
    null
  );
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const data = await apiJson<{ items: LineItemCatalogEntry[] }>(`/api/line-items?${params.toString()}`);
      setItems(data.items);
    } catch (err: any) {
      setError(err?.message || "Error carregant el catàleg de conceptes.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(item: LineItemCatalogEntry) {
    setEditingId(item.id);
    setEditDraft({
      description: item.description || "",
      unitPrice: item.unitPrice ?? 0,
      vatRate: item.vatRate ?? 21,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft(null);
  }

  async function saveEdit(id: string) {
    if (!editDraft) return;
    setSavingId(id);
    setError(null);
    try {
      await apiJson(`/api/line-items/${id}`, {
        method: "PATCH",
        body: JSON.stringify(editDraft),
      });
      cancelEdit();
      await load();
    } catch (err: any) {
      setError(err?.message || "Error desant el concepte.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Vols eliminar aquest concepte del catàleg?")) return;
    setSavingId(id);
    setError(null);
    try {
      await apiJson(`/api/line-items/${id}`, { method: "DELETE" });
      await load();
    } catch (err: any) {
      setError(err?.message || "Error eliminant el concepte.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-xl font-semibold text-gray-900">📚 Conceptes</h1>
        </div>

        <p className="text-sm text-gray-500">
          Catàleg de descripcions, preus i IVA reutilitzats a les factures. Es genera i actualitza automàticament en
          desar factures, i s&apos;ofereix com a autocompletar en crear noves línies.
        </p>

        <div className="card">
          <label htmlFor="search">Cerca</label>
          <input
            id="search"
            type="text"
            placeholder="Descripció..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {loading ? (
          <p className="text-sm text-gray-500">Carregant...</p>
        ) : items.length === 0 ? (
          <div className="card text-center text-sm text-gray-500">No s&apos;ha trobat cap concepte.</div>
        ) : (
          <div className="card overflow-x-auto p-0">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-4 py-2 font-medium">Descripció</th>
                  <th className="px-4 py-2 font-medium">Preu unitari</th>
                  <th className="px-4 py-2 font-medium">% IVA</th>
                  <th className="px-4 py-2 font-medium">Usos</th>
                  <th className="px-4 py-2 font-medium">Últim ús</th>
                  <th className="px-4 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => {
                  const isEditing = editingId === item.id;
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editDraft?.description ?? ""}
                            onChange={(e) =>
                              setEditDraft((d) => (d ? { ...d, description: e.target.value } : d))
                            }
                          />
                        ) : (
                          <span className="font-medium text-gray-900">{item.description || "—"}</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editDraft?.unitPrice ?? 0}
                            onChange={(e) =>
                              setEditDraft((d) => (d ? { ...d, unitPrice: Number(e.target.value) } : d))
                            }
                          />
                        ) : (
                          formatAmount(item.unitPrice)
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {isEditing ? (
                          <select
                            value={editDraft?.vatRate ?? 21}
                            onChange={(e) =>
                              setEditDraft((d) => (d ? { ...d, vatRate: Number(e.target.value) } : d))
                            }
                          >
                            {VAT_RATES.map((r) => (
                              <option key={r} value={r}>
                                {r}%
                              </option>
                            ))}
                          </select>
                        ) : item.vatRate !== null && item.vatRate !== undefined ? (
                          `${item.vatRate}%`
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-2">{item.usageCount}</td>
                      <td className="px-4 py-2">{item.lastUsedDate || "—"}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {isEditing ? (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className="btn-primary text-xs"
                              onClick={() => saveEdit(item.id)}
                              disabled={savingId === item.id}
                            >
                              Desar
                            </button>
                            <button type="button" className="btn-secondary text-xs" onClick={cancelEdit}>
                              Cancel·lar
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button type="button" className="btn-secondary text-xs" onClick={() => startEdit(item)}>
                              Editar
                            </button>
                            <button
                              type="button"
                              className="btn-danger text-xs"
                              onClick={() => handleDelete(item.id)}
                              disabled={savingId === item.id}
                            >
                              Eliminar
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}

export default function ConceptesPage() {
  return (
    <AuthGuard>
      <ConceptesPageContent />
    </AuthGuard>
  );
}
