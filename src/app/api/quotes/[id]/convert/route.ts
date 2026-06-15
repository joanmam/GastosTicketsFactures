import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/server-auth";
import { convertQuoteToInvoice } from "@/lib/quotes-db";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  try {
    const result = await convertQuoteToInvoice(params.id);
    if (!result) {
      return NextResponse.json({ error: "Pressupost no trobat" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Error converting quote to invoice:", err);
    return NextResponse.json({ error: err?.message || "Error convertint el pressupost en factura." }, { status: 500 });
  }
}
