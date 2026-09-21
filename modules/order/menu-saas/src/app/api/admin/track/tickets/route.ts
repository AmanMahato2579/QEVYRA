import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRestaurantAdmin } from "@/lib/auth-guard";
import { createTrackTicket, getActiveTickets } from "@/lib/track";
import { createNotification } from "@/lib/notifications";

// ─── Validation Schema ─────────────────────────────────────────────────────────

const createTicketSchema = z.object({
  serviceType: z.enum([
    "GARAGE",
    "TAILOR",
    "ELECTRONICS_REPAIR",
    "DRY_CLEAN",
    "OTHER",
  ]),
  customerName: z.string().trim().min(1).max(120),
  customerPhone: z.string().trim().max(30).optional(),
  itemDescription: z.string().trim().min(1).max(500),
  internalNote: z.string().trim().max(500).optional(),
  estimatedPrice: z.coerce.number().positive().optional(),
  currency: z.string().min(1).max(10).default("Rs."),
});

// ─── GET /api/admin/track/tickets ─────────────────────────────────────────────

export async function GET() {
  const user = await requireRestaurantAdmin();
  const tickets = await getActiveTickets(user.restaurantId!);
  return NextResponse.json(tickets);
}

// ─── POST /api/admin/track/tickets ────────────────────────────────────────────

export async function POST(req: Request) {
  const user = await requireRestaurantAdmin();

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = createTicketSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const ticket = await createTrackTicket({
    restaurantId: user.restaurantId!,
    ...parsed.data,
  });

  // Fire-and-forget notification — never breaks the response
  createNotification({
    restaurantId: user.restaurantId!,
    type: "NEW_TRACK_TICKET",
    title: "New service ticket",
    message: `${ticket.ticketCode} – ${ticket.customerName}: ${ticket.itemDescription}`,
    link: `/admin/track/${ticket.id}`,
  }).catch(() => {});

  return NextResponse.json(ticket, { status: 201 });
}
