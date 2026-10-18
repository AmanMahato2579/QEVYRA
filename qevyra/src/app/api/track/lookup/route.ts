import { NextResponse } from "next/server";
import { z } from "zod";
import { lookupTicketByCodeAndPhone } from "@/modules/track/services";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  code: z.string().trim().min(1).max(64),
  phone: z.string().trim().min(3).max(50),
});

// Public fallback lookup for customers who lost their QR/link. Requires the
// ticket code AND the phone number on file, so the sequential code alone can
// never be used to enumerate other people's jobs. Rate limited per client.
export async function POST(req: Request) {
  if (!rateLimit(`track-lookup:${clientIp(req)}`, 10, 60_000)) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a minute and try again." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter your ticket code and phone number." }, { status: 400 });
  }

  const token = await lookupTicketByCodeAndPhone(parsed.data.code, parsed.data.phone);
  if (!token) {
    return NextResponse.json(
      { error: "We couldn't find a ticket with that code and phone number." },
      { status: 404 }
    );
  }

  return NextResponse.json({ token });
}
