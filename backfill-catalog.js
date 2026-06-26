/**
 * Backfill del catàleg de conceptes (línies de factura reutilitzables).
 *
 * Recorre TOTES les factures existents a Firestore i reconstrueix la col·lecció
 * "lineItemCatalog" a partir de les seves línies. Útil per poblar el catàleg amb
 * l'històric (incloses les factures importades de Holded, que no l'alimenten).
 *
 * És IDEMPOTENT: el recompte d'usos es calcula sempre a partir de les factures
 * actuals, així que executar-lo dues vegades dóna el mateix resultat. Els
 * conceptes afegits manualment que no surten a cap factura NO es toquen.
 *
 * Ús:
 *   node backfill-catalog.js            → mode prova (no escriu, només informa)
 *   node backfill-catalog.js --apply    → aplica els canvis a Firestore
 */

const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

const APPLY = process.argv.includes("--apply");

// ── Credencials (mateix patró que import-holded.js) ──────────────────────────
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "{}");
if (!serviceAccount.project_id) {
  const envContent = fs.readFileSync(path.join(__dirname, ".env.local"), "utf-8");
  const match = envContent.match(/FIREBASE_SERVICE_ACCOUNT_KEY='([\s\S]+?)'\s*\n/);
  if (!match) { console.error("No s'ha trobat FIREBASE_SERVICE_ACCOUNT_KEY a .env.local"); process.exit(1); }
  Object.assign(serviceAccount, JSON.parse(match[1]));
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const CATALOG = "lineItemCatalog";

async function main() {
  console.log(APPLY ? "▶ Mode APLICAR (s'escriurà a Firestore)\n" : "▶ Mode PROVA (no s'escriu res)\n");

  // 1) Llegeix totes les factures, ordenades per data ascendent
  const invSnap = await db.collection("invoices").get();
  const invoices = invSnap.docs
    .map((d) => ({ id: d.id, ...(d.data() || {}) }))
    .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));

  console.log(`Factures llegides: ${invoices.length}`);

  // 2) Agrega les línies per descripció (clau = descripció en minúscules)
  //    Com que recorrem en ordre de data, l'últim preu/IVA vist preval.
  const agg = new Map();
  let totalLines = 0;

  for (const inv of invoices) {
    const items = Array.isArray(inv.items) ? inv.items : [];
    for (const item of items) {
      const description = String(item.description || "").trim();
      if (!description) continue;
      totalLines++;
      const key = description.toLowerCase();
      const prev = agg.get(key);
      const date = String(inv.date || "").slice(0, 10) || null;
      // Llista de factures que usen el concepte, sense duplicats per id
      const invoices = prev?.invoices ? prev.invoices.filter((r) => r.id !== inv.id) : [];
      invoices.push({ id: inv.id, number: inv.number ?? null, date });
      agg.set(key, {
        description,                               // casing de l'última aparició
        unitPrice: item.unitPrice ?? prev?.unitPrice ?? null,
        vatRate: item.vatRate ?? prev?.vatRate ?? null,
        invoices,
        usageCount: invoices.length,              // nombre de factures distintes
        lastUsedDate: maxDate(prev?.lastUsedDate, date),
        userId: prev?.userId || inv.userId || "",
      });
    }
  }

  console.log(`Línies amb descripció: ${totalLines}`);
  console.log(`Conceptes únics derivats de factures: ${agg.size}\n`);

  // 3) Llegeix el catàleg existent (per fer match i no duplicar)
  const catSnap = await db.collection(CATALOG).get();
  const existingByKey = new Map();
  for (const doc of catSnap.docs) {
    const data = doc.data() || {};
    const key = String(data.description || "").trim().toLowerCase();
    if (key) existingByKey.set(key, { id: doc.id, data });
  }

  // 4) Calcula les operacions
  const now = new Date().toISOString();
  let toUpdate = 0, toCreate = 0;
  const ops = [];

  for (const [key, c] of agg) {
    const existing = existingByKey.get(key);
    if (existing) {
      toUpdate++;
      ops.push({
        type: "update",
        id: existing.id,
        data: {
          description: c.description,
          unitPrice: c.unitPrice,
          vatRate: c.vatRate,
          usageCount: c.usageCount,
          lastUsedDate: c.lastUsedDate,
          invoices: sortRefs(c.invoices),
          updatedAt: now,
        },
      });
    } else {
      toCreate++;
      ops.push({
        type: "create",
        data: {
          userId: c.userId,
          description: c.description,
          unitPrice: c.unitPrice,
          vatRate: c.vatRate,
          usageCount: c.usageCount,
          lastUsedDate: c.lastUsedDate,
          invoices: sortRefs(c.invoices),
          createdAt: now,
          updatedAt: now,
        },
      });
    }
  }

  // Mostra una vista prèvia (top 15 per usos)
  const preview = [...agg.values()].sort((a, b) => b.usageCount - a.usageCount).slice(0, 15);
  console.log("Vista prèvia (top 15 per nombre d'usos):");
  for (const c of preview) {
    const d = c.description.length > 50 ? c.description.slice(0, 47) + "..." : c.description;
    console.log(`  ${String(c.usageCount).padStart(3)}×  ${d}  (${c.unitPrice ?? "?"}€, IVA ${c.vatRate ?? "?"}%)`);
  }

  console.log(`\nResum: ${toCreate} conceptes nous, ${toUpdate} actualitzats.`);
  const untouched = existingByKey.size - toUpdate;
  if (untouched > 0) console.log(`Conceptes manuals que no es toquen: ${untouched}`);

  if (!APPLY) {
    console.log("\n(Mode prova — no s'ha escrit res. Torna a executar amb --apply per aplicar.)");
    return;
  }

  // 5) Aplica en lots de 400
  let batch = db.batch();
  let count = 0;
  for (const op of ops) {
    if (op.type === "update") {
      batch.update(db.collection(CATALOG).doc(op.id), op.data);
    } else {
      batch.set(db.collection(CATALOG).doc(), op.data);
    }
    if (++count % 400 === 0) { await batch.commit(); batch = db.batch(); }
  }
  await batch.commit();
  console.log(`\n✔ Fet. ${ops.length} operacions aplicades al catàleg.`);
}

function maxDate(a, b) {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

// Ordena les referències de factura per data descendent (més recent primer)
function sortRefs(refs) {
  return (refs || []).slice().sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
