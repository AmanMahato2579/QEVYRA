import { prisma } from "@/lib/prisma";
import { startOfBusinessDay, ORDER_HISTORY_RETENTION_HOURS } from "@/lib/db";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface DailyResetResult {
  staleSessionsClosed: number;
  oldSessionsDeleted: number;
  ordersDeleted: number;
  notificationsDeleted: number;
  bookingsDeleted: number;
  ticketsFinalizedDeleted: number;
  ticketsDormantDeleted: number;
}

/**
 * Nightly data reset, meant to run just after midnight in the restaurant
 * timezone (Asia/Kathmandu). Keeps only shop details per the QEVYRA business
 * model: menu, orders, sessions, track tickets and notifications are all
 * ephemeral, day-scoped data.
 *
 * Steps (each best-effort; counts reported in the result):
 *  1. Close ACTIVE table sessions left open from a previous business day.
 *  2. Delete COMPLETED / REJECTED orders past the 24h retention window.
 *  3. Delete notifications from before the current business day.
 *  4. Delete bookings finished (or dropped) before the retention window.
 *  5. Delete track tickets in a final state past retention, plus any ticket
 *     (any status) untouched for 7 days so dormant jobs never linger.
 *  6. Best-effort purge of CLOSED sessions older than 30 days.
 */
export async function runDailyReset(): Promise<DailyResetResult> {
  const businessDayStart = startOfBusinessDay();
  const retentionCutoff = new Date(Date.now() - ORDER_HISTORY_RETENTION_HOURS * 60 * 60 * 1000);
  const dormantCutoff = new Date(Date.now() - 7 * DAY_MS);
  const sessionCutoff = new Date(Date.now() - 30 * DAY_MS);

  const baseline = await prisma.$transaction([
    prisma.tableSession.count({ where: { status: "ACTIVE", startedAt: { lt: businessDayStart } } }),
    prisma.order.count(),
    prisma.notification.count(),
    prisma.booking.count(),
    prisma.ticket.count(),
  ]);

  const staleSessions = await prisma.tableSession.updateMany({
    where: { status: "ACTIVE", startedAt: { lt: businessDayStart } },
    data: { status: "CLOSED", closedAt: new Date() },
  });

  const orders = await prisma.order.deleteMany({
    where: { status: { in: ["COMPLETED", "REJECTED"] }, statusChangedAt: { lt: retentionCutoff } },
  });

  const notifications = await prisma.notification.deleteMany({
    where: { createdAt: { lt: businessDayStart } },
  });

  const bookings = await prisma.booking.deleteMany({
    where: { status: { in: ["COMPLETED", "REJECTED", "CANCELLED"] }, createdAt: { lt: retentionCutoff } },
  });

  const ticketsFinalized = await prisma.ticket.deleteMany({
    where: { status: { in: ["COMPLETED", "CANCELLED"] }, statusChangedAt: { lt: retentionCutoff } },
  });

  const ticketsDormant = await prisma.ticket.deleteMany({
    where: { createdAt: { lt: dormantCutoff } },
  });

  let oldSessionsDeleted = 0;
  try {
    const oldSessions = await prisma.tableSession.deleteMany({
      where: { status: "CLOSED", closedAt: { lt: sessionCutoff } },
    });
    oldSessionsDeleted = oldSessions.count;
  } catch {
    // Orders / bookings may still reference a session through non-cascade
    // relations; a purge failure is never fatal for the reset.
    oldSessionsDeleted = -1;
  }

  console.log(`[daily-reset] start counts: sessions=${baseline[0]} orders=${baseline[1]} ` +
    `notifications=${baseline[2]} bookings=${baseline[3]} tickets=${baseline[4]}`);

  return {
    staleSessionsClosed: staleSessions.count,
    oldSessionsDeleted,
    ordersDeleted: orders.count,
    notificationsDeleted: notifications.count,
    bookingsDeleted: bookings.count,
    ticketsFinalizedDeleted: ticketsFinalized.count,
    ticketsDormantDeleted: ticketsDormant.count,
  };
}