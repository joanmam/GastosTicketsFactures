import type { Metadata, Viewport } from "next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "Gastos · Tickets",
  description: "Escaneja i gestiona els tickets de despeses",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ca">
      <body className="min-h-screen">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
