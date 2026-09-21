import { requireBusinessAdmin } from "@/lib/auth-guard";
import { getWebsiteForBusiness, listWebsiteThemes } from "@/modules/website/services";
import { canUse } from "@/lib/plans";
import WebsiteClient from "@/app/(business)/admin/website/WebsiteClient";

export const metadata = { title: "Website – Track Admin" };
export const dynamic = "force-dynamic";

export default async function TrackWebsitePage() {
  const ctx = await requireBusinessAdmin();

  const [website, themes] = await Promise.all([
    getWebsiteForBusiness(ctx.business.id),
    listWebsiteThemes(),
  ]);

  return (
    <WebsiteClient
      slug={ctx.business.slug}
      website={JSON.parse(JSON.stringify(website))}
      themes={JSON.parse(JSON.stringify(themes))}
      canUse={canUse(ctx.access, "business_website")}
    />
  );
}