import { getAdminDb } from "@/lib/firebase-admin";
import { createInvoice } from "@/lib/invoices-db";
import type { Invoice, Quote, QuoteInput } from "@/types";

const COLLECTION = "quotes";

function docToQuote(doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot): Quote {
  const data = doc.data() || {};
  return {
    id: doc.id,
    userId: data.userId ?? "",
    number: data.number ?? null,
    clientId: data.clientId ?? null,
    clientSnapshot: data.clientSnapshot ?? null,
    date: data.date ?? null,
    validUntil: data.validUntil ?? null,
    items: data.items ?? [],
    irpfRate: data.irpfRate ?? null,
    notes: data.notes ?? null,
    status: data.status ?? "DRAFT",
    convertedInvoiceId: data.convertedInvoiceId ?? null,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

export interface QuoteFilters {
  status?: string | null;
  clientId?: string | null;
  search?: string | null;
}

export async function listQuotes(filters: QuoteFilters = {}): Promise<Quote[]> {
  const db = getAdminDb();
  const snapshot = await db.collection(COLLECTION).get();

  let quotes = snapshot.docs.map(docToQuote);

  if (filters.status) {
    quotes = quotes.filter((q) => q.status === filters.status);
  }
  if (filters.clientId) {
    quotes = quotes.filter((q) => q.clientId === filters.clientId);
  }
  if (filters.search) {
    const s = filters.search.toLowerCase();
    quotes = quotes.filter(
      (q) =>
        (q.number && q.number.toLowerCase().includes(s)) ||
        (q.clientSnapshot?.name && q.clientSnapshot.name.toLowerCase().includes(s)) ||
        (q.notes && q.notes.toLowerCase().includes(s))
    );
  }

  quotes.sort((a, b) => {
    const dateA = a.date || "";
    const dateB = b.date || "";
    if (dateA !== dateB) return dateA < dateB ? 1 : -1;
    return (b.number || "").localeCompare(a.number || "");
  });

  return quotes;
}

export async function getQuoteById(id: string): Promise<Quote | null> {
  const db = getAdminDb();
  const doc = await db.collection(COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return docToQuote(doc);
}

/**
 * Genera el següent número de pressupost correlatiu per a l'any indicat,
 * amb format "PRES-AAAA-NNN" (p.ex. PRES-2026-001).
 */
export async function getNextQuoteNumber(year: number): Promise<string> {
  const db = getAdminDb();
  const snapshot = await db.collection(COLLECTION).get();

  const prefix = `PRES-${year}-`;
  let max = 0;
  snapshot.docs.forEach((doc) => {
    const number = (doc.data() || {}).number as string | undefined;
    if (number && number.startsWith(prefix)) {
      const seq = parseInt(number.slice(prefix.length), 10);
      if (!isNaN(seq) && seq > max) max = seq;
    }
  });

  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

export async function createQuote(userId: string, input: QuoteInput): Promise<Quote> {
  const db = getAdminDb();
  const now = new Date().toISOString();

  const date = input.date || now.slice(0, 10);
  const number = input.number || (await getNextQuoteNumber(Number(date.slice(0, 4))));

  const ref = db.collection(COLLECTION).doc();

  const data = {
    userId,
    number,
    clientId: input.clientId ?? null,
    clientSnapshot: input.clientSnapshot ?? null,
    date,
    validUntil: input.validUntil ?? null,
    items: input.items ?? [],
    irpfRate: input.irpfRate ?? null,
    notes: input.notes ?? null,
    status: input.status || "DRAFT",
    convertedInvoiceId: input.convertedInvoiceId ?? null,
    createdAt: now,
    updatedAt: now,
  };

  await ref.set(data);
  return (await getQuoteById(ref.id))!;
}

export async function updateQuote(id: string, input: QuoteInput): Promise<Quote | null> {
  const db = getAdminDb();
  const ref = db.collection(COLLECTION).doc(id);
  const existingDoc = await ref.get();
  if (!existingDoc.exists) return null;

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

  if (input.number !== undefined) updates.number = input.number;
  if (input.clientId !== undefined) updates.clientId = input.clientId;
  if (input.clientSnapshot !== undefined) updates.clientSnapshot = input.clientSnapshot;
  if (input.date !== undefined) updates.date = input.date;
  if (input.validUntil !== undefined) updates.validUntil = input.validUntil;
  if (input.items !== undefined) updates.items = input.items;
  if (input.irpfRate !== undefined) updates.irpfRate = input.irpfRate;
  if (input.notes !== undefined) updates.notes = input.notes;
  if (input.status !== undefined) updates.status = input.status;
  if (input.convertedInvoiceId !== undefined) updates.convertedInvoiceId = input.convertedInvoiceId;

  await ref.update(updates);
  return getQuoteById(id);
}

export async function deleteQuote(id: string): Promise<boolean> {
  const db = getAdminDb();
  const ref = db.collection(COLLECTION).doc(id);
  const doc = await ref.get();
  if (!doc.exists) return false;
  await ref.delete();
  return true;
}

/**
 * Converteix un pressupost en una factura nova. Marca el pressupost com
 * CONVERTED i desa l'id de la factura generada. No es pot convertir més
 * d'una vegada.
 */
export async function convertQuoteToInvoice(id: string): Promise<{ quote: Quote; invoice: Invoice } | null> {
  const quote = await getQuoteById(id);
  if (!quote) return null;

  if (quote.status === "CONVERTED" && quote.convertedInvoiceId) {
    throw new Error("Aquest pressupost ja s'ha convertit en factura.");
  }

  const invoice = await createInvoice(quote.userId, {
    clientId: quote.clientId,
    clientSnapshot: quote.clientSnapshot,
    date: new Date().toISOString().slice(0, 10),
    items: quote.items,
    irpfRate: quote.irpfRate,
    notes: quote.notes,
    status: "DRAFT",
    invoiceType: "ORDINARY",
  });

  const updatedQuote = await updateQuote(id, {
    status: "CONVERTED",
    convertedInvoiceId: invoice.id,
  });

  return { quote: updatedQuote!, invoice };
}
