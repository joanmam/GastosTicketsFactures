export interface TicketItem {
  description: string;
  quantity?: number | null;
  unitPrice?: number | null;
  totalPrice?: number | null;
}

export interface TicketInput {
  merchant?: string | null;
  date?: string | null; // ISO date string (YYYY-MM-DD)
  totalAmount?: number | null;
  taxAmount?: number | null;
  taxRate?: number | null;
  currency?: string;
  category?: string | null;
  paymentMethod?: string | null;
  notes?: string | null;
  status?: string;
  imageBase64?: string | null; // data URL, només quan es crea/actualitza la imatge
  imageMediaType?: string | null;
  rawExtraction?: string | null;
  items?: TicketItem[];
}

export interface Ticket extends TicketInput {
  id: string;
  userId: string;
  userName?: string | null;
  imagePath?: string | null;
  imageUrl?: string | null; // URL signada temporal per visualitzar la imatge
  createdAt?: string | null;
  updatedAt?: string | null;
}

// ---------------------------------------------------------------------------
// Facturació
// ---------------------------------------------------------------------------

export interface ClientInput {
  name?: string | null;
  taxId?: string | null; // NIF / CIF
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
}

export interface Client extends ClientInput {
  id: string;
  userId: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number; // 0, 4, 10, 21
}

/**
 * Estat de gestió interna de la factura.
 * DRAFT = Esborrany, PENDING_AEAT = Pendent AEAT, SENT = Enviada al client,
 * PAID = Pagada, OVERDUE = Veñcuda.
 */
export type InvoiceStatus = "DRAFT" | "PENDING_AEAT" | "SENT" | "PAID" | "OVERDUE";

/**
 * Tipus de factura: ORDINARY = ordinària, RECTIFYING = rectificativa
 * (factura que rectifica una factura anterior, segons normativa AEAT).
 */
export type InvoiceType = "ORDINARY" | "RECTIFYING";

/**
 * Estat del document oficial de la AEAT (Sede Electrònica).
 * PENDING = Pendent de generar, OBTAINED = Document AEAT obtingut,
 * SENT_TO_CLIENT = Enviat al client.
 */
export type AeatStatus = "PENDING" | "OBTAINED" | "SENT_TO_CLIENT";

export interface AeatInfo {
  status: AeatStatus;
  csv?: string | null; // codi segur de verificació
  verificationUrl?: string | null;
  pdfPath?: string | null;
  pdfUrl?: string | null; // URL signada temporal
  qrPath?: string | null;
  qrUrl?: string | null; // URL signada temporal
  generatedDate?: string | null; // data en què es va generar a la AEAT
}

export interface InvoiceChecklist {
  createdInApp: boolean;
  dataEnteredAeat: boolean;
  aeatPdfSaved: boolean;
  sentToClient: boolean;
  paid: boolean;
}

export interface InvoiceInput {
  number?: string | null; // YYYY-NNN
  importSource?: string | null; // p.ex. "Holded" quan ve d'importació
  clientId?: string | null;
  clientSnapshot?: ClientInput | null;
  date?: string | null; // data de factura (ISO)
  dueDate?: string | null; // data de venciment (ISO)
  items?: InvoiceLineItem[];
  irpfRate?: number | null; // % retenció IRPF (p.ex. 15)
  notes?: string | null;
  status?: InvoiceStatus;
  invoiceType?: InvoiceType | null; // ORDINARY (per defecte) o RECTIFYING
  rectifiesInvoiceId?: string | null; // id de la factura original que es rectifica
  rectificationReason?: string | null; // motiu de la rectificació
  aeat?: AeatInfo;
  checklist?: InvoiceChecklist;
  // Camps temporals només per pujar fitxers nous des del client
  aeatPdfBase64?: string | null;
  aeatPdfMediaType?: string | null;
  aeatQrBase64?: string | null;
  aeatQrMediaType?: string | null;
}

