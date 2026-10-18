import { Clock } from "lucide-react";
import type { SiteData } from "../types";
import { SectionContainer } from "../SectionContainer";

export function OpeningHoursSection({
  site,
  isGrouped,
}: {
  site: SiteData;
  isGrouped?: boolean;
}) {
  if (!site.openingHours || site.openingHours.trim() === "") {
    return null;
  }

  const content = (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm h-full flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <Clock
          className="w-4 h-4 shrink-0"
          style={{ color: "var(--site-primary, #2563eb)" }}
        />
        <h2 className="text-base font-bold text-gray-900 truncate">Opening Hours</h2>
      </div>
      <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed max-w-prose break-words">
        {site.openingHours}
      </p>
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
