"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Truck,
  Globe,
  Play,
  Ban,
  ShieldCheck,
  Star,
  ExternalLink,
  Wallet,
  CalendarPlus,
  RefreshCcw,
  Package,
} from "lucide-react";

type ManageBusiness = {
  id: string;
  name: string;
  slug: string;
  type: string;
  plan: string;
  starNumber: number | null;
  isActive: boolean;
  subscriptionStatus: string;
  subscriptionExpiresAt: string | null;
  neverExpires: boolean;
  autoOff: boolean;
  phone: string | null;
  address: string | null;
  brandColor: string | null;
  users: { name: string; email: string; role: string }[];
  website: { isPublished: boolean; metaTitle: string | null } | null;
  workflows: { id: string; name: string; codePrefix: string; isActive: boolean }[];
  ticketStats: Record<string, number>;
};

const PLAN_STYLE: Record<string, string> = {
  BRONZE: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  SILVER: "bg-slate-400/15 text-slate-200 border-slate-400/30",
  STAR: "bg-purple-500/15 text-purple-300 border-purple-500/30",
};

const STATUS_LABEL: Record<string, string> = {
  PLACED: "Placed",
  IN_PROGRESS: "In progress",
  READY: "Ready",
  COMPLETED: "Done",
  CANCELLED: "Cancelled",
};

async function patchBusiness(id: string, body: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/super-admin/tracking/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return res.ok ? { ok: true } : { ok: false, error: data.error ?? "Failed" };
  } catch {
    return { ok: false, error: "Network error" };
  }
}

