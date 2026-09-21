import Link from "next/link";
import { requireBusinessAdmin } from "@/lib/auth-guard";
import { canUse } from "@/lib/plans";
import { listTickets, getTicketCounts, getWorkflows } from "@/modules/track/services";
import { TRACK_STATUS_META } from "@/modules/track/catalog";
import { Lock } from "lucide-react";
import TicketsClient from "./TicketsClient";

export const metadata = { title: "Tickets – Business Admin" };
export const dynamic = "force-dynamic";

export default async function TrackTicketsPage() {
  const ctx = await requireBusinessAdmin();

  if (!canUse(ctx.access, "business_track")) {
    return (
      <div className="max-w-lg mx-auto mt-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto mb-5">
          <Lock className="w-8 h-8 text-purple-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Track not available</h1>
        <p className="text-gray-500 mt-3 text-sm">
          Your current plan does not include service tracking for your customers.
        </p>
        <Link href="/track-admin/workflows" className="inline-block mt-6 text-blue-600 hover:underline text-sm">
          Back to Workflows
        </Link>
      </div>
    );
  }

  const [tickets, wantedCounts, workflows] = await Promise.all([
    listTickets(ctx.business.id),
    getTicketCounts(ctx.business.id),
    getWorkflows(ctx.business.id),
  ]);

  const counts: Record<string, number> = { ALL: tickets.length };
  for (const row of wantedCounts) counts[row.status] = row._count._all;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tickets</h1>
          <p className="text-gray-500 text-sm mt-1">
            Issue a ticket to a customer and hand them the tracking code or QR.
          </p>
        </div>
        <Link
          href="/track-admin/workflows"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50"
        >
          Workflows
        </Link>
      </div>

      <TicketsClient
        tickets={JSON.parse(JSON.stringify(tickets))}
        workflows={JSON.parse(
          JSON.stringify(workflows.map((w) => ({ id: w.id, name: w.name, codePrefix: w.codePrefix, isActive: w.isActive })))
        )}
        counts={counts}
        statusMeta={TRACK_STATUS_META}
      />
    </div>
  );
}