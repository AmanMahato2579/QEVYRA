import Link from "next/link";
import { Phone, MapPin, MessageCircle } from "lucide-react";
import { sanitizePhoneDigits, formatWhatsAppDigits } from "../types";
import type { SiteData } from "../types";
import { SectionContainer } from "../SectionContainer";

export function HeaderSection({ site }: { site: SiteData }) {
  const mapHref = site.mapUrl || (site.addressText ? `#location` : null);
  const cleanWhatsAppDigits =
    site.type === "TRACKING" && site.whatsapp
      ? formatWhatsAppDigits(site.whatsapp)
      : null;
  const cleanPhone = site.phone ? sanitizePhoneDigits(site.phone) : null;

  return (
    <header className="w-full bg-white border-b border-gray-100 py-6">
      <SectionContainer
        as="div"
        className="flex flex-col md:flex-row items-center md:justify-between gap-4 text-center md:text-left"
      >
        <div className="flex flex-col items-center md:flex-row md:items-center gap-4 md:gap-5 text-center md:text-left">
          {site.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={site.logoUrl}
              alt={`${site.name} logo`}
              className="w-20 h-20 rounded-2xl object-cover shadow-sm mb-4 md:mb-0 border border-gray-100 shrink-0"
            />
          ) : (
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-sm mb-4 md:mb-0 shrink-0"
              style={{ backgroundColor: "var(--site-primary, #2563eb)" }}
            >
              {site.name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex flex-col items-center md:items-start">
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              <Link href={`/s/${site.slug}`} className="hover:opacity-90">
                {site.name}
              </Link>
            </h1>

            {site.shortDescription && (
              <p className="mt-1 text-sm text-gray-600 max-w-md md:max-w-lg leading-relaxed">
                {site.shortDescription}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 md:mt-0 flex flex-wrap md:flex-nowrap items-center justify-center md:justify-end gap-2.5 shrink-0">
          {cleanWhatsAppDigits && (
            <a
              href={`https://wa.me/${cleanWhatsAppDigits}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors whitespace-nowrap"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </a>
          )}

          {cleanPhone && (
            <a
              href={`tel:${cleanPhone}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg text-white shadow-sm hover:opacity-95 transition-opacity whitespace-nowrap"
              style={{ backgroundColor: "var(--site-primary, #2563eb)" }}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Call now</span>
            </a>
          )}

          {mapHref && (
            <a
              href={mapHref}
              target={site.mapUrl ? "_blank" : undefined}
              rel={site.mapUrl ? "noopener noreferrer" : undefined}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 transition-colors whitespace-nowrap"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>See location</span>
            </a>
          )}
        </div>
      </SectionContainer>
    </header>
  );
}
