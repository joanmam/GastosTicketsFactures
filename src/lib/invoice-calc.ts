import type { AeatInfo, InvoiceChecklist, InvoiceLineItem, InvoiceTotals } from "@/types";

export function emptyInvoiceItem(): InvoiceLineItem {
  return { description: "", quantity: 1, unitPrice: 0, vatRate: 21 };
}

export function defaultAeatInfo(): AeatInfo {
  return {
    status: "PENDING",
    csv: null,
    verificationUrl: null,
    pdfPath: null,
    qrPath: null,
    generatedDate: null,
  };
}

export function defaultInvoiceChecklist(): InvoiceChecklist {
  return {
    createdInApp: true,
    dataEnteredAeat: false,
    aeatPdfSaved: false,
    sentToClient: false,
    paid: false,
  };
}

/** Base imposable d'una línia (quantitat × preu unitari). */
export function lineBase(item: InvoiceLineItem): number {
  return (item.quantity || 0) * (item.unitPrice || 0);
}

/** Import d'IVA d'una línia. */
export function lineVat(item: InvoiceLineItem): number {
  return round2(lineBase(item) * ((item.vatRate || 0) / 100));
}

/** Total d'una línia (base + IVA). */
export function lineTotal(item: InvoiceLineItem): number {
  return round2(lineBase(item) + lineVat(item));
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Calcula els totals d'una factura: base imposable, IVA desglossat per tipus,
 * retenció d'IRPF i total a cobrar.
 */
export function computeInvoiceTotals(items: InvoiceLineItem[] = [], irpfRate?: number | null): InvoiceTotals {
  let baseImposable = 0;
  const vatByRate: Record<string, number> = {};

  for (const item of items) {
    const base = lineBase(item);
    baseImposable += base;
    const rateKey = String(item.vatRate ?? 0);
    vatByRate[rateKey] = (vatByRate[rateKey] || 0) + round2(base * ((item.vatRate || 0) / 100));
  }

  const vatTotal = Object.values(vatByRate).reduce((sum, v) => sum + v, 0);
  const irpfAmount = round2(baseImposable * ((irpfRate || 0) / 100));
  const total = round2(baseImposable + vatTotal - irpfAmount);

  return {
    baseImposable: round2(baseImposable),
    vatByRate,
    vatTotal: round2(vatTotal),
    irpfAmount,
    total,
  };
}

/** Retorna el trimestre (1-4) d'una data ISO (YYYY-MM-DD). */
export function quarterOf(dateIso: string): number {
  const month = Number(dateIso.slice(5, 7));
  return Math.ceil(month / 3);
}
