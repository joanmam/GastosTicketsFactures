import { randomUUID } from "crypto";
import { getAdminStorage } from "@/lib/firebase-admin";

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
};

/**
 * Desa una imatge (base64, amb o sense prefix data:URL) a Firebase Storage
 * dins una carpeta pròpia de l'usuari i retorna la ruta del fitxer al bucket.
 */
export async function saveTicketImage(
  uid: string,
  base64Data: string,
  mediaType: string
): Promise<string> {
  const cleaned = base64Data.replace(/^data:[^;]+;base64,/, "");
  const buffer = Buffer.from(cleaned, "base64");
  const ext = EXT_BY_MIME[mediaType] || "jpg";
  const filePath = `tickets/${uid}/${randomUUID()}.${ext}`;

  const bucket = getAdminStorage().bucket();
  await bucket.file(filePath).save(buffer, {
    contentType: mediaType,
    metadata: { cacheControl: "private, max-age=0" },
  });

  return filePath;
}

/**
 * Genera una URL signada temporal (1 hora) per visualitzar la imatge d'un ticket.
 */
export async function getSignedImageUrl(
  filePath: string | null | undefined
): Promise<string | null> {
  if (!filePath) return null;
  try {
    const bucket = getAdminStorage().bucket();
    const [url] = await bucket.file(filePath).getSignedUrl({
      action: "read",
      expires: Date.now() + 60 * 60 * 1000,
    });
    return url;
  } catch {
    return null;
  }
}

/**
 * Desa un adjunt de compra (PDF o imatge) a Firebase Storage.
 */
export async function savePurchaseAttachment(
  uid: string,
  base64Data: string,
  mediaType: string
): Promise<string> {
  const cleaned = base64Data.replace(/^data:[^;]+;base64,/, "");
  const buffer = Buffer.from(cleaned, "base64");
  const ext = EXT_BY_MIME[mediaType] || "pdf";
  const filePath = `purchases/${uid}/${randomUUID()}.${ext}`;

  const bucket = getAdminStorage().bucket();
  await bucket.file(filePath).save(buffer, {
    contentType: mediaType,
    metadata: { cacheControl: "private, max-age=0" },
  });

  return filePath;
}

/**
 * Genera una URL signada temporal (1 hora) per visualitzar un adjunt de compra.
 */
export async function getPurchaseAttachmentUrl(
  filePath: string | null | undefined
): Promise<string | null> {
  if (!filePath) return null;
  try {
    const bucket = getAdminStorage().bucket();
    const [url] = await bucket.file(filePath).getSignedUrl({
      action: "read",
      expires: Date.now() + 60 * 60 * 1000,
    });
    return url;
  } catch {
    return null;
  }
}

export async function deletePurchaseAttachment(filePath: string | null | undefined) {
  if (!filePath) return;
  try {
    await getAdminStorage().bucket().file(filePath).delete();
  } catch {
    // ignore if it doesn't exist
  }
}

export async function deleteTicketImage(filePath: string | null | undefined) {
  if (!filePath) return;
  try {
    await getAdminStorage().bucket().file(filePath).delete();
  } catch {
    // ignore if it doesn't exist
  }
}
