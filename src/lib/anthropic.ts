import Anthropic from "@anthropic-ai/sdk";
import { CATEGORIES } from "@/lib/categories";

export interface ExtractedTicketItem {
  description: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
}

export interface ExtractedTicket {
  merchant?: string;
  date?: string; // ISO format YYYY-MM-DD
  totalAmount?: number;
  taxAmount?: number;
  taxRate?: number;
  currency?: string;
  category?: string;
  paymentMethod?: string;
  notes?: string;
  items?: ExtractedTicketItem[];
}

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Falta la variable d'entorn ANTHROPIC_API_KEY. Configura-la al fitxer .env per poder escanejar tickets."
    );
  }
  return new Anthropic({ apiKey });
}

export async function extractTicketData(
  base64Image: string,
  mediaType: string
): Promise<ExtractedTicket> {
  const client = getClient();

  const prompt = `Ets un assistent que extreu dades estructurades de tickets de compra o factures (en qualsevol idioma).
Analitza la imatge i retorna NOMÉS un objecte JSON vàlid (sense text addicional, sense markdown) amb aquests camps:

{
  "merchant": string | null,        // nom del comerç o establiment
  "date": string | null,            // data de la compra en format ISO YYYY-MM-DD
  "totalAmount": number | null,     // import total pagat
  "taxAmount": number | null,       // import de l'IVA/impostos si apareix
  "taxRate": number | null,         // percentatge d'IVA si apareix (ex: 21, 10, 4)
  "currency": string,               // codi de moneda ISO (ex: EUR, USD). Per defecte "EUR"
  "category": string,               // tria la més adient d'aquesta llista: ${CATEGORIES.join(", ")}
  "paymentMethod": string | null,   // "Targeta", "Efectiu", "Transferència", "Domiciliació" o "Altres" si s'identifica
  "notes": string | null,           // qualsevol observació rellevant breu
  "items": [                        // línies de producte si es poden llegir, si no, array buit
    { "description": string, "quantity": number, "unitPrice": number | null, "totalPrice": number | null }
  ]
}

Si algun camp no es pot determinar, posa null (excepte currency i category, que sempre han de tenir un valor). Respon NOMÉS amb el JSON.`;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType as
                | "image/jpeg"
                | "image/png"
                | "image/gif"
                | "image/webp",
              data: base64Image,
            },
          },
          {
            type: "text",
            text: prompt,
          },
        ],
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("La IA no ha retornat cap resposta de text.");
  }

  let raw = textBlock.text.trim();
  // Treure blocs de codi markdown si n'hi ha
  raw = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");

  try {
    return JSON.parse(raw) as ExtractedTicket;
  } catch (err) {
    throw new Error("No s'ha pogut interpretar la resposta de la IA com a JSON: " + raw.slice(0, 200));
  }
}
