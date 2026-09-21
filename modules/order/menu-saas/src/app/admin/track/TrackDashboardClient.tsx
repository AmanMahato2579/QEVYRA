"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import {
  Wrench,
  Scissors,
  Cpu,
  Wind,
  FileText,
  Plus,
  Pencil,
  Copy,
  Check,
  Loader2,
  Ticket,
  Clock,
  Phone,
  X,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TicketStatus =
  | "RECEIVED"
  | "INSPECTING"
  | "IN_PROGRESS"
  | "QUALITY_CHECK"
  | "READY"
  | "DELIVERED"
  | "CANCELLED";

type ServiceType =
  | "GARAGE"
  | "TAILOR"
  | "ELECTRONICS_REPAIR"
  | "DRY_CLEAN"
  | "OTHER";

interface TicketEvent {
  id: string;
  toStatus: TicketStatus;
  actorNote: string | null;
  createdAt: string;
}

interface TrackTicket {
  id: string;
  ticketCode: string;
  serviceType: ServiceType;
  customerName: string;
  customerPhone: string | null;
  itemDescription: string;
  estimatedPrice: string | null;
  finalPrice: string | null;
  priceNote: string | null;
  status: TicketStatus;
  currency: string;
  createdAt: string;
  events: TicketEvent[];
}

interface Restaurant {
  name: string;
  currency: string;
  slug: string;
  phone: string | null;
}

interface Props {
  tickets: TrackTicket[];
  restaurant: Restaurant | null;
}

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const STATUS_ORDER: TicketStatus[] = [
  "RECEIVED",
  "INSPECTING",
  "IN_PROGRESS",
  "QUALITY_CHECK",
  "READY",
  "DELIVERED",
];

function nextStatus(current: TicketStatus): TicketStatus | null {
  const idx = STATUS_ORDER.indexOf(current);
  return idx >= 0 && idx < STATUS_ORDER.length - 1
    ? STATUS_ORDER[idx + 1]
    : null;
}

const STATUS_META: Record<
  TicketStatus,
  { label: string; color: string; bg: string; dot: string }
> = {
  RECEIVED: {
    label: "Received",
    color: "text-blue-700",
    bg: "bg-blue-100",
    dot: "bg-blue-500",
  },
  INSPECTING: {
    label: "Inspecting",
    color: "text-purple-700",
    bg: "bg-purple-100",
    dot: "bg-purple-500",
  },
  IN_PROGRESS: {
    label: "In Progress",
    color: "text-orange-700",
    bg: "bg-orange-100",
    dot: "bg-orange-500",
  },
  QUALITY_CHECK: {
    label: "Quality Check",
    color: "text-yellow-700",
    bg: "bg-yellow-100",
    dot: "bg-yellow-400",
  },
  READY: {
    label: "Ready for Pickup",
    color: "text-green-700",
    bg: "bg-green-100",
    dot: "bg-green-500",
  },
  DELIVERED: {
    label: "Delivered",
    color: "text-gray-600",
    bg: "bg-gray-100",
    dot: "bg-gray-400",
  },
  CANCELLED: {
    label: "Cancelled",
    color: "text-red-700",
    bg: "bg-red-100",
    dot: "bg-red-400",
  },
};

const SERVICE_META: Record<
  ServiceType,
  { label: string; emoji: string; Icon: React.ElementType }
> = {
  GARAGE: { label: "Garage", emoji: "🔧", Icon: Wrench },
  TAILOR: { label: "Tailor", emoji: "🧵", Icon: Scissors },
  ELECTRONICS_REPAIR: { label: "Repair", emoji: "💻", Icon: Cpu },
  DRY_CLEAN: { label: "Dry Clean", emoji: "👗", Icon: Wind },
  OTHER: { label: "Other", emoji: "📋", Icon: FileText },
};

