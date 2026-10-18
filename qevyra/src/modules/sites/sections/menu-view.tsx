import { Utensils, Phone } from "lucide-react";
import { sanitizePhoneDigits } from "../types";
import type { SiteData } from "../types";
import { SectionContainer } from "../SectionContainer";

export function MenuViewSection({ site }: { site: SiteData }) {
  const cleanPhone = site.phone ? sanitizePhoneDigits(site.phone) : null;

  if (!site.items || site.items.length === 0) {
    return (
      <SectionContainer className="py-8 text-center">
        <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm max-w-md mx-auto">
          <Utensils className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Menu is being updated.</p>
        </div>
      </SectionContainer>
    );
  }

  const categories = Array.from(
    new Set(site.items.map((i) => i.category || "Menu"))
  );

  return (
    <SectionContainer className="py-6">
      {/* Call to Book / Order Notice Banner */}
      <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div>
          <h2 className="text-sm font-bold text-amber-900">
            Digital Menu (View Only)
          </h2>
          <p className="text-xs text-amber-700 mt-0.5">
            Table reservation & takeaway available by phone
          </p>
        </div>
        {cleanPhone && (
          <a
            href={`tel:${cleanPhone}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white font-semibold text-xs shadow-sm hover:opacity-95 transition-opacity shrink-0"
            style={{ backgroundColor: "var(--site-primary, #2563eb)" }}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Book by calling</span>
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {categories.map((category) => {
          const categoryItems = site.items.filter(
            (i) => (i.category || "Menu") === category
          );

          return (
            <div key={category} className="flex flex-col gap-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">
                {category}
              </h3>

              <div className="grid grid-cols-1 gap-3">
                {categoryItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl p-4 border border-gray-100 shadow-xs flex items-center justify-between gap-3 hover:border-gray-200 transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {item.imageUrl && (
                        <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-gray-50 border border-gray-100 aspect-square">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm text-gray-900 truncate">
                          {item.name}
                        </h4>
                        {item.description && (
                          <p className="text-xs text-gray-500 line-clamp-2 mt-0.5 max-w-prose">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {item.priceText && (
                      <div className="text-right shrink-0">
                        <span
                          className="font-bold text-sm text-gray-900 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-100 whitespace-nowrap inline-block"
                          style={{ color: "var(--site-primary, #2563eb)" }}
                        >
                          {item.priceText}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </SectionContainer>
  );
}
