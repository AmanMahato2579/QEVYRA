import { requireRestaurantAdmin } from '@/lib/auth-guard';
import { prisma } from '@/lib/prisma';
import TrackDashboardClient from './TrackDashboardClient';

export const dynamic = 'force-dynamic';

export default async function TrackPage() {
  const user = await requireRestaurantAdmin();

  const tickets = await prisma.trackTicket.findMany({
    where: {
      restaurantId: user.restaurantId!,
      status: { notIn: ['DELIVERED', 'CANCELLED'] },
    },
    include: { events: { orderBy: { createdAt: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  });

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: user.restaurantId! },
    select: { name: true, currency: true, slug: true, phone: true },
  });

  return (
    <TrackDashboardClient
      tickets={tickets as unknown as Parameters<typeof TrackDashboardClient>[0]['tickets']}
      restaurant={restaurant}
    />
  );
}
