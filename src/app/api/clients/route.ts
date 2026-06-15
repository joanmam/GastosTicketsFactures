import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/server-auth";
import { createClient, listClients } from "@/lib/clients-db";
import type { ClientInput } from "@/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const { searchParams } = new URL(req.url);
  const clients = await listClients({ search: searchParams.get("search") });

  return NextResponse.json({ clients });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  try {
    const body = (await req.json()) as ClientInput;
    const client = await createClient(user.uid, body);
    return NextResponse.json({ client }, { status: 201 });
  } catch (err: any) {
    console.error("Error creating client:", err);
    return NextResponse.json({ error: err?.message || "Error creant el client." }, { status: 500 });
  }
}
