/**
 * Script per crear (o actualitzar) un usuari de l'aplicació a Firebase Authentication.
 *
 * Ús:
 *   npm run create-user -- correu@exemple.com "Contrasenya123" "Nom visible"
 *
 * Requereix que la variable d'entorn FIREBASE_SERVICE_ACCOUNT_KEY estigui
 * definida (per exemple, carregant-la des de .env.local amb `dotenv`,
 * o exportant-la al terminal abans d'executar l'script).
 */

import { config as loadEnv } from "dotenv";
import { getAdminAuth } from "../lib/firebase-admin";

// Carrega les variables d'entorn des de .env.local (mateix fitxer que usa Next.js)
loadEnv({ path: ".env.local" });

async function main() {
  const [email, password, displayName] = process.argv.slice(2);

  if (!email || !password) {
    console.error(
      'Ús: npm run create-user -- correu@exemple.com "Contrasenya123" "Nom visible (opcional)"'
    );
    process.exit(1);
  }

  if (password.length < 6) {
    console.error("La contrasenya ha de tenir com a mínim 6 caràcters.");
    process.exit(1);
  }

  const auth = getAdminAuth();

  try {
    const existing = await auth.getUserByEmail(email).catch(() => null);

    if (existing) {
      await auth.updateUser(existing.uid, {
        password,
        displayName: displayName || existing.displayName,
      });
      console.log(`Usuari actualitzat: ${email} (uid: ${existing.uid})`);
    } else {
      const user = await auth.createUser({
        email,
        password,
        displayName: displayName || undefined,
        emailVerified: true,
      });
      console.log(`Usuari creat: ${email} (uid: ${user.uid})`);
    }
  } catch (err: any) {
    console.error("Error creant/actualitzant l'usuari:", err?.message || err);
    process.exit(1);
  }
}

main();
