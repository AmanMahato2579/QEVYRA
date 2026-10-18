import { apiGuard, parseBody } from "@/lib/api-guard";
import { transferTableSession } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { NextResponse } from "next/server";
import { z } from "zod";

const transferSchema = z.object({
  destinationTableId: z.string().min(1),
});

/**
 * Move the active session (bill) from this table to another table in the same
 * restaurant. Tenant is derived from the session; the source table id comes
 * from the URL — never trust a business id from the client.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ tableId: string }> }
) {
  const guard = await apiGuard({ permission: "orders.manage" });
  if (guard.error) return guard.error;
  const restaurantId = guard.user.restaurantId;
  if (!restaurantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tableId } = await params;

  const body = await parseBody(req, transferSchema);
  if (body.error) return body.error;

  const result = await transferTableSession(restaurantId, tableId, body.data.destinationTableId);
  if (!result.ok) {
    switch (result.code) {
      case "SOURCE_NOT_FOUND":
      case "DESTINATION_NOT_FOUND":
        return NextResponse.json({ error: "Table not found" }, { status: 404 });
      case "SAME_TABLE":
        return NextResponse.json({ error: "Source and destination are the same table" }, { status: 400 });
      case "NO_ACTIVE_SESSION":
        return NextResponse.json({ error: "No active session for this table" }, { status: 409 });
      case "DESTINATION_OCCUPIED":
        return NextResponse.json({ error: "Destination table is occupied" }, { status: 409 });
    }
  }

  await logActivity("order_transferred", {
    restaurantId,
    detail: `Session moved from Table ${result.fromTableNumber} to Table ${result.toTableNumber}`,
  });

  return NextResponse.json({
    success: true,
    sessionId: result.sessionId,
    fromTableNumber: result.fromTableNumber,
    toTableNumber: result.toTableNumber,
  });
}
