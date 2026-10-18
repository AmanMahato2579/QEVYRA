import { NextResponse } from "next/server";
import { listActivity } from "@/lib/activity";
import { superAdminGuard } from "@/lib/api-guard";

export async function GET(req: Request) {
  const guard = await superAdminGuard();
  if (guard.error) return guard.error;
  const { searchParams } = new URL(req.url);
  const limit = Number.parseInt(searchParams.get("limit") ?? "60", 10);
  const safe = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 200) : 60;
  return NextResponse.json(await listActivity({ limit: safe }));
}