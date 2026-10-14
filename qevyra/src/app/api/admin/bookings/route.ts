import { apiGuard } from "@/lib/api-guard";
import { NextResponse } from "next/server";
import { getAdminBookings } from "@/lib/db";

export async function GET(req: Request) {
  const guard = await apiGuard({ permission: "bookings.view" });
  if (guard.error) return guard.error;
  const restaurantId = guard.user.restaurantId;
  if (!restaurantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const bookings = await getAdminBookings(restaurantId, date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined);
  return NextResponse.json(bookings);
}