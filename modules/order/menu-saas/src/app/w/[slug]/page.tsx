import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Phone,
  MapPin,
  Clock,
  MessageCircle,
  ExternalLink,
  Utensils,
  Wrench,
  Search,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ticket?: string }>;
}

type BusinessType = "restaurant" | "track" | "showcase";

function formatOpeningHours(hours: string | null): string {
  if (!hours) return "Contact shop for hours";
  return hours;
}

// Map track service type to display info
const SERVICE_TYPE_LABEL: Record<string, string> = {
  GARAGE: "Auto Garage",
  TAILOR: "Tailoring",
  ELECTRONICS_REPAIR: "Electronics Repair",
  DRY_CLEAN: "Dry Cleaning",
  OTHER: "Service Shop",
};

export default async function UniversalBusinessWebsite({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { ticket: prefilledCode } = await searchParams;

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug, isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      logoUrl: true,
      address: true,
      phone: true,
      openingHours: true,
      brandColor: true,
      currency: true,
      language: true,
      plan: true,
      bookingsEnabled: true,
      // Track: check if they have active track tickets (service business indicator)
      _count: {
        select: { trackTickets: true },
      },
    },
  });

  if (!restaurant) {
    notFound();
  }

  // Determine business type from presence of track tickets
  const hasTrackActivity = restaurant._count.trackTickets > 0;
  const businessType: BusinessType = hasTrackActivity ? "track" : "restaurant";

  const brandColors: Record<string, { primary: string; light: string; gradient: string }> = {
    orange: { primary: "bg-orange-500", light: "bg-orange-500/10", gradient: "from-orange-500 to-orange-600" },
    blue: { primary: "bg-blue-500", light: "bg-blue-500/10", gradient: "from-blue-500 to-blue-600" },
    green: { primary: "bg-green-500", light: "bg-green-500/10", gradient: "from-green-500 to-green-600" },
    purple: { primary: "bg-purple-500", light: "bg-purple-500/10", gradient: "from-purple-500 to-purple-600" },
    red: { primary: "bg-red-500", light: "bg-red-500/10", gradient: "from-red-500 to-red-600" },
    teal: { primary: "bg-teal-500", light: "bg-teal-500/10", gradient: "from-teal-500 to-teal-600" },
  };
  const colors = brandColors[restaurant.brandColor ?? "orange"] ?? brandColors.orange;

  const whatsappLink = restaurant.phone
    ? `https://wa.me/${restaurant.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hello ${restaurant.name}!`)}`
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 text-white">
      {/* Hero Header */}
      <div className={`bg-gradient-to-br ${colors.gradient} relative overflow-hidden`}>
        {/* Decorative circles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 rounded-full bg-black/10" />
        </div>
        <div className="relative container mx-auto px-4 py-12 max-w-2xl">
          {/* Logo */}
          {restaurant.logoUrl ? (
            <img
              src={restaurant.logoUrl}
              alt={restaurant.name}
              className="w-20 h-20 rounded-2xl object-cover shadow-xl mb-4 border-2 border-white/20"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 border-2 border-white/30 shadow-xl">
              {businessType === "track" ? (
                <Wrench className="w-10 h-10 text-white" />
              ) : (
                <Utensils className="w-10 h-10 text-white" />
              )}
            </div>
          )}
          <h1 className="text-3xl font-extrabold text-white mb-2 drop-shadow-sm">{restaurant.name}</h1>
          {restaurant.description && (
            <p className="text-white/80 text-base leading-relaxed max-w-md">{restaurant.description}</p>
          )}
          {/* Quick info pills */}
          <div className="flex flex-wrap gap-2 mt-4">
            {restaurant.address && (
              <span className="inline-flex items-center gap-1.5 bg-black/20 border border-white/20 rounded-full px-3 py-1 text-xs text-white/80">
                <MapPin className="w-3.5 h-3.5" />
                {restaurant.address}
              </span>
            )}
            {restaurant.phone && (
              <span className="inline-flex items-center gap-1.5 bg-black/20 border border-white/20 rounded-full px-3 py-1 text-xs text-white/80">
                <Phone className="w-3.5 h-3.5" />
                {restaurant.phone}
              </span>
            )}
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 max-w-2xl space-y-4">
        {/* Primary CTA Section — switches based on business type */}
        {businessType === "track" ? (
          /* TRACK CTA — Service shop: ticket lookup */
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 ${colors.primary} rounded-xl flex items-center justify-center`}>
                <Search className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-white text-lg">Track Your Service</h2>
                <p className="text-white/50 text-xs">Enter your ticket code to check status</p>
              </div>
            </div>
            <TrackLookupForm prefilledCode={prefilledCode} primaryColor={colors.primary} />
          </div>
        ) : (
          /* ORDER CTA — Restaurant: see menu */
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 ${colors.primary} rounded-xl flex items-center justify-center`}>
                <Utensils className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-white text-lg">View Our Menu</h2>
                <p className="text-white/50 text-xs">Browse our menu and place your order</p>
              </div>
            </div>
            <p className="text-white/60 text-sm mb-4">
              Scan a QR code at any table, or ask a team member for the table link.
            </p>
            <div className="bg-white/5 border border-dashed border-white/20 rounded-xl p-4 text-center">
              <p className="text-white/40 text-sm">📱 Scan the QR code at your table to start ordering</p>
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          {whatsappLink && (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold transition-colors text-sm"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </a>
          )}
          {restaurant.phone && (
            <a
              href={`tel:${restaurant.phone}`}
              className="flex items-center justify-center gap-2 py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-colors border border-white/10 text-sm"
            >
              <Phone className="w-4 h-4" />
              Call Us
            </a>
          )}
        </div>

        {/* Info cards */}
        <div className="space-y-3">
          {restaurant.openingHours && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-start gap-3">
              <Clock className="w-5 h-5 text-white/40 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1">Opening Hours</p>
                <p className="text-white/80 text-sm whitespace-pre-line">{formatOpeningHours(restaurant.openingHours)}</p>
              </div>
            </div>
          )}
          {restaurant.address && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-start gap-3">
              <MapPin className="w-5 h-5 text-white/40 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1">Address</p>
                <p className="text-white/80 text-sm">{restaurant.address}</p>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(restaurant.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 mt-1 transition-colors"
                >
                  Open in Maps <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* QEVYRA branding footer */}
        <div className="text-center pt-2 pb-6">
          <p className="text-xs text-white/20">
            Powered by{" "}
            <Link href="/" className="text-orange-400/60 hover:text-orange-400 font-semibold transition-colors">
              QEVYRA
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

// Inline client component for the ticket search form
function TrackLookupForm({
  prefilledCode,
  primaryColor,
}: {
  prefilledCode?: string;
  primaryColor: string;
}) {
  return (
    <form action="/track" method="GET" className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          name="code"
          defaultValue={prefilledCode ?? ""}
          placeholder="e.g. GAR-4821"
          className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-white/30 uppercase"
          autoCapitalize="characters"
        />
        <button
          type="submit"
          className={`${primaryColor} hover:opacity-90 text-white px-5 py-3 rounded-xl font-bold transition-opacity flex items-center gap-2 text-sm`}
        >
          <Search className="w-4 h-4" />
          Track
        </button>
      </div>
      <p className="text-xs text-white/30 text-center">
        Your ticket code was shared when you dropped off your item
      </p>
    </form>
  );
}
