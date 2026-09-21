import { getTicketByCode } from "@/lib/track";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle,
  Circle,
  Clock,
  Phone,
  MapPin,
  MessageCircle,
  ArrowLeft,
  Wrench,
  Scissors,
  Cpu,
  Wind,
  FileText,
  Package,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ code: string }>;
}

const STATUS_STEPS = [
  "RECEIVED",
  "INSPECTING",
  "IN_PROGRESS",
  "QUALITY_CHECK",
  "READY",
  "DELIVERED",
] as const;

type TicketStatus =
  | "RECEIVED"
  | "INSPECTING"
  | "IN_PROGRESS"
  | "QUALITY_CHECK"
  | "READY"
  | "DELIVERED"
  | "CANCELLED";

const STATUS_LABELS: Record<TicketStatus, string> = {
  RECEIVED: "Item Received",
  INSPECTING: "Under Inspection",
  IN_PROGRESS: "Work in Progress",
  QUALITY_CHECK: "Quality Check",
  READY: "Ready for Pickup",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

const STATUS_DESCS: Record<TicketStatus, string> = {
  RECEIVED: "We have received your item and will begin inspection shortly.",
  INSPECTING: "Our team is currently inspecting your item.",
  IN_PROGRESS: "Work is actively in progress on your item.",
  QUALITY_CHECK: "Your item is undergoing final quality inspection.",
  READY: "Your item is ready! Please come to collect it.",
  DELIVERED: "Your item has been delivered. Thank you!",
  CANCELLED: "This service ticket has been cancelled.",
};

const SERVICE_TYPE_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  GARAGE: { icon: Wrench, label: "Auto Service", color: "bg-blue-500" },
  TAILOR: { icon: Scissors, label: "Tailoring", color: "bg-purple-500" },
  ELECTRONICS_REPAIR: { icon: Cpu, label: "Electronics Repair", color: "bg-indigo-500" },
  DRY_CLEAN: { icon: Wind, label: "Dry Cleaning", color: "bg-teal-500" },
  OTHER: { icon: FileText, label: "Service", color: "bg-gray-500" },
};

