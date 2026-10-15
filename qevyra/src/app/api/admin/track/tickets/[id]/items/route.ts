import { NextResponse } from "next/server";
import { loadBusinessContext } from "@/lib/auth-guard";
import { canUse } from "@/lib/plans";
import { ticketItemSchema } from "@/modules/track/schemas";
import { addTicketItem, TrackError } from "@/modules/track/services";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await loadBusinessContext();
  if (!ctx || !canUse(ctx.access, "business_track")) {
    return NextResponse.json({ error: "Track is not available for this plan." }, { status: 403 });
  }

  const { id } = await params;
  const parsed = ticketItemSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const item = await addTicketItem(ctx.business.id, id, parsed.data);
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    if (err instanceof TrackError) {
      return NextResponse.json({ error: err.message }, { status: err.code === "not_found" ? 404 : 400 });
    }
    throw err;
  }
}
