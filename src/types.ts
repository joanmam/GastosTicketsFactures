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
