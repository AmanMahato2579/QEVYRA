import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSiteBySlug, getActiveAds } from "@/modules/sites/services";
import { TemplateRenderer } from "@/modules/sites/TemplateRenderer";
import type { SectionId } from "@/modules/sites/types";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const site = await getSiteBySlug(slug);

  if (!site || !site.enableTrackOrder) {
    notFound();
  }

  return {
    title: `Track Order (Demo) — ${site.name}`,
    description: `Track order progress demo for ${site.name}`,
    robots: { index: false, follow: false },
  };
}

export default async function SiteTrackPage({ params }: PageProps) {
  const { slug } = await params;
  const site = await getSiteBySlug(slug);

  if (!site || !site.enableTrackOrder) {
    notFound();
  }

  const ads = site.enableAds ? await getActiveAds(2) : [];

  const sections: SectionId[] = ["header", "track-demo"];
  if (site.enableAds) {
    sections.push("ad-banner");
  }
  sections.push("footer");

  return <TemplateRenderer site={site} sections={sections} ads={ads} />;
}
