import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/server-auth";
import { getExistingSourceKeys, createNotifications } from "@/lib/notifications-db";
import { fetchAllNotifications } from "@/lib/fetch-notifications";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  try {
    const fetched = await fetchAllNotifications("2026-01-01");

    const existingKeys = await getExistingSourceKeys();
    const newItems = fetched.filter((n) => !existingKeys.has(n.sourceKey));

    const imported = await createNotifications(newItems);

    return NextResponse.json({
      imported,
      skipped: fetched.length - imported,
      total: fetched.length,
      message: imported > 0
        ? `${imported} notificació${imported !== 1 ? "ns" : ""} nova${imported !== 1 ? "s" : ""} importada${imported !== 1 ? "des" : ""}.`
        : "Ja estàs al dia, cap novetat.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Error sincronitzant." }, { status: 500 });
  }
}
