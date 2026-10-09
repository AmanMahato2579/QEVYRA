import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSiteBySlug } from "@/modules/sites/services";
import { getLayoutForType, applyOptions } from "@/modules/sites/layouts";
import { TemplateRenderer } from "@/modules/sites/TemplateRenderer";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const site = await getSiteBySlug(slug);

  if (!site) {
    notFound();
  }

  return {
    title: `${site.name} — QEVYRA`,
    description: site.shortDescription || site.aboutText || undefined,
    robots: { index: false, follow: false },
  };
}

export default async function SiteHomePage({ params }: PageProps) {
  const { slug } = await params;
  const site = await getSiteBySlug(slug);

  if (!site) {
    notFound();
  }

  const baseLayout = getLayoutForType(site.type);
  const activeSections = applyOptions(baseLayout, site);

  return <TemplateRenderer site={site} sections={activeSections} />;
}
