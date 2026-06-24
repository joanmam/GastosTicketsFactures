import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/server-auth";
import { listInvoices } from "@/lib/invoices-db";
import { listTickets } from "@/lib/tickets-db";
import { listPurchasesForUser } from "@/lib/purchases-db";
import { computeInvoiceTotals, quarterOf, round2 } from "@/lib/invoice-calc";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year")) || new Date().getFullYear();

  const [invoices, tickets, purchases] = await Promise.all([
    listInvoices({}),
    listTickets({}),
    listPurchasesForUser(user.uid, {}),
  ]);

  const yearInvoices = invoices.filter((i) => i.date && Number(i.date.slice(0, 4)) === year);
  const yearTickets = tickets.filter((t) => t.date && Number(t.date.slice(0, 4)) === year);
  const yearPurchases = purchases.filter((p) => p.date && Number(p.date.slice(0, 4)) === year);

  const quarters = [1, 2, 3, 4].map((q) => {
    const qInvoices = yearInvoices.filter((i) => quarterOf(i.date!) === q);
    const qTickets = yearTickets.filter((t) => quarterOf(t.date!) === q);
    const qPurchases = yearPurchases.filter((p) => quarterOf(p.date) === q);

    let baseImposable = 0;
    let vatTotal = 0;
    let irpfAmount = 0;
    let total = 0;
    const vatByRate: Record<string, number> = {};

    for (const inv of qInvoices) {
      const totals = computeInvoiceTotals(inv.items || [], inv.irpfRate);
      baseImposable += totals.baseImposable;
      vatTotal += totals.vatTotal;
      irpfAmount += totals.irpfAmount;
      total += totals.total;
      for (const [rate, amount] of Object.entries(totals.vatByRate)) {
        vatByRate[rate] = (vatByRate[rate] || 0) + amount;
      }
    }

    const ticketExpenses = qTickets.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    const purchaseExpenses = qPurchases.reduce(
      (sum, p) => sum + Math.abs(p.import < 0 ? p.import : 0),
      0
    );
    const purchaseRefunds = qPurchases.reduce(
      (sum, p) => sum + (p.import > 0 ? p.import : 0),
      0
    );
    const netPurchaseExpenses = purchaseExpenses - purchaseRefunds;
    const expenses = ticketExpenses + netPurchaseExpenses;

    // IVA suportat (pagat): suma de l'IVA de les compres del trimestre
    const ivaSuportat = qPurchases
      .filter((p) => p.import < 0)
      .reduce((sum, p) => {
        if (p.ivaLines && p.ivaLines.length > 0) {
          return sum + p.ivaLines.reduce((s: number, l: any) => s + (l.iva || 0), 0);
        }
        return sum + Math.abs(p.iva || 0);
      }, 0);

    // IVA repercutit (cobrat en factures) = vatTotal ja calculat
    const ivaRepercutit = vatTotal;
    // Diferència positiva = a pagar a l'AEAT; negativa = a retornar
    const ivaBalance = round2(ivaRepercutit - ivaSuportat);

    return {
      quarter: q,
      invoiceCount: qInvoices.length,
      baseImposable: round2(baseImposable),
      vatByRate,
      vatTotal: round2(vatTotal),
      irpfAmount: round2(irpfAmount),
      total: round2(total),
      ticketExpenses: round2(ticketExpenses),
      purchaseExpenses: round2(netPurchaseExpenses),
      expenses: round2(expenses),
      balance: round2(baseImposable - expenses),
      ivaSuportat: round2(ivaSuportat),
      ivaRepercutit: round2(ivaRepercutit),
      ivaBalance,
    };
  });

  const pendingPayment = yearInvoices
    .filter((i) => i.status !== "PAID" && i.status !== "DRAFT")
    .map((i) => ({
      id: i.id,
      number: i.number,
      client: i.clientSnapshot?.name || null,
      total: computeInvoiceTotals(i.items || [], i.irpfRate).total,
      dueDate: i.dueDate,
      status: i.status,
    }));

  const pendingAeat = yearInvoices
    .filter((i) => i.aeat?.status === "PENDING")
    .map((i) => ({ id: i.id, number: i.number, client: i.clientSnapshot?.name || null, date: i.date }));

  const pendingSendClient = yearInvoices
    .filter((i) => !i.checklist?.sentToClient && i.status !== "DRAFT")
    .map((i) => ({
      id: i.id,
      number: i.number,
      client: i.clientSnapshot?.name || null,
      aeatStatus: i.aeat?.status,
    }));

  const totals = quarters.reduce(
    (acc, q) => ({
      baseImposable: round2(acc.baseImposable + q.baseImposable),
      vatTotal: round2(acc.vatTotal + q.vatTotal),
      irpfAmount: round2(acc.irpfAmount + q.irpfAmount),
      total: round2(acc.total + q.total),
      expenses: round2(acc.expenses + q.expenses),
      balance: round2(acc.balance + q.balance),
      ivaSuportat: round2(acc.ivaSuportat + q.ivaSuportat),
      ivaRepercutit: round2(acc.ivaRepercutit + q.ivaRepercutit),
      ivaBalance: round2(acc.ivaBalance + q.ivaBalance),
    }),
    { baseImposable: 0, vatTotal: 0, irpfAmount: 0, total: 0, expenses: 0, balance: 0, ivaSuportat: 0, ivaRepercutit: 0, ivaBalance: 0 }
  );

  return NextResponse.json({
    year,
    quarters,
    totals,
    pendingPayment,
    pendingAeat,
    pendingSendClient,
  });
}
