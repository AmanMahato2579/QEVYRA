import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import AdminShell from "@/components/admin/AdminShell";
import AuthStateWatcher from "@/components/admin/AuthStateWatcher";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  let unreadCount = 0;
  let language = "EN";
  let bookingsEnabled = false;
  let brandColor = "orange";

  const [notifCount, restaurant] = await Promise.all([
    user.restaurantId
      ? prisma.notification.count({ where: { restaurantId: user.restaurantId, read: false } })
      : Promise.resolve(0),
    user.restaurantId
      ? prisma.restaurant.findUnique({
          where: { id: user.restaurantId },
          select: { language: true, bookingsEnabled: true, brandColor: true, businessId: true },
        })
      : Promise.resolve(null),
  ]);

  unreadCount = notifCount;
  language = restaurant?.language ?? "EN";
  bookingsEnabled = restaurant?.bookingsEnabled ?? false;
  brandColor = restaurant?.brandColor ?? "orange";

  // Product-aware admin nav: fetch active products so the sidebar only shows
  // features the business actually has. Empty set = legacy tenant → show all.
  let activeProducts: string[] = [];
  if (restaurant?.businessId) {
    const rows = await prisma.businessProduct.findMany({
      where: { businessId: restaurant.businessId, isActive: true },
      select: { productId: true },
    });
    activeProducts = rows.map((r) => r.productId);
  }
  const hasMenu = activeProducts.length === 0 || activeProducts.includes("MENU");
  const hasOrder = activeProducts.length === 0 || activeProducts.includes("ORDER");
  const hasWebsite = activeProducts.length === 0 || activeProducts.includes("WEBSITE");

  return (
    <>
      <AuthStateWatcher />
      <AdminShell user={user} initialUnreadCount={unreadCount} language={language} bookingsEnabled={bookingsEnabled} brandColor={brandColor} hasMenu={hasMenu} hasOrder={hasOrder} hasWebsite={hasWebsite}>
        {children}
      </AdminShell>
    </>
  );
}