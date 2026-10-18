import { prisma } from "@/lib/prisma";
import { apiGuard } from "@/lib/api-guard";
import { NextResponse } from "next/server";
import { z } from "zod";
import { loadOperationalRestaurant, getEffectiveAccess, effectiveTableLimit } from "@/lib/plans";

const tableSchema = z.object({
  tableNumber: z.number().int().positive(),
});

export async function GET() {
  const guard = await apiGuard({ permission: "resources.view" });
  if (guard.error) return guard.error;
  const restaurantId = guard.user.restaurantId;
  if (!restaurantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tables = await prisma.table.findMany({
    where: { restaurantId },
    orderBy: { tableNumber: "asc" },
  });
  return NextResponse.json(tables);
}

export async function POST(req: Request) {
  const guard = await apiGuard({ permission: "resources.manage" });
  if (guard.error) return guard.error;
  const restaurantId = guard.user.restaurantId;
  if (!restaurantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = tableSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const restaurant = await loadOperationalRestaurant(restaurantId);
  if (!restaurant?.business) return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });

  const access = await getEffectiveAccess(restaurant.business);
  const limit = effectiveTableLimit(access);

  const [existing, existingCount] = await Promise.all([
    prisma.table.findFirst({ where: { restaurantId, tableNumber: parsed.data.tableNumber } }),
    prisma.table.count({ where: { restaurantId } }),
  ]);
  if (existing) {
    return NextResponse.json({ error: `Table ${parsed.data.tableNumber} already exists` }, { status: 409 });
  }
  if (existingCount >= limit) return NextResponse.json({ error: `Table limit reached (${limit}). Contact the platform administrator to increase it.` }, { status: 403 });

  const table = await prisma.table.create({
    data: { restaurantId, tableNumber: parsed.data.tableNumber },
  });
  return NextResponse.json(table, { status: 201 });
}
