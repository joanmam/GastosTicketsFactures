import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/server-auth";
import { createQuote, listQuotes } from "@/lib/quotes-db";
import type { QuoteInput } from "@/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const { searchParams } = new URL(req.url);

  const quotes = await listQuotes({
    status: searchParams.get("status"),
    clientId: searchParams.get("clientId"),
    search: searchParams.get("search"),
  });

  return NextResponse.json({ quotes });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  try {
    const body = (await req.json()) as QuoteInput;
    const quote = await createQuote(user.uid, body);
    return NextResponse.json({ quote }, { status: 201 });
  } catch (err: any) {
    console.error("Error creating quote:", err);
    return NextResponse.json({ error: err?.message || "Error creant el pressupost." }, { status: 500 });
  }
}
