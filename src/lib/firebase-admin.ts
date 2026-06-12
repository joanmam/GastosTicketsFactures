import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";

let app: App | null = null;

/**
 * Inicialitza (de forma diferida) l'app de Firebase Admin a partir del
 * compte de servei definit a la variable d'entorn FIREBASE_SERVICE_ACCOUNT_KEY
 * (el JSON sencer del compte de servei, en una sola línia).
 */
function getAdminApp(): App {
  if (app) return app;
  if (getApps().length) {
    app = getApps()[0];
    return app;
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error(
      "Falta la variable d'entorn FIREBASE_SERVICE_ACCOUNT_KEY amb les credencials del compte de servei de Firebase."
    );
  }

  let serviceAccount: Record<string, unknown>;
  try {
    serviceAccount = JSON.parse(raw);
  } catch {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY no conté un JSON vàlid. Copia el contingut sencer del fitxer de credencials del compte de servei."
    );
  }

  app = initializeApp({
    credential: cert(serviceAccount as any),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });

  return app;
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}

export function getAdminStorage(): Storage {
  return getStorage(getAdminApp());
}