type FilterView = "ALL" | "RECEIVED" | "IN_PROGRESS" | "READY";

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatPrice(val: string | null, currency: string): string | null {
  if (!val) return null;
  const num = parseFloat(val);
  if (isNaN(num)) return null;
  return `${currency} ${num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Horizontal status stepper (RECEIVED → ... → READY) */
function StatusStepper({ status }: { status: TicketStatus }) {
  if (status === "CANCELLED") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
        <X className="w-3.5 h-3.5" /> Cancelled
      </span>
    );
  }

  const activeIdx = STATUS_ORDER.indexOf(status);
  const steps = STATUS_ORDER.slice(0, 6); // RECEIVED → DELIVERED

  return (
    <div className="flex items-center gap-0.5 w-full overflow-hidden">
      {steps.map((s, i) => {
        const isPast = i < activeIdx;
        const isActive = i === activeIdx;
        const meta = STATUS_META[s];
        return (
          <div key={s} className="flex items-center gap-0.5 flex-1 min-w-0">
            <div className="flex flex-col items-center gap-0.5 min-w-0">
              <div
                className={`w-3 h-3 rounded-full shrink-0 transition-all ${
                  isActive
                    ? `${meta.dot} ring-2 ring-offset-1 ring-orange-400 scale-125`
                    : isPast
                    ? "bg-orange-300"
                    : "bg-gray-200"
                }`}
              />
              <span
                className={`text-[9px] leading-tight font-medium text-center truncate w-full max-w-[44px] ${
                  isActive ? "text-gray-800 font-bold" : "text-gray-400"
                }`}
              >
                {meta.label.split(" ")[0]}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`h-0.5 flex-1 rounded-full mb-3 ${
                  i < activeIdx ? "bg-orange-300" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Copy-to-clipboard button */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
      title="Copy tracking link"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-green-500" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function TrackDashboardClient({ tickets, restaurant }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [, startTransition] = useTransition();

  const [filterView, setFilterView] = useState<FilterView>("ALL");
  const [advancingId, setAdvancingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // New Ticket Modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [newForm, setNewForm] = useState({
    serviceType: "GARAGE" as ServiceType,
    customerName: "",
    customerPhone: "",
    itemDescription: "",
    internalNote: "",
    estimatedPrice: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Price Edit Modal
  const [priceTicket, setPriceTicket] = useState<TrackTicket | null>(null);
  const [priceForm, setPriceForm] = useState({
    estimatedPrice: "",
    finalPrice: "",
    priceNote: "",
  });
  const [savingPrice, setSavingPrice] = useState(false);

  // Advance note modal
  const [advanceTarget, setAdvanceTarget] = useState<{
    ticket: TrackTicket;
    toStatus: TicketStatus;
  } | null>(null);
  const [advanceNote, setAdvanceNote] = useState("");
  const [advancingNote, setAdvancingNote] = useState(false);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      startTransition(() => router.refresh());
    }, 10000);
    return () => clearInterval(interval);
  }, [router]);

  // ---------------------------------------------------------------------------
  // Derived stats
  // ---------------------------------------------------------------------------

  const totalActive = tickets.length;
  const readyCount = tickets.filter((t) => t.status === "READY").length;
  const inProgressCount = tickets.filter(
    (t) => t.status === "IN_PROGRESS"
  ).length;
  const receivedCount = tickets.filter((t) => t.status === "RECEIVED").length;

  const visibleTickets = tickets.filter((t) => {
    if (filterView === "ALL") return true;
    return t.status === filterView;
  });

  // ---------------------------------------------------------------------------
  // API calls
  // ---------------------------------------------------------------------------

  async function handleAdvanceStatus() {
    if (!advanceTarget) return;
    setAdvancingNote(true);
    try {
      const res = await fetch(
        `/api/admin/track/tickets/${advanceTarget.ticket.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "status",
            newStatus: advanceTarget.toStatus,
            note: advanceNote.trim() || undefined,
          }),
        }
      );
      if (!res.ok) throw new Error("Failed");
      toast({
        title: "Status updated ✓",
        variant: "success",
        description: `Moved to ${STATUS_META[advanceTarget.toStatus].label}`,
      });
      setAdvanceTarget(null);
      setAdvanceNote("");
      startTransition(() => router.refresh());
    } catch {
      toast({
        title: "Error",
        variant: "destructive",
        description: "Could not update status.",
      });
    } finally {
      setAdvancingNote(false);
    }
  }

  async function handleCancel(ticket: TrackTicket) {
    if (!window.confirm(`Cancel ticket ${ticket.ticketCode}?`)) return;
    setCancellingId(ticket.id);
    try {
      const res = await fetch(`/api/admin/track/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status", newStatus: "CANCELLED" }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Ticket cancelled", variant: "destructive" });
      startTransition(() => router.refresh());
    } catch {
      toast({
        title: "Error",
        variant: "destructive",
        description: "Could not cancel ticket.",
      });
    } finally {
      setCancellingId(null);
    }
  }

  async function handleCreateTicket(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/track/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceType: newForm.serviceType,
          customerName: newForm.customerName.trim(),
          customerPhone: newForm.customerPhone.trim() || undefined,
          itemDescription: newForm.itemDescription.trim(),
          internalNote: newForm.internalNote.trim() || undefined,
          estimatedPrice: newForm.estimatedPrice
            ? parseFloat(newForm.estimatedPrice)
            : undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      toast({
        title: "Ticket created ✓",
        variant: "success",
        description: `Ticket ${data.ticketCode ?? ""} created`,
      });
      setShowNewModal(false);
      setNewForm({
        serviceType: "GARAGE",
        customerName: "",
        customerPhone: "",
        itemDescription: "",
        internalNote: "",
        estimatedPrice: "",
      });
      startTransition(() => router.refresh());
    } catch {
      toast({
        title: "Error",
        variant: "destructive",
        description: "Could not create ticket.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSavePrice(e: React.FormEvent) {
    e.preventDefault();
    if (!priceTicket) return;
    setSavingPrice(true);
    try {
      const res = await fetch(`/api/admin/track/tickets/${priceTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "price",
          estimatedPrice: priceForm.estimatedPrice
            ? parseFloat(priceForm.estimatedPrice)
            : undefined,
          finalPrice: priceForm.finalPrice
            ? parseFloat(priceForm.finalPrice)
            : undefined,
          priceNote: priceForm.priceNote.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Price updated ✓", variant: "success" });
      setPriceTicket(null);
      startTransition(() => router.refresh());
    } catch {
      toast({
        title: "Error",
        variant: "destructive",
        description: "Could not update price.",
      });
    } finally {
      setSavingPrice(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const currency = restaurant?.currency ?? "NPR";
  const slug = restaurant?.slug ?? "";

  function openPriceModal(t: TrackTicket) {
    setPriceTicket(t);
    setPriceForm({
      estimatedPrice: t.estimatedPrice ?? "",
      finalPrice: t.finalPrice ?? "",
      priceNote: t.priceNote ?? "",
    });
  }

  // ---------------------------------------------------------------------------
  // JSX
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
            Service Tracker
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage service tickets and update customer status
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold shadow-sm transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          New Ticket
        </button>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Total Active"
          value={totalActive}
          icon={<Ticket className="w-5 h-5 text-orange-500" />}
          bg="bg-orange-50"
        />
        <StatCard
          label="Ready for Pickup"
          value={readyCount}
          icon={<Check className="w-5 h-5 text-green-500" />}
          bg="bg-green-50"
        />
        <StatCard
          label="In Progress"
          value={inProgressCount}
          icon={<Wrench className="w-5 h-5 text-blue-500" />}
          bg="bg-blue-50"
        />
        <StatCard
          label="New (Received)"
          value={receivedCount}
          icon={<Clock className="w-5 h-5 text-purple-500" />}
          bg="bg-purple-50"
        />
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex gap-2 flex-wrap">
        {(
          [
            { key: "ALL", label: "All Active" },
            { key: "RECEIVED", label: "Received" },
            { key: "IN_PROGRESS", label: "In Progress" },
            { key: "READY", label: "Ready" },
          ] as { key: FilterView; label: string }[]
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilterView(key)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
              filterView === key
                ? "bg-orange-500 text-white shadow-md"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {label}
            {key === "ALL" && totalActive > 0 && ` (${totalActive})`}
            {key !== "ALL" &&
              (() => {
                const c = tickets.filter((t) => t.status === key).length;
                return c > 0 ? ` (${c})` : "";
              })()}
          </button>
        ))}
      </div>

      {/* ── Ticket grid ── */}
      {visibleTickets.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
          <Ticket className="w-12 h-12 text-orange-300 mx-auto mb-3" />
          <p className="text-base font-semibold text-gray-500">
            No tickets match this filter
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
          {visibleTickets.map((ticket) => {
            const svcMeta = SERVICE_META[ticket.serviceType];
            const statusMeta = STATUS_META[ticket.status];
            const next = nextStatus(ticket.status);
            const trackingUrl =
              typeof window !== "undefined"
                ? `${window.location.origin}/track/${ticket.ticketCode}`
                : `/track/${ticket.ticketCode}`;

            return (
              <div
                key={ticket.id}
                className="rounded-2xl border-2 border-gray-100 bg-white p-4 space-y-3 hover:border-orange-200 transition-colors"
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg font-extrabold text-gray-900 tracking-tight">
                      {ticket.ticketCode}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${statusMeta.bg} ${statusMeta.color}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`}
                      />
                      {statusMeta.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <CopyButton text={trackingUrl} />
                    <a
                      href={`/track/${ticket.ticketCode}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Open tracking page"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* Service type badge */}
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
                    <span>{svcMeta.emoji}</span>
                    {svcMeta.label}
                  </span>
                  <span className="text-xs text-gray-400">
                    {relativeTime(ticket.createdAt)}
                  </span>
                </div>

                {/* Customer info */}
                <div className="flex items-center gap-3">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {ticket.customerName}
                  </p>
                  {ticket.customerPhone && (
                    <a
                      href={`tel:${ticket.customerPhone}`}
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <Phone className="w-3 h-3" />
                      {ticket.customerPhone}
                    </a>
                  )}
                </div>

                {/* Item description */}
                <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                  {ticket.itemDescription}
                </p>

                {/* Status stepper */}
                <div className="py-1">
                  <StatusStepper status={ticket.status} />
                </div>

                {/* Price section */}
                <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                  <div className="space-y-0.5">
                    {ticket.estimatedPrice && (
                      <p className="text-xs text-gray-500">
                        Est.{" "}
                        <span className="font-semibold text-gray-700">
                          {formatPrice(ticket.estimatedPrice, currency)}
                        </span>
                      </p>
                    )}
                    {ticket.finalPrice && (
                      <p className="text-xs">
                        Final{" "}
                        <span className="font-bold text-green-600">
                          {formatPrice(ticket.finalPrice, currency)}
                        </span>
                      </p>
                    )}
                    {!ticket.estimatedPrice && !ticket.finalPrice && (
                      <p className="text-xs text-gray-400 italic">
                        No price set
                      </p>
                    )}
                    {ticket.priceNote && (
                      <p className="text-[10px] text-gray-400 truncate max-w-[160px]">
                        {ticket.priceNote}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => openPriceModal(ticket)}
                    className="p-1.5 rounded-lg hover:bg-white hover:shadow-sm text-gray-400 hover:text-orange-500 transition-all"
                    title="Edit price"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 pt-1">
                  {next && next !== "DELIVERED" && (
                    <button
                      onClick={() =>
                        setAdvanceTarget({ ticket, toStatus: next })
                      }
                      disabled={
                        advancingId === ticket.id ||
                        cancellingId === ticket.id
                      }
                      className="flex-1 h-9 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all active:scale-95"
                    >
                      {advancingId === ticket.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                      {STATUS_META[next].label}
                    </button>
                  )}
                  {next === "DELIVERED" && (
                    <button
                      onClick={() =>
                        setAdvanceTarget({ ticket, toStatus: "DELIVERED" })
                      }
                      disabled={
                        advancingId === ticket.id ||
                        cancellingId === ticket.id
                      }
                      className="flex-1 h-9 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all active:scale-95"
                    >
                      {advancingId === ticket.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      Mark Delivered
                    </button>
                  )}
                  <button
                    onClick={() => handleCancel(ticket)}
                    disabled={
                      cancellingId === ticket.id || advancingId === ticket.id
                    }
                    className="h-9 px-3 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 text-xs font-semibold disabled:opacity-50 transition-all"
                  >
                    {cancellingId === ticket.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      "Cancel"
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Advance Status Modal ── */}
      {advanceTarget && (
        <Modal
          title={`Advance to "${STATUS_META[advanceTarget.toStatus].label}"?`}
          onClose={() => {
            setAdvanceTarget(null);
            setAdvanceNote("");
          }}
        >
          <p className="text-sm text-gray-600 mb-4">
            Ticket{" "}
            <span className="font-bold">{advanceTarget.ticket.ticketCode}</span>{" "}
            — {advanceTarget.ticket.customerName}
          </p>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Note (optional)
          </label>
          <textarea
            value={advanceNote}
            onChange={(e) => setAdvanceNote(e.target.value)}
            rows={2}
            placeholder="e.g. Inspection done, parts ordered…"
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleAdvanceStatus}
              disabled={advancingNote}
              className="flex-1 h-10 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
            >
              {advancingNote ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              Confirm
            </button>
            <button
              onClick={() => {
                setAdvanceTarget(null);
                setAdvanceNote("");
              }}
              className="h-10 px-4 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* ── New Ticket Modal ── */}
      {showNewModal && (
        <Modal title="New Service Ticket" onClose={() => setShowNewModal(false)}>
          <form onSubmit={handleCreateTicket} className="space-y-4">
            {/* Service Type */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Service Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(SERVICE_META) as ServiceType[]).map((st) => {
                  const m = SERVICE_META[st];
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() =>
                        setNewForm((f) => ({ ...f, serviceType: st }))
                      }
                      className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all ${
                        newForm.serviceType === st
                          ? "border-orange-400 bg-orange-50 text-orange-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      <span className="text-base">{m.emoji}</span>
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Customer Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={newForm.customerName}
                onChange={(e) =>
                  setNewForm((f) => ({ ...f, customerName: e.target.value }))
                }
                placeholder="e.g. Ram Bahadur"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            {/* Customer Phone */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Customer Phone
              </label>
              <input
                type="tel"
                value={newForm.customerPhone}
                onChange={(e) =>
                  setNewForm((f) => ({
                    ...f,
                    customerPhone: e.target.value,
                  }))
                }
                placeholder="e.g. 98xxxxxxxx"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            {/* Item Description */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Item / Service Description{" "}
                <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={newForm.itemDescription}
                onChange={(e) =>
                  setNewForm((f) => ({
                    ...f,
                    itemDescription: e.target.value,
                  }))
                }
                placeholder="Describe the item or service needed…"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            {/* Internal Note */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Internal Note{" "}
                <span className="text-xs font-normal text-gray-400">
                  (staff only)
                </span>
              </label>
              <input
                value={newForm.internalNote}
                onChange={(e) =>
                  setNewForm((f) => ({
                    ...f,
                    internalNote: e.target.value,
                  }))
                }
                placeholder="e.g. Urgent, handle with care"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            {/* Estimated Price */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Estimated Price ({currency})
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={newForm.estimatedPrice}
                onChange={(e) =>
                  setNewForm((f) => ({
                    ...f,
                    estimatedPrice: e.target.value,
                  }))
                }
                placeholder="0.00"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-all active:scale-95"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Create Ticket
            </button>
          </form>
        </Modal>
      )}

      {/* ── Price Edit Modal ── */}
      {priceTicket && (
        <Modal
          title={`Edit Price — ${priceTicket.ticketCode}`}
          onClose={() => setPriceTicket(null)}
        >
          <form onSubmit={handleSavePrice} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Estimated Price ({currency})
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={priceForm.estimatedPrice}
                onChange={(e) =>
                  setPriceForm((f) => ({
                    ...f,
                    estimatedPrice: e.target.value,
                  }))
                }
                placeholder="0.00"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Final Price ({currency})
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={priceForm.finalPrice}
                onChange={(e) =>
                  setPriceForm((f) => ({
                    ...f,
                    finalPrice: e.target.value,
                  }))
                }
                placeholder="0.00"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Price Note
              </label>
              <input
                value={priceForm.priceNote}
                onChange={(e) =>
                  setPriceForm((f) => ({ ...f, priceNote: e.target.value }))
                }
                placeholder="e.g. Added spare parts"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <button
              type="submit"
              disabled={savingPrice}
              className="w-full h-11 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
            >
              {savingPrice ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Save Price
            </button>
          </form>
        </Modal>
      )}

      {/* Spacer so content doesn't get hidden behind bottom nav on mobile */}
      <div className="h-6" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared UI helpers
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  icon,
  bg,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  bg: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 flex items-center gap-3">
      <div className={`${bg} p-2.5 rounded-xl`}>{icon}</div>
      <div>
        <p className="text-2xl font-extrabold text-gray-900 leading-none">
          {value}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="font-bold text-gray-900 text-base">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Modal body */}
        <div className="overflow-y-auto flex-1 px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
