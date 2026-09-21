import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRestaurantAdmin } from "@/lib/auth-guard";
import { advanceTicketStatus, cancelTicket, updateTicketPrice } from "@/lib/track";

// ─── Validation Schema ─────────────────────────────────────────────────────────

const patchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("status"),
    status: z.enum([
      "RECEIVED",
      "INSPECTING",
      "IN_PROGRESS",
      "QUALITY_CHECK",
      "READY",
      "DELIVERED",
      "CANCELLED",
    ]),
    actorNote: z.string().trim().max(500).optional(),
  }),
  z.object({
    action: z.literal("price"),
    estimatedPrice: z.coerce.number().positive().nullable().optional(),
    finalPrice: z.coerce.number().positive().nullable().optional(),
    priceNote: z.string().trim().max(500).nullable().optional(),
  }),
]);

// ─── PATCH /api/admin/track/tickets/[id] ──────────────────────────────────────

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireRestaurantAdmin();
  const { id } = await params;

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    if (parsed.data.action === "status") {
      const updated = await advanceTicketStatus({
        ticketId: id,
        restaurantId: user.restaurantId!,
        newStatus: parsed.data.status,
        actorNote: parsed.data.actorNote,
      });
      return NextResponse.json(updated);
    }

    // action === 'price'
    const updated = await updateTicketPrice({
      ticketId: id,
      restaurantId: user.restaurantId!,
      estimatedPrice: parsed.data.estimatedPrice,
      finalPrice: parsed.data.finalPrice,
      priceNote: parsed.data.priceNote,
    });
    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    if (message.includes("not found") || message.includes("access denied")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── DELETE /api/admin/track/tickets/[id] ─────────────────────────────────────

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireRestaurantAdmin();
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const reason: string | undefined =
    typeof body === "object" && body !== null && "reason" in body
      ? String((body as Record<string, unknown>).reason)
      : undefined;

  try {
    await cancelTicket({
      ticketId: id,
      restaurantId: user.restaurantId!,
      reason,
    });
    return new Response(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    if (message.includes("not found") || message.includes("access denied")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
