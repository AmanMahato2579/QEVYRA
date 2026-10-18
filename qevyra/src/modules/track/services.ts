// QEVYRA Track — server service.
// The "service tracking for every business" engine: a Business defines one or
// more Workflows (a process with ordered steps) and issues a Ticket per job.
// Each ticket carries a human-friendly tracking code (e.g. GAR-0001) for staff
// plus an unguessable public token that customers follow on the public /track
// page. Everything is tenant-scoped
// through businessId and gated on the `business_track` plan feature.
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { NotificationChannel, Prisma, TicketStatus } from "@prisma/client";
import { enqueueNotification } from "@/modules/notifications/services";

// Customer-facing phrasing per status, used in the outbound notification body.
const STATUS_MESSAGE: Record<string, string> = {
  PLACED: "has been received",
  IN_PROGRESS: "is in progress",
  READY: "is ready",
  COMPLETED: "is completed",
  CANCELLED: "has been cancelled",
};

async function notifyTicketCustomer(
  businessId: string,
  ticket: { id: string; customerPhone: string | null; publicToken: string },
  text: string
) {
  if (!ticket.customerPhone) return;
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const url = base ? `${base}/track/${ticket.publicToken}` : "";
  await enqueueNotification(businessId, {
    channel: NotificationChannel.WHATSAPP,
    recipient: ticket.customerPhone,
    body: url ? `${text}\n${url}` : text,
    refType: "ticket",
    refId: ticket.id,
  });
}

export type TrackWorkflowWithSteps = Prisma.WorkflowGetPayload<{
  include: {
    steps: { orderBy: { sortOrder: "asc" } };
    _count: { select: { tickets: true } };
  };
}>;

export type TicketWithWorkflow = Prisma.TicketGetPayload<{
  include: {
    workflow: { select: { id: true; name: true; codePrefix: true } };
    currentStep: true;
    items: { orderBy: { sortOrder: "asc" } };
  };
}>;

export type TicketHistoryEntry = Prisma.TicketStatusHistoryGetPayload<{
  include: { fromStep: true; toStep: true };
}>;

export class TrackError extends Error {
  constructor(
    public readonly code: "limit" | "not_found" | "forbidden" | "invalid" | "conflict",
    message: string
  ) {
    super(message);
  }
}

/** Normalize a workflow code prefix to a safe, uppercase, unique-per-business token. */
export function normalizeCodePrefix(value: string): string {
  const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  if (clean.length < 2) throw new TrackError("invalid", "Code prefix must have at least 2 letters/numbers.");
  return clean;
}

export function buildTrackingCode(prefix: string, ticketNumber: number): string {
  return `${prefix}-${String(ticketNumber).padStart(4, "0")}`;
}

/** 192-bit URL-safe secret used in customer QR links. Non-guessable, unlike the
 *  sequential `trackingCode`, so the public tracking page cannot be enumerated. */
export function generatePublicToken(): string {
  return randomBytes(24).toString("base64url");
}

/** Digits-only phone normalization for customer self-lookup matching. */
function normalizePhone(value: string): string {
  return value.replace(/[^0-9]/g, "");
}

/** True when a Prisma error is a unique-constraint violation (P2002). */
export function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002";
}

/** Stable, short, per-business discriminator used only if a tracking code ever collides cross-tenant. */
function businessToken(businessId: string): string {
  const digits = businessId.replace(/[^a-zA-Z0-9]/g, "");
  return (digits.slice(0, 4) || "QV").toUpperCase();
}

// ─── Workflows ──────────────────────────────────────────────────────────────

export function getWorkflows(businessId: string): Promise<TrackWorkflowWithSteps[]> {
  return prisma.workflow.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    include: {
      steps: { orderBy: { sortOrder: "asc" } },
      _count: { select: { tickets: true } },
    },
  });
}

export function getWorkflow(businessId: string, workflowId: string) {
  return prisma.workflow.findFirst({
    where: { id: workflowId, businessId },
    include: { steps: { orderBy: { sortOrder: "asc" } } },
  });
}

