import { getAdminDb } from "@/lib/firebase-admin";
import type { Notification, NotificationWithRead } from "@/types";

const COLLECTION = "notifications";
const READS_SUBCOLLECTION = "notificationReads";

export async function listNotificationsForUser(
  userId: string,
  opts: { source?: string; from?: string; onlyUnread?: boolean } = {}
): Promise<NotificationWithRead[]> {
  const db = getAdminDb();
  const q = db.collection(COLLECTION).orderBy("publishedAt", "desc").limit(200);

  const snap = await q.get();
  const notifications: Notification[] = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Notification, "id">),
  }));

  // Llegir reads de l'usuari
  const readsSnap = await db
    .collection("users")
    .doc(userId)
    .collection(READS_SUBCOLLECTION)
    .get();
  const readIds = new Set(readsSnap.docs.map((d) => d.id));

  let result: NotificationWithRead[] = notifications.map((n) => ({
    ...n,
    isRead: readIds.has(n.id),
  }));

  // Filtres opcionals
  if (opts.source) result = result.filter((n) => n.source === opts.source);
  if (opts.from) result = result.filter((n) => n.publishedAt >= opts.from!);
  if (opts.onlyUnread) result = result.filter((n) => !n.isRead);

  return result;
}

export async function getUnreadCount(userId: string): Promise<number> {
  const db = getAdminDb();
  const [allSnap, readsSnap] = await Promise.all([
    db.collection(COLLECTION).get(),
    db.collection("users").doc(userId).collection(READS_SUBCOLLECTION).get(),
  ]);
  const readIds = new Set(readsSnap.docs.map((d) => d.id));
  return allSnap.docs.filter((d) => !readIds.has(d.id)).length;
}

export async function getExistingSourceKeys(): Promise<Set<string>> {
  const db = getAdminDb();
  const snap = await db.collection(COLLECTION).select("sourceKey").get();
  return new Set(snap.docs.map((d) => d.data().sourceKey as string));
}

export async function createNotifications(notifications: Omit<Notification, "id">[]): Promise<number> {
  if (notifications.length === 0) return 0;
  const db = getAdminDb();
  const batch = db.batch();
  for (const n of notifications) {
    const ref = db.collection(COLLECTION).doc();
    batch.set(ref, n);
  }
  await batch.commit();
  return notifications.length;
}

export async function markAsRead(userId: string, notificationId: string): Promise<void> {
  const db = getAdminDb();
  await db
    .collection("users")
    .doc(userId)
    .collection(READS_SUBCOLLECTION)
    .doc(notificationId)
    .set({ readAt: new Date().toISOString() });
}

export async function deleteNotificationsBySource(source: string): Promise<number> {
  const db = getAdminDb();
  const snap = await db.collection(COLLECTION).where("source", "==", source).get();
  if (snap.empty) return 0;
  const batch = db.batch();
  for (const doc of snap.docs) batch.delete(doc.ref);
  await batch.commit();
  return snap.docs.length;
}

export async function markAllAsRead(userId: string): Promise<void> {
  const db = getAdminDb();
  const snap = await db.collection(COLLECTION).select().get();
  const batch = db.batch();
  const readsRef = db.collection("users").doc(userId).collection(READS_SUBCOLLECTION);
  const now = new Date().toISOString();
  for (const doc of snap.docs) {
    batch.set(readsRef.doc(doc.id), { readAt: now });
  }
  await batch.commit();
}
