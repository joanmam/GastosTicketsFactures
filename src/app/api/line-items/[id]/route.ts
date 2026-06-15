import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/server-auth";
import { deleteCatalogEntry, updateCatalogEntry } from "@/lib/line-item-catalog-db";
import type { LineItemCatalogInput } from "@/types";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const body = (await req.json()) as LineItemCatalogInput;
  const item = await updateCatalogEntry(params.id, body);
  if (!item) {
    return NextResponse.json({ error: "Concepte no trobat" }, { status: 404 });
  }

  return NextResponse.json({ item });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const ok = await deleteCatalogEntry(params.id);
  if (!ok) {
    return NextResponse.json({ error: "Concepte no trobat" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
