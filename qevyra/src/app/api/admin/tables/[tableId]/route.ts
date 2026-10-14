import { prisma } from "@/lib/prisma";
import { apiGuard } from "@/lib/api-guard";
import { NextResponse } from "next/server";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ tableId: string }> }
) {
  const guard = await apiGuard({ permission: "resources.manage" });
  if (guard.error) return guard.error;
  const restaurantId = guard.user.restaurantId;
  if (!restaurantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tableId } = await params;
  const table = await prisma.table.findFirst({ where: { id: tableId, restaurantId } });
  if (!table) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Deleting a table would cascade-delete every session's order/financial
  // history. That is a money-destroying action — refuse it outright.
  const sessionCount = await prisma.tableSession.count({ where: { tableId } });
  if (sessionCount > 0) {
    return NextResponse.json(
      { error: "This table has order history and cannot be deleted. Deactivate it instead." },
      { status: 409 }
    );
  }

  await prisma.table.delete({ where: { id: tableId } });
  return NextResponse.json({ success: true });
}
