import { NextResponse } from "next/server";
import { loadBusinessContext } from "@/lib/auth-guard";
import { canUse } from "@/lib/plans";
import { ticketItemSchema } from "@/modules/track/schemas";
import { updateTicketItem, deleteTicketItem, TrackError } from "@/modules/track/services";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const ctx = await loadBusinessContext();
  if (!ctx || !canUse(ctx.access, "business_track")) {
    return NextResponse.json({ error: "Track is not available for this plan." }, { status: 403 });
  }

  const { id, itemId } = await params;
  const parsed = ticketItemSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const item = await updateTicketItem(ctx.business.id, id, itemId, parsed.data);
    return NextResponse.json({ item });
  } catch (err) {
    if (err instanceof TrackError) {
      return NextResponse.json({ error: err.message }, { status: err.code === "not_found" ? 404 : 400 });
    }
    throw err;
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const ctx = await loadBusinessContext();
  if (!ctx || !canUse(ctx.access, "business_track")) {
    return NextResponse.json({ error: "Track is not available for this plan." }, { status: 403 });
  }

  const { id, itemId } = await params;
  try {
    await deleteTicketItem(ctx.business.id, id, itemId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof TrackError) {
      return NextResponse.json({ error: err.message }, { status: err.code === "not_found" ? 404 : 400 });
    }
    throw err;
  }
}
