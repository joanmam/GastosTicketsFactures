import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/server-auth";
import { createCatalogEntry, listCatalogEntries } from "@/lib/line-item-catalog-db";
import type { LineItemCatalogInput } from "@/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const { searchParams } = new URL(req.url);
  const items = await listCatalogEntries({ search: searchParams.get("search") });

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  try {
    const body = (await req.json()) as LineItemCatalogInput;
    const item = await createCatalogEntry(user.uid, body);
    return NextResponse.json({ item }, { status: 201 });
  } catch (err: any) {
    console.error("Error creating catalog entry:", err);
    return NextResponse.json({ error: err?.message || "Error desant el concepte." }, { status: 500 });
  }
}
