import { getAdminDb } from "@/lib/firebase-admin";
import type { Purchase, PurchaseInput, IvaLine } from "@/types";

function docToPurchase(id: string, data: FirebaseFirestore.DocumentData): Purchase {
  return {
    id,
    userId: data.userId ?? "",
    date: data.date ?? "",
    concepte: data.concepte ?? "",
    categoria: data.categoria ?? "",
    import: data.import ?? 0,
    tipusMoviment: data.tipusMoviment ?? "",
    compteTarjeta: data.compteTarjeta ?? "",
    sourceFile: data.sourceFile ?? "",
    sourceKey: data.sourceKey ?? "",
    importSource: data.importSource ?? null,
    createdAt: data.createdAt ?? null,
    subtotal: data.subtotal ?? null,
    ivaRate: data.ivaRate ?? null,
    iva: data.iva ?? null,
    attachmentPath: data.attachmentPath ?? null,
    attachmentUrl: null, // es genera a l'API amb URL signada
    ivaLines: data.ivaLines ?? null,
    notes: data.notes ?? null,
  };
}

export async function getPurchase(userId: string, id: string): Promise<Purchase | null> {
  const db = getAdminDb();
  const doc = await db
    .collection("users")
    .doc(userId)
    .collection("purchases")
    .doc(id)
    .get();
  if (!doc.exists) return null;
  return docToPurchase(doc.id, doc.data()!);
}

export async function listPurchasesForUser(
  userId: string,
  filters: { categoria?: string; from?: string; to?: string }
): Promise<Purchase[]> {
  const db = getAdminDb();
  const snap = await db
    .collection("users")
    .doc(userId)
    .collection("purchases")
    .get();

  let items = snap.docs.map((d) => docToPurchase(d.id, d.data()));

  if (filters.categoria) {
    items = items.filter((p) => p.categoria === filters.categoria);
  }
  if (filters.from) {
    items = items.filter((p) => p.date >= filters.from!);
  }
  if (filters.to) {
    items = items.filter((p) => p.date <= filters.to!);
  }

  items.sort((a, b) => b.date.localeCompare(a.date));
  return items;
}

export async function getExistingSourceKeys(userId: string): Promise<Set<string>> {
  const db = getAdminDb();
  const snap = await db
    .collection("users")
    .doc(userId)
    .collection("purchases")
    .select("sourceKey")
    .get();
  const keys = new Set<string>();
  snap.docs.forEach((d) => {
    const k = d.data().sourceKey;
    if (k) keys.add(k);
  });
  return keys;
}

export async function createPurchases(
  userId: string,
  inputs: PurchaseInput[]
): Promise<number> {
  const db = getAdminDb();
  const col = db.collection("users").doc(userId).collection("purchases");
  const batch = db.batch();
  const now = new Date().toISOString();

  for (const input of inputs) {
    const ref = col.doc();
    batch.set(ref, { ...input, userId, createdAt: now });
  }

  await batch.commit();
  return inputs.length;
}

export async function updatePurchase(
  userId: string,
  id: string,
  fields: Partial<Pick<PurchaseInput, "subtotal" | "ivaRate" | "iva" | "ivaLines" | "attachmentPath" | "notes" | "concepte" | "categoria">>
): Promise<void> {
  const db = getAdminDb();
  await db
    .collection("users")
    .doc(userId)
    .collection("purchases")
    .doc(id)
    .update({ ...fields, updatedAt: new Date().toISOString() });
}

export async function deletePurchase(userId: string, id: string): Promise<void> {
  const db = getAdminDb();
  await db
    .collection("users")
    .doc(userId)
    .collection("purchases")
    .doc(id)
    .delete();
}
