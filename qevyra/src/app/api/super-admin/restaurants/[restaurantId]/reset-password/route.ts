import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { superAdminGuard } from "@/lib/api-guard";

const schema = z.object({ password: z.string().min(8).max(128) });

export async function POST(req: Request, { params }: { params: Promise<{ restaurantId: string }> }) {
  const guard = await superAdminGuard();
  if (guard.error) return guard.error;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Password must contain at least 8 characters" }, { status: 400 });
  const { restaurantId } = await params;
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { name: true } });
  const result = await prisma.user.updateMany({
    where: { restaurantId, role: "RESTAURANT_ADMIN" },
    // Bump tokenVersion so every existing login of that owner is revoked.
    data: { passwordHash: await bcrypt.hash(parsed.data.password, 12), tokenVersion: { increment: 1 } },
  });
  if (!result.count) return NextResponse.json({ error: "Owner not found" }, { status: 404 });
  await logActivity("password_reset", { restaurantId, restaurantName: restaurant?.name ?? null });
  return NextResponse.json({ success: true });
}