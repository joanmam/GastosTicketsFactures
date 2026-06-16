/**
 * Parser per als fitxers SpreadsheetML (XML) exportats des de "Les Meves Finances"
 * de CaixaBank. Extreu les files de dades (Data, Concepte, Categoria, Import,
 * Tipus Moviment, Compte/Targeta) i les retorna com a objectes normals.
 */

export interface ParsedRow {
  date: string;          // ISO YYYY-MM-DD
  concepte: string;
  categoria: string;
  import: number;
  tipusMoviment: string;
  compteTarjeta: string;
}

/** Converteix DD/MM/YYYY → YYYY-MM-DD */
function toIso(ddmmyyyy: string): string {
  const parts = ddmmyyyy.split("/");
  if (parts.length !== 3) return ddmmyyyy;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

/** Extreu el text de tots els elements <Data> d'una fila XML */
function extractCellValues(row: string): string[] {
  const values: string[] = [];
  // Matches <Data ss:Type="...">CONTENT</Data>
  const re = /<Data\s+ss:Type="[^"]*">([^<]*)<\/Data>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(row)) !== null) {
    // Decode common XML entities
    values.push(
      m[1]
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&#x2F;/g, "/")
        .replace(/&#8364;/g, "€")
        .trim()
    );
  }
  return values;
}

const DATE_RE = /^\d{2}\/\d{2}\/\d{4}$/;

export function parseCaixaXml(xmlContent: string): ParsedRow[] {
  // Normalise line endings so the regex works
  const flat = xmlContent.replace(/\r?\n/g, " ");

  // Split by <Row ...> or <Row>
  const rowChunks = flat.split(/<Row[^>]*>/);
  const results: ParsedRow[] = [];

  for (const chunk of rowChunks) {
    const values = extractCellValues(chunk);
    // A data row has at least 6 values, and the first one looks like DD/MM/YYYY
    if (values.length >= 6 && DATE_RE.test(values[0])) {
      const importRaw = parseFloat(values[3]);
      if (isNaN(importRaw)) continue;

      results.push({
        date: toIso(values[0]),
        concepte: values[1],
        categoria: values[2],
        import: importRaw,
        tipusMoviment: values[4],
        compteTarjeta: values[5],
      });
    }
  }

  return results;
}
