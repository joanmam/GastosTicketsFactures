"use client";

import { useState, Suspense, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { auth } from "@/lib/firebase-client";
import { useAuth } from "@/components/AuthProvider";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace(params.get("callbackUrl") || "/tickets");
    }
  }, [authLoading, user, params, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push(params.get("callbackUrl") || "/tickets");
      router.refresh();
    } catch {
      setError("Correu o contrasenya incorrectes.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm card">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Gastos · Tickets</h1>
        <p className="text-sm text-gray-500 mb-6">
          Inicia sessió per gestionar els tickets de despeses.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email">Correu electrònic</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="password">Contrasenya</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Entrant..." : "Entrar"}
          </button>
        </form>
        <p className="text-sm text-gray-500 mt-4 text-center">
          Encara no tens compte?{" "}
          <Link href="/register" className="text-brand-600 hover:underline">
            Crea&apos;n un
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
