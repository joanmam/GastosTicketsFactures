import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/server-auth";
import { markAsRead, markAllAsRead } from "@/lib/notifications-db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const body = await req.json();

  if (body.all === true) {
    await markAllAsRead(user.uid);
    return NextResponse.json({ ok: true });
  }

  if (body.id) {
    await markAsRead(user.uid, body.id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Cal especificar id o all:true" }, { status: 400 });
}