export interface WorkflowInput {
  name: string;
  description?: string | null;
  codePrefix?: string;
  isActive?: boolean;
  steps: { name: string; description?: string | null; isReadyStep?: boolean }[];
}

export async function createWorkflow(
  businessId: string,
  workflowsLimit: number | undefined,
  input: WorkflowInput
): Promise<TrackWorkflowWithSteps> {
  const limit = typeof workflowsLimit === "number" && Number.isFinite(workflowsLimit) ? workflowsLimit : 1;
  const existingCount = await prisma.workflow.count({ where: { businessId } });
  if (existingCount >= limit) {
    throw new TrackError(
      "limit",
      `Your plan allows up to ${limit} workflow${limit === 1 ? "" : "s"}. Upgrade to add more.`
    );
  }

  const codePrefix = normalizeCodePrefix(input.codePrefix || input.name);
  const prefixTaken = await prisma.workflow.findFirst({ where: { businessId, codePrefix } });
  if (prefixTaken) throw new TrackError("conflict", `Code prefix "${codePrefix}" is already used by another workflow.`);

  const cleanSteps = input.steps
    .map((s) => ({ name: s.name.trim(), description: s.description?.trim() || null }))
    .filter((s) => s.name.length > 0);
  if (cleanSteps.length === 0) throw new TrackError("invalid", "A workflow needs at least one step.");

  return prisma.workflow.create({
    data: {
      businessId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      codePrefix,
      isActive: input.isActive ?? true,
      steps: {
        create: cleanSteps.map((s, i) => ({
          name: s.name,
          description: s.description,
          sortOrder: i + 1,
          isReadyStep: i === cleanSteps.length - 1,
        })),
      },
    },
    include: { steps: { orderBy: { sortOrder: "asc" } }, _count: { select: { tickets: true } } },
  });
}

export async function updateWorkflow(
  businessId: string,
  workflowId: string,
  input: WorkflowInput
): Promise<TrackWorkflowWithSteps> {
  const existing = await prisma.workflow.findFirst({ where: { id: workflowId, businessId } });
  if (!existing) throw new TrackError("not_found", "Workflow not found.");

  const codePrefix = normalizeCodePrefix(input.codePrefix || input.name);
  const prefixTaken = await prisma.workflow.findFirst({
    where: { businessId, codePrefix, id: { not: workflowId } },
  });
  if (prefixTaken) throw new TrackError("conflict", `Code prefix "${codePrefix}" is already used by another workflow.`);

  const cleanSteps = input.steps
    .map((s) => ({ name: s.name.trim(), description: s.description?.trim() || null }))
    .filter((s) => s.name.length > 0);
  if (cleanSteps.length === 0) throw new TrackError("invalid", "A workflow needs at least one step.");

  // Steps are replaced wholesale; ticket references to removed steps are
  // nulled by the schema (currentStep/history are onDelete: SetNull).
  await prisma.$transaction(async (tx) => {
    await tx.workflow.update({
      where: { id: workflowId },
      data: {
        name: input.name.trim(),
        description: input.description?.trim() || null,
        codePrefix,
        isActive: input.isActive ?? existing.isActive,
      },
    });
    await tx.workflowStep.deleteMany({ where: { workflowId } });
    await tx.workflowStep.createMany({
      data: cleanSteps.map((s, i) => ({
        workflowId,
        name: s.name,
        description: s.description,
        sortOrder: i + 1,
        isReadyStep: i === cleanSteps.length - 1,
      })),
    });
  });

  const updated = await prisma.workflow.findUnique({
    where: { id: workflowId },
    include: { steps: { orderBy: { sortOrder: "asc" } }, _count: { select: { tickets: true } } },
  });
  if (!updated) throw new TrackError("not_found", "Workflow not found.");
  return updated;
}

