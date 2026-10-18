import type { SectionId, SiteData, SiteType } from "./types";

export const DEFAULT_LAYOUTS: Record<SiteType, SectionId[]> = {
  GENERAL: [
    "header",
    "hero",
    "what-we-do",
    "story",
    "main-buttons",
    "visit-us",
    "contact",
    "opening-hours",
    "google-review",
    "social",
    "footer",
  ],
  TRACKING: [
    "header",
    "hero",
    "what-we-do",
    "story",
    "main-buttons",
    "visit-us",
    "contact",
    "opening-hours",
    "google-review",
    "social",
    "footer",
  ],
  MENU: [
    "header",
    "hero",
    "what-we-do",
    "story",
    "main-buttons",
    "visit-us",
    "contact",
    "opening-hours",
    "google-review",
    "social",
    "footer",
  ],
};

export function getLayoutForType(type: SiteType): SectionId[] {
  return DEFAULT_LAYOUTS[type] ?? DEFAULT_LAYOUTS.GENERAL;
}

export function applyOptions(layout: SectionId[], site: SiteData): SectionId[] {
  return layout.filter((section) => {
    switch (section) {
      case "main-buttons": {
        if (site.type === "GENERAL") {
          return site.enableItems;
        }
        if (site.type === "TRACKING") {
          const hasTrack = site.enableTrackOrder;
          const hasBooking = site.enableBooking && Boolean(site.phone);
          return hasTrack || hasBooking;
        }
        if (site.type === "MENU") {
          const hasMenu = site.enableItems;
          const hasTrack = site.enableTrackOrder;
          const hasBooking = site.enableBooking && Boolean(site.phone);
          return hasMenu || hasTrack || hasBooking;
        }
        return true;
      }
      case "what-we-do":
        return site.highlights && site.highlights.length > 0;
      case "story":
        return Boolean(site.storyText && site.storyText.trim().length > 0);
      case "visit-us":
        return Boolean(site.mapUrl || site.addressText);
      case "contact":
        return Boolean(site.phone || site.whatsapp);
      case "opening-hours":
        return Boolean(site.openingHours && site.openingHours.trim().length > 0);
      case "google-review":
        return Boolean(site.googleReviewUrl);
      case "social":
        return Boolean(site.socialLinks && site.socialLinks.length > 0);
      case "item-list":
      case "menu-view":
        return site.enableItems;
      case "track-demo":
        return site.enableTrackOrder;
      case "ad-banner":
        return site.enableAds;
      default:
        return true;
    }
  });
}

export type RenderBlock =
  | { kind: "single"; section: SectionId }
  | { kind: "story-buttons"; sections: ["story", "main-buttons"] }
  | { kind: "bottom-grid"; sections: SectionId[] };

export const BOTTOM_SECTIONS: ReadonlySet<SectionId> = new Set([
  "visit-us",
  "contact",
  "opening-hours",
  "google-review",
  "social",
]);

export function groupSections(sections: SectionId[]): RenderBlock[] {
  const blocks: RenderBlock[] = [];
  let i = 0;

  while (i < sections.length) {
    const current = sections[i];

    // Group story and main-buttons when both are adjacent
    if (
      current === "story" &&
      i + 1 < sections.length &&
      sections[i + 1] === "main-buttons"
    ) {
      blocks.push({
        kind: "story-buttons",
        sections: ["story", "main-buttons"],
      });
      i += 2;
      continue;
    }

    // Group bottom area sections
    if (BOTTOM_SECTIONS.has(current)) {
      const bottomGroup: SectionId[] = [];
      while (i < sections.length && BOTTOM_SECTIONS.has(sections[i])) {
        bottomGroup.push(sections[i]);
        i++;
      }
      blocks.push({
        kind: "bottom-grid",
        sections: bottomGroup,
      });
      continue;
    }

    blocks.push({ kind: "single", section: current });
    i++;
  }

  return blocks;
}