function formatCurrencyAmount(amount: unknown, currency: string): string {
  if (amount == null) return "—";
  const num = Number(amount.toString());
  if (isNaN(num)) return "—";
  return `${currency} ${num.toLocaleString()}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStepIndex(status: string): number {
  return STATUS_STEPS.indexOf(status as (typeof STATUS_STEPS)[number]);
}

export default async function PublicTrackPage({ params }: PageProps) {
  const { code } = await params;
  const ticket = await getTicketByCode(code.toUpperCase());

  if (!ticket) {
    notFound();
  }

  const currentIdx = getStepIndex(ticket.status);
  const isCancelled = ticket.status === "CANCELLED";
  const isDelivered = ticket.status === "DELIVERED";
  const isReady = ticket.status === "READY";

  const serviceConfig = SERVICE_TYPE_CONFIG[ticket.serviceType] ?? SERVICE_TYPE_CONFIG.OTHER;
  const ServiceIcon = serviceConfig.icon;

  const whatsappMessage = encodeURIComponent(
    `Hello! I'm checking on my service ticket *${ticket.ticketCode}*.\nItem: ${ticket.itemDescription}\nStatus: ${STATUS_LABELS[ticket.status as TicketStatus]}`
  );
  const whatsappLink = ticket.restaurant.phone
    ? `https://wa.me/${ticket.restaurant.phone.replace(/\D/g, "")}?text=${whatsappMessage}`
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 text-white">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm bg-white/5">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between max-w-2xl">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl ${serviceConfig.color} flex items-center justify-center shadow-lg`}>
              <ServiceIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-sm leading-tight">{ticket.restaurant.name}</div>
              <div className="text-xs text-white/50">QEVYRA Track</div>
            </div>
          </div>
          <Link
            href={`/w/${ticket.restaurant.slug}`}
            className="text-xs text-white/50 hover:text-white/80 flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Shop
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        {/* Ticket hero */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${serviceConfig.color}/20 border border-white/20 text-white/80`}>
                  {serviceConfig.label}
                </span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">{ticket.ticketCode}</h1>
              <p className="text-sm text-white/60 mt-1">{ticket.itemDescription}</p>
            </div>
            {/* Status badge */}
            <div
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border ${
                isCancelled
                  ? "bg-red-500/20 border-red-500/40 text-red-300"
                  : isReady || isDelivered
                  ? "bg-green-500/20 border-green-500/40 text-green-300"
                  : "bg-orange-500/20 border-orange-500/40 text-orange-300"
              }`}
            >
              {STATUS_LABELS[ticket.status as TicketStatus]}
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-white/60">
            <span className="flex items-center gap-1.5">
              <Package className="w-4 h-4" />
              {ticket.customerName}
            </span>
            {ticket.customerPhone && (
              <span className="flex items-center gap-1.5">
                <Phone className="w-4 h-4" />
                {ticket.customerPhone}
              </span>
            )}
          </div>
        </div>

        {/* Progress stepper */}
        {!isCancelled && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-5">Service Progress</h2>
            <div className="space-y-1">
              {STATUS_STEPS.filter(s => s !== "DELIVERED").map((step, idx) => {
                const stepIdx = STATUS_STEPS.indexOf(step);
                const isDone = currentIdx > stepIdx;
                const isActive = currentIdx === stepIdx;
                const isPending = currentIdx < stepIdx;
                return (
                  <div key={step} className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${
                          isDone
                            ? "bg-green-500 border-green-500 text-white"
                            : isActive
                            ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/30 animate-pulse"
                            : "bg-white/5 border-white/20 text-white/30"
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : isActive ? (
                          <Clock className="w-4 h-4" />
                        ) : (
                          <Circle className="w-4 h-4" />
                        )}
                      </div>
                      {idx < STATUS_STEPS.filter(s => s !== "DELIVERED").length - 1 && (
                        <div
                          className={`w-0.5 h-8 mt-1 ${
                            isDone ? "bg-green-500/50" : "bg-white/10"
                          }`}
                        />
                      )}
                    </div>
                    <div className="pt-1 pb-8">
                      <p
                        className={`text-sm font-semibold ${
                          isDone ? "text-green-400" : isActive ? "text-orange-300" : "text-white/40"
                        }`}
                      >
                        {STATUS_LABELS[step as TicketStatus]}
                      </p>
                      {isActive && (
                        <p className="text-xs text-white/50 mt-0.5">{STATUS_DESCS[step as TicketStatus]}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Ready / Delivered special banner */}
            {(isReady || isDelivered) && (
              <div className="mt-4 bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
                <p className="text-green-400 font-bold text-lg">
                  {isReady ? "✅ Ready for Pickup!" : "🎉 Delivered!"}
                </p>
                <p className="text-white/60 text-sm mt-1">
                  {isReady
                    ? "Please visit the shop to collect your item."
                    : "Thank you for choosing us. See you next time!"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Cancelled state */}
        {isCancelled && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">
            <p className="text-red-400 font-bold text-lg">❌ Ticket Cancelled</p>
            <p className="text-white/50 text-sm mt-1">
              This service ticket has been cancelled. Please contact the shop for more information.
            </p>
          </div>
        )}

        {/* Pricing */}
        {(ticket.estimatedPrice || ticket.finalPrice) && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-4">Service Cost</h2>
            <div className="space-y-3">
              {ticket.estimatedPrice && !ticket.finalPrice && (
                <div className="flex items-center justify-between">
                  <span className="text-white/60 text-sm">Estimated Price</span>
                  <span className="text-white font-semibold">
                    {formatCurrencyAmount(ticket.estimatedPrice, ticket.currency)}
                  </span>
                </div>
              )}
              {ticket.finalPrice && (
                <div className="flex items-center justify-between">
                  <span className="text-white/60 text-sm">Final Price</span>
                  <span className="text-green-400 font-bold text-lg">
                    {formatCurrencyAmount(ticket.finalPrice, ticket.currency)}
                  </span>
                </div>
              )}
              {ticket.priceNote && (
                <p className="text-xs text-white/40 italic border-t border-white/10 pt-2">{ticket.priceNote}</p>
              )}
            </div>
          </div>
        )}

        {/* Activity timeline */}
        {ticket.events.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-4">Activity Timeline</h2>
            <div className="space-y-3">
              {ticket.events.map((event) => (
                <div key={event.id} className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-sm text-white/80 font-medium">
                      {STATUS_LABELS[event.toStatus as TicketStatus]}
                    </p>
                    {event.actorNote && (
                      <p className="text-xs text-white/50 mt-0.5">{event.actorNote}</p>
                    )}
                    <p className="text-xs text-white/30 mt-0.5">{formatDate(event.createdAt.toString())}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact shop */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-4">Contact Shop</h2>
          <div className="space-y-2 mb-4 text-sm text-white/70">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-white/40" />
              <span className="font-semibold text-white">{ticket.restaurant.name}</span>
            </div>
            {ticket.restaurant.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-white/40" />
                <span>{ticket.restaurant.phone}</span>
              </div>
            )}
            {ticket.restaurant.address && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-white/40" />
                <span>{ticket.restaurant.address}</span>
              </div>
            )}
          </div>
          {whatsappLink && (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold transition-colors text-sm"
            >
              <MessageCircle className="w-4 h-4" />
              Chat on WhatsApp
            </a>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-white/30 pb-4">
          Powered by{" "}
          <Link href="/" className="text-orange-400 hover:text-orange-300 font-semibold">
            QEVYRA
          </Link>
        </p>
      </main>
    </div>
  );
}
