import type { Notification, NotificationSource } from "@/types";

// ─── Keywords per filtrar contingut rellevant per a autònoms ──────────────────
const AUTONOMO_KEYWORDS = [
  "autónom", "autònom", "cuenta propia", "RETA", "empresari", "empresario",
  "estimación directa", "estimació directa", "módulos", "mòduls",
  "modelo 130", "modelo 303", "modelo 349", "modelo 390", "modelo 190",
  "IVA", "IRPF", "rendimientos actividades", "activitats econòmiques",
  "actividades económicas", "facturación", "facturació", "treballador",
  "trabajador por cuenta", "cuota autónomos", "quota autònoms",
  "régimen especial", "règim especial", "pagos fraccionados",
  "pagaments fraccionats",
];

function isRelevant(text: string): boolean {
  const lower = text.toLowerCase();
  return AUTONOMO_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
}

// ─── Parser XML RSS genèric ───────────────────────────────────────────────────
interface RawItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
}

function parseRss(xml: string): RawItem[] {
  const items: RawItem[] = [];
  // Eliminar CDATA wrappers
  const clean = xml.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");

  const itemMatches = clean.matchAll(/<item>([\s\S]*?)<\/item>/g);
  for (const m of itemMatches) {
    const block = m[1];
    const title = (block.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1]?.trim() || "";
    const link = (block.match(/<link>([\s\S]*?)<\/link>/) || [])[1]?.trim() || "";
    const description = (block.match(/<description>([\s\S]*?)<\/description>/) || [])[1]?.trim() || "";
    const pubDate = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1]?.trim() || "";
    if (title && link) items.push({ title, link, description, pubDate });
  }
  return items;
}

function parsePubDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().slice(0, 10);
  try {
    // Format RSS: "Thu, 21 May 2026 00:00:00 +0200" o "DD/mes/YYYY"
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    // Format AEAT: "29/abril/2026"
    const spanishMonths: Record<string, string> = {
      enero: "01", febrero: "02", marzo: "03", abril: "04",
      mayo: "05", junio: "06", julio: "07", agosto: "08",
      septiembre: "09", octubre: "10", noviembre: "11", diciembre: "12",
    };
    const m = dateStr.match(/(\d{1,2})\/(\w+)\/(\d{4})/);
    if (m) {
      const month = spanishMonths[m[2].toLowerCase()] || "01";
      return `${m[3]}-${month}-${m[1].padStart(2, "0")}`;
    }
  } catch {}
  return new Date().toISOString().slice(0, 10);
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300);
}

// ─── Fetch individual per font ────────────────────────────────────────────────
async function fetchSource(
  url: string,
  source: NotificationSource,
  filterByKeyword: boolean,
  since: string
): Promise<Omit<Notification, "id">[]> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 GastosApp/1.0 RSS-Reader" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const items = parseRss(xml);

    return items
      .filter((item) => {
        const date = parsePubDate(item.pubDate);
        if (date < since) return false;
        if (filterByKeyword && !isRelevant(item.title + " " + item.description)) return false;
        return true;
      })
      .map((item) => ({
        source,
        title: stripHtml(item.title).slice(0, 200),
        summary: stripHtml(item.description).slice(0, 400),
        url: item.link,
        publishedAt: parsePubDate(item.pubDate),
        fetchedAt: new Date().toISOString().slice(0, 10),
        sourceKey: `${source}|${item.link}`,
      }));
  } catch (err) {
    console.error(`[fetch-notifications] Error fetching ${source}:`, err);
    return [];
  }
}

// ─── Funció principal ─────────────────────────────────────────────────────────
export async function fetchAllNotifications(
  since = "2026-01-01"
): Promise<Omit<Notification, "id">[]> {
  const [aeat, ss, dogc, atc, infoautonomos] = await Promise.allSettled([
    // AEAT: totes les novedades (ja parlen d'autònoms o no)
    fetchSource(
      "https://sede.agenciatributaria.gob.es/Sede/todas-noticias.xml",
      "AEAT",
      false, // mostrar totes (son seleccionades per la AEAT)
      since
    ),
    // SS: novedades legislatives
    fetchSource(
      "https://www.seg-social.es/wps/wcm/connect/wss/poin_contenidos/internet/34975/rss.xml",
      "SS",
      false,
      since
    ),
    // DOGC
    fetchSource(
      "https://dogc.gencat.cat/ca/pdogc_canals_interns/pdogc_resultats_edicte/rss.rss",
      "DOGC",
      true,
      since
    ),
    // ATC (Agència Tributària de Catalunya): filtrar per paraules clau
    fetchSource(
      "https://atc.gencat.cat/ca/novetats_i_comunicats/novetats/rss.xml",
      "ATC",
      true,
      since
    ),
    // Infoautónomos: ja és una font curada, sense filtre
    fetchSource(
      "https://www.infoautonomos.com/feed/",
      "Infoautonomos",
      false,
      since
    ),
  ]);

  const results: Omit<Notification, "id">[] = [];
  for (const r of [aeat, ss, dogc, atc, infoautonomos]) {
    if (r.status === "fulfilled") results.push(...r.value);
  }
  return results;
}
