import { Share2, Globe } from "lucide-react";
import type { SiteData } from "../types";
import { SectionContainer } from "../SectionContainer";

export function SocialSection({
  site,
  isGrouped,
}: {
  site: SiteData;
  isGrouped?: boolean;
}) {
  if (!site.socialLinks || site.socialLinks.length === 0) {
    return null;
  }

  const content = (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm text-center h-full flex flex-col justify-between overflow-hidden">
      <div>
        <div className="flex items-center justify-center gap-2 mb-3">
          <Share2
            className="w-4 h-4 shrink-0"
            style={{ color: "var(--site-primary, #2563eb)" }}
          />
          <h2 className="text-base font-bold text-gray-900 truncate">Follow Us</h2>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
          {site.socialLinks.map((link, idx) => (
            <a
              key={idx}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50/70 hover:bg-gray-100 text-xs font-semibold text-gray-700 capitalize transition-colors max-w-full"
            >
              <Globe className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <span className="truncate">{link.platform}</span>
            </a>
          ))}
        </div>
      </div>
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
