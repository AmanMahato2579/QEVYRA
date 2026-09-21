import { NextResponse } from "next/server";
import { z } from "zod";
import { loadBusinessContext } from "@/lib/auth-guard";
import { canUse } from "@/lib/plans";
import {
  getWorkflows,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  TrackError,
} from "@/modules/track/services";

const stepSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().nullable(),
});

const workflowSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  codePrefix: z.string().trim().min(2).max(8).optional(),
  isActive: z.boolean().optional(),
  steps: z.array(stepSchema).min(1).max(30),
});

const deleteSchema = z.object({ id: z.string().min(1) });

/** All Track admin endpoints are tenant-scoped and gated on business_track. */
async function requireTrack() {
  const ctx = await loadBusinessContext();
  if (!ctx || !canUse(ctx.access, "business_track")) return null;
  return ctx;
}

export async function GET() {
  const ctx = await requireTrack();
  if (!ctx) return NextResponse.json({ error: "Track is not available for this plan." }, { status: 403 });

  const workflows = await getWorkflows(ctx.business.id);
  return NextResponse.json({ workflows });
}

export async function POST(req: Request) {
  const ctx = await requireTrack();
  if (!ctx) return NextResponse.json({ error: "Track is not available for this plan." }, { status: 403 });

  const parsed = workflowSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const workflow = await createWorkflow(ctx.business.id, ctx.access.limits["workflows"], parsed.data);
    return NextResponse.json({ workflow }, { status: 201 });
  } catch (err) {
    if (err instanceof TrackError) {
      const status = err.code === "limit" ? 429 : err.code === "conflict" ? 409 : 400;
      return NextResponse.json({ error: err.message }, { status });
    }
    throw err;
  }
}

export async function PATCH(req: Request) {
  const ctx = await requireTrack();
  if (!ctx) return NextResponse.json({ error: "Track is not available for this plan." }, { status: 403 });

  const parsed = workflowSchema.safeParse(await req.json());
  if (!parsed.success || !parsed.data.id) {
    return NextResponse.json({ error: parsed.success ? "Workflow id is required." : parsed.error.flatten() }, { status: 400 });
  }

  try {
    const workflow = await updateWorkflow(ctx.business.id, parsed.data.id as string, parsed.data);
    return NextResponse.json({ workflow });
  } catch (err) {
    if (err instanceof TrackError) {
      const status = err.code === "conflict" ? 409 : 404;
      return NextResponse.json({ error: err.message }, { status });
    }
    throw err;
  }
}

export async function DELETE(req: Request) {
  const ctx = await requireTrack();
  if (!ctx) return NextResponse.json({ error: "Track is not available for this plan." }, { status: 403 });

  const parsed = deleteSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    await deleteWorkflow(ctx.business.id, parsed.data.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof TrackError) {
      const status = err.code === "conflict" ? 409 : 404;
      return NextResponse.json({ error: err.message }, { status });
    }
    throw err;
  }
}