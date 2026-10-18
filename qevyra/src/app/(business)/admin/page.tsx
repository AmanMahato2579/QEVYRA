import { requireRestaurantAdmin } from "@/lib/auth-guard";
import { getDashboardStats, getRestaurantById } from "@/lib/db";
import { getLowStockItems } from "@/modules/inventory/services";
import { formatCurrency } from "@/lib/utils";
import { t } from "@/lib/i18n";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, CalendarDays, Armchair, LayoutGrid, Clock, ChefHat, TriangleAlert, PackageCheck } from "lucide-react";

export const metadata = { title: "Dashboard – QEVYRA Admin" };

export default async function AdminDashboard() {
  const user = await requireRestaurantAdmin();
  const [stats, restaurant] = await Promise.all([
    getDashboardStats(user.restaurantId!),
    getRestaurantById(user.restaurantId!),
  ]);

  const plan = restaurant?.business?.plan ?? "STAR";
  const lang = restaurant?.language ?? "EN";
  const businessId = user.businessId ?? restaurant?.business?.id ?? null;
  const lowStockItems = businessId ? await getLowStockItems(businessId) : [];
  const planColor =
    plan === "SILVER" ? "bg-gray-50 text-gray-600 border-gray-300"
    : plan === "BRONZE" ? "bg-orange-50 text-orange-700 border-orange-200"
    : "bg-purple-50 text-purple-700 border-purple-200";

  const statCards = [
    { label: t(lang, "Revenue Today", "आजको कमाइ"), value: formatCurrency(Number(stats.todaySales)), icon: Wallet, color: "text-green-600", bg: "bg-green-50" },
    { label: t(lang, "Customer Sessions", "ग्राहक सेसनहरू"), value: stats.todaySessions, icon: CalendarDays, color: "text-blue-600", bg: "bg-blue-50" },
    { label: t(lang, "Active Tables", "चालू टेबलहरू"), value: stats.activeTables, icon: Armchair, color: "text-orange-600", bg: "bg-orange-50" },
    { label: t(lang, "Total Tables", "जम्मा टेबलहरू"), value: stats.totalTables, icon: LayoutGrid, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t(lang, "Dashboard", "ड्यासबोर्ड")}</h1>
          <p className="text-gray-500 text-sm mt-1">{t(lang, "Overview of your business today", "आज तपाईंको बिजनेसको अवलोकन")}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold border ${planColor}`}>
          {plan}
          <span className="text-xs font-normal opacity-70">{t(lang, "Plan", "योजना")}</span>
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">{label}</p>
                  <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <Card className="border-orange-100 bg-gradient-to-br from-orange-50 to-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-orange-700 flex items-center gap-2">
              <Clock className="w-4 h-4" /> {t(lang, "Pending Orders", "पेन्डिङ अर्डरहरू")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-extrabold text-orange-600">{stats.pendingCount}</p>
            <p className="text-sm text-orange-500 mt-1">{t(lang, "orders waiting for your reply", "तपाईंको जवाफ पर्खिरहेका अर्डरहरू")}</p>
            <Link href="/admin/orders" className="inline-block mt-3 text-sm font-medium text-orange-600 hover:underline">
              {t(lang, "Review & Accept →", "हेर्नुहोस् र स्वीकार गर्नुहोस् →")}
            </Link>
          </CardContent>
        </Card>

        <Card className="border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-blue-700 flex items-center gap-2">
              <ChefHat className="w-4 h-4" /> {t(lang, "In Kitchen", "किचनमा")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-extrabold text-blue-600">{stats.preparingItems}</p>
            <p className="text-sm text-blue-500 mt-1">{t(lang, "items cooking right now", "अहिले पाकिरहेका परिकारहरू")}</p>
            <Link href="/admin/service" className="inline-block mt-3 text-sm font-medium text-blue-600 hover:underline">
              {t(lang, "Open Service Desk →", "सेवा डेस्क खोल्नुहोस् →")}
            </Link>
          </CardContent>
        </Card>

        {businessId && (
          lowStockItems.length > 0 ? (
            <Card className="border-red-200 bg-gradient-to-br from-red-50 to-amber-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-red-700 flex items-center gap-2">
                  <TriangleAlert className="w-4 h-4" /> {t(lang, "Low Stock", "कम स्टक")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-extrabold text-red-600">{lowStockItems.length}</p>
                <p className="text-sm text-red-500 mt-1">
                  {t(lang, "items at or below reorder level", "पुनः अर्डर गर्नुपर्ने तहमा वा त्योभन्दा कम भएका वस्तुहरू")}
                </p>
                <ul className="mt-2 space-y-0.5">
                  {lowStockItems.slice(0, 3).map((item) => (
                    <li key={item.id} className="text-xs text-red-600/80 truncate">
                      • {item.name} — {Number(item.currentStock)} {item.unit}
                    </li>
                  ))}
                  {lowStockItems.length > 3 && (
                    <li className="text-xs text-red-400">
                      +{lowStockItems.length - 3} …
                    </li>
                  )}
                </ul>
                <Link href="/admin/inventory" className="inline-block mt-3 text-sm font-medium text-red-600 hover:underline">
                  {t(lang, "Open Inventory →", "इन्भेन्टरी खोल्नुहोस् →")}
                </Link>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 to-green-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-emerald-700 flex items-center gap-2">
                  <PackageCheck className="w-4 h-4" /> {t(lang, "Stock Levels", "स्टक तह")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-extrabold text-emerald-600">✓</p>
                <p className="text-sm text-emerald-500 mt-1">{t(lang, "all inventory items are above reorder level", "सबै इन्भेन्टरी वस्तुहरू पुनः अर्डर तह माथि छन्")}</p>
                <Link href="/admin/inventory" className="inline-block mt-3 text-sm font-medium text-emerald-600 hover:underline">
                  {t(lang, "Open Inventory →", "इन्भेन्टरी खोल्नुहोस् →")}
                </Link>
              </CardContent>
            </Card>
          )
        )}
      </div>
    </div>
  );
}