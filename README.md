# Gastos Tickets

Aplicació per escanejar tickets de despeses, extreure les dades automàticament amb IA (Claude), desar-les a Firebase i exportar-les a Excel. Pensada per a 1-2 usuaris familiars, amb accés des de mòbil i ordinador.

## Funcionalitats

- Inici de sessió amb correu i contrasenya (Firebase Authentication, multi-usuari)
- Escaneig de tickets fent foto (mòbil) o pujant un fitxer (ordinador)
- Extracció automàtica de dades (comerç, data, import, IVA, categoria, forma de pagament, línies de producte) amb Claude
- Llistat de tickets amb filtres (cerca, categoria, dates) i edició/eliminació
- Exportació a Excel (`.xlsx`) amb dues pestanyes: Tickets i Línies de producte
- Imatges dels tickets desades a Firebase Storage

## 1. Configurar Firebase

1. Crea un projecte a [Firebase Console](https://console.firebase.google.com/).
2. **Authentication** → Sign-in method → activa "Correu electrònic/contrasenya".
3. **Firestore Database** → crea una base de dades (mode producció).
4. **Storage** → activa Firebase Storage.
5. **Project settings → General → Your apps** → afegeix una app web i copia la configuració (`apiKey`, `authDomain`, etc.).
6. **Project settings → Service accounts** → "Generate new private key" → desa el JSON (compte de servei, només pel servidor, no el compartisis).

## 2. Configurar variables d'entorn

Copia `.env.example` a `.env.local` i omple els valors:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=el-teu-projecte.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=el-teu-projecte
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=el-teu-projecte.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...", ...}'
FIREBASE_STORAGE_BUCKET=el-teu-projecte.appspot.com

ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6
```

Notes:
- `FIREBASE_SERVICE_ACCOUNT_KEY` ha de ser el JSON del compte de servei sencer **en una sola línia** (entre cometes simples).
- `ANTHROPIC_API_KEY` es crea a [console.anthropic.com](https://console.anthropic.com/).

## 3. Instal·lar dependències

```bash
npm install
```

## 4. Crear els usuaris (família)

Crea un compte per a cada persona que hagi d'accedir a l'app:

```bash
npm run create-user -- joanmam@gmail.com "ContrasenyaSegura123" "Joan"
npm run create-user -- altra@correu.com "AltraContrasenya456" "Nom"
```

Si l'usuari ja existeix, l'script actualitza la contrasenya i el nom.

## 5. Provar en local

```bash
npm run dev
```

Obre http://localhost:3000, inicia sessió amb un dels usuaris creats al pas 4.

## 6. Desplegar a Vercel (gratuït)

1. Puja el projecte a un repositori de GitHub (no incloguis `.env.local`, ja està al `.gitignore`).
2. A [vercel.com](https://vercel.com/), "Add New Project" i importa el repositori.
3. A "Environment Variables", afegeix totes les variables del pas 2 (incloent `FIREBASE_SERVICE_ACCOUNT_KEY` sencer en una línia).
4. Desplega. Un cop fet, l'app serà accessible des del mòbil i l'ordinador amb la URL que et doni Vercel.

Per crear usuaris després del desplegament, executa `npm run create-user -- ...` en local (amb les mateixes variables d'entorn de producció a `.env.local`) — l'script es connecta directament a Firebase, no cal fer-ho des de Vercel.

## Estructura del projecte

```
src/
  app/
    login/            # Pàgina d'inici de sessió
    tickets/          # Llistat, nou ticket (escaneig) i detall/edició
    api/
      tickets/        # CRUD de tickets + extracció amb IA
      export/         # Generació de l'Excel
  components/         # AuthProvider, AuthGuard, Navbar, CameraCapture, TicketForm
  lib/                 # Firebase (client/admin), Anthropic, Firestore, categories
  scripts/
    create-user.ts    # Crear/actualitzar usuaris
```

## Pròxims passos / idees de futures funcionalitats

Aquesta versió cobreix l'escaneig, l'extracció amb IA, l'emmagatzematge, l'autenticació multi-usuari i l'exportació a Excel. Quan vulguis afegir noves funcionalitats (gràfics de despeses, pressupostos, recordatoris, etc.), digues-m'ho i les afegim sobre aquesta base.
