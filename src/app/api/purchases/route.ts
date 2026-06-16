import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/server-auth";
import { listPurchasesForUser } from "@/lib/purchases-db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const { searchParams } = new URL(req.url);
  const categoria = searchParams.get("categoria") || undefined;
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;

  const purchases = await listPurchasesForUser(user.uid, { categoria, from, to });
  return NextResponse.json({ purchases });
}
