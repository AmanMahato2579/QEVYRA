import type { SiteData } from "../types";
import { SectionContainer } from "../SectionContainer";

export function HeroSection({ site }: { site: SiteData }) {
  if (!site.aboutText && !site.heroImageUrl) {
    return null;
  }

  return (
    <SectionContainer className="py-6">
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm overflow-hidden flex flex-col lg:flex-row lg:items-center lg:gap-10">
        {site.heroImageUrl && (
          <div className="mb-5 lg:mb-0 lg:order-2 lg:w-1/2 shrink-0 rounded-xl lg:rounded-2xl overflow-hidden -mx-2 -mt-2 lg:m-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={site.heroImageUrl}
              alt={`Welcome to ${site.name}`}
              className="w-full h-48 sm:h-56 lg:h-80 object-cover rounded-xl lg:rounded-2xl"
            />
          </div>
        )}

        <div className="lg:order-1 lg:flex-1 min-w-0">
          <h2 className="text-xl lg:text-2xl font-bold text-gray-900 tracking-tight">
            Welcome to {site.name}
          </h2>

          {site.aboutText && (
            <p className="mt-3 text-sm text-gray-600 leading-relaxed whitespace-pre-line max-w-prose">
              {site.aboutText}
            </p>
          )}
        </div>
      </div>
    </SectionContainer>
  );
}
