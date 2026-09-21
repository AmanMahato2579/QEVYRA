import { prisma } from "@/lib/prisma";
import type {
  TrackTicket,
  TrackTicketEvent,
  TrackTicketStatus,
  TrackServiceType,
} from "@prisma/client";

// ─── Ticket Code Generation ────────────────────────────────────────────────────

const SERVICE_PREFIX: Record<TrackServiceType, string> = {
  GARAGE: "GAR",
  TAILOR: "TLR",
  ELECTRONICS_REPAIR: "REP",
  DRY_CLEAN: "DRY",
  OTHER: "TKT",
};

/** Generates a human-readable ticket code like GAR-4821. */
export function generateTicketCode(serviceType: TrackServiceType): string {
  const prefix = SERVICE_PREFIX[serviceType];
  const suffix = Math.floor(1000 + Math.random() * 9000); // 1000–9999
  return `${prefix}-${suffix}`;
}

// ─── createTrackTicket ─────────────────────────────────────────────────────────

export async function createTrackTicket(params: {
  restaurantId: string;
  serviceType: TrackServiceType;
  customerName: string;
  customerPhone?: string;
  itemDescription: string;
  internalNote?: string;
  estimatedPrice?: number;
  currency: string;
}): Promise<TrackTicket & { events: TrackTicketEvent[] }> {
  const ticketCode = generateTicketCode(params.serviceType);

  const ticket = await prisma.trackTicket.create({
    data: {
      restaurantId: params.restaurantId,
      ticketCode,
      serviceType: params.serviceType,
      customerName: params.customerName,
      customerPhone: params.customerPhone ?? null,
      itemDescription: params.itemDescription,
      internalNote: params.internalNote ?? null,
      estimatedPrice: params.estimatedPrice ?? null,
      currency: params.currency,
      status: "RECEIVED",
      events: {
        create: {
          fromStatus: null,
          toStatus: "RECEIVED",
          note: "Ticket created",
        },
      },
    },
    include: {
      events: { orderBy: { createdAt: "asc" } },
    },
  });

  return ticket;
}

// ─── advanceTicketStatus ───────────────────────────────────────────────────────

export async function advanceTicketStatus(params: {
  ticketId: string;
  restaurantId: string;
  newStatus: TrackTicketStatus;
  actorNote?: string;
}): Promise<TrackTicket> {
  const existing = await prisma.trackTicket.findFirst({
    where: { id: params.ticketId, restaurantId: params.restaurantId },
  });

  if (!existing) {
    throw new Error("Ticket not found or access denied");
  }

  const now = new Date();
  const timestamps: { readyAt?: Date; deliveredAt?: Date } = {};

  if (params.newStatus === "READY") {
    timestamps.readyAt = now;
  } else if (params.newStatus === "DELIVERED") {
    timestamps.deliveredAt = now;
  }

  const [, updated] = await prisma.$transaction([
    prisma.trackTicketEvent.create({
      data: {
        ticketId: params.ticketId,
        fromStatus: existing.status,
        toStatus: params.newStatus,
        actorNote: params.actorNote ?? null,
      },
    }),
    prisma.trackTicket.update({
      where: { id: params.ticketId },
      data: {
        status: params.newStatus,
        ...timestamps,
      },
    }),
  ]);

  return updated;
}

// ─── updateTicketPrice ─────────────────────────────────────────────────────────

export async function updateTicketPrice(params: {
  ticketId: string;
  restaurantId: string;
  estimatedPrice?: number | null;
  finalPrice?: number | null;
  priceNote?: string | null;
}): Promise<TrackTicket> {
  const existing = await prisma.trackTicket.findFirst({
    where: { id: params.ticketId, restaurantId: params.restaurantId },
  });

  if (!existing) {
    throw new Error("Ticket not found or access denied");
  }

  return prisma.trackTicket.update({
    where: { id: params.ticketId },
    data: {
      estimatedPrice: params.estimatedPrice,
      finalPrice: params.finalPrice,
      priceNote: params.priceNote,
    },
  });
}

// ─── getActiveTickets ──────────────────────────────────────────────────────────

/** Returns all non-terminal tickets (not DELIVERED or CANCELLED) for a restaurant. */
export async function getActiveTickets(
  restaurantId: string
): Promise<(TrackTicket & { events: TrackTicketEvent[] })[]> {
  return prisma.trackTicket.findMany({
    where: {
      restaurantId,
      status: { notIn: ["DELIVERED", "CANCELLED"] },
    },
    orderBy: { createdAt: "desc" },
    include: {
      events: { orderBy: { createdAt: "asc" } },
    },
  });
}

// ─── getTicketByCode ───────────────────────────────────────────────────────────

/** Public lookup — no auth required. Returns ticket with restaurant info and events. */
export async function getTicketByCode(ticketCode: string): Promise<
  | (TrackTicket & {
      restaurant: {
        name: string;
        phone: string | null;
        address: string | null;
        slug: string;
        currency: string;
      };
      events: TrackTicketEvent[];
    })
  | null
> {
  return prisma.trackTicket.findUnique({
    where: { ticketCode },
    include: {
      restaurant: {
        select: {
          name: true,
          phone: true,
          address: true,
          slug: true,
          currency: true,
        },
      },
      events: { orderBy: { createdAt: "asc" } },
    },
  });
}

// ─── cancelTicket ──────────────────────────────────────────────────────────────

/** Cancels a ticket and records a CANCELLED event. Validates tenant ownership. */
export async function cancelTicket(params: {
  ticketId: string;
  restaurantId: string;
  reason?: string;
}): Promise<void> {
  const existing = await prisma.trackTicket.findFirst({
    where: { id: params.ticketId, restaurantId: params.restaurantId },
  });

  if (!existing) {
    throw new Error("Ticket not found or access denied");
  }

  await prisma.$transaction([
    prisma.trackTicketEvent.create({
      data: {
        ticketId: params.ticketId,
        fromStatus: existing.status,
        toStatus: "CANCELLED",
        actorNote: params.reason ?? null,
      },
    }),
    prisma.trackTicket.update({
      where: { id: params.ticketId },
      data: { status: "CANCELLED" },
    }),
  ]);
}
