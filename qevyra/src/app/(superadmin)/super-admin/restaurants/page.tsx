import { requireSuperAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import SuperAdminClient from "../SuperAdminClient";

export const metadata = { title: "Restaurants – Super Admin" };
export const dynamic = "force-dynamic";

export default async function RestaurantsPage() {
  await requireSuperAdmin();
  const restaurants = await prisma.restaurant.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      business: true,
      _count: { select: { tables: true, users: true } },
    },
  });

  // Subscription lives on the linked Business (universal tenant); the ORDER
  // client contract below reads it through the Restaurant row, so map it on.
  const rows = restaurants.map((r) => ({
    ...r,
    plan: r.business?.plan ?? "STAR",
    subscriptionStatus: r.business?.subscriptionStatus ?? null,
    subscriptionExpiresAt: r.business?.subscriptionExpiresAt ?? null,
    neverExpires: r.business?.neverExpires ?? false,
    autoOff: r.business?.autoOff ?? false,
    starNumber: r.business?.starNumber ?? null,
    starNote: r.business?.starNote ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Restaurants</h1>
        <p className="text-gray-400 text-sm mt-1">Onboard restaurants, manage subscriptions, plans and star assignments.</p>
      </div>
      <SuperAdminClient restaurants={JSON.parse(JSON.stringify(rows))} />
    </div>
  );
}