export async function deleteWorkflow(businessId: string, workflowId: string): Promise<void> {
  const existing = await prisma.workflow.findFirst({
    where: { id: workflowId, businessId },
    include: { _count: { select: { tickets: true } } },
  });
  if (!existing) throw new TrackError("not_found", "Workflow not found.");
  if (existing._count.tickets > 0) {
    throw new TrackError(
      "conflict",
      "This workflow has tickets. Deactivate it instead of deleting so tracking history stays valid."
    );
  }
  await prisma.workflow.delete({ where: { id: workflowId } });
}

// ─── Tickets ────────────────────────────────────────────────────────────────

export interface TicketItemInput {
  name: string;
  description?: string | null;
  quantity?: number | null;
  unitPrice?: number | null;
  currency?: string | null;
}

export interface TicketInput {
  workflowId: string;
  customerName?: string | null;
  customerPhone?: string | null;
  itemSummary?: string | null;
  notes?: string | null;
  items?: TicketItemInput[] | null;
}

/** Clean a raw list of line items into Prisma create inputs. Blank names are
 *  dropped; quantity defaults to 1; prices stay null when not supplied so no
 *  amount is ever invented. */
function normalizeTicketItems(items?: TicketItemInput[] | null) {
  if (!items?.length) return [];
  const rows: { name: string; description: string | null; quantity: number; unitPrice: number | null; currency: string | null; sortOrder: number }[] = [];
  for (const it of items) {
    const name = it.name?.trim();
    if (!name) continue;
    const qty =
      typeof it.quantity === "number" && Number.isFinite(it.quantity) && it.quantity > 0
        ? Math.floor(it.quantity)
        : 1;
    const price =
      typeof it.unitPrice === "number" && Number.isFinite(it.unitPrice) && it.unitPrice >= 0
        ? it.unitPrice
        : null;
    rows.push({
      name,
      description: it.description?.trim() || null,
      quantity: qty,
      unitPrice: price,
      currency: price != null ? it.currency?.trim() || null : null,
      sortOrder: rows.length,
    });
  }
  return rows;
}

export async function createTicket(businessId: string, input: TicketInput): Promise<TicketWithWorkflow> {
  const workflow = await prisma.workflow.findFirst({
    where: { id: input.workflowId, businessId, isActive: true },
  });
  if (!workflow) throw new TrackError("not_found", "Workflow not found or inactive.");

  const items = normalizeTicketItems(input.items);

  // Atomic ticket numbering: a per-workflow counter upserted with `increment`
  // (one locked row, no read-then-write race) — concurrent creates can never
  // reuse a ticket number.
  const ticket = await prisma.$transaction(async (tx) => {
    const seq = await tx.workflowSequence.upsert({
      where: { workflowId: workflow.id },
      update: { lastTicketNumber: { increment: 1 } },
      create: { workflowId: workflow.id, businessId, lastTicketNumber: 1000 },
    });
    const ticketNumber = seq.lastTicketNumber;
    let trackingCode = buildTrackingCode(workflow.codePrefix, ticketNumber);

    // The counter guarantees uniqueness per workflow, but two businesses can
    // share a code prefix (e.g. two garages both "GAR"), so `trackingCode`
    // (globally unique) can collide across tenants. Fall back to a stable
    // business suffix instead of returning a 500 on the very rare P2002.
    for (let attempt = 0; ; attempt++) {
      try {
        const created = await tx.ticket.create({
          data: {
            businessId,
            workflowId: workflow.id,
            ticketNumber,
            trackingCode,
            publicToken: generatePublicToken(),
            customerName: input.customerName?.trim() || null,
            customerPhone: input.customerPhone?.trim() || null,
            itemSummary: input.itemSummary?.trim() || null,
            notes: input.notes?.trim() || null,
            status: "PLACED",
            ...(items.length ? { items: { create: items } } : {}),
          },
          include: {
            workflow: { select: { id: true, name: true, codePrefix: true } },
            currentStep: true,
            items: { orderBy: { sortOrder: "asc" } },
          },
        });
        await tx.ticketStatusHistory.create({
          data: { ticketId: created.id, toStatus: "PLACED", note: "Ticket placed" },
        });
        return created;
      } catch (error) {
        if (attempt >= 2 || !isUniqueViolation(error)) throw error;
        trackingCode = `${buildTrackingCode(workflow.codePrefix, ticketNumber)}-${businessToken(businessId)}`;
      }
    }
  });

  await notifyTicketCustomer(
    businessId,
    ticket,
    `Your ${workflow.name} job ${ticket.trackingCode} has been received.`
  );

  return ticket;
}

