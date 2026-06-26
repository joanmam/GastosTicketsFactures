import { getAdminDb } from "@/lib/firebase-admin";
import type { CatalogInvoiceRef, InvoiceLineItem, LineItemCatalogEntry, LineItemCatalogInput } from "@/types";

const COLLECTION = "lineItemCatalog";

function docToCatalogEntry(
  doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot
): LineItemCatalogEntry {
  const data = doc.data() || {};
  return {
    id: doc.id,
    userId: data.userId ?? "",
    description: data.description ?? null,
    unitPrice: data.unitPrice ?? null,
    vatRate: data.vatRate ?? null,
    usageCount: data.usageCount ?? 0,
    lastUsedDate: data.lastUsedDate ?? null,
    invoices: Array.isArray(data.invoices) ? data.invoices : [],
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

export interface LineItemCatalogFilters {
  search?: string | null;
}

export async function listCatalogEntries(filters: LineItemCatalogFilters = {}): Promise<LineItemCatalogEntry[]> {
  const db = getAdminDb();
  const snapshot = await db.collection(COLLECTION).get();

  let entries = snapshot.docs.map(docToCatalogEntry);

  if (filters.search) {
    const q = filters.search.toLowerCase();
    entries = entries.filter((e) => e.description && e.description.toLowerCase().includes(q));
  }

  entries.sort((a, b) => {
    if (b.usageCount !== a.usageCount) return b.usageCount - a.usageCount;
    return (a.description || "").localeCompare(b.description || "");
  });

  return entries;
}

export async function getCatalogEntryById(id: string): Promise<LineItemCatalogEntry | null> {
  const db = getAdminDb();
  const doc = await db.collection(COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return docToCatalogEntry(doc);
}

export async function createCatalogEntry(userId: string, input: LineItemCatalogInput): Promise<LineItemCatalogEntry> {
  const db = getAdminDb();
  const now = new Date().toISOString();

  const data = {
    userId,
    description: input.description ?? null,
    unitPrice: input.unitPrice ?? null,
    vatRate: input.vatRate ?? null,
    usageCount: 0,
    lastUsedDate: null,
    createdAt: now,
    updatedAt: now,
  };

  const ref = await db.collection(COLLECTION).add(data);
  return docToCatalogEntry(await ref.get());
}

export async function updateCatalogEntry(id: string, input: LineItemCatalogInput): Promise<LineItemCatalogEntry | null> {
  const db = getAdminDb();
  const ref = db.collection(COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) return null;

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (input.description !== undefined) updates.description = input.description;
  if (input.unitPrice !== undefined) updates.unitPrice = input.unitPrice;
  if (input.vatRate !== undefined) updates.vatRate = input.vatRate;

  await ref.update(updates);
  return docToCatalogEntry(await ref.get());
}

export async function deleteCatalogEntry(id: string): Promise<boolean> {
  const db = getAdminDb();
  const ref = db.collection(COLLECTION).doc(id);
  const doc = await ref.get();
  if (!doc.exists) return false;
  await ref.delete();
  return true;
}

/**
 * Combina la llista de factures d'un concepte amb una nova referència,
 * evitant duplicats per id. Retorna la llista ordenada per data descendent.
 */
function mergeInvoiceRefs(
  existing: CatalogInvoiceRef[] | undefined,
  ref: CatalogInvoiceRef | undefined
): CatalogInvoiceRef[] {
  const list = Array.isArray(existing) ? existing.filter((r) => r && r.id) : [];
  if (ref && ref.id) {
    const without = list.filter((r) => r.id !== ref.id);
    without.push({ id: ref.id, number: ref.number ?? null, date: ref.date ?? null });
    return without.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  }
  return list.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
}

/**
 * Desa o actualitza una entrada del catàleg a partir d'una línia de factura.
 * Cerca per descripció (sense distingir majúscules/minúscules); si existeix,
 * actualitza el preu/IVA i hi afegeix la referència de la factura; si no, en crea
 * una de nova. El comptador d'usos és el nombre de factures distintes que l'usen.
 */
export async function upsertFromInvoiceItem(
  userId: string,
  item: InvoiceLineItem,
  invoiceRef?: CatalogInvoiceRef
): Promise<void> {
  const description = (item.description || "").trim();
  if (!description) return;

  const db = getAdminDb();
  const now = new Date().toISOString();
  const today = now.slice(0, 10);

  const snapshot = await db.collection(COLLECTION).get();
  const match = snapshot.docs.find((doc) => {
    const data = doc.data() || {};
    return (data.description || "").trim().toLowerCase() === description.toLowerCase();
  });

  if (match) {
    const data = match.data() || {};
    const invoices = mergeInvoiceRefs(data.invoices, invoiceRef);
    const lastUsedDate = invoices[0]?.date || invoiceRef?.date || data.lastUsedDate || today;
    await match.ref.update({
      description,
      unitPrice: item.unitPrice ?? null,
      vatRate: item.vatRate ?? null,
      usageCount: invoices.length || (data.usageCount ?? 0) + 1,
      lastUsedDate,
      invoices,
      updatedAt: now,
    });
  } else {
    const invoices = mergeInvoiceRefs([], invoiceRef);
    await db.collection(COLLECTION).add({
      userId,
      description,
      unitPrice: item.unitPrice ?? null,
      vatRate: item.vatRate ?? null,
      usageCount: invoices.length || 1,
      lastUsedDate: invoices[0]?.date || invoiceRef?.date || today,
      invoices,
      createdAt: now,
      updatedAt: now,
    });
  }
}
