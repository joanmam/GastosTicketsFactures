"use client";

import { useState, Suspense, useEffect } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { auth } from "@/lib/firebase-client";
import { useAuth } from "@/components/AuthProvider";

function errorMessage(err: any): string {
  switch (err?.code) {
    case "auth/email-already-in-use":
      return "Ja existeix un compte amb aquest correu.";
    case "auth/invalid-email":
      return "El correu electrònic no és vàlid.";
    case "auth/weak-password":
      return "La contrasenya ha de tenir com a mínim 6 caràcters.";
    default:
      return "No s'ha pogut crear el compte. Torna-ho a provar.";
  }
}

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

    if (password !== confirmPassword) {
      setError("Les contrasenyes no coincideixen.");
      return;
    }

    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      if (name.trim()) {
        await updateProfile(credential.user, { displayName: name.trim() });
      }
      router.push(params.get("callbackUrl") || "/tickets");
      router.refresh();
    } catch (err: any) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm card">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Gastos · Tickets</h1>
        <p className="text-sm text-gray-500 mb-6">Crea el teu compte per gestionar els tickets de despeses.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name">Nom</label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
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
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="confirmPassword">Repeteix la contrasenya</label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Creant compte..." : "Crear compte"}
          </button>
        </form>
        <p className="text-sm text-gray-500 mt-4 text-center">
          Ja tens compte?{" "}
          <Link href="/login" className="text-brand-600 hover:underline">
            Inicia sessió
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
