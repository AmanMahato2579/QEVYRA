import { Star } from "lucide-react";
import type { SiteData } from "../types";
import { SectionContainer } from "../SectionContainer";

export function GoogleReviewSection({
  site,
  isGrouped,
}: {
  site: SiteData;
  isGrouped?: boolean;
}) {
  if (!site.googleReviewUrl) {
    return null;
  }

  const content = (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-5 border border-amber-200/60 shadow-sm h-full flex flex-col justify-between gap-4 overflow-hidden">
      <div>
        <div className="flex items-center gap-1 text-amber-500 mb-1.5">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400 shrink-0" />
          ))}
        </div>
        <h2 className="text-sm font-bold text-gray-900 break-words">
          Enjoyed your experience?
        </h2>
        <p className="text-xs text-gray-600 mt-0.5 break-words">
          Leave us a review on Google!
        </p>
      </div>

      <a
        href={site.googleReviewUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 text-white font-semibold text-xs shadow-sm hover:bg-amber-600 transition-colors w-full shrink-0"
      >
        <span>Write a Review</span>
      </a>
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
