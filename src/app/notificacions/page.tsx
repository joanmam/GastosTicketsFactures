"use client";

import { useEffect, useState, useCallback } from "react";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import { apiJson } from "@/lib/api-client";
import type { NotificationWithRead, NotificationSource } from "@/types";

const SOURCE_LABEL: Record<NotificationSource, string> = {
  AEAT: "🏛️ AEAT",
  SS: "🏥 Seguretat Social",
  BOE: "📜 BOE",
  DOGC: "📋 DOGC",
};

const SOURCE_COLOR: Record<NotificationSource, string> = {
  AEAT: "bg-blue-100 text-blue-800",
  SS: "bg-green-100 text-green-800",
  BOE: "bg-yellow-100 text-yellow-800",
  DOGC: "bg-purple-100 text-purple-800",
};

function NotificacionsContent() {
  const [notifications, setNotifications] = useState<NotificationWithRead[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [onlyUnread, setOnlyUnread] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ from: "2026-01-01" });
      if (sourceFilter) params.set("source", sourceFilter);
      if (onlyUnread) params.set("onlyUnread", "true");
      const data = await apiJson<{ notifications: NotificationWithRead[]; unreadCount: number }>(
        `/api/notifications?${params}`
      );
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err: any) {
      setError(err?.message || "Error carregant les notificacions.");
    } finally {
      setLoading(false);
    }
  }, [sourceFilter, onlyUnread]);

  useEffect(() => { load(); }, [load]);

  async function handleSync() {
    setSyncing(true);
    setSyncMsg(null);
    setError(null);
    try {
      const res = await apiJson<{ message: string; imported: number }>(
        "/api/notifications/sync",
        { method: "POST" }
      );
      setSyncMsg(res.message);
      await load();
    } catch (err: any) {
      setError(err?.message || "Error sincronitzant.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleRead(id: string) {
    try {
      await apiJson("/api/notifications/read", { method: "POST", body: JSON.stringify({ id }) });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  }

  async function handleReadAll() {
    try {
      await apiJson("/api/notifications/read", { method: "POST", body: JSON.stringify({ all: true }) });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err: any) {
      setError(err?.message || "Error marcant com a llegides.");
    }
  }

  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-gray-900">Notificacions</h1>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">
                {unreadCount} no llegides
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <button className="btn-secondary text-sm" onClick={handleReadAll}>
                ✓ Marcar totes com a llegides
              </button>
            )}
            <button className="btn-primary text-sm" onClick={handleSync} disabled={syncing}>
              {syncing ? "Sincronitzant..." : "🔄 Sincronitzar ara"}
            </button>
          </div>
        </div>

        {syncMsg && (
          <div className="rounded-md bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-2">
            {syncMsg}
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Filtres */}
        <div className="card flex flex-wrap gap-4 items-center">
          <div>
            <label htmlFor="source" className="text-sm text-gray-600 mr-2">Font:</label>
            <select
              id="source"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="text-sm"
            >
              <option value="">Totes</option>
              {(Object.keys(SOURCE_LABEL) as NotificationSource[]).map((s) => (
                <option key={s} value={s}>{SOURCE_LABEL[s]}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyUnread}
              onChange={(e) => setOnlyUnread(e.target.checked)}
              className="rounded"
            />
            Només no llegides
          </label>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Carregant...</p>
        ) : notifications.length === 0 ? (
          <div className="card text-center text-sm text-gray-500 py-8">
            <p className="text-2xl mb-2">🔔</p>
            <p>Cap notificació. Prem &quot;Sincronitzar ara&quot; per obtenir les darreres novetats.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`card flex gap-3 transition-colors ${n.isRead ? "opacity-60" : "border-l-4 border-brand-500"}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${SOURCE_COLOR[n.source]}`}>
                        {SOURCE_LABEL[n.source]}
                      </span>
                      <span className="text-xs text-gray-400">{n.publishedAt}</span>
                    </div>
                    {!n.isRead && (
                      <button
                        onClick={() => handleRead(n.id)}
                        className="text-xs text-gray-400 hover:text-gray-600 whitespace-nowrap"
                      >
                        Marcar llegida
                      </button>
                    )}
                  </div>
                  <a
                    href={n.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block mt-1 text-sm font-medium text-brand-700 hover:underline"
                    onClick={() => !n.isRead && handleRead(n.id)}
                  >
                    {n.title}
                  </a>
                  {n.summary && (
                    <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{n.summary}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-gray-400 text-center pt-2">
          Fonts: AEAT · Seguretat Social · BOE · DOGC — actualització setmanal automàtica
        </p>
      </main>
    </>
  );
}

export default function NotificacionsPage() {
  return (
    <AuthGuard>
      <NotificacionsContent />
    </AuthGuard>
  );
}
