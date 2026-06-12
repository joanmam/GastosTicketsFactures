import { getAdminDb } from "@/lib/firebase-admin";
import { deleteTicketImage, getSignedImageUrl } from "@/lib/firebase-storage";
import type { Ticket, TicketInput } from "@/types";

const COLLECTION = "tickets";

export interface TicketFilters {
  from?: string | null;
  to?: string | null;
  category?: string | null;
  search?: string | null;
  userId?: string | null;
}

function docToTicket(doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot): Ticket {
  const data = doc.data() || {};
  return {
    id: doc.id,
    userId: data.userId ?? "",
    userName: data.userName ?? null,
    merchant: data.merchant ?? null,
    date: data.date ?? null,
    totalAmount: data.totalAmount ?? null,
    taxAmount: data.taxAmount ?? null,
    taxRate: data.taxRate ?? null,
    currency: data.currency ?? "EUR",
    category: data.category ?? null,
    paymentMethod: data.paymentMethod ?? null,
    notes: data.notes ?? null,
    status: data.status ?? "REVIEW",
    imagePath: data.imagePath ?? null,
    rawExtraction: data.rawExtraction ?? null,
    items: data.items ?? [],
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

/**
 * Llista els tickets aplicant filtres. Per mantenir la configuració senzilla
 * (sense índexs composts de Firestore), es recuperen tots els documents
 * ordenats per data de creació i es filtren en memòria.
 */
export async function listTickets(filters: TicketFilters = {}): Promise<Ticket[]> {
  const db = getAdminDb();
  const snapshot = await db.collection(COLLECTION).orderBy("createdAt", "desc").get();

  let tickets = snapshot.docs.map(docToTicket);

  if (filters.userId) {
    tickets = tickets.filter((t) => t.userId === filters.userId);
  }
  if (filters.category) {
    tickets = tickets.filter((t) => t.category === filters.category);
  }
  if (filters.from) {
    tickets = tickets.filter((t) => !t.date || t.date >= filters.from!);
  }
  if (filters.to) {
    tickets = tickets.filter((t) => !t.date || t.date <= filters.to!);
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    tickets = tickets.filter(
      (t) =>
        (t.merchant && t.merchant.toLowerCase().includes(q)) ||
        (t.notes && t.notes.toLowerCase().includes(q))
    );
  }

  // Ordenar per data de compra (descendent), després per data de creació
  tickets.sort((a, b) => {
    const dateA = a.date || "";
    const dateB = b.date || "";
    if (dateA !== dateB) return dateA < dateB ? 1 : -1;
    return 0;
  });

  // Adjuntar URL signada per a la imatge
  await Promise.all(
    tickets.map(async (t) => {
      t.imageUrl = await getSignedImageUrl(t.imagePath);
    })
  );

  return tickets;
}

export async function getTicketById(id: string): Promise<Ticket | null> {
  const db = getAdminDb();
  const doc = await db.collection(COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  const ticket = docToTicket(doc);
  ticket.imageUrl = await getSignedImageUrl(ticket.imagePath);
  return ticket;
}

export async function createTicket(
  userId: string,
  userName: string | null,
  imagePath: string | null,
  input: TicketInput
): Promise<Ticket> {
  const db = getAdminDb();
  const now = new Date().toISOString();

  const data = {
    userId,
    userName,
    merchant: input.merchant ?? null,
    date: input.date ?? null,
    totalAmount: input.totalAmount ?? null,
    taxAmount: input.taxAmount ?? null,
    taxRate: input.taxRate ?? null,
    currency: input.currency || "EUR",
    category: input.category ?? null,
    paymentMethod: input.paymentMethod ?? null,
    notes: input.notes ?? null,
    status: input.status || "REVIEW",
    imagePath,
    rawExtraction: input.rawExtraction ?? null,
    items: input.items ?? [],
    createdAt: now,
    updatedAt: now,
  };

  const ref = await db.collection(COLLECTION).add(data);
  const ticket = docToTicket(await ref.get());
  ticket.imageUrl = await getSignedImageUrl(ticket.imagePath);
  return ticket;
}

export async function updateTicket(
  id: string,
  input: TicketInput,
  newImagePath?: string | null
): Promise<Ticket | null> {
  const db = getAdminDb();
  const ref = db.collection(COLLECTION).doc(id);
  const existingDoc = await ref.get();
  if (!existingDoc.exists) return null;
  const existing = existingDoc.data() || {};

  let imagePath = existing.imagePath ?? null;
  if (newImagePath) {
    await deleteTicketImage(existing.imagePath);
    imagePath = newImagePath;
  }

  const updates: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
    imagePath,
  };

  if (input.merchant !== undefined) updates.merchant = input.merchant;
  if (input.date !== undefined) updates.date = input.date;
  if (input.totalAmount !== undefined) updates.totalAmount = input.totalAmount;
  if (input.taxAmount !== undefined) updates.taxAmount = input.taxAmount;
  if (input.taxRate !== undefined) updates.taxRate = input.taxRate;
  if (input.currency !== undefined) updates.currency = input.currency;
  if (input.category !== undefined) updates.category = input.category;
  if (input.paymentMethod !== undefined) updates.paymentMethod = input.paymentMethod;
  if (input.notes !== undefined) updates.notes = input.notes;
  if (input.status !== undefined) updates.status = input.status;
  if (input.items !== undefined) updates.items = input.items;

  await ref.update(updates);

  const ticket = docToTicket(await ref.get());
  ticket.imageUrl = await getSignedImageUrl(ticket.imagePath);
  return ticket;
}

export async function deleteTicket(id: string): Promise<boolean> {
  const db = getAdminDb();
  const ref = db.collection(COLLECTION).doc(id);
  const doc = await ref.get();
  if (!doc.exists) return false;

  const data = doc.data() || {};
  await deleteTicketImage(data.imagePath);
  await ref.delete();
  return true;
}
