import { redirect } from "next/navigation";

export const metadata = { title: "Businesses – Super Admin" };
export const dynamic = "force-dynamic";

// Legacy URL — businesses now live under /super-admin/businesses.
export default function RestaurantsPageLegacy() {
  redirect("/super-admin/businesses");
}