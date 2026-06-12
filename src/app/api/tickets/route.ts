import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/server-auth";
import { createTicket, listTickets } from "@/lib/tickets-db";
import { saveTicketImage } from "@/lib/firebase-storage";
import { TicketInput } from "@/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const { searchParams } = new URL(req.url);

  const tickets = await listTickets({
    from: searchParams.get("from"),
    to: searchParams.get("to"),
    category: searchParams.get("category"),
    search: searchParams.get("search"),
    userId: searchParams.get("userId"),
  });

  return NextResponse.json({ tickets });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const body = (await req.json()) as TicketInput;

  let imagePath: string | null = null;
  if (body.imageBase64 && body.imageMediaType) {
    imagePath = await saveTicketImage(user.uid, body.imageBase64, body.imageMediaType);
  }

  const ticket = await createTicket(
    user.uid,
    user.name || user.email || null,
    imagePath,
    body
  );

  return NextResponse.json({ ticket }, { status: 201 });
}
