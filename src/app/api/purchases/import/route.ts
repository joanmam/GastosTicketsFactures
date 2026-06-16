import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/server-auth";
import { getExistingSourceKeys, createPurchases } from "@/lib/purchases-db";
import { parseCaixaXml } from "@/lib/parse-caixa-xml";
import type { PurchaseInput } from "@/types";
import path from "path";
import fs from "fs";

export const runtime = "nodejs";

/** Carpeta on es troben els fitxers XML de CaixaBank */
const COMPRES_DIR = path.join(process.cwd(), "CompresCaixa");

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  if (!fs.existsSync(COMPRES_DIR)) {
    return NextResponse.json(
      { error: `Carpeta no trobada: ${COMPRES_DIR}` },
      { status: 400 }
    );
  }

  const xmlFiles = fs
    .readdirSync(COMPRES_DIR)
    .filter((f) => f.toLowerCase().endsWith(".xml"));

  if (xmlFiles.length === 0) {
    return NextResponse.json({ imported: 0, skipped: 0, message: "Cap fitxer XML trobat." });
  }

  // Claus ja importades → evitar duplicats
  const existingKeys = await getExistingSourceKeys(user.uid);

  const toInsert: PurchaseInput[] = [];
  let skipped = 0;

  for (const filename of xmlFiles) {
    const filePath = path.join(COMPRES_DIR, filename);
    const content = fs.readFileSync(filePath, "utf-8");
    const rows = parseCaixaXml(content);

    for (const row of rows) {
      const key = `${filename}|${row.date}|${row.concepte}|${row.import}|${row.compteTarjeta}`;
      if (existingKeys.has(key)) {
        skipped++;
        continue;
      }
      toInsert.push({
        date: row.date,
        concepte: row.concepte,
        categoria: row.categoria,
        import: row.import,
        tipusMoviment: row.tipusMoviment,
        compteTarjeta: row.compteTarjeta,
        sourceFile: filename,
        sourceKey: key,
      });
      existingKeys.add(key); // evita duplicats dins del mateix batch
    }
  }

  const imported = toInsert.length > 0 ? await createPurchases(user.uid, toInsert) : 0;

  return NextResponse.json({
    imported,
    skipped,
    message: `${imported} registres importats, ${skipped} ja existien.`,
  });
}
