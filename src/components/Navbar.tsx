"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { apiJson } from "@/lib/api-client";
import pkg from "../../package.json";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    apiJson<{ unreadCount: number }>("/api/notifications?from=2026-01-01")
      .then((d) => setUnreadCount(d.unreadCount))
      .catch(() => {});
  }, [user]);

  const linkClass = (href: string) =>
    `px-2 py-1.5 rounded-md text-sm font-medium ${
      pathname === href
        ? "bg-brand-600 text-white"
        : "text-gray-600 hover:bg-gray-100"
    }`;

  const sectionLinkClass = (href: string) =>
    `px-2 py-1.5 rounded-md text-sm font-medium ${
      pathname === href || pathname.startsWith(`${href}/`)
        ? "bg-brand-600 text-white"
        : "text-gray-600 hover:bg-gray-100"
    }`;

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-1 flex-nowrap">
        <div className="flex items-center gap-1 flex-nowrap">
          <span className="font-semibold text-gray-900 mr-1 whitespace-nowrap">
            🧾 Gastos
            <span className="ml-1 text-xs font-normal text-gray-400">v{pkg.version}</span>
          </span>
          <Link href="/tickets" className={linkClass("/tickets")}>Tickets</Link>
          <Link href="/tickets/new" className={linkClass("/tickets/new")}>Escanejar</Link>
          <Link href="/compres" className={sectionLinkClass("/compres")}>🛒 Compres</Link>
          <span className="border-l border-gray-200 h-5 mx-1" />
          <Link href="/clients" className={sectionLinkClass("/clients")}>👥 Clients</Link>
          <Link href="/invoices" className={sectionLinkClass("/invoices")}>🧾 Factures</Link>
          <Link href="/conceptes" className={sectionLinkClass("/conceptes")}>📚 Conceptes</Link>
          <Link href="/pressupostos" className={sectionLinkClass("/pressupostos")}>📋 Pressupostos</Link>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600 flex-nowrap whitespace-nowrap">
          <Link href="/notificacions" className={`relative ${linkClass("/notificacions")}`}>
            🔔 Notificacions
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>
          <Link href="/facturacio" className={linkClass("/facturacio")}>📊 Resum</Link>
          <span className="border-l border-gray-200 h-5" />
          {(user?.displayName || user?.email) && <span>{user.displayName || user.email}</span>}
          <button onClick={handleSignOut} className="text-sm text-gray-500 hover:text-gray-900">
            Tancar sessió
          </button>
        </div>
      </div>
    </nav>
  );
}
