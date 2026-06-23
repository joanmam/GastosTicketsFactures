import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/server-auth";
import { listPurchasesForUser, createPurchases } from "@/lib/purchases-db";
import { getPurchaseAttachmentUrl, savePurchaseAttachment } from "@/lib/firebase-storage";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const { searchParams } = new URL(req.url);
  const categoria = searchParams.get("categoria") || undefined;
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;

  const purchases = await listPurchasesForUser(user.uid, { categoria, from, to });

  // Generar URLs signades per als adjunts
  const withUrls = await Promise.all(
    purchases.map(async (p) => ({
      ...p,
      attachmentUrl: await getPurchaseAttachmentUrl(p.attachmentPath),
    }))
  );

  return NextResponse.json({ purchases: withUrls });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const body = await req.json();
  const {
    date, concepte, categoria, import: importAmt,
    subtotal, ivaRate, iva, notes,
    tipusMoviment, compteTarjeta, sourceFile, sourceKey,
    attachmentBase64, attachmentMediaType,
  } = body;

  let attachmentPath: string | null = null;
  if (attachmentBase64 && attachmentMediaType) {
    attachmentPath = await savePurchaseAttachment(user.uid, attachmentBase64, attachmentMediaType);
  }

  await createPurchases(user.uid, [{
    date: date || new Date().toISOString().slice(0, 10),
    concepte: concepte || "",
    categoria: categoria || "Altres",
    import: importAmt ?? 0,
    tipusMoviment: tipusMoviment || "Despesa (D)",
    compteTarjeta: compteTarjeta || "",
    sourceFile: sourceFile || "Escaner",
    sourceKey: sourceKey || `scan-${Date.now()}`,
    subtotal: subtotal ?? null,
    ivaRate: ivaRate ?? null,
    iva: iva ?? null,
    notes: notes ?? null,
    attachmentPath,
    importSource: "Escaner",
  }]);

  return NextResponse.json({ ok: true });
}
