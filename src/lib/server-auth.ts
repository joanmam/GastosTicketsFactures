import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";
import type { DecodedIdToken } from "firebase-admin/auth";

/**
 * Verifica el token d'identitat de Firebase (Authorization: Bearer <token>)
 * enviat des del client. Retorna el token decodificat (amb uid, email, etc.)
 * o `null` si no és vàlid.
 */
export async function getAuthUser(req: NextRequest): Promise<DecodedIdToken | null> {
  const authHeader = req.headers.get("authorization") || "";
  const match = authHeader.match(/^Bearer (.+)$/i);
  if (!match) return null;

  try {
    return await getAdminAuth().verifyIdToken(match[1]);
  } catch {
    return null;
  }
}

export function unauthorized() {
  return NextResponse.json({ error: "No autoritzat" }, { status: 401 });
}
