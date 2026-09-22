"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { LayoutDashboard, ClipboardList, Workflow, Globe, LogOut, Menu as MenuIcon, X, Truck } from "lucide-react";

interface TrackAdminShellProps {
  userName: string;
  userEmail: string;
  businessName: string;
  businessType: string;
  children: React.ReactNode;
}

export default function TrackAdminShell({
  userName,
  userEmail,
  businessName,
  businessType,
  children,
}: TrackAdminShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { href: "/track-admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { href: "/track-admin/tickets", label: "Tickets", icon: ClipboardList },
    { href: "/track-admin/workflows", label: "Workflows", icon: Workflow },
    { href: "/track-admin/website", label: "Website", icon: Globe },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-gray-950/60 md:hidden" onClick={() => setMobileOpen(false)} aria-hidden="true" />
      )}

      <aside
        className={cn(
          "w-72 sm:w-64 flex flex-col shrink-0 text-white bg-gray-950",
          "fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-in-out",
          "md:static md:translate-x-0 overflow-y-auto",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center shadow-lg shrink-0">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-sm leading-tight">QEVYRA Track</div>
              <div className="text-xs text-white/50 leading-tight">Service admin</div>
            </div>
          </div>
        </div>

        <div className="px-6 py-3 border-b border-white/10">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-1">{businessType.replace(/_/g, " ")}</p>
          <p className="text-sm font-medium text-white/90 truncate">{businessName}</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const isActive = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="px-3 py-2 mb-2">
            <p className="text-xs font-medium text-white/70 truncate">{userName}</p>
            <p className="text-xs text-white/40 truncate">{userEmail}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-red-500/20 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-gray-200 bg-white sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden p-2 -ml-2 text-gray-600"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
            </button>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate">{businessName}</p>
              <p className="text-xs text-gray-500 truncate">Ticket & service tracking</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}