import { Sparkles } from "lucide-react";
import type { SiteData } from "../types";
import { SectionContainer } from "../SectionContainer";

export function WhatWeDoSection({ site }: { site: SiteData }) {
  if (!site.highlights || site.highlights.length === 0) {
    return null;
  }

  const title =
    site.type === "TRACKING"
      ? "Popular Services"
      : site.type === "MENU"
      ? "What We Do & Popular Dishes"
      : "What We Do";

  const count = site.highlights.length;
  const gridColsClass =
    count === 1
      ? "grid-cols-1 max-w-md"
      : count === 2
      ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2"
      : count === 3
      ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3"
      : "grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4";

  return (
    <SectionContainer className="py-5">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles
          className="w-4 h-4"
          style={{ color: "var(--site-primary, #2563eb)" }}
        />
        <h2 className="text-base font-bold text-gray-900 uppercase tracking-wider text-xs">
          {title}
        </h2>
      </div>

      <div className={`grid ${gridColsClass} gap-3.5`}>
        {site.highlights.map((highlight) => (
          <div
            key={highlight.id}
            className="bg-white rounded-xl p-4 border border-gray-100 shadow-xs flex flex-col justify-between hover:border-gray-200 transition-colors"
          >
            {highlight.imageUrl && (
              <div className="mb-3 rounded-lg overflow-hidden h-36 aspect-video bg-gray-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={highlight.imageUrl}
                  alt={highlight.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">
                {highlight.title}
              </h3>
              {highlight.description && (
                <p className="mt-1 text-xs text-gray-600 leading-relaxed max-w-prose">
                  {highlight.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </SectionContainer>
  );
}
