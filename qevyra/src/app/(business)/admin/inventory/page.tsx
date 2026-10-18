import { requireRestaurantAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { t } from "@/lib/i18n";
import { getInventoryItems } from "@/modules/inventory/services";
import InventoryClient from "./InventoryClient";

export const metadata = { title: "Inventory – QEVYRA Admin" };
export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const user = await requireRestaurantAdmin();

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: user.restaurantId! },
    select: { language: true, businessId: true },
  });
  const lang = restaurant?.language ?? "EN";
  const businessId = user.businessId ?? restaurant?.businessId ?? null;

  if (!businessId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">{t(lang, "Inventory", "स्टक")}</h1>
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
          <p className="text-sm text-gray-500">
            {t(lang, "Inventory is not available for this business.", "यो व्यवसायका लागि स्टक उपलब्ध छैन।")}
          </p>
        </div>
      </div>
    );
  }

  const items = await getInventoryItems(businessId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t(lang, "Inventory", "स्टक")}</h1>
        <p className="text-gray-500 text-sm mt-1">
          {t(lang, "Track stock, record usage and spoilage, and see what needs reordering", "स्टक ट्र्याक गर्नुहोस्, खपत र बिग्रेको रेकर्ड गर्नुहोस्, र पुनः अर्डर गर्नुपर्ने हेर्नुहोस्")}
        </p>
      </div>

      <InventoryClient
        initialItems={JSON.parse(JSON.stringify(items))}
        language={lang}
      />
    </div>
  );
}
