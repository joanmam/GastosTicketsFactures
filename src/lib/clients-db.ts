import { getAdminDb } from "@/lib/firebase-admin";
import type { Client, ClientInput } from "@/types";

const COLLECTION = "clients";

function docToClient(doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot): Client {
  const data = doc.data() || {};
  return {
    id: doc.id,
    userId: data.userId ?? "",
    name: data.name ?? null,
    taxId: data.taxId ?? null,
    address: data.address ?? null,
    email: data.email ?? null,
    phone: data.phone ?? null,
    notes: data.notes ?? null,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

export interface ClientFilters {
  search?: string | null;
}

export async function listClients(filters: ClientFilters = {}): Promise<Client[]> {
  const db = getAdminDb();
  const snapshot = await db.collection(COLLECTION).orderBy("name", "asc").get();

  let clients = snapshot.docs.map(docToClient);

  if (filters.search) {
    const q = filters.search.toLowerCase();
    clients = clients.filter(
      (c) =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.taxId && c.taxId.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
    );
  }

  return clients;
}

export async function getClientById(id: string): Promise<Client | null> {
  const db = getAdminDb();
  const doc = await db.collection(COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return docToClient(doc);
}

export async function createClient(userId: string, input: ClientInput): Promise<Client> {
  const db = getAdminDb();
  const now = new Date().toISOString();

  const data = {
    userId,
    name: input.name ?? null,
    taxId: input.taxId ?? null,
    address: input.address ?? null,
    email: input.email ?? null,
    phone: input.phone ?? null,
    notes: input.notes ?? null,
    createdAt: now,
    updatedAt: now,
  };

  const ref = await db.collection(COLLECTION).add(data);
  return docToClient(await ref.get());
}

export async function updateClient(id: string, input: ClientInput): Promise<Client | null> {
  const db = getAdminDb();
  const ref = db.collection(COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) return null;

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (input.name !== undefined) updates.name = input.name;
  if (input.taxId !== undefined) updates.taxId = input.taxId;
  if (input.address !== undefined) updates.address = input.address;
  if (input.email !== undefined) updates.email = input.email;
  if (input.phone !== undefined) updates.phone = input.phone;
  if (input.notes !== undefined) updates.notes = input.notes;

  await ref.update(updates);
  return docToClient(await ref.get());
}

export async function deleteClient(id: string): Promise<boolean> {
  const db = getAdminDb();
  const ref = db.collection(COLLECTION).doc(id);
  const doc = await ref.get();
  if (!doc.exists) return false;
  await ref.delete();
  return true;
}
