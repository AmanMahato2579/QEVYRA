import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { superAdminGuard } from "@/lib/api-guard";

const schema = z.object({ password: z.string().min(8).max(128) });

export async function POST(req: Request, { params }: { params: Promise<{ businessId: string }> }) {
  const guard = await superAdminGuard();
  if (guard.error) return guard.error;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Password must contain at least 8 characters" }, { status: 400 });
  const { businessId } = await params;
  const business = await prisma.business.findUnique({ where: { id: businessId }, select: { name: true } });
  const result = await prisma.user.updateMany({
    where: { businessId, role: { in: ["RESTAURANT_ADMIN", "TRACKING_ADMIN"] } },
    // Bump tokenVersion so every existing login of that owner is revoked.
    data: { passwordHash: await bcrypt.hash(parsed.data.password, 12), tokenVersion: { increment: 1 } },
  });
  if (!result.count) return NextResponse.json({ error: "Owner not found" }, { status: 404 });
  await logActivity("password_reset", { businessId, businessName: business?.name ?? null });
  return NextResponse.json({ success: true });
}