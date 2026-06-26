import { getAdminDb } from "@/lib/firebase-admin";
import { deleteInvoiceFile, getSignedInvoiceFileUrl, saveInvoiceFile } from "@/lib/invoice-storage";
import { defaultAeatInfo as defaultAeat, defaultInvoiceChecklist as defaultChecklist, quarterOf } from "@/lib/invoice-calc";
import { upsertFromInvoiceItem } from "@/lib/line-item-catalog-db";
import type { AeatInfo, CatalogInvoiceRef, Invoice, InvoiceChecklist, InvoiceInput } from "@/types";

const COLLECTION = "invoices";

function docToInvoice(doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot): Invoice {
  const data = doc.data() || {};
  return {
    id: doc.id,
    userId: data.userId ?? "",
    number: data.number ?? null,
    importSource: data.importSource ?? null,
    clientId: data.clientId ?? null,
    clientSnapshot: data.clientSnapshot ?? null,
    date: data.date ?? null,
    dueDate: data.dueDate ?? null,
    items: data.items ?? [],
    irpfRate: data.irpfRate ?? null,
    notes: data.notes ?? null,
    status: data.status ?? "DRAFT",
    invoiceType: data.invoiceType ?? "ORDINARY",
    rectifiesInvoiceId: data.rectifiesInvoiceId ?? null,
    rectificationReason: data.rectificationReason ?? null,
    aeat: { ...defaultAeat(), ...(data.aeat || {}) },
    checklist: { ...defaultChecklist(), ...(data.checklist || {}) },
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

export interface InvoiceFilters {
  status?: string | null;
  clientId?: string | null;
  from?: string | null;
  to?: string | null;
  quarter?: string | null; // format "AAAA-T" ex. "2026-2"
  search?: string | null;
}

export async function listInvoices(filters: InvoiceFilters = {}): Promise<Invoice[]> {
  const db = getAdminDb();
  const snapshot = await db.collection(COLLECTION).get();

  let invoices = snapshot.docs.map(docToInvoice);

  if (filters.status) {
    invoices = invoices.filter((i) => i.status === filters.status);
  }
  if (filters.clientId) {
    invoices = invoices.filter((i) => i.clientId === filters.clientId);
  }
  if (filters.from) {
    invoices = invoices.filter((i) => !i.date || i.date >= filters.from!);
  }
  if (filters.to) {
    invoices = invoices.filter((i) => !i.date || i.date <= filters.to!);
  }
  if (filters.quarter) {
    const [yearStr, qStr] = filters.quarter.split("-");
    const year = Number(yearStr);
    const q = Number(qStr);
    invoices = invoices.filter((i) => {
      if (!i.date) return false;
      return Number(i.date.slice(0, 4)) === year && quarterOf(i.date) === q;
    });
  }
  if (filters.search) {
    const s = filters.search.toLowerCase();
    invoices = invoices.filter(
      (i) =>
        (i.number && i.number.toLowerCase().includes(s)) ||
        (i.clientSnapshot?.name && i.clientSnapshot.name.toLowerCase().includes(s)) ||
        (i.notes && i.notes.toLowerCase().includes(s))
    );
  }

  invoices.sort((a, b) => {
    const dateA = a.date || "";
    const dateB = b.date || "";
    if (dateA !== dateB) return dateA < dateB ? 1 : -1;
    return (b.number || "").localeCompare(a.number || "");
  });

  await Promise.all(
    invoices.map(async (i) => {
      if (i.aeat) {
        i.aeat.pdfUrl = await getSignedInvoiceFileUrl(i.aeat.pdfPath);
        i.aeat.qrUrl = await getSignedInvoiceFileUrl(i.aeat.qrPath);
      }
    })
  );

  return invoices;
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  const db = getAdminDb();
  const doc = await db.collection(COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  const invoice = docToInvoice(doc);
  if (invoice.aeat) {
    invoice.aeat.pdfUrl = await getSignedInvoiceFileUrl(invoice.aeat.pdfPath);
    invoice.aeat.qrUrl = await getSignedInvoiceFileUrl(invoice.aeat.qrPath);
  }
  return invoice;
}

/**
 * Genera el següent número de factura correlatiu per a l'any indicat,
 * amb format "AAAA-NNN" (p.ex. 2026-001).
 */
export async function getNextInvoiceNumber(year: number): Promise<string> {
  const db = getAdminDb();
  const snapshot = await db.collection(COLLECTION).get();

  const prefix = `${year}-`;
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

export async function createInvoice(userId: string, input: InvoiceInput): Promise<Invoice> {
  const db = getAdminDb();
  const now = new Date().toISOString();

  const date = input.date || now.slice(0, 10);
  const number = input.number || (await getNextInvoiceNumber(Number(date.slice(0, 4))));

  let pdfPath: string | null = null;
  let qrPath: string | null = null;

  const ref = db.collection(COLLECTION).doc();

  if (input.aeatPdfBase64 && input.aeatPdfMediaType) {
    pdfPath = await saveInvoiceFile(userId, ref.id, "pdf", input.aeatPdfBase64, input.aeatPdfMediaType);
  }
  if (input.aeatQrBase64 && input.aeatQrMediaType) {
    qrPath = await saveInvoiceFile(userId, ref.id, "qr", input.aeatQrBase64, input.aeatQrMediaType);
  }

  const aeat: AeatInfo = { ...defaultAeat(), ...(input.aeat || {}) };
  if (pdfPath) aeat.pdfPath = pdfPath;
  if (qrPath) aeat.qrPath = qrPath;

  const checklist: InvoiceChecklist = { ...defaultChecklist(), ...(input.checklist || {}) };

  const data = {
    userId,
    number,
    importSource: input.importSource ?? null,
    clientId: input.clientId ?? null,
    clientSnapshot: input.clientSnapshot ?? null,
    date,
    dueDate: input.dueDate ?? null,
    items: input.items ?? [],
    irpfRate: input.irpfRate ?? null,
    notes: input.notes ?? null,
    status: input.status || "DRAFT",
    invoiceType: input.invoiceType || "ORDINARY",
    rectifiesInvoiceId: input.rectifiesInvoiceId ?? null,
    rectificationReason: input.rectificationReason ?? null,
    aeat,
    checklist,
    createdAt: now,
    updatedAt: now,
  };

  await ref.set(data);
  await saveLineItemsToCatalog(userId, data.items, { id: ref.id, number: data.number, date: data.date });
  return (await getInvoiceById(ref.id))!;
}

export async function updateInvoice(id: string, input: InvoiceInput): Promise<Invoice | null> {
  const db = getAdminDb();
  const ref = db.collection(COLLECTION).doc(id);
  const existingDoc = await ref.get();
  if (!existingDoc.exists) return null;
  const existing = existingDoc.data() || {};

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

  if (input.number !== undefined) updates.number = input.number;
  if (input.clientId !== undefined) updates.clientId = input.clientId;
  if (input.clientSnapshot !== undefined) updates.clientSnapshot = input.clientSnapshot;
  if (input.date !== undefined) updates.date = input.date;
  if (input.dueDate !== undefined) updates.dueDate = input.dueDate;
  if (input.items !== undefined) updates.items = input.items;
  if (input.irpfRate !== undefined) updates.irpfRate = input.irpfRate;
  if (input.notes !== undefined) updates.notes = input.notes;
  if (input.status !== undefined) updates.status = input.status;
  if (input.invoiceType !== undefined) updates.invoiceType = input.invoiceType;
  if (input.rectifiesInvoiceId !== undefined) updates.rectifiesInvoiceId = input.rectifiesInvoiceId;
  if (input.rectificationReason !== undefined) updates.rectificationReason = input.rectificationReason;

  const existingAeat: AeatInfo = { ...defaultAeat(), ...(existing.aeat || {}) };
  const existingChecklist: InvoiceChecklist = { ...defaultChecklist(), ...(existing.checklist || {}) };

  const newAeat: AeatInfo = { ...existingAeat, ...(input.aeat || {}) };

  if (input.aeatPdfBase64 && input.aeatPdfMediaType) {
    await deleteInvoiceFile(existingAeat.pdfPath);
    newAeat.pdfPath = await saveInvoiceFile(
      existing.userId,
      id,
      "pdf",
      input.aeatPdfBase64,
      input.aeatPdfMediaType
    );
  }
  if (input.aeatQrBase64 && input.aeatQrMediaType) {
    await deleteInvoiceFile(existingAeat.qrPath);
    newAeat.qrPath = await saveInvoiceFile(existing.userId, id, "qr", input.aeatQrBase64, input.aeatQrMediaType);
  }

  if (input.aeat !== undefined || input.aeatPdfBase64 || input.aeatQrBase64) {
    updates.aeat = newAeat;
  }

  const newChecklist: InvoiceChecklist = { ...existingChecklist, ...(input.checklist || {}) };
  if (input.checklist !== undefined) {
    updates.checklist = newChecklist;
  }

  await ref.update(updates);

  if (input.items !== undefined) {
    const invNumber = (input.number !== undefined ? input.number : existing.number) ?? null;
    const invDate = (input.date !== undefined ? input.date : existing.date) ?? null;
    await saveLineItemsToCatalog((existing.userId as string) || "", input.items, {
      id,
      number: invNumber,
      date: invDate,
    });
  }

  return getInvoiceById(id);
}

/**
 * Desa les línies de la factura al catàleg de conceptes reutilitzables.
 * No bloqueja ni fa fallar el desat de la factura si hi ha algun error.
 */
async function saveLineItemsToCatalog(
  userId: string,
  items: InvoiceInput["items"],
  invoiceRef?: CatalogInvoiceRef
): Promise<void> {
  if (!userId || !items || items.length === 0) return;
  try {
    for (const item of items) {
      await upsertFromInvoiceItem(userId, item, invoiceRef);
    }
  } catch (err) {
    console.error("Error desant el catàleg de conceptes:", err);
  }
}

export async function deleteInvoice(id: string): Promise<boolean> {
  const db = getAdminDb();
  const ref = db.collection(COLLECTION).doc(id);
  const doc = await ref.get();
  if (!doc.exists) return false;

  const data = doc.data() || {};
  const aeat = data.aeat || {};
  await deleteInvoiceFile(aeat.pdfPath);
  await deleteInvoiceFile(aeat.qrPath);
  await ref.delete();
  return true;
}
