import Link from "next/link";
import { requireBusinessAdmin } from "@/lib/auth-guard";
import { canUse } from "@/lib/plans";
import { getWorkflows } from "@/modules/track/services";
import { WORKFLOW_LIMIT_KEY } from "@/modules/track/catalog";
import { Truck, Lock } from "lucide-react";
import TrackClient from "./TrackClient";

export const metadata = { title: "Track – Business Admin" };
export const dynamic = "force-dynamic";

export default async function TrackAdminPage() {
  const ctx = await requireBusinessAdmin();
  const access = ctx.access;
  const limit = access.limits[WORKFLOW_LIMIT_KEY] ?? 1;

  if (!canUse(access, "business_track")) {
    return (
      <div className="max-w-lg mx-auto mt-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto mb-5">
          <Lock className="w-8 h-8 text-purple-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Track not available</h1>
        <p className="text-gray-500 mt-3 text-sm">
          Your current plan does not include service tracking for your customers.
          Upgrade to give them a live tracking code — great for tailors, garages,
          laundries and catering orders.
        </p>
        <Link
          href="/track-admin"
          className="inline-block mt-6 px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-medium text-sm"
        >
          Go to Track dashboard
        </Link>
      </div>
    );
  }

  const workflows = await getWorkflows(ctx.business.id);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="w-6 h-6 text-orange-500" /> Track
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Workflows turn into live tracking codes like{" "}
            <span className="font-mono text-orange-600">MOMO-0001</span> that your
            customers follow on{" "}
            <a href="/track" target="_blank" className="text-blue-600 hover:underline">
              qevyra.com/track
            </a>
            .
          </p>
        </div>
        <Link
          href="/track-admin/tickets"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50"
        >
          Manage tickets
        </Link>
      </div>

      <TrackClient
        workflows={JSON.parse(JSON.stringify(workflows))}
        limit={limit}
      />
    </div>
  );
}