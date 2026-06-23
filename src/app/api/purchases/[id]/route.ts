import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/server-auth";
import { deletePurchase, updatePurchase } from "@/lib/purchases-db";
import { savePurchaseAttachment, deletePurchaseAttachment } from "@/lib/firebase-storage";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const body = await req.json();
  const { subtotal, ivaRate, iva, attachmentBase64, attachmentMediaType, removeAttachment, currentAttachmentPath } = body;

  const fields: Record<string, unknown> = {};

  if (subtotal !== undefined) fields.subtotal = subtotal;
  if (ivaRate !== undefined) fields.ivaRate = ivaRate;
  if (iva !== undefined) fields.iva = iva;

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
