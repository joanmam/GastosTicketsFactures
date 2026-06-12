import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/server-auth";
import { deleteTicket, getTicketById, updateTicket } from "@/lib/tickets-db";
import { saveTicketImage } from "@/lib/firebase-storage";
import { TicketInput } from "@/types";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const ticket = await getTicketById(params.id);
  if (!ticket) {
    return NextResponse.json({ error: "Ticket no trobat" }, { status: 404 });
  }

  return NextResponse.json({ ticket });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const body = (await req.json()) as TicketInput;

  let newImagePath: string | null = null;
  if (body.imageBase64 && body.imageMediaType) {
    newImagePath = await saveTicketImage(user.uid, body.imageBase64, body.imageMediaType);
  }

  const ticket = await updateTicket(params.id, body, newImagePath);
  if (!ticket) {
    return NextResponse.json({ error: "Ticket no trobat" }, { status: 404 });
  }

  return NextResponse.json({ ticket });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const ok = await deleteTicket(params.id);
  if (!ok) {
    return NextResponse.json({ error: "Ticket no trobat" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
