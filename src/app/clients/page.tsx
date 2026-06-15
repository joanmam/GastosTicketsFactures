"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import { apiJson } from "@/lib/api-client";
import type { Client } from "@/types";

function ClientsPageContent() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const data = await apiJson<{ clients: Client[] }>(`/api/clients?${params.toString()}`);
      setClients(data.clients);
    } catch (err: any) {
      setError(err?.message || "Error carregant els clients.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-xl font-semibold text-gray-900">Clients</h1>
          <Link href="/clients/new" className="btn-primary">
            + Nou client
          </Link>
        </div>

        <div className="card">
          <label htmlFor="search">Cerca</label>
          <input
            id="search"
            type="text"
            placeholder="Nom, NIF o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {loading ? (
          <p className="text-sm text-gray-500">Carregant...</p>
        ) : clients.length === 0 ? (
          <div className="card text-center text-sm text-gray-500">No s&apos;ha trobat cap client.</div>
        ) : (
          <div className="card overflow-x-auto p-0">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-4 py-2 font-medium">Nom</th>
                  <th className="px-4 py-2 font-medium">NIF/CIF</th>
                  <th className="px-4 py-2 font-medium">Email</th>
                  <th className="px-4 py-2 font-medium">Telèfon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clients.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 cursor-pointer">
                    <td className="px-0">
                      <Link href={`/clients/${c.id}`} className="flex">
                        <span className="px-4 py-2 block w-full whitespace-nowrap font-medium text-gray-900">
                          {c.name || "—"}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-2">
                      <Link href={`/clients/${c.id}`}>{c.taxId || "—"}</Link>
                    </td>
                    <td className="px-4 py-2">
                      <Link href={`/clients/${c.id}`}>{c.email || "—"}</Link>
                    </td>
                    <td className="px-4 py-2">
                      <Link href={`/clients/${c.id}`}>{c.phone || "—"}</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}

export default function ClientsPage() {
  return (
    <AuthGuard>
      <ClientsPageContent />
    </AuthGuard>
  );
}
