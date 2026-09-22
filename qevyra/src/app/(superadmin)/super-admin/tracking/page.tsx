import { requireSuperAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { TRACK_BUSINESS_TYPES } from "@/lib/business-kind";
import { BusinessType } from "@prisma/client";
import { TrackingManageClient } from "./TrackingManageClient";

export const dynamic = "force-dynamic";

async function fetchTrackBusinesses() {
  return prisma.business.findMany({
    where: { type: { in: [...TRACK_BUSINESS_TYPES] as BusinessType[] } },
    orderBy: [{ starNumber: "asc" }, { createdAt: "asc" }],
    include: {
      users: { select: { name: true, email: true, role: true }, orderBy: { createdAt: "asc" } },
      website: { select: { isPublished: true, metaTitle: true, heroTitle: true } },
      workflows: { select: { id: true, name: true, codePrefix: true, isActive: true }, orderBy: { createdAt: "asc" } },
    },
  });
}

export default async function SuperAdminTrackingPage() {
  await requireSuperAdmin();

  const [businesses, ticketGroups] = await Promise.all([
    fetchTrackBusinesses(),
    prisma.ticket.groupBy({ by: ["businessId", "status"], _count: { id: true } }),
  ]);

  const counts = new Map<string, Record<string, number>>();
  for (const g of ticketGroups) {
    const byStatus = counts.get(g.businessId) ?? {};
    byStatus[g.status] = g._count.id;
    counts.set(g.businessId, byStatus);
  }

  const rows = businesses.map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    type: b.type,
    plan: b.plan,
    starNumber: b.starNumber,
    isActive: b.isActive,
    subscriptionStatus: b.subscriptionStatus,
    subscriptionExpiresAt: b.subscriptionExpiresAt?.toISOString() ?? null,
    neverExpires: b.neverExpires,
    autoOff: b.autoOff,
    phone: b.phone,
    address: b.address,
    brandColor: b.brandColor,
    users: b.users.map((u) => ({ name: u.name, email: u.email, role: u.role })),
    website: b.website ? { isPublished: b.website.isPublished, metaTitle: b.website.metaTitle } : null,
    workflows: b.workflows.map((w) => ({ id: w.id, name: w.name, codePrefix: w.codePrefix, isActive: w.isActive })),
    ticketStats: {
      PLACED: counts.get(b.id)?.PLACED ?? 0,
      IN_PROGRESS: counts.get(b.id)?.IN_PROGRESS ?? 0,
      READY: counts.get(b.id)?.READY ?? 0,
      COMPLETED: counts.get(b.id)?.COMPLETED ?? 0,
      CANCELLED: counts.get(b.id)?.CANCELLED ?? 0,
      total: 0,
    },
  }));

  for (const row of rows) {
    row.ticketStats.total =
      row.ticketStats.PLACED + row.ticketStats.IN_PROGRESS + row.ticketStats.READY + row.ticketStats.COMPLETED + row.ticketStats.CANCELLED;
  }

  return <TrackingManageClient businesses={rows} />;
}