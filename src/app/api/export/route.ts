import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getAuthUser, unauthorized } from "@/lib/server-auth";
import { listTickets } from "@/lib/tickets-db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const { searchParams } = new URL(req.url);

  const tickets = await listTickets({
    from: searchParams.get("from"),
    to: searchParams.get("to"),
    category: searchParams.get("category"),
    search: searchParams.get("search"),
    userId: searchParams.get("userId"),
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Gastos Tickets";
  workbook.created = new Date();

  // --- Full de tickets ---
  const sheet = workbook.addWorksheet("Tickets");
  sheet.columns = [
    { header: "Data", key: "date", width: 12 },
    { header: "Comerç", key: "merchant", width: 28 },
    { header: "Categoria", key: "category", width: 16 },
    { header: "Import total", key: "totalAmount", width: 14 },
    { header: "IVA", key: "taxAmount", width: 10 },
    { header: "% IVA", key: "taxRate", width: 8 },
    { header: "Moneda", key: "currency", width: 8 },
    { header: "Forma de pagament", key: "paymentMethod", width: 18 },
    { header: "Usuari", key: "user", width: 16 },
    { header: "Notes", key: "notes", width: 30 },
    { header: "Estat", key: "status", width: 12 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const t of tickets) {
    sheet.addRow({
      date: t.date || "",
      merchant: t.merchant || "",
      category: t.category || "",
      totalAmount: t.totalAmount ?? "",
      taxAmount: t.taxAmount ?? "",
      taxRate: t.taxRate ?? "",
      currency: t.currency,
      paymentMethod: t.paymentMethod || "",
      user: t.userName || "",
      notes: t.notes || "",
      status: t.status,
    });
  }

  sheet.getColumn("totalAmount").numFmt = "#,##0.00";
  sheet.getColumn("taxAmount").numFmt = "#,##0.00";

  // --- Full de línies de detall ---
  const itemsSheet = workbook.addWorksheet("Línies de producte");
  itemsSheet.columns = [
    { header: "Data ticket", key: "date", width: 12 },
    { header: "Comerç", key: "merchant", width: 28 },
    { header: "Descripció", key: "description", width: 32 },
    { header: "Quantitat", key: "quantity", width: 10 },
    { header: "Preu unitari", key: "unitPrice", width: 12 },
    { header: "Total línia", key: "totalPrice", width: 12 },
  ];
  itemsSheet.getRow(1).font = { bold: true };

  for (const t of tickets) {
    for (const item of t.items || []) {
      itemsSheet.addRow({
        date: t.date || "",
        merchant: t.merchant || "",
        description: item.description,
        quantity: item.quantity ?? 1,
        unitPrice: item.unitPrice ?? "",
        totalPrice: item.totalPrice ?? "",
      });
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="tickets_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx"`,
    },
  });
}
