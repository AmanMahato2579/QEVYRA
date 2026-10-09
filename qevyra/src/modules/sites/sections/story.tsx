import { BookOpen } from "lucide-react";
import type { SiteData } from "../types";
import { SectionContainer } from "../SectionContainer";

export function StorySection({
  site,
  isGrouped,
}: {
  site: SiteData;
  isGrouped?: boolean;
}) {
  if (!site.storyText || site.storyText.trim() === "") {
    return null;
  }

  const content = (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm h-full flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen
          className="w-4 h-4 shrink-0"
          style={{ color: "var(--site-primary, #2563eb)" }}
        />
        <h2 className="text-base font-bold text-gray-900">Our Story</h2>
      </div>
      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line max-w-prose break-words">
        {site.storyText}
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
