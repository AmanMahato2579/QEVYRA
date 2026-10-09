import { MapPin, Navigation } from "lucide-react";
import type { SiteData } from "../types";
import { SectionContainer } from "../SectionContainer";

export function VisitUsSection({
  site,
  isGrouped,
}: {
  site: SiteData;
  isGrouped?: boolean;
}) {
  if (!site.mapUrl && !site.addressText) {
    return null;
  }

  const content = (
    <div
      id="location"
      className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm h-full flex flex-col justify-between overflow-hidden"
    >
      <div>
        <div className="flex items-center gap-2 mb-3">
          <MapPin
            className="w-4 h-4 shrink-0"
            style={{ color: "var(--site-primary, #2563eb)" }}
          />
          <h2 className="text-base font-bold text-gray-900 truncate">Visit Us</h2>
        </div>

        {site.addressText && (
          <p className="text-sm text-gray-700 leading-relaxed max-w-prose break-words">
            {site.addressText}
          </p>
        )}
      </div>

      {site.mapUrl && (
        <div className="mt-4">
          <a
            href={site.mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white shadow-sm hover:opacity-95 transition-opacity w-full text-center"
            style={{ backgroundColor: "var(--site-primary, #2563eb)" }}
          >
            <Navigation className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Open in Google Maps</span>
          </a>
        </div>
      )}
    </div>
  );

  if (isGrouped) {
    return content;
  }

  return (
    <SectionContainer className="py-5">
      {content}
    </SectionContainer>
  );
}
