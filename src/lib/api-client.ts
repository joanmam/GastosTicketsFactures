"use client";

import { auth } from "@/lib/firebase-client";

/**
 * Wrapper de fetch que afegeix el token d'identitat de Firebase
 * com a capçalera Authorization: Bearer <token>.
 */
export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await auth.currentUser?.getIdToken();

  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(url, { ...options, headers });
}

export async function apiJson<T = unknown>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await apiFetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error((data as any)?.error || `Error ${res.status}`);
  }

  return data as T;
}
