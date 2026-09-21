import { requireSuperAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { listActivity, actionLabel } from "@/lib/activity";
import Link from "next/link";
import { Building2, Activity as ActivityIcon, Star as StarIcon, AlertTriangle } from "lucide-react";

export const metadata = { title: "Overview – Super Admin" };
export const dynamic = "force-dynamic";

async function getOverview() {
  const now = new Date();

  const [businessCount, activeCount, starCount, expiredCount, expiringSoon, expired, starList, planBreakdown, typeBreakdown, recentActivity] =
    await Promise.all([
      prisma.business.count(),
      prisma.business.count({ where: { isActive: true } }),
      prisma.business.count({ where: { starNumber: { not: null } } }),
      prisma.business.count({
        where: {
          neverExpires: false,
          isActive: true,
          subscriptionStatus: { not: "ACTIVE" },
        },
      }),
      prisma.business.findMany({
        where: { neverExpires: false, isActive: true, subscriptionExpiresAt: { not: null } },
        select: { id: true, name: true, subscriptionExpiresAt: true },
        orderBy: { subscriptionExpiresAt: "asc" },
        take: 10,
      }),
      prisma.business.findMany({
        where: { neverExpires: false, isActive: true, subscriptionStatus: { not: "ACTIVE" } },
        select: { id: true, name: true, subscriptionStatus: true },
        take: 10,
      }),
      prisma.business.findMany({
        where: { starNumber: { not: null } },
        select: { id: true, name: true, starNumber: true },
        orderBy: { starNumber: "asc" },
      }),
      prisma.business.groupBy({ by: ["plan"], _count: true }),
      prisma.business.groupBy({ by: ["type"], _count: true }),
      listActivity({ limit: 8 }),
    ]);

  return { now, businessCount, activeCount, starCount, expiredCount, expiringSoon, expired, starList, planBreakdown, typeBreakdown, recentActivity };
}

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  RESTAURANT: "Restaurant / cafe",
  HOTEL: "Hotel",
  HOMESTAY: "Homestay",
  RETAIL: "Retail / shop",
  SERVICE: "Service shop",
  TAILOR: "Tailor",
  DRY_CLEANING: "Dry cleaning",
  GARAGE: "Garage / showroom",
  CLEANING: "Cleaning service",
  REPAIR: "Repair service",
  OTHER: "Other",
};

function daysUntil(date: Date, now: Date): number {
  return Math.ceil((date.getTime() - now.getTime()) / 86400000);
}

export default async function OverviewPage() {
  await requireSuperAdmin();
  const o = await getOverview();

  const statCards = [
    { label: "Total businesses", value: o.businessCount, icon: Building2, color: "text-white" },
    { label: "Active now", value: o.activeCount, icon: Building2, color: "text-green-400" },
    { label: "Star founding", value: o.starCount, icon: StarIcon, color: "text-purple-300" },
    { label: "Non-active/expired", value: o.expiredCount, icon: AlertTriangle, color: "text-red-400" },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <p className="text-gray-400 text-sm">{label}</p>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-gray-300" />
            <h2 className="font-bold">Business mix by type</h2>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {o.typeBreakdown.length === 0 ? (
              <p className="text-sm text-gray-500 col-span-2">No businesses yet.</p>
            ) : (
              o.typeBreakdown.map((t) => (
                <div key={t.type} className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">{BUSINESS_TYPE_LABELS[t.type] ?? t.type}</span>
                  <span className="font-bold text-gray-100">{t._count}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-gray-300" />
            <h2 className="font-bold">Business mix by plan</h2>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {o.planBreakdown.length === 0 ? (
              <p className="text-sm text-gray-500 col-span-2">No plan data yet.</p>
            ) : (
              o.planBreakdown.map((p) => (
                <div key={p.plan} className="flex items-center justify-between text-sm">
                  <span className={`font-medium ${p.plan === "STAR" ? "text-purple-300" : p.plan === "SILVER" ? "text-gray-200" : "text-orange-300"}`}>
                    {p.plan}
                  </span>
                  <span className="font-bold text-gray-100">{p._count}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <StarIcon className="w-4 h-4 text-purple-300" />
            <h2 className="font-bold">Founding Star customers</h2>
          </div>
          {o.starList.length === 0 ? (
            <p className="text-sm text-gray-500">No star businesses yet.</p>
          ) : (
            <div className="space-y-2">
              {o.starList.map((star) => (
                <div key={star.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-200">#{star.starNumber} · {star.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">Star</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h2 className="font-bold">Attention needed</h2>
          </div>
          {o.expired.length === 0 && o.expiringSoon.length === 0 ? (
            <p className="text-sm text-gray-500">All active subscriptions are healthy.</p>
          ) : (
            <div className="space-y-2">
              {o.expired.map((r) => (
                <div key={r.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-200">{r.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">{r.subscriptionStatus}</span>
                </div>
              ))}
              {o.expiringSoon.map((r) => {
                const days = r.subscriptionExpiresAt ? daysUntil(r.subscriptionExpiresAt, o.now) : null;
                return (
                  <div key={r.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-200">{r.name}</span>
                    {days != null && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${days <= 14 ? "bg-amber-500/20 text-amber-300" : "bg-white/10 text-gray-300"}`}>
                        {days < 0 ? "expired" : `${days}d remaining`}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ActivityIcon className="w-4 h-4 text-gray-300" />
            <h2 className="font-bold">Recent activity</h2>
          </div>
          <Link href="/super-admin/activity" className="text-xs text-purple-300 hover:text-purple-200">View all</Link>
        </div>
        {o.recentActivity.length === 0 ? (
          <p className="text-sm text-gray-500">No activity recorded yet.</p>
        ) : (
          <div className="divide-y divide-white/10">
            {o.recentActivity.map((a) => (
              <div key={a.id} className="py-2.5 flex items-center gap-3 text-sm">
                <span className="text-gray-200 font-medium">{actionLabel(a.action)}</span>
                {a.restaurantName && <span className="text-xs text-gray-400">{a.restaurantName}</span>}
                <span className="ml-auto text-xs text-gray-500">
                  {a.createdAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}