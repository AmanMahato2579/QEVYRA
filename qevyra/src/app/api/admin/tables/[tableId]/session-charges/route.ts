import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiGuard } from "@/lib/api-guard";
const schema = z.object({ applyTax: z.boolean().optional(), applyServiceCharge: z.boolean().optional() });
export async function PATCH(req: Request, { params }: { params: Promise<{ tableId: string }> }) {
  const guard = await apiGuard({ permission: "resources.manage" });
  if (guard.error) return guard.error;
  const restaurantId = guard.user.restaurantId;
  if (!restaurantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = schema.safeParse(await req.json()); if (!data.success) return NextResponse.json({ error: "Invalid charges" }, { status: 400 });
  const { tableId } = await params;
  const updated = await prisma.tableSession.updateMany({ where: { tableId, restaurantId, status: "ACTIVE" }, data: data.data });
  return NextResponse.json(updated);
}
