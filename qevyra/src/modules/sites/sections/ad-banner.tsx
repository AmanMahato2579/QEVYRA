import { ExternalLink } from "lucide-react";
import type { SiteAdData } from "../types";
import { SectionContainer } from "../SectionContainer";

export function AdBannerSection({ ads }: { ads: SiteAdData[] }) {
  if (!ads || ads.length === 0) {
    return null;
  }

  const isMulti = ads.length >= 2;

  return (
    <SectionContainer className="py-4">
      <div
        className={
          isMulti ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "flex flex-col gap-3"
        }
      >
        {ads.map((ad) => (
          <a
            key={ad.id}
            href={ad.linkUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="group relative block overflow-hidden rounded-2xl border border-gray-200 bg-white p-3 shadow-xs hover:border-gray-300 hover:shadow-sm transition-all h-full"
          >
            <div className="flex items-center gap-3">
              {ad.imageUrl && (
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0 aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ad.imageUrl}
                    alt={ad.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600">
                    Sponsored
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-gray-900 group-hover:text-blue-600 truncate transition-colors">
                  {ad.title}
                </h4>
                <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                  <span>Visit sponsor</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </p>
              </div>
            </div>
          </a>
        ))}
      </div>
    </SectionContainer>
  );
}
