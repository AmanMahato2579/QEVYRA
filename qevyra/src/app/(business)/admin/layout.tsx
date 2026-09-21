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
          select: { language: true, bookingsEnabled: true, brandColor: true },
        })
      : Promise.resolve(null),
  ]);

  unreadCount = notifCount;
  language = restaurant?.language ?? "EN";
  bookingsEnabled = restaurant?.bookingsEnabled ?? false;
  brandColor = restaurant?.brandColor ?? "orange";

  return (
    <>
      <AuthStateWatcher />
      <AdminShell user={user} initialUnreadCount={unreadCount} language={language} bookingsEnabled={bookingsEnabled} brandColor={brandColor}>
        {children}
      </AdminShell>
    </>
  );
}