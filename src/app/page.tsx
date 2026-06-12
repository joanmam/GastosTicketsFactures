"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace("/tickets");
    } else {
      router.replace("/login");
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Carregant...</p>
    </div>
  );
}
