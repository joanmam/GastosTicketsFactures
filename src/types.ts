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
 * PAID = Pagada, OVERDUE = Vençuda.
 */
export type InvoiceStatus = "DRAFT" | "PENDING_AEAT" | "SENT" | "PAID" | "OVERDUE";

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
  clientId?: string | null;
  clientSnapshot?: ClientInput | null;
  date?: string | null; // data de factura (ISO)
  dueDate?: string | null; // data de venciment (ISO)
  items?: InvoiceLineItem[];
  irpfRate?: number | null; // % retenció IRPF (p.ex. 15)
  notes?: string | null;
  status?: InvoiceStatus;
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
