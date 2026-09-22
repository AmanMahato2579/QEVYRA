import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { isTrackBusinessType } from "@/lib/business-kind";

const schema = z
  .object({
    plan: z.enum(["BRONZE", "SILVER", "STAR"]).optional(),
    isPublished: z.boolean().optional(),
    isActive: z.boolean().optional(),
    neverExpires: z.boolean().optional(),
    extendDays: z.number().int().min(1).max(3650).optional(),
    password: z.string().min(8).max(128).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });

export async function PATCH(req: Request, { params }: { params: Promise<{ businessId: string }> }) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });

  const { businessId } = await params;
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });
  if (!isTrackBusinessType(business.type)) return NextResponse.json({ error: "Not a Track business" }, { status: 400 });

  const data: Record<string, unknown> = {};

  if (parsed.data.plan !== undefined) data.plan = parsed.data.plan;
  if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;
  if (parsed.data.neverExpires !== undefined) data.neverExpires = parsed.data.neverExpires;
  if (parsed.data.extendDays !== undefined) {
    const base = business.subscriptionStatus === "ACTIVE" && business.subscriptionExpiresAt ? business.subscriptionExpiresAt : new Date();
    data.subscriptionEnd = new Date(base.getTime() + parsed.data.extendDays * 24 * 60 * 60 * 1000);
    data.subscriptionStatus = "ACTIVE";
  }

  await prisma.$transaction(async (tx) => {
    if (Object.keys(data).length > 0) await tx.business.update({ where: { id: businessId }, data });

    if (parsed.data.isPublished !== undefined) {
      const existing = await tx.website.findUnique({ where: { businessId } });
      if (existing) await tx.website.update({ where: { businessId }, data: { isPublished: parsed.data.isPublished } });
      else
        await tx.website.create({
          data: {
            businessId,
            themeId: "theme-ember",
            isPublished: parsed.data.isPublished,
            metaTitle: business.name,
            heroTitle: business.name,
          },
        });
    }

    if (parsed.data.password !== undefined) {
      const updated = await tx.user.updateMany({
        where: { businessId, role: "TRACKING_ADMIN" },
        data: { passwordHash: await bcrypt.hash(parsed.data.password!, 12), tokenVersion: { increment: 1 } },
      });
      if (!updated.count) throw new Error("Owner not found");
    }
  });

  await logActivity("tracking_updated", {
    businessId,
    businessName: business.name,
    detail: JSON.stringify({
      plan: parsed.data.plan ?? null,
      isPublished: parsed.data.isPublished ?? null,
      isActive: parsed.data.isActive ?? null,
      extendDays: parsed.data.extendDays ?? null,
      password: parsed.data.password ? "reset" : null,
    }),
  });

  return NextResponse.json({ success: true });
}