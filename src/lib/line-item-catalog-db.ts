import { getAdminDb } from "@/lib/firebase-admin";
import type { InvoiceLineItem, LineItemCatalogEntry, LineItemCatalogInput } from "@/types";

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
 * Desa o actualitza una entrada del catàleg a partir d'una línia de factura.
 * Cerca per descripció (sense distingir majúscules/minúscules); si existeix,
 * actualitza el preu/IVA i incrementa el comptador d'usos; si no, en crea una nova.
 */
export async function upsertFromInvoiceItem(userId: string, item: InvoiceLineItem): Promise<void> {
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
    await match.ref.update({
      description,
      unitPrice: item.unitPrice ?? null,
      vatRate: item.vatRate ?? null,
      usageCount: ((match.data() || {}).usageCount ?? 0) + 1,
      lastUsedDate: today,
      updatedAt: now,
    });
  } else {
    await db.collection(COLLECTION).add({
      userId,
      description,
      unitPrice: item.unitPrice ?? null,
      vatRate: item.vatRate ?? null,
      usageCount: 1,
      lastUsedDate: today,
      createdAt: now,
      updatedAt: now,
    });
  }
}