export async function advanceTicket(businessId: string, ticketId: string): Promise<TicketWithWorkflow> {
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, businessId },
    include: {
      workflow: { include: { steps: { orderBy: { sortOrder: "asc" } } } },
      currentStep: true,
    },
  });
  if (!ticket) throw new TrackError("not_found", "Ticket not found.");

  const steps = ticket.workflow.steps;

  type Next = { toStatus: TicketStatus; toStepId: string | null };
  let next: Next;
  if (ticket.status === "PLACED") {
    const first = steps[0];
    next = first ? { toStatus: first.isReadyStep ? "READY" : "IN_PROGRESS", toStepId: first.id } : { toStatus: "READY", toStepId: null };
  } else if (ticket.status === "IN_PROGRESS") {
    const idx = steps.findIndex((s) => s.id === ticket.currentStepId);
    const nxt = idx >= 0 ? steps[idx + 1] : null;
    next = nxt
      ? { toStatus: nxt.isReadyStep ? "READY" : "IN_PROGRESS", toStepId: nxt.id }
      : { toStatus: "READY", toStepId: ticket.currentStepId };
  } else if (ticket.status === "READY") {
    next = { toStatus: "COMPLETED", toStepId: ticket.currentStepId };
  } else {
    throw new TrackError("invalid", "A completed or cancelled ticket cannot be advanced.");
  }

  await prisma.$transaction(async (tx) => {
    // Guarded transition: only moves if the status is still what we read, so
    // two concurrent advances can never double-advance a ticket.
    const moved = await tx.ticket.updateMany({
      where: { id: ticket.id, businessId, status: ticket.status },
      data: {
        status: next.toStatus,
        currentStepId: next.toStepId,
        statusChangedAt: new Date(),
        completedAt: next.toStatus === "COMPLETED" ? new Date() : null,
      },
    });
    if (moved.count !== 1) throw new TrackError("invalid", "This ticket was already moved — refresh the list.");

    await tx.ticketStatusHistory.create({
      data: {
        ticketId: ticket.id,
        fromStepId: ticket.currentStepId,
        toStepId: next.toStepId,
        fromStatus: ticket.status,
        toStatus: next.toStatus,
        note: next.toStatus === "COMPLETED" ? "Job completed" : "Advanced to next step",
      },
    });
  });

  const updated = await prisma.ticket.findUnique({
    where: { id: ticket.id },
    include: {
      workflow: { select: { id: true, name: true, codePrefix: true } },
      currentStep: true,
      items: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!updated) throw new TrackError("not_found", "Ticket not found.");

  await notifyTicketCustomer(
    businessId,
    updated,
    `Your job ${updated.trackingCode} ${STATUS_MESSAGE[updated.status] ?? "was updated"}${
      updated.currentStep ? ` — ${updated.currentStep.name}` : ""
    }.`
  );

  return updated;
}

export async function cancelTicket(businessId: string, ticketId: string): Promise<TicketWithWorkflow> {
  const ticket = await prisma.ticket.findFirst({ where: { id: ticketId, businessId } });
  if (!ticket) throw new TrackError("not_found", "Ticket not found.");
  if (ticket.status === "COMPLETED" || ticket.status === "CANCELLED") {
    throw new TrackError("invalid", "This ticket is already final.");
  }

  await prisma.$transaction(async (tx) => {
    // Guarded transition: only finalises a still-open ticket, so a concurrent
    // cancel/advance cannot both win.
    const moved = await tx.ticket.updateMany({
      where: { id: ticket.id, businessId, status: { notIn: ["COMPLETED", "CANCELLED"] } },
      data: { status: "CANCELLED", statusChangedAt: new Date() },
    });
    if (moved.count !== 1) throw new TrackError("invalid", "This ticket is already final (completed or cancelled).");

    await tx.ticketStatusHistory.create({
      data: {
        ticketId: ticket.id,
        fromStepId: ticket.currentStepId,
        fromStatus: ticket.status,
        toStatus: "CANCELLED",
        note: "Ticket cancelled",
      },
    });
  });

  const updated = await prisma.ticket.findUnique({
    where: { id: ticket.id },
    include: {
      workflow: { select: { id: true, name: true, codePrefix: true } },
      currentStep: true,
      items: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!updated) throw new TrackError("not_found", "Ticket not found.");

  await notifyTicketCustomer(businessId, updated, `Your job ${updated.trackingCode} has been cancelled.`);

  return updated;
}

export function listTickets(businessId: string, status?: string | null): Promise<TicketWithWorkflow[]> {
  const valid = status && Object.values(TicketStatus).includes(status as TicketStatus);
  return prisma.ticket.findMany({
    where: {
      businessId,
      ...(valid && status !== "ALL" ? { status: status as TicketStatus } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      workflow: { select: { id: true, name: true, codePrefix: true } },
      currentStep: true,
      items: { orderBy: { sortOrder: "asc" } },
    },
    take: 100,
  });
}

export function getTicketCounts(businessId: string) {
  return prisma.ticket.groupBy({
    by: ["status"],
    where: { businessId },
    _count: { _all: true },
  });
}

export function getTicketDetails(businessId: string, ticketId: string) {
  return prisma.ticket.findFirst({
    where: { id: ticketId, businessId },
    include: {
      workflow: { include: { steps: { orderBy: { sortOrder: "asc" } } } },
      currentStep: true,
      items: { orderBy: { sortOrder: "asc" } },
      statusHistory: { orderBy: { createdAt: "asc" }, include: { fromStep: true, toStep: true } },
    },
  });
}

// ─── Ticket line items ──────────────────────────────────────────────────────
// Optional, free-form line items on a ticket. Everything is tenant-scoped: the
// parent ticket must belong to `businessId` before any write touches its items.

export async function addTicketItem(
  businessId: string,
  ticketId: string,
  input: TicketItemInput
) {
  const ticket = await prisma.ticket.findFirst({ where: { id: ticketId, businessId }, select: { id: true } });
  if (!ticket) throw new TrackError("not_found", "Ticket not found.");

  const [row] = normalizeTicketItems([input]);
  if (!row) throw new TrackError("invalid", "A line item needs a name.");

  const last = await prisma.ticketItem.findFirst({
    where: { ticketId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  return prisma.ticketItem.create({
    data: { ticketId, ...row, sortOrder: (last?.sortOrder ?? -1) + 1 },
  });
}

async function requireTicketItem(businessId: string, ticketId: string, itemId: string) {
  const item = await prisma.ticketItem.findFirst({
    where: { id: itemId, ticketId, ticket: { businessId } },
  });
  if (!item) throw new TrackError("not_found", "Line item not found.");
  return item;
}

export async function updateTicketItem(
  businessId: string,
  ticketId: string,
  itemId: string,
  input: TicketItemInput
) {
  const existing = await requireTicketItem(businessId, ticketId, itemId);
  const [row] = normalizeTicketItems([input]);
  if (!row) throw new TrackError("invalid", "Line item name is required.");
  return prisma.ticketItem.update({
    where: { id: existing.id },
    data: {
      name: row.name,
      description: row.description,
      quantity: row.quantity,
      unitPrice: row.unitPrice,
      currency: row.currency,
    },
  });
}

export async function deleteTicketItem(businessId: string, ticketId: string, itemId: string) {
  const existing = await requireTicketItem(businessId, ticketId, itemId);
  await prisma.ticketItem.delete({ where: { id: existing.id } });
}

// ─── Public lookup ──────────────────────────────────────────────────────────

export type PublicTicket = {
  trackingCode: string;
  ticketNumber: number;
  status: TicketStatus;
  statusChangedAt: Date;
  completedAt: Date | null;
  createdAt: Date;
  customerName: string | null;
  itemSummary: string | null;
  items: {
    id: string;
    name: string;
    description: string | null;
    quantity: number;
    unitPrice: number | null;
    currency: string | null;
  }[];
  currentStepId: string | null;
  business: {
    slug: string;
    name: string;
    phone: string | null;
    whatsapp: string | null;
    brandColor: string;
    logoUrl: string | null;
    address: string | null;
  };
  workflow: { id: string; name: string; description: string | null; codePrefix: string };
  steps: { id: string; name: string; description: string | null; sortOrder: number; isReadyStep: boolean }[];
  history: {
    id: string;
    fromStatus: TicketStatus | null;
    toStatus: TicketStatus;
    note: string | null;
    createdAt: Date;
    fromStepName: string | null;
    toStepName: string | null;
  }[];
};

/** Public, read-only lookup of a ticket by its unguessable `publicToken` (the
 *  secret embedded in the customer's QR/link). Never look tickets up by the
 *  sequential `trackingCode` alone — that would let anyone enumerate jobs. */
export async function getPublicTicket(rawToken: string): Promise<PublicTicket | null> {
  const token = rawToken.trim();
  if (!token) return null;

  const ticket = await prisma.ticket.findUnique({
    where: { publicToken: token },
    include: { business: true, workflow: true, items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!ticket) return null;

  const [steps, history] = await Promise.all([
    prisma.workflowStep.findMany({
      where: { workflowId: ticket.workflowId },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, description: true, sortOrder: true, isReadyStep: true },
    }),
    prisma.ticketStatusHistory.findMany({
      where: { ticketId: ticket.id },
      orderBy: { createdAt: "asc" },
      include: { fromStep: { select: { id: true, name: true } }, toStep: { select: { id: true, name: true } } },
    }),
  ]);

  return {
    trackingCode: ticket.trackingCode,
    ticketNumber: ticket.ticketNumber,
    status: ticket.status,
    statusChangedAt: ticket.statusChangedAt,
    completedAt: ticket.completedAt,
    createdAt: ticket.createdAt,
    customerName: ticket.customerName,
    itemSummary: ticket.itemSummary,
    items: ticket.items.map((it) => ({
      id: it.id,
      name: it.name,
      description: it.description,
      quantity: it.quantity,
      unitPrice: it.unitPrice == null ? null : Number(it.unitPrice),
      currency: it.currency,
    })),
    currentStepId: ticket.currentStepId,
    business: {
      slug: ticket.business.slug,
      name: ticket.business.name,
      phone: ticket.business.phone,
      whatsapp: ticket.business.whatsapp,
      brandColor: ticket.business.brandColor,
      logoUrl: ticket.business.logoUrl,
      address: ticket.business.address,
    },
    workflow: {
      id: ticket.workflow.id,
      name: ticket.workflow.name,
      description: ticket.workflow.description,
      codePrefix: ticket.workflow.codePrefix,
    },
    steps,
    history: history.map((h) => ({
      id: h.id,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      note: h.note,
      createdAt: h.createdAt,
      fromStepName: h.fromStep?.name ?? null,
      toStepName: h.toStep?.name ?? null,
    })),
  };
}

/** Manual lookup fallback for customers who lost their QR/link. The human
 *  tracking code is sequential and guessable, so it is never sufficient on its
 *  own: the caller must also supply the phone number recorded on the ticket.
 *  Returns the public link token on a match, else null. */
export async function lookupTicketByCodeAndPhone(
  rawCode: string,
  rawPhone: string
): Promise<string | null> {
  const code = rawCode.trim().toUpperCase();
  const phone = normalizePhone(rawPhone);
  if (!code || phone.length < 6) return null;

  const ticket = await prisma.ticket.findUnique({
    where: { trackingCode: code },
    select: { publicToken: true, customerPhone: true },
  });
  if (!ticket || !ticket.customerPhone) return null;
  if (normalizePhone(ticket.customerPhone) !== phone) return null;
  return ticket.publicToken;
}