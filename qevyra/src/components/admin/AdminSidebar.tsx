"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { visibleBusinessNav, type ModuleFlags } from "@/lib/navigation";
import type { AdminUser } from "@/types";
import {
  LayoutDashboard,
  ClipboardList,
  UtensilsCrossed,
  QrCode,
  Settings,
  LogOut,
  ChefHat,
  Bell,
  HandPlatter,
  CalendarCheck,
  Globe,
  Boxes,
} from "lucide-react";
import InstallPWA from "./InstallPWA";

interface AdminSidebarProps {
  user: AdminUser;
  /** Whether the drawer is open on mobile. Ignored at md+ where the sidebar is always visible. */
  open?: boolean;
  /** Called when a nav link is clicked, so the mobile drawer can close itself. */
  onNavigate?: () => void;
  language?: string;
  bookingsEnabled?: boolean;
  /** Product-aware gating: hide features the business hasn't purchased. Purely cosmetic for navigation only. */
  hasMenu?: boolean;
  hasOrder?: boolean;
  hasWebsite?: boolean;
}

type NavIcon = React.ComponentType<{ className?: string }>;

// Presentation map for the shared business nav catalog (navigation.ts):
// catalog decides WHAT is visible, this only supplies icon + bilingual label.
const MENU_NAV: Record<string, { icon: NavIcon; label: [string, string] }> = {
  dashboard: { icon: LayoutDashboard, label: ["Dashboard", "ड्यासबोर्ड"] },
  "take-order": { icon: HandPlatter, label: ["Take Order", "अर्डर लिनुहोस्"] },
  orders: { icon: ClipboardList, label: ["Orders", "अर्डरहरू"] },
  menu: { icon: UtensilsCrossed, label: ["Menu", "मेनु"] },
  website: { icon: Globe, label: ["Website", "वेबसाइट"] },
  tables: { icon: QrCode, label: ["Tables", "टेबलहरू"] },
  bookings: { icon: CalendarCheck, label: ["Bookings", "बुकिङहरू"] },
  inventory: { icon: Boxes, label: ["Inventory", "इन्भेन्टरी"] },
  notifications: { icon: Bell, label: ["Notifications", "सूचनाहरू"] },
  settings: { icon: Settings, label: ["Settings", "सेटिङहरू"] },
};

export default function AdminSidebar({
  user,
  open = false,
  onNavigate,
  language = "EN",
  bookingsEnabled = false,
  hasMenu = true,
  hasOrder = true,
  hasWebsite = true,
}: AdminSidebarProps) {
  const pathname = usePathname();

  const modules: ModuleFlags = { menu: hasMenu, order: hasOrder, website: hasWebsite, track: false };
  const visibleNav = visibleBusinessNav({
    kind: "menu",
    role: user.staffRole ?? user.role,
    modules,
    bookingsEnabled,
  }).flatMap((item) => {
    const meta = MENU_NAV[item.key];
    return meta
      ? [{ href: item.href, label: t(language, meta.label[0], meta.label[1]), icon: meta.icon, exact: item.exact }]
      : [];
  });

  return (
    <aside
      className={cn(
        "admin-sidebar w-72 sm:w-64 flex flex-col shrink-0 text-white",
        "fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-in-out",
        "md:static md:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shrink-0">
            <ChefHat className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-sm leading-tight">QEVYRA</div>
            <div className="text-xs text-white/50 leading-tight">{t(language, "Business Admin", "बिजनेस एडमिन")}</div>
          </div>
        </div>
      </div>

      {user.restaurantName && (
        <div className="px-6 py-3 border-b border-white/10">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-1">{t(language, "Business", "बिजनेस")}</p>
          <p className="text-sm font-medium text-white/80 truncate">{user.restaurantName}</p>
        </div>
      )}

      <nav className="flex-1 p-4 space-y-1">
        {visibleNav.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                isActive
                  ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <InstallPWA language={language} />

      <div className="p-4 border-t border-white/10">
        <div className="px-3 py-2 mb-2">
          <p className="text-xs font-medium text-white/70 truncate">{user.name}</p>
          <p className="text-xs text-white/40 truncate">{user.email}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-red-500/20 transition-all"
        >
          <LogOut className="w-5 h-5" />
          {t(language, "Logout", "लगआउट")}
        </button>
      </div>
    </aside>
  );
}
