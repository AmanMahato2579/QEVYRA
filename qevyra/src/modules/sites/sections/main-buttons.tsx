import Link from "next/link";
import { Utensils, ShoppingBag, Truck, Phone } from "lucide-react";
import { sanitizePhoneDigits } from "../types";
import type { SiteData } from "../types";
import { SectionContainer } from "../SectionContainer";

export function MainButtonsSection({
  site,
  isGrouped,
}: {
  site: SiteData;
  isGrouped?: boolean;
}) {
  const cleanPhone = site.phone ? sanitizePhoneDigits(site.phone) : null;
  const showItems = site.type === "GENERAL" && site.enableItems;
  const showMenu = site.type === "MENU" && site.enableItems;
  const showTrack =
    (site.type === "TRACKING" || site.type === "MENU") && site.enableTrackOrder;
  const showBooking =
    (site.type === "TRACKING" || site.type === "MENU") &&
    site.enableBooking &&
    Boolean(cleanPhone);

  if (!showItems && !showMenu && !showTrack && !showBooking) {
    return null;
  }

  const buttons = (
    <div className="flex flex-col gap-3 w-full">
      {showItems && (
        <Link
          href={`/s/${site.slug}/items`}
          className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-white font-medium shadow-sm hover:opacity-95 transition-opacity text-sm"
          style={{ backgroundColor: "var(--site-primary, #2563eb)" }}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>View items</span>
        </Link>
      )}

      {showMenu && (
        <Link
          href={`/s/${site.slug}/menu`}
          className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-white font-medium shadow-sm hover:opacity-95 transition-opacity text-sm"
          style={{ backgroundColor: "var(--site-primary, #2563eb)" }}
        >
          <Utensils className="w-4 h-4" />
          <span>View menu</span>
        </Link>
      )}

      {showTrack && (
        <Link
          href={`/s/${site.slug}/track`}
          className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-gray-900 text-white font-medium shadow-sm hover:bg-gray-800 transition-colors text-sm"
        >
          <Truck className="w-4 h-4" />
          <span>Track order</span>
        </Link>
      )}

      {showBooking && cleanPhone && (
        <a
          href={`tel:${cleanPhone}`}
          className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-emerald-600 text-white font-medium shadow-sm hover:bg-emerald-700 transition-colors text-sm"
        >
          <Phone className="w-4 h-4" />
          <span>Call to book</span>
        </a>
      )}
    </div>
  );

  if (isGrouped) {
    return (
      <div className="w-full h-full flex flex-col justify-center">
        {buttons}
      </div>
    );
  }

  return (
    <SectionContainer className="py-5">
      <div className="max-w-md mx-auto lg:mx-0">{buttons}</div>
    </SectionContainer>
  );
}
