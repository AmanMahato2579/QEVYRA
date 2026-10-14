import { prisma } from "@/lib/prisma";
import { apiGuard } from "@/lib/api-guard";
import { NextResponse } from "next/server";
import { z } from "zod";

const categorySchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export async function GET() {
  const guard = await apiGuard({ permission: "catalog.view" });
  if (guard.error) return guard.error;
  const restaurantId = guard.user.restaurantId;
  if (!restaurantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const categories = await prisma.category.findMany({
    where: { restaurantId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  const guard = await apiGuard({ permission: "catalog.manage" });
  if (guard.error) return guard.error;
  const restaurantId = guard.user.restaurantId;
  if (!restaurantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const category = await prisma.category.create({
    data: {
      ...parsed.data,
      restaurantId,
      sortOrder: await prisma.category.count({ where: { restaurantId } }),
    },
  });
  return NextResponse.json(category, { status: 201 });
}
