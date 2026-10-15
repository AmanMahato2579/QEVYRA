import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Legacy business-website route. The public storefront now renders through the
 * canonical `Site` engine at `/s/[slug]` (which bridges legacy `Website`
 * content), so this route only preserves old/printed `/b/{slug}` links by
 * redirecting them. See build-plan gap 8.
 */
export default async function LegacyBusinessPage({ params }: PageProps) {
  const { slug } = await params;
  redirect(`/s/${encodeURIComponent(slug)}`);
}
