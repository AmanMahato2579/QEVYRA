import { NextResponse } from "next/server";
import { z } from "zod";
import { loadBusinessContext } from "@/lib/auth-guard";
import { canUse } from "@/lib/plans";
import { listTickets, createTicket, TrackError } from "@/modules/track/services";

const createSchema = z.object({
  workflowId: z.string().min(1),
  customerName: z.string().trim().max(120).optional().nullable(),
  customerPhone: z.string().trim().max(50).optional().nullable(),
  itemSummary: z.string().trim().max(500).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

async function requireTrack() {
  const ctx = await loadBusinessContext();
  if (!ctx || !canUse(ctx.access, "business_track")) return null;
  return ctx;
}

export async function GET(req: Request) {
  const ctx = await requireTrack();
  if (!ctx) return NextResponse.json({ error: "Track is not available for this plan." }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "ALL";
  const tickets = await listTickets(ctx.business.id, status);
  return NextResponse.json({ tickets });
}

export async function POST(req: Request) {
  const ctx = await requireTrack();
  if (!ctx) return NextResponse.json({ error: "Track is not available for this plan." }, { status: 403 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const ticket = await createTicket(ctx.business.id, parsed.data);
    return NextResponse.json({ ticket }, { status: 201 });
  } catch (err) {
    if (err instanceof TrackError) return NextResponse.json({ error: err.message }, { status: err.code === "not_found" ? 404 : 400 });
    throw err;
  }
}