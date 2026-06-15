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
 * Desa un fitxer (PDF oficial AEAT o imatge del QR) a Firebase Storage,
 * dins una carpeta pròpia de l'usuari i de la factura.
 */
export async function saveInvoiceFile(
  uid: string,
  invoiceId: string,
  kind: "pdf" | "qr",
  base64Data: string,
  mediaType: string
): Promise<string> {
  const cleaned = base64Data.replace(/^data:[^;]+;base64,/, "");
  const buffer = Buffer.from(cleaned, "base64");
  const ext = EXT_BY_MIME[mediaType] || (kind === "pdf" ? "pdf" : "jpg");
  const filePath = `facturacio/${uid}/${invoiceId}/${kind}-${randomUUID()}.${ext}`;

  const bucket = getAdminStorage().bucket();
  await bucket.file(filePath).save(buffer, {
    contentType: mediaType,
    metadata: { cacheControl: "private, max-age=0" },
  });

  return filePath;
}

/**
 * Genera una URL signada temporal (1 hora) per visualitzar/descarregar un fitxer.
 */
export async function getSignedInvoiceFileUrl(
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

export async function deleteInvoiceFile(filePath: string | null | undefined) {
  if (!filePath) return;
  try {
    await getAdminStorage().bucket().file(filePath).delete();
  } catch {
    // ignore if it doesn't exist
  }
}
