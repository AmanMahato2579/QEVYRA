import Link from "next/link";
import type { SiteData } from "../types";
import { SectionContainer } from "../SectionContainer";

export function FooterSection({ site }: { site: SiteData }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-gray-100 bg-white py-8 mt-6">
      <SectionContainer
        as="div"
        className="flex flex-col md:flex-row items-center justify-between text-center md:text-left gap-3"
      >
        <p className="text-xs text-gray-500 font-medium">
          © {currentYear} {site.name}. All rights reserved.
        </p>

        <div className="flex items-center gap-2 text-[11px] text-gray-400">
          <span>Powered by</span>
          <Link
            href="/"
            className="font-bold tracking-wider text-gray-700 hover:text-black transition-colors"
          >
            QEVYRA
          </Link>
        </div>
      </SectionContainer>
    </footer>
  );
}
