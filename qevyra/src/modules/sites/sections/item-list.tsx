import { ShoppingBag } from "lucide-react";
import type { SiteData } from "../types";
import { SectionContainer } from "../SectionContainer";

export function ItemListSection({ site }: { site: SiteData }) {
  if (!site.items || site.items.length === 0) {
    return (
      <SectionContainer className="py-8 text-center">
        <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm max-w-md mx-auto">
          <ShoppingBag className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No items available right now.</p>
        </div>
      </SectionContainer>
    );
  }

  // Group items by category if available, otherwise flat
  const categories = Array.from(
    new Set(site.items.map((i) => i.category || "General Items"))
  );

  return (
    <SectionContainer className="py-6">
      <div className="flex items-center gap-2 mb-5">
        <ShoppingBag
          className="w-5 h-5"
          style={{ color: "var(--site-primary, #2563eb)" }}
        />
        <h2 className="text-lg font-bold text-gray-900">Available Items</h2>
      </div>

      <div className="flex flex-col gap-6">
        {categories.map((category) => {
          const categoryItems = site.items.filter(
            (i) => (i.category || "General Items") === category
          );

          return (
            <div key={category} className="flex flex-col gap-3">
              {categories.length > 1 && (
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">
                  {category}
                </h3>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {categoryItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl p-4 border border-gray-100 shadow-xs flex items-center justify-between gap-3 hover:border-gray-200 transition-colors h-full"
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
