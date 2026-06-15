import type { AeatStatus, InvoiceStatus, InvoiceType, QuoteStatus } from "@/types";

export const VAT_RATES = [0, 4, 10, 21] as const;

export const DEFAULT_IRPF_RATE = 15;

export const IRPF_RATES = [0, 7, 15, 19] as const;

export const INVOICE_STATUSES: { value: InvoiceStatus; label: string }[] = [
  { value: "DRAFT", label: "Esborrany" },
  { value: "PENDING_AEAT", label: "Pendent AEAT" },
  { value: "SENT", label: "Enviada al client" },
  { value: "PAID", label: "Pagada" },
  { value: "OVERDUE", label: "Vençuda" },
];

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  DRAFT: "Esborrany",
  PENDING_AEAT: "Pendent AEAT",
  SENT: "Enviada al client",
  PAID: "Pagada",
  OVERDUE: "Vençuda",
};

export const INVOICE_STATUS_COLOR: Record<InvoiceStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PENDING_AEAT: "bg-yellow-100 text-yellow-700",
  SENT: "bg-blue-100 text-blue-700",
  PAID: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
};

export const INVOICE_TYPES: { value: InvoiceType; label: string }[] = [
  { value: "ORDINARY", label: "Ordinària" },
  { value: "RECTIFYING", label: "Rectificativa" },
];

export const INVOICE_TYPE_LABEL: Record<InvoiceType, string> = {
  ORDINARY: "Ordinària",
  RECTIFYING: "Rectificativa",
};

export const QUOTE_STATUSES: { value: QuoteStatus; label: string }[] = [
  { value: "DRAFT", label: "Esborrany" },
  { value: "SENT", label: "Enviat al client" },
  { value: "ACCEPTED", label: "Acceptat" },
  { value: "REJECTED", label: "Rebutjat" },
  { value: "CONVERTED", label: "Convertit en factura" },
];

export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  DRAFT: "Esborrany",
  SENT: "Enviat al client",
  ACCEPTED: "Acceptat",
  REJECTED: "Rebutjat",
  CONVERTED: "Convertit en factura",
};

export const QUOTE_STATUS_COLOR: Record<QuoteStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SENT: "bg-blue-100 text-blue-700",
  ACCEPTED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  CONVERTED: "bg-purple-100 text-purple-700",
};

export const AEAT_STATUSES: { value: AeatStatus; label: string; icon: string }[] = [
  { value: "PENDING", label: "Pendent de generar a la AEAT", icon: "⚠️" },
  { value: "OBTAINED", label: "Document AEAT obtingut", icon: "✅" },
  { value: "SENT_TO_CLIENT", label: "Enviat al client", icon: "📤" },
];

export const AEAT_STATUS_LABEL: Record<AeatStatus, string> = {
  PENDING: "⚠️ Pendent de generar a la AEAT",
  OBTAINED: "✅ Document AEAT obtingut",
  SENT_TO_CLIENT: "📤 Enviat al client",
};

export const AEAT_STATUS_COLOR: Record<AeatStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-700 border-yellow-200",
  OBTAINED: "bg-green-100 text-green-700 border-green-200",
  SENT_TO_CLIENT: "bg-blue-100 text-blue-700 border-blue-200",
};

export const CHECKLIST_LABELS: Record<keyof import("@/types").InvoiceChecklist, string> = {
  createdInApp: "Factura creada a l'app",
  dataEnteredAeat: "Dades introduïdes a la Sede Electrònica AEAT",
  aeatPdfSaved: "PDF oficial AEAT obtingut i guardat",
  sentToClient: "PDF oficial enviat al client",
  paid: "Factura cobrada",
};