export interface Invoice extends InvoiceInput {
  id: string;
  userId: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface InvoiceTotals {
  baseImposable: number;
  vatByRate: Record<string, number>; // base per cada tipus d'IVA
  vatTotal: number;
  irpfAmount: number;
  total: number;
}

// ---------------------------------------------------------------------------
// Catàleg de conceptes (línies de factura reutilitzables)
// ---------------------------------------------------------------------------

export interface LineItemCatalogInput {
  description?: string | null;
  unitPrice?: number | null;
  vatRate?: number | null;
}

/** Referència a una factura que ha fet servir un concepte del catàleg. */
export interface CatalogInvoiceRef {
  id: string;
  number?: string | null;
  date?: string | null; // ISO date YYYY-MM-DD
}

export interface LineItemCatalogEntry extends LineItemCatalogInput {
  id: string;
  userId: string;
  usageCount: number;
  lastUsedDate?: string | null;
  invoices?: CatalogInvoiceRef[]; // factures que han usat aquest concepte
  createdAt?: string | null;
  updatedAt?: string | null;
}

// ---------------------------------------------------------------------------
// Pressupostos
// ---------------------------------------------------------------------------

/**
 * Estat d'un pressupost.
 * DRAFT = Esborrany, SENT = Enviat al client, ACCEPTED = Acceptat,
 * REJECTED = Rebutjat, CONVERTED = Convertit en factura.
 */
export type QuoteStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "CONVERTED";

export interface QuoteInput {
  number?: string | null; // PRES-YYYY-NNN
  clientId?: string | null;
  clientSnapshot?: ClientInput | null;
  date?: string | null; // data del pressupost (ISO)
  validUntil?: string | null; // data de validesa (ISO)
  items?: InvoiceLineItem[];
  irpfRate?: number | null; // % retenció IRPF (p.ex. 15)
  notes?: string | null;
  status?: QuoteStatus;
  convertedInvoiceId?: string | null; // id de la factura generada en acceptar-se
}

export interface Quote extends QuoteInput {
  id: string;
  userId: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

// ---------------------------------------------------------------------------
// Compres (moviments de targeta, importats des de XML CaixaBank)
// ---------------------------------------------------------------------------

export interface IvaLine {
  ivaRate: number;   // tipus IVA: 0, 4, 10, 21
  subtotal: number;  // base imposable d'aquesta línia
  iva: number;       // import IVA = subtotal * ivaRate / 100
}

export interface PurchaseInput {
  date: string;           // data ISO (YYYY-MM-DD)
  concepte: string;       // descripció del moviment
  categoria: string;      // categoria assignada pel banc
  import: number;         // import en EUR (negatiu = despesa, positiu = abonament/devolució)
  tipusMoviment: string;  // p.ex. "Despesa (D)"
  compteTarjeta: string;  // p.ex. "MyCard ...8817"
  sourceFile: string;     // nom del fitxer XML origen
  sourceKey: string;      // clau única per evitar duplicats
  importSource?: string | null; // p.ex. "Holded" quan ve d'importació
  // Desglosament IVA (opcional, editable manualment)
  subtotal?: number | null;    // base imposable (sense IVA)
  ivaRate?: number | null;     // tipus IVA aplicat (0, 4, 10, 21)
  iva?: number | null;         // import IVA
  // Adjunt (ticket, factura, etc.)
  attachmentPath?: string | null;      // ruta a Firebase Storage
  attachmentUrl?: string | null;       // URL signada temporal (només lectura)
  attachmentBase64?: string | null;    // base64 per pujar (transitori, no es desa)
  attachmentMediaType?: string | null; // MIME type del fitxer adjunt
  // Múltiples línies d'IVA (substitueix els camps subtotal/ivaRate/iva per a compres noves)
  ivaLines?: IvaLine[] | null;
  // Altres
  notes?: string | null;
}

export interface Purchase extends PurchaseInput {
  id: string;
  userId: string;
  createdAt?: string | null;
}

export type NotificationSource = "AEAT" | "SS" | "DOGC" | "ATC" | "Infoautonomos";

export interface Notification {
  id: string;
  source: NotificationSource;
  title: string;
  summary: string;
  url: string;
  publishedAt: string; // ISO date YYYY-MM-DD
  fetchedAt: string;
  sourceKey: string;   // dedup key
}

export interface NotificationWithRead extends Notification {
  isRead: boolean;
}
