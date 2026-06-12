"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-500">Carregant...</p>
      </div>
    );
  }

  return <>{children}</>;
}
