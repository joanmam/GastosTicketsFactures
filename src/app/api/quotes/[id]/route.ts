import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/server-auth";
import { deleteQuote, getQuoteById, updateQuote } from "@/lib/quotes-db";
import type { QuoteInput } from "@/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const quote = await getQuoteById(params.id);
  if (!quote) {
    return NextResponse.json({ error: "Pressupost no trobat" }, { status: 404 });
  }

  return NextResponse.json({ quote });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  try {
    const body = (await req.json()) as QuoteInput;
    const quote = await updateQuote(params.id, body);
    if (!quote) {
      return NextResponse.json({ error: "Pressupost no trobat" }, { status: 404 });
    }
    return NextResponse.json({ quote });
  } catch (err: any) {
    console.error("Error updating quote:", err);
    return NextResponse.json({ error: err?.message || "Error desant el pressupost." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const ok = await deleteQuote(params.id);
  if (!ok) {
    return NextResponse.json({ error: "Pressupost no trobat" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
