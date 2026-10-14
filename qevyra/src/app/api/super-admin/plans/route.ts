import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ALL_FEATURE_KEYS, ALL_FEATURES_MARKER } from "@/lib/plan-catalog";
import { logActivity } from "@/lib/activity";
import { parseBody, superAdminGuard } from "@/lib/api-guard";

const FEATURE_VALUES = [...ALL_FEATURE_KEYS, ALL_FEATURES_MARKER] as const;

const featureKeysSchema = z.union([
  z.array(z.enum(FEATURE_VALUES)),
  z.literal(ALL_FEATURES_MARKER),
]);

const limitKeysSchema = z.record(z.string(), z.number().int().min(0));

const patchSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).nullable().optional(),
  priceMonthly: z.number().min(0).nullable().optional(),
  priceYearly: z.number().min(0).nullable().optional(),
  featureKeys: featureKeysSchema.optional(),
  limitKeys: limitKeysSchema.optional(),
  isVisible: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export async function GET() {
  const guard = await superAdminGuard();
  if (guard.error) return guard.error;
  const plans = await prisma.plan.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json(plans);
}

export async function PATCH(req: Request) {
  const guard = await superAdminGuard();
  if (guard.error) return guard.error;

  const body = await parseBody(req, patchSchema);
  if (body.error) return body.error;

  const { id, ...data } = body.data;
  const plan = await prisma.plan.findUnique({ where: { id } });
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  const update: Record<string, unknown> = {};
  for (const key of ["name", "description", "priceMonthly", "priceYearly", "isVisible", "isActive", "sortOrder"] as const) {
    if (data[key] !== undefined) update[key] = data[key];
  }
  if (data.featureKeys !== undefined) update.featureKeys = JSON.stringify(data.featureKeys);
  if (data.limitKeys !== undefined) update.limitKeys = JSON.stringify(data.limitKeys);

  const updated = await prisma.plan.update({ where: { id }, data: update });

  await logActivity("plan_updated", {
    detail: `Plan ${id} configuration updated`,
  });

  return NextResponse.json(updated);
}