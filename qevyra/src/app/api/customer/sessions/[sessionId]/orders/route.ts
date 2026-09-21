import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  // A session id alone must not be enough to read a table's order history.
  // The caller proves ownership via the customer token it was issued.
  const customerToken = req.headers.get("x-customer-token")?.trim();
  if (!customerToken) {
    return NextResponse.json({ error: "Missing customer token." }, { status: 401 });
  }

  const session = await prisma.tableSession.findFirst({
    where: { id: sessionId },
    select: { id: true, status: true },
  });
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (session.status !== "ACTIVE") {
    return NextResponse.json({ error: "This table session has ended." }, { status: 410 });
  }

  const orders = await prisma.order.findMany({
    where: { tableSessionId: sessionId, customerToken },
    include: { orderItems: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(JSON.parse(JSON.stringify(orders)));
}