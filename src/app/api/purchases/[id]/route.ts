import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/server-auth";
import { getPurchase, deletePurchase, updatePurchase } from "@/lib/purchases-db";
import { savePurchaseAttachment, deletePurchaseAttachment, getPurchaseAttachmentUrl } from "@/lib/firebase-storage";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const purchase = await getPurchase(user.uid, params.id);
  if (!purchase) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const attachmentUrl = await getPurchaseAttachmentUrl(purchase.attachmentPath);
  return NextResponse.json({ purchase: { ...purchase, attachmentUrl } });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const body = await req.json();
  const { subtotal, ivaRate, iva, ivaLines, concepte, categoria, notes, attachmentBase64, attachmentMediaType, removeAttachment, currentAttachmentPath } = body;

  const fields: Record<string, unknown> = {};

  if (subtotal !== undefined) fields.subtotal = subtotal;
  if (ivaRate !== undefined) fields.ivaRate = ivaRate;
  if (iva !== undefined) fields.iva = iva;
  if (ivaLines !== undefined) fields.ivaLines = ivaLines;
  if (concepte !== undefined) fields.concepte = concepte;
  if (categoria !== undefined) fields.categoria = categoria;
  if (notes !== undefined) fields.notes = notes;

  if (removeAttachment && currentAttachmentPath) {
    await deletePurchaseAttachment(currentAttachmentPath);
    fields.attachmentPath = null;
  } else if (attachmentBase64 && attachmentMediaType) {
    if (currentAttachmentPath) await deletePurchaseAttachment(currentAttachmentPath);
    const path = await savePurchaseAttachment(user.uid, attachmentBase64, attachmentMediaType);
    fields.attachmentPath = path;
  }

  await updatePurchase(user.uid, params.id, fields as any);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  await deletePurchase(user.uid, params.id);
  return NextResponse.json({ ok: true });
}
