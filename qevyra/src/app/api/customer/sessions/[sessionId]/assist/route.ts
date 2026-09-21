import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { assistanceMessage, assistanceTitle } from "@/lib/i18n";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export async function POST(req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;

  // Assist is a public endpoint (no login); rate limit it so a stray table QR
  // cannot be used to spam staff notifications.
  if (!rateLimit(`assist:${clientIp(req)}:${sessionId}`, 4, 60_000)) {
    return NextResponse.json({ error: "You are pressing call too often. Wait a minute." }, { status: 429 });
  }

  const session = await prisma.tableSession.findFirst({ where: { id: sessionId, status: "ACTIVE" }, include: { table: true } });
  if (!session) return NextResponse.json({ error: "This table session has ended." }, { status: 409 });
  const lang = (await prisma.restaurant.findUnique({ where: { id: session.restaurantId }, select: { language: true } }))?.language ?? "EN";
  await createNotification({
    restaurantId: session.restaurantId, type: "ASSISTANCE_REQUEST", title: assistanceTitle(lang),
    message: assistanceMessage(lang, session.customerName, session.table?.tableNumber), link: "/admin/notifications",
  });
  return NextResponse.json({ success: true });
}