function BusinessCard({ b }: { b: ManageBusiness }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [extendDays, setExtendDays] = useState(30);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (body: Record<string, unknown>, okMessage: string) => {
    setBusy(true);
    setMsg(null);
    setError(null);
    const r = await patchBusiness(b.id, body);
    setBusy(false);
    if (r.ok) {
      setMsg(okMessage);
      router.refresh();
    } else {
      setError(r.error ?? "Update failed");
    }
  };

  const statusCount = useMemo(() => {
    const keys = ["PLACED", "IN_PROGRESS", "READY", "COMPLETED", "CANCELLED"];
    return keys.filter((k) => b.ticketStats[k]).map((k) => `${b.ticketStats[k]} ${STATUS_LABEL[k]}`);
  }, [b]);

  const accent = b.brandColor ?? "purple";
  const accentClass = `bg-${accent}-500`;

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg bg-${accent}-500 flex items-center justify-center`}>
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{b.name}</span>
              {b.starNumber != null && (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-300 border border-yellow-500/30">
                  <Star className="w-3 h-3" /> #{b.starNumber}
                </span>
              )}
              <span className={`text-[11px] px-2 py-0.5 rounded-full border ${PLAN_STYLE[b.plan] ?? PLAN_STYLE.BRONZE}`}>
                {b.plan}
              </span>
            </div>
            <div className="text-xs text-gray-400">
              {b.type.replaceAll("_", " ").toLowerCase()} ·{" "}
              <Link className="text-purple-300 hover:underline inline-flex items-center gap-1" href={`/b/${b.slug}`} target="_blank">
                qevyra.com/b/{b.slug} <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() =>
              run({ isPublished: !b.website?.isPublished }, b.website?.isPublished ? "Website unpublished" : "Website published")
            }
            disabled={busy}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border disabled:opacity-50 transition-colors ${
              b.website?.isPublished
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25"
                : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            {b.website?.isPublished ? "Live" : "Off"}
          </button>
          <button
            onClick={() => run({ isActive: !b.isActive }, b.isActive ? "Business deactivated" : "Business activated")}
            disabled={busy}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border disabled:opacity-50 transition-colors ${
              b.isActive
                ? "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10"
                : "bg-rose-500/15 text-rose-300 border-rose-500/40 hover:bg-rose-500/25"
            }`}
          >
            {b.isActive ? <Play className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
            {b.isActive ? "Active" : "Disabled"}
          </button>
        </div>
      </div>

      <div className="px-5 py-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Plan
          </div>
          <select
            value={b.plan}
            disabled={busy}
            onChange={(e) => run({ plan: e.target.value }, "Plan updated to " + e.target.value)}
            className="bg-gray-900 border border-white/10 rounded-lg px-2 py-1.5 text-sm disabled:opacity-50"
          >
            <option value="BRONZE">BRONZE — website</option>
            <option value="SILVER">SILVER — website + tracking</option>
            <option value="STAR">STAR — special client</option>
          </select>
          <div className="mt-1 text-[11px] text-gray-500">
            {b.plan === "BRONZE" && "Website only"}
            {b.plan === "SILVER" && "Website + live tracking"}
            {b.plan === "STAR" && "All features; offers given separately"}
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
            <Package className="w-3.5 h-3.5" /> Subscription
          </div>
          <div className="font-medium capitalize">{b.subscriptionStatus.toLowerCase()}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">
            {b.neverExpires ? "Never expires" : b.subscriptionExpiresAt ? `till ${new Date(b.subscriptionExpiresAt).toLocaleDateString()}` : "no end date"}
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <select
              value={extendDays}
              disabled={busy}
              onChange={(e) => setExtendDays(Number(e.target.value))}
              className="bg-gray-900 border border-white/10 rounded-lg px-1.5 py-1 text-xs disabled:opacity-50"
            >
              <option value={30}>+30d</option>
              <option value={90}>+90d</option>
              <option value={365}>+1y</option>
            </select>
            <button
              onClick={() => run({ extendDays }, `Subscription extended ${extendDays} days`)}
              disabled={busy}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-200 border border-purple-500/40 text-xs disabled:opacity-50"
            >
              <CalendarPlus className="w-3.5 h-3.5" /> Extend
            </button>
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
            <Wallet className="w-3.5 h-3.5" /> Tickets
          </div>
          <div className="font-medium">{b.ticketStats.total}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">{statusCount.join(" · ") || "—"}</div>
          {b.workflows.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {b.workflows.map((w) => (
                <span key={w.id} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-gray-400">
                  {w.codePrefix}
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
            <RefreshCcw className="w-3.5 h-3.5" /> Owners
          </div>
          <div className="text-xs text-gray-300">
            {b.users.length > 0 ? (
              b.users.map((u) => (
                <div key={u.email} className="flex items-center gap-1.5">
                  <span className="truncate">{u.name}</span>
                  <span className="text-gray-500 truncate">{u.email}</span>
                </div>
              ))
            ) : (
              <span className="text-gray-500">none</span>
            )}
          </div>
          <button
            onClick={async () => {
              const pw = window.prompt("New password (min 8 characters) for the tracking admin(s):");
              if (!pw || pw.length < 8) return;
              await run({ password: pw }, "Password reset — old logins revoked");
            }}
            disabled={busy}
            className="mt-2 text-[11px] px-2 py-1 rounded border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-50"
          >
            Reset password
          </button>
        </div>
      </div>

      {b.address && (
        <div className="px-5 pb-3 text-xs text-gray-500">
          {b.address}
          {b.phone ? `  ·  ${b.phone}` : ""}
        </div>
      )}
      <div className="px-5 pb-4">
        {msg && <p className="text-emerald-400 text-xs">{msg}</p>}
        {error && <p className="text-rose-400 text-xs">{error}</p>}
      </div>
    </div>
  );
}

export function TrackingManageClient({ businesses }: { businesses: ManageBusiness[] }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Track Businesses</h1>
          <p className="text-sm text-gray-400 mt-1">
            Track tenants (garage, dry-clean, tailor, cleaning, repair…) — public websites + live ticket tracking.
          </p>
        </div>
        <span className="text-xs px-3 py-1.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
          {businesses.length} business{businesses.length === 1 ? "" : "es"}
        </span>
      </div>
      <div className="space-y-4">
        {businesses.map((b) => (
          <BusinessCard key={b.id} b={b} />
        ))}
        {businesses.length === 0 && (
          <div className="text-center py-16 text-gray-500 text-sm">
            No track clients yet. Create one from the Businesses page with a service business type.
          </div>
        )}
      </div>
    </div>
  );
}