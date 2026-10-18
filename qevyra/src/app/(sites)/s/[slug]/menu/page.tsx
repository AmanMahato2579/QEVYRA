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

  if (!site || site.type !== "MENU" || !site.enableItems) {
    notFound();
  }

  return {
    title: `Menu — ${site.name}`,
    description: `View menu dishes and specialties from ${site.name}`,
    robots: { index: false, follow: false },
  };
}

export default async function SiteMenuPage({ params }: PageProps) {
  const { slug } = await params;
  const site = await getSiteBySlug(slug);

  if (!site || site.type !== "MENU" || !site.enableItems) {
    notFound();
  }

  const ads = site.enableAds ? await getActiveAds(2) : [];

  const sections: SectionId[] = ["header", "menu-view"];
  if (site.enableAds) {
    sections.push("ad-banner");
  }
  sections.push("footer");

  return <TemplateRenderer site={site} sections={sections} ads={ads} />;
}
