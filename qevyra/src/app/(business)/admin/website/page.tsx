import { requireRestaurantAdmin } from "@/lib/auth-guard";
import { getWebsiteForBusiness, listWebsiteThemes } from "@/modules/website/services";
import { getEffectiveAccess, canUse } from "@/lib/plans";
import { loadOperationalRestaurant } from "@/lib/plans";
import WebsiteClient from "./WebsiteClient";

export const metadata = { title: "Website – Business Admin" };
export const dynamic = "force-dynamic";

export default async function WebsiteAdminPage() {
  const user = await requireRestaurantAdmin();
  const businessId = (user as { businessId?: string | null }).businessId;
  if (!businessId) return null;

  const restaurant = await loadOperationalRestaurant(user.restaurantId!);
  if (!restaurant?.business) return null;
  const access = await getEffectiveAccess(restaurant.business);

  const [website, themes] = await Promise.all([
    getWebsiteForBusiness(businessId),
    listWebsiteThemes(),
  ]);

  return (
    <WebsiteClient
      slug={restaurant.business.slug}
      website={JSON.parse(JSON.stringify(website))}
      themes={JSON.parse(JSON.stringify(themes))}
      canUse={canUse(access, "business_website")}
    />
  );
}