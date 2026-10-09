import React from "react";
import type { SectionId, SiteAdData, SiteData } from "./types";
import { groupSections } from "./layouts";
import { SectionContainer } from "./SectionContainer";
import { HeaderSection } from "./sections/header";
import { HeroSection } from "./sections/hero";
import { WhatWeDoSection } from "./sections/what-we-do";
import { StorySection } from "./sections/story";
import { MainButtonsSection } from "./sections/main-buttons";
import { VisitUsSection } from "./sections/visit-us";
import { ContactSection } from "./sections/contact";
import { OpeningHoursSection } from "./sections/opening-hours";
import { GoogleReviewSection } from "./sections/google-review";
import { SocialSection } from "./sections/social";
import { ItemListSection } from "./sections/item-list";
import { MenuViewSection } from "./sections/menu-view";
import { TrackDemoSection } from "./sections/track-demo";
import { AdBannerSection } from "./sections/ad-banner";
import { FooterSection } from "./sections/footer";

interface TemplateRendererProps {
  site: SiteData;
  sections: SectionId[];
  ads?: SiteAdData[];
}

export function TemplateRenderer({
  site,
  sections,
  ads = [],
}: TemplateRendererProps) {
  const primaryColor = site.primaryColor || "#2563eb";
  const blocks = groupSections(sections);

  function renderSingleSection(sectionId: SectionId, index: number) {
    const key = `${sectionId}-${index}`;

    switch (sectionId) {
      case "header":
        return <HeaderSection key={key} site={site} />;
      case "hero":
        return <HeroSection key={key} site={site} />;
      case "what-we-do":
        return <WhatWeDoSection key={key} site={site} />;
      case "story":
        return <StorySection key={key} site={site} />;
      case "main-buttons":
        return <MainButtonsSection key={key} site={site} />;
      case "visit-us":
        return <VisitUsSection key={key} site={site} />;
      case "contact":
        return <ContactSection key={key} site={site} />;
      case "opening-hours":
        return <OpeningHoursSection key={key} site={site} />;
      case "google-review":
        return <GoogleReviewSection key={key} site={site} />;
      case "social":
        return <SocialSection key={key} site={site} />;
      case "item-list":
        return <ItemListSection key={key} site={site} />;
      case "menu-view":
        return <MenuViewSection key={key} site={site} />;
      case "track-demo":
        return <TrackDemoSection key={key} site={site} />;
      case "ad-banner":
        return <AdBannerSection key={key} ads={ads} />;
      case "footer":
        return <FooterSection key={key} site={site} />;
      default:
        return null;
    }
  }

  return (
    <div
      className="min-h-screen bg-gray-50/60 text-gray-900 font-sans flex flex-col justify-between"
      style={
        {
          "--site-primary": primaryColor,
        } as React.CSSProperties
      }
    >
      <main className="w-full flex-1">
        {blocks.map((block, index) => {
          if (block.kind === "story-buttons") {
            return (
              <SectionContainer key={`story-buttons-${index}`} className="py-5">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-stretch">
                  <div className="lg:col-span-2 flex flex-col">
                    <StorySection site={site} isGrouped />
                  </div>
                  <div className="lg:col-span-1 flex flex-col">
                    <MainButtonsSection site={site} isGrouped />
                  </div>
                </div>
              </SectionContainer>
            );
          }

          if (block.kind === "bottom-grid") {
            return (
              <SectionContainer key={`bottom-grid-${index}`} className="py-5">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:flex xl:flex-row gap-4 items-stretch">
                  {block.sections.map((secId) => {
                    const isContact = secId === "contact";
                    const cellClass = isContact
                      ? "min-w-0 w-full xl:w-auto xl:flex-[1.35] flex flex-col"
                      : "min-w-0 w-full xl:w-auto xl:flex-1 flex flex-col";

                    let node = null;
                    switch (secId) {
                      case "visit-us":
                        node = (
                          <VisitUsSection site={site} isGrouped />
                        );
                        break;
                      case "contact":
                        node = (
                          <ContactSection site={site} isGrouped />
                        );
                        break;
                      case "opening-hours":
                        node = (
                          <OpeningHoursSection site={site} isGrouped />
                        );
                        break;
                      case "google-review":
                        node = (
                          <GoogleReviewSection site={site} isGrouped />
                        );
                        break;
                      case "social":
                        node = (
                          <SocialSection site={site} isGrouped />
                        );
                        break;
                      default:
                        node = null;
                        break;
                    }

                    if (!node) return null;

                    return (
                      <div key={secId} className={cellClass}>
                        {node}
                      </div>
                    );
                  })}
                </div>
              </SectionContainer>
            );
          }

          return renderSingleSection(block.section, index);
        })}
      </main>
    </div>
  );
}
