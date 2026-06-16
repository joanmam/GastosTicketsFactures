import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/server-auth";
import { deletePurchase } from "@/lib/purchases-db";

export const runtime = "nodejs";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  await deletePurchase(user.uid, params.id);
  return NextResponse.json({ ok: true });
}
