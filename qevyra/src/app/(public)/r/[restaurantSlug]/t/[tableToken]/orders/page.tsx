import { notFound, redirect } from "next/navigation";
import { getRestaurantBySlug, getTableByToken, getActiveSession } from "@/lib/db";
import OrdersPageClient from "./OrdersPageClient";
import { validBrandColor } from "@/lib/brand";

interface Props {
  params: Promise<{ restaurantSlug: string; tableToken: string }>;
}

export const dynamic = "force-dynamic";

export default async function CustomerOrdersPage({ params }: Props) {
  const { restaurantSlug, tableToken } = await params;
  const restaurant = await getRestaurantBySlug(restaurantSlug);
  if (!restaurant) notFound();
  const table = await getTableByToken(tableToken);
  if (!table || table.restaurantId !== restaurant.id) notFound();
  const session = await getActiveSession(table.id, restaurant.id);
  if (!session) redirect(`/r/${restaurantSlug}/t/${tableToken}`);

  // Order history is fetched client-side with the customer's own token, so a
  // customer only ever sees the orders they placed (not the whole table's).
  const orders: unknown[] = [];

  return (
    <div data-brand={validBrandColor(restaurant.brandColor)}>
      <OrdersPageClient
        restaurant={JSON.parse(JSON.stringify(restaurant))}
        table={JSON.parse(JSON.stringify(table))}
        orders={JSON.parse(JSON.stringify(orders))}
        tableSession={JSON.parse(JSON.stringify(session))}
      />
    </div>
  );
}
