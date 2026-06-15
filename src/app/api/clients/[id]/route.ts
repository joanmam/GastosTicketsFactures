import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/server-auth";
import { deleteClient, getClientById, updateClient } from "@/lib/clients-db";
import type { ClientInput } from "@/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const client = await getClientById(params.id);
  if (!client) {
    return NextResponse.json({ error: "Client no trobat" }, { status: 404 });
  }

  return NextResponse.json({ client });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const body = (await req.json()) as ClientInput;
  const client = await updateClient(params.id, body);
  if (!client) {
    return NextResponse.json({ error: "Client no trobat" }, { status: 404 });
  }

  return NextResponse.json({ client });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const ok = await deleteClient(params.id);
  if (!ok) {
    return NextResponse.json({ error: "Client no trobat" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
