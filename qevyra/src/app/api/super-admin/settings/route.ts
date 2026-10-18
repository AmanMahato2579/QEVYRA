import { NextResponse } from "next/server";
import { z } from "zod";
import { getPlatformSettings, savePlatformSettings } from "@/lib/settings";
import { logActivity } from "@/lib/activity";
import { parseBody, superAdminGuard } from "@/lib/api-guard";

const settingsSchema = z.object({
  platformName: z.string().min(1).max(100).optional(),
  defaultTableLimit: z.number().int().min(1).max(200).optional(),
  defaultSubscriptionDays: z.number().int().min(1).max(3650).optional(),
  newRestaurantNeverExpires: z.boolean().optional(),
  newRestaurantAutoOff: z.boolean().optional(),
});

export async function GET() {
  const guard = await superAdminGuard();
  if (guard.error) return guard.error;
  return NextResponse.json(await getPlatformSettings());
}

export async function PATCH(req: Request) {
  const guard = await superAdminGuard();
  if (guard.error) return guard.error;

  const body = await parseBody(req, settingsSchema);
  if (body.error) return body.error;

  await savePlatformSettings(body.data);
  await logActivity("settings_updated", { detail: JSON.stringify(body.data) });
  return NextResponse.json({ success: true, settings: await getPlatformSettings() });
}