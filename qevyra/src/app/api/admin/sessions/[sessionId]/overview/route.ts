import { getSessionOverview } from "@/lib/db";
import { apiGuard } from "@/lib/api-guard";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const guard = await apiGuard({ permission: "orders.view" });
  if (guard.error) return guard.error;
  const restaurantId = guard.user.restaurantId;
  if (!restaurantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = await params;
  const overview = await getSessionOverview(sessionId, restaurantId);
  if (!overview) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  return NextResponse.json(JSON.parse(JSON.stringify(overview)));
}