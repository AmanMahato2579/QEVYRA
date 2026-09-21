import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBookableSlots } from "@/lib/db";
import { getEffectiveAccess, canBook } from "@/lib/plans";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const slug = searchParams.get("slug");
  const serviceId = searchParams.get("serviceId");
  const date = searchParams.get("date");

  if ((!token && !slug) || !serviceId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Missing or invalid parameters" }, { status: 400 });
  }

  let restaurantId: string;
  let bookingsEnabled = false;
  let business: { plan: string; featureOverrides: string | null; limitOverrides: string | null; starNumber: number | null } | null = null;

  if (slug) {
    const restaurant = await prisma.restaurant.findFirst({
      where: { slug, isActive: true, business: { isActive: true } },
      select: {
        id: true,
        bookingsEnabled: true,
        business: { select: { plan: true, featureOverrides: true, limitOverrides: true, starNumber: true } },
      },
    });
    if (!restaurant) return NextResponse.json({ error: "Business is unavailable" }, { status: 404 });
    restaurantId = restaurant.id;
    bookingsEnabled = restaurant.bookingsEnabled;
    business = restaurant.business;
  } else {
    const table = await prisma.table.findFirst({
      where: { qrToken: token!, isActive: true, restaurant: { isActive: true } },
      select: { restaurantId: true },
    });
    if (!table) return NextResponse.json({ error: "Table is unavailable" }, { status: 404 });

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: table.restaurantId },
      select: {
        id: true,
        bookingsEnabled: true,
        business: { select: { plan: true, featureOverrides: true, limitOverrides: true, starNumber: true } },
      },
    });
    if (!restaurant?.business) return NextResponse.json({ error: "Restaurant is unavailable" }, { status: 404 });
    restaurantId = restaurant.id;
    bookingsEnabled = restaurant.bookingsEnabled;
    business = restaurant.business;
  }

  if (!business) return NextResponse.json({ error: "Business is unavailable" }, { status: 404 });

  const access = await getEffectiveAccess(business);
  if (!canBook(access, bookingsEnabled)) {
    return NextResponse.json({ error: "Bookings are not available at this business." }, { status: 403 });
  }

  const service = await prisma.bookableService.findFirst({
    where: { id: serviceId, restaurantId, isActive: true },
    select: { id: true },
  });
  if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 });

  const slots = await getBookableSlots(serviceId, restaurantId, date);
  return NextResponse.json({ slots });
}