import { requireSuperAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import SuperAdminClient from "../SuperAdminClient";

export const metadata = { title: "Businesses – Super Admin" };
export const dynamic = "force-dynamic";

export default async function RestaurantsPage() {
  await requireSuperAdmin();
  const businesses = await prisma.business.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      restaurant: true,
      users: { select: { name: true, email: true, role: true }, orderBy: { createdAt: "asc" } },
    },
  });

  // The client deals with the classic "restaurant card" (ORDER profile backed),
  // so a business without a Restaurant row still shows up as a row here.
  const rows = businesses.map((b) => {
    const owner = b.users.find((u) => u.role === "RESTAURANT_ADMIN") ?? b.users[0] ?? null;
    return {
      id: b.restaurant?.id ?? `business-${b.id}`,
      name: b.name,
      slug: b.slug,
      type: b.type,
      phone: b.restaurant?.phone ?? null,
      address: b.restaurant?.address ?? null,
      tableLimit: b.restaurant?.tableLimit ?? 0,
      isActive: b.isActive,
      plan: b.plan,
      bookingsEnabled: b.restaurant?.bookingsEnabled ?? false,
      brandColor: b.brandColor,
      subscriptionStatus: b.subscriptionStatus,
      subscriptionExpiresAt: b.subscriptionExpiresAt,
      neverExpires: b.neverExpires,
      autoOff: b.autoOff,
      starNumber: b.starNumber,
      starNote: b.starNote,
      createdAt: b.createdAt,
      ownerName: owner?.name ?? null,
      ownerEmail: owner?.email ?? null,
      _count: {
        tables: b.restaurant ? 0 : 0,
        users: b.users.length,
      },
    };
  });

  // Fill real table counts for restaurant-backed businesses.
  const withTables = await prisma.restaurant.findMany({
    select: { id: true, _count: { select: { tables: true } } },
  });
  const tableCountMap = new Map(withTables.map((r) => [r.id, r._count.tables]));
  for (const row of rows) if (tableCountMap.has(row.id)) row._count.tables = tableCountMap.get(row.id)!;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Businesses</h1>
        <p className="text-gray-400 text-sm mt-1">Onboard any business type, manage subscriptions, plans and star assignments.</p>
      </div>
      <SuperAdminClient restaurants={JSON.parse(JSON.stringify(rows))} />
    </div>
  );
}