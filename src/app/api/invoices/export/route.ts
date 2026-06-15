import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getAuthUser, unauthorized } from "@/lib/server-auth";
import { listInvoices } from "@/lib/invoices-db";
import { computeInvoiceTotals } from "@/lib/invoice-calc";
import { AEAT_STATUS_LABEL, INVOICE_STATUS_LABEL } from "@/lib/invoice-constants";
import type { InvoiceStatus, AeatStatus } from "@/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const { searchParams } = new URL(req.url);

  const invoices = await listInvoices({
    status: searchParams.get("status"),
    clientId: searchParams.get("clientId"),
    from: searchParams.get("from"),
    to: searchParams.get("to"),
    quarter: searchParams.get("quarter"),
    search: searchParams.get("search"),
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Gastos · Facturació";
  workbook.created = new Date();

  // --- Full de factures ---
  const sheet = workbook.addWorksheet("Factures");
  sheet.columns = [
    { header: "Número", key: "number", width: 12 },
    { header: "Data", key: "date", width: 12 },
    { header: "Venciment", key: "dueDate", width: 12 },
    { header: "Client", key: "client", width: 28 },
    { header: "NIF/CIF", key: "taxId", width: 14 },
    { header: "Base imposable", key: "base", width: 14 },
    { header: "% IVA", key: "vatRates", width: 10 },
    { header: "IVA", key: "vat", width: 12 },
    { header: "% IRPF", key: "irpfRate", width: 8 },
    { header: "IRPF", key: "irpf", width: 12 },
    { header: "Total", key: "total", width: 14 },
    { header: "Estat", key: "status", width: 16 },
    { header: "Estat AEAT", key: "aeatStatus", width: 26 },
    { header: "CSV AEAT", key: "csv", width: 20 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const inv of invoices) {
    const totals = computeInvoiceTotals(inv.items || [], inv.irpfRate);
    const vatRates = Array.from(new Set((inv.items || []).map((it) => it.vatRate))).sort().join("/");
    sheet.addRow({
      number: inv.number || "",
      date: inv.date || "",
      dueDate: inv.dueDate || "",
      client: inv.clientSnapshot?.name || "",
      taxId: inv.clientSnapshot?.taxId || "",
      base: totals.baseImposable,
      vatRates: vatRates ? `${vatRates}%` : "",
      vat: totals.vatTotal,
      irpfRate: inv.irpfRate ?? "",
      irpf: totals.irpfAmount,
      total: totals.total,
      status: INVOICE_STATUS_LABEL[(inv.status || "DRAFT") as InvoiceStatus],
      aeatStatus: AEAT_STATUS_LABEL[(inv.aeat?.status || "PENDING") as AeatStatus],
      csv: inv.aeat?.csv || "",
    });
  }

  ["base", "vat", "irpf", "total"].forEach((key) => {
    sheet.getColumn(key).numFmt = "#,##0.00";
  });

  const totalRow = sheet.addRow({
    client: "TOTAL",
    base: { formula: `SUM(F2:F${invoices.length + 1})` },
    vat: { formula: `SUM(H2:H${invoices.length + 1})` },
    irpf: { formula: `SUM(J2:J${invoices.length + 1})` },
    total: { formula: `SUM(K2:K${invoices.length + 1})` },
  });
  totalRow.font = { bold: true };

  // --- Full de línies de factura ---
  const itemsSheet = workbook.addWorksheet("Línies");
  itemsSheet.columns = [
    { header: "Número factura", key: "number", width: 12 },
    { header: "Data", key: "date", width: 12 },
    { header: "Client", key: "client", width: 28 },
    { header: "Descripció", key: "description", width: 36 },
    { header: "Quantitat", key: "quantity", width: 10 },
    { header: "Preu unitari", key: "unitPrice", width: 12 },
    { header: "% IVA", key: "vatRate", width: 8 },
    { header: "Base línia", key: "base", width: 12 },
  ];
  itemsSheet.getRow(1).font = { bold: true };

  for (const inv of invoices) {
    for (const item of inv.items || []) {
      itemsSheet.addRow({
        number: inv.number || "",
        date: inv.date || "",
        client: inv.clientSnapshot?.name || "",
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        vatRate: item.vatRate,
        base: (item.quantity || 0) * (item.unitPrice || 0),
      });
    }
  }
  itemsSheet.getColumn("unitPrice").numFmt = "#,##0.00";
  itemsSheet.getColumn("base").numFmt = "#,##0.00";

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="factures_${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
