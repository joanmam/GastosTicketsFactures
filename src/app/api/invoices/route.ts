import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/server-auth";
import { createInvoice, listInvoices } from "@/lib/invoices-db";
import type { InvoiceInput } from "@/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const { searchParams } = new URL(req.url);

  const invoices = await listInvoices({
    status: searchParams.get("status"),
    clientId: searchParams.get("clientId"),
    from: searchParams.get("from"),
    to: searchParams.get("to"),
    quarter: searchParams.get("quarter"),
    search: searchParams.get("search"),
  });

  return NextResponse.json({ invoices });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  try {
    const body = (await req.json()) as InvoiceInput;
    const invoice = await createInvoice(user.uid, body);
    return NextResponse.json({ invoice }, { status: 201 });
  } catch (err: any) {
    console.error("Error creating invoice:", err);
    return NextResponse.json({ error: err?.message || "Error creant la factura." }, { status: 500 });
  }
}
