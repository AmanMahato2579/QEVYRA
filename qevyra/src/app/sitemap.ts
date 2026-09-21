import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://qevyra.app";
const base = new URL(siteUrl).origin;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, priority: 1 },
    { url: `${base}/track`, priority: 0.7 },
  ];

  let businessSites: MetadataRoute.Sitemap = [];
  try {
    // Only public, published business websites are indexed.
    const websites = await prisma.website.findMany({
      where: { isPublished: true, business: { isActive: true } },
      select: { business: { select: { slug: true } }, updatedAt: true },
      take: 1000,
    });
    businessSites = websites.map((w) => ({
      url: `${base}/b/${w.business.slug}`,
      lastModified: w.updatedAt,
      priority: 0.6,
    }));
  } catch {
    // Never fail the whole sitemap because of a database hiccup.
  }

  return [...staticRoutes, ...businessSites];
}