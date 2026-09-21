import { NextResponse } from "next/server";
import { z } from "zod";
import { loadBusinessContext } from "@/lib/auth-guard";
import { canUse } from "@/lib/plans";
import { advanceTicket, cancelTicket, TrackError } from "@/modules/track/services";

const actionSchema = z.object({
  action: z.enum(["advance", "cancel"]),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await loadBusinessContext();
  if (!ctx || !canUse(ctx.access, "business_track")) {
    return NextResponse.json({ error: "Track is not available for this plan." }, { status: 403 });
  }

  const { id } = await params;
  const parsed = actionSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const ticket =
      parsed.data.action === "advance"
        ? await advanceTicket(ctx.business.id, id)
        : await cancelTicket(ctx.business.id, id);
    return NextResponse.json({ ticket });
  } catch (err) {
    if (err instanceof TrackError) {
      return NextResponse.json({ error: err.message }, { status: err.code === "not_found" ? 404 : 400 });
    }
    throw err;
  }
}