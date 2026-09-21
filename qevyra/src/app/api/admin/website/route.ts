import { NextResponse } from "next/server";
import { z } from "zod";
import { loadBusinessContext } from "@/lib/auth-guard";
import { canUse } from "@/lib/plans";
import { listWebsiteThemes, validThemeId } from "@/modules/website/services";
import { prisma } from "@/lib/prisma";

const websiteSchema = z.object({
  themeId: z.string().min(1).optional().nullable(),
  isPublished: z.boolean().optional(),
  metaTitle: z.string().trim().max(160).optional().nullable(),
  metaDescription: z.string().trim().max(320).optional().nullable(),
  heroTitle: z.string().trim().max(120).optional().nullable(),
  heroSubtitle: z.string().trim().max(240).optional().nullable(),
  heroImageUrl: z.string().trim().max(500).optional().nullable(),
  heroCtaLabel: z.string().trim().max(60).optional().nullable(),
  heroCtaLink: z.string().trim().max(500).optional().nullable(),
  aboutTitle: z.string().trim().max(120).optional().nullable(),
  aboutText: z.string().trim().max(4000).optional().nullable(),
  aboutImageUrl: z.string().trim().max(500).optional().nullable(),
  servicesTitle: z.string().trim().max(120).optional().nullable(),
  servicesText: z.string().trim().max(4000).optional().nullable(),
  contactPhone: z.string().trim().max(50).optional().nullable(),
  contactEmail: z.string().trim().max(120).optional().nullable(),
  addressText: z.string().trim().max(500).optional().nullable(),
  mapUrl: z.string().trim().max(500).optional().nullable(),
  footerText: z.string().trim().max(500).optional().nullable(),
  googleReviewUrl: z.string().trim().max(500).optional().nullable(),
});

/**
 * Website editor — GET returns the business's website (auto-creating a draft
 * on first visit) plus the theme catalog. PATCH persists content. Both are
 * tenant-scoped to the Business row (works for menu- and track-kind tenants)
 * and gated on the business_website feature.
 */
async function resolveBusiness() {
  const ctx = await loadBusinessContext();
  if (!ctx) return null;
  if (!canUse(ctx.access, "business_website")) return null;
  return ctx;
}

export async function GET() {
  const ctx = await resolveBusiness();
  if (!ctx) return NextResponse.json({ error: "Website is not available for this plan." }, { status: 403 });

  const [website, themes] = await Promise.all([
    prisma.website.findUnique({
      where: { businessId: ctx.business.id },
      include: { business: true, theme: true },
    }),
    listWebsiteThemes(),
  ]);

  // First visit: create an empty draft so the editor has a row to edit.
  const draft = website ?? (await prisma.website.create({ data: { businessId: ctx.business.id } }));

  return NextResponse.json({ website: draft, themes });
}

export async function PATCH(req: Request) {
  const ctx = await resolveBusiness();
  if (!ctx) return NextResponse.json({ error: "Website is not available for this plan." }, { status: 403 });

  const parsed = websiteSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const themes = await listWebsiteThemes();
  const themeIds = new Set(themes.map((t) => t.id));
  if (data.themeId != null && !themeIds.has(data.themeId)) {
    return NextResponse.json({ error: "Unknown theme" }, { status: 400 });
  }

  const website = await prisma.website.upsert({
    where: { businessId: ctx.business.id },
    update: {
      ...(data.themeId !== undefined ? { themeId: validThemeId(data.themeId) } : {}),
      ...(data.isPublished !== undefined ? { isPublished: data.isPublished } : {}),
      metaTitle: data.metaTitle,
      metaDescription: data.metaDescription,
      heroTitle: data.heroTitle,
      heroSubtitle: data.heroSubtitle,
      heroImageUrl: data.heroImageUrl,
      heroCtaLabel: data.heroCtaLabel,
      heroCtaLink: data.heroCtaLink,
      aboutTitle: data.aboutTitle,
      aboutText: data.aboutText,
      aboutImageUrl: data.aboutImageUrl,
      servicesTitle: data.servicesTitle,
      servicesText: data.servicesText,
      contactPhone: data.contactPhone,
      contactEmail: data.contactEmail,
      addressText: data.addressText,
      mapUrl: data.mapUrl,
      footerText: data.footerText,
      googleReviewUrl: data.googleReviewUrl,
    },
    create: {
      businessId: ctx.business.id,
      ...(data.themeId !== undefined ? { themeId: validThemeId(data.themeId) } : {}),
      ...(data.isPublished !== undefined ? { isPublished: data.isPublished } : {}),
      metaTitle: data.metaTitle,
      metaDescription: data.metaDescription,
      heroTitle: data.heroTitle,
      heroSubtitle: data.heroSubtitle,
      heroImageUrl: data.heroImageUrl,
      heroCtaLabel: data.heroCtaLabel,
      heroCtaLink: data.heroCtaLink,
      aboutTitle: data.aboutTitle,
      aboutText: data.aboutText,
      aboutImageUrl: data.aboutImageUrl,
      servicesTitle: data.servicesTitle,
      servicesText: data.servicesText,
      contactPhone: data.contactPhone,
      contactEmail: data.contactEmail,
      addressText: data.addressText,
      mapUrl: data.mapUrl,
      footerText: data.footerText,
      googleReviewUrl: data.googleReviewUrl,
      isPublished: data.isPublished ?? false,
    },
  });

  return NextResponse.json({ website });
}