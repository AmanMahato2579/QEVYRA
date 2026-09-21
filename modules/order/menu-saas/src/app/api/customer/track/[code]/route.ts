import { NextResponse } from "next/server";
import { getTicketByCode } from "@/lib/track";

// ─── GET /api/customer/track/[code] ───────────────────────────────────────────
// Public endpoint — no authentication required.
// Customers can look up their own ticket status using the printed ticket code.

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const ticket = await getTicketByCode(code.toUpperCase());

  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  // Strip staff-only field before sending to the public caller
  const {
    internalNote: _stripped,
    ...publicTicket
  } = ticket;

  return NextResponse.json(publicTicket);
}
