import Link from "next/link";
import { requireBusinessAdmin } from "@/lib/auth-guard";
import { listTickets, getTicketCounts } from "@/modules/track/services";
import { TRACK_STATUS_META, trackStatusMeta } from "@/modules/track/catalog";
import { Plus, ArrowRight } from "lucide-react";

export const metadata = { title: "Track Dashboard" };
export const dynamic = "force-dynamic";

export default async function TrackDashboardPage() {
  const ctx = await requireBusinessAdmin();

  const [tickets, wantedCounts] = await Promise.all([
    listTickets(ctx.business.id),
    getTicketCounts(ctx.business.id),
  ]);

  const counts: Record<string, number> = { ALL: tickets.length };
  for (const row of wantedCounts) counts[row.status] = row._count._all;

  const statusKeys = ["PLACED", "IN_PROGRESS", "READY", "COMPLETED", "CANCELLED"];
  const running = tickets.filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELLED").slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            Issue tickets with a customer number, then move them along in running order.
          </p>
        </div>
        <Link
          href="/track-admin/tickets"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700"
        >
          <Plus className="w-4 h-4" /> New ticket
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {statusKeys.map((key) => (
          <div key={key} className="bg-white border border-gray-200 rounded-2xl p-4">
            <p className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full border ${trackStatusMeta(key).badge}`}>
              {TRACK_STATUS_META[key]?.label ?? key}
            </p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{counts[key] ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Running tickets</h2>
          <Link href="/track-admin/tickets" className="inline-flex items-center gap-1 text-sm text-purple-600 hover:underline">
            All tickets <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {running.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">No open tickets right now.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {running.map((ticket) => (
              <li key={ticket.id} className="px-5 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-mono font-semibold text-gray-900">{ticket.trackingCode}</p>
                  <p className="text-sm text-gray-500 truncate">
                    {ticket.customerName || "Customer"} · {ticket.customerPhone || "no number"} · {ticket.itemSummary ?? ""}
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full border shrink-0 ${trackStatusMeta(ticket.status).badge}`}>
                  {trackStatusMeta(ticket.status).label}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}