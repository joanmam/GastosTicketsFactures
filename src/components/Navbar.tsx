"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();

  const linkClass = (href: string) =>
    `px-3 py-2 rounded-md text-sm font-medium ${
      pathname === href
        ? "bg-brand-600 text-white"
        : "text-gray-600 hover:bg-gray-100"
    }`;

  const sectionLinkClass = (href: string) =>
    `px-3 py-2 rounded-md text-sm font-medium ${
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
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-gray-900 mr-2">🧾 Gastos</span>
          <Link href="/tickets" className={linkClass("/tickets")}>
            Tickets
          </Link>
          <Link href="/tickets/new" className={linkClass("/tickets/new")}>
            Escanejar
          </Link>
          <Link href="/compres" className={sectionLinkClass("/compres")}>
            🛒 Compres
          </Link>
          <span className="border-l border-gray-200 h-5 mx-1" />
          <Link href="/clients" className={sectionLinkClass("/clients")}>
            👥 Clients
          </Link>
          <Link href="/invoices" className={sectionLinkClass("/invoices")}>
            🧾 Factures
          </Link>
          <Link href="/conceptes" className={sectionLinkClass("/conceptes")}>
            📚 Conceptes
          </Link>
          <Link href="/pressupostos" className={sectionLinkClass("/pressupostos")}>
            📋 Pressupostos
          </Link>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <Link href="/facturacio" className={linkClass("/facturacio")}>
            📊 Resum
          </Link>
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
