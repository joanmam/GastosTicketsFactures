import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/server-auth";
import { deleteInvoice, getInvoiceById, updateInvoice } from "@/lib/invoices-db";
import type { InvoiceInput } from "@/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const invoice = await getInvoiceById(params.id);
  if (!invoice) {
    return NextResponse.json({ error: "Factura no trobada" }, { status: 404 });
  }

  return NextResponse.json({ invoice });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  try {
    const body = (await req.json()) as InvoiceInput;
    const invoice = await updateInvoice(params.id, body);
    if (!invoice) {
      return NextResponse.json({ error: "Factura no trobada" }, { status: 404 });
    }
    return NextResponse.json({ invoice });
  } catch (err: any) {
    console.error("Error updating invoice:", err);
    return NextResponse.json({ error: err?.message || "Error desant la factura." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const ok = await deleteInvoice(params.id);
  if (!ok) {
    return NextResponse.json({ error: "Factura no trobada" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
