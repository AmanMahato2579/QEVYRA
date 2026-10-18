import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ProductType } from "@prisma/client";
import { ALL_FEATURE_KEYS } from "@/lib/plan-catalog";
import { logActivity } from "@/lib/activity";
import { parseBody, superAdminGuard } from "@/lib/api-guard";

const schema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).nullable().optional(),
  featureKeys: z.array(z.enum(ALL_FEATURE_KEYS)).optional(),
  limitKeys: z.record(z.string(), z.number().int().min(0)).optional(),
  isVisible: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ productId: string }> }) {
  const guard = await superAdminGuard();
  if (guard.error) return guard.error;

  const { productId } = await params;
  if (!(productId in ProductType)) return NextResponse.json({ error: "Unknown product" }, { status: 400 });

  const body = await parseBody(req, schema);
  if (body.error) return body.error;

  const update: Record<string, unknown> = {};
  const data = body.data;
  for (const key of ["name", "description", "isVisible", "isActive", "sortOrder"] as const) {
    if (data[key] !== undefined) update[key] = data[key];
  }
  if (data.featureKeys !== undefined) update.featureKeys = JSON.stringify(data.featureKeys);
  if (data.limitKeys !== undefined) update.limitKeys = JSON.stringify(data.limitKeys);

  const updated = await prisma.product.update({ where: { id: productId as ProductType }, data: update });

  await logActivity("products_changed", { detail: `Product ${productId} configuration updated` });

  return NextResponse.json(updated);
}