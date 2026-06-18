import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/server-auth";
import { listNotificationsForUser, getUnreadCount } from "@/lib/notifications-db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const { searchParams } = new URL(req.url);
  const source = searchParams.get("source") || undefined;
  const from = searchParams.get("from") || "2026-01-01";
  const onlyUnread = searchParams.get("onlyUnread") === "true";

  const [notifications, unreadCount] = await Promise.all([
    listNotificationsForUser(user.uid, { source, from, onlyUnread }),
    getUnreadCount(user.uid),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}
