"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
  Plus,
  Loader2,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  X,
  Truck,
  Ban,
  ChevronRight,
} from "lucide-react";

interface Ticket {
  id: string;
  trackingCode: string;
  ticketNumber: number;
  status: "PLACED" | "IN_PROGRESS" | "READY" | "COMPLETED" | "CANCELLED";
  customerName: string | null;
  customerPhone: string | null;
  itemSummary: string | null;
  createdAt: string;
  statusChangedAt: string;
  currentStep: { id: string; name: string } | null;
  workflow: { id: string; name: string; codePrefix: string };
}

interface WorkflowOption {
  id: string;
  name: string;
  codePrefix: string;
  isActive: boolean;
}

interface Props {
  tickets: Ticket[];
  workflows: WorkflowOption[];
  counts: Record<string, number>;
  statusMeta: Record<string, { label: string; badge: string }>;
}

const STATUS_ORDER = ["ALL", "PLACED", "IN_PROGRESS", "READY", "COMPLETED", "CANCELLED"];

function formatWhen(date: string | number | Date) {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const advanceLabel = (status: Ticket["status"]) =>
  status === "PLACED" ? "Start" : status === "IN_PROGRESS" ? "Advance" : status === "READY" ? "Complete" : null;

export default function TicketsClient({ tickets, workflows, statusMeta }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [, startTransition] = useTransition();

  const [filter, setFilter] = useState("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [qrId, setQrId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    workflowId: "",
    customerName: "",
    customerPhone: "",
    itemSummary: "",
    notes: "",
  });

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const activeWorkflows = workflows.filter((w) => w.isActive);

  const counts = STATUS_ORDER.reduce<Record<string, number>>((acc, key) => {
    acc[key] = key === "ALL" ? tickets.length : tickets.filter((t) => t.status === key).length;
    return acc;
  }, {});

  const visible =
    filter === "ALL" ? tickets : tickets.filter((t) => t.status === filter);

  const createTicket = async () => {
    if (!form.workflowId) {
      toast({ title: "Select a workflow", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/track/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          customerName: form.customerName || null,
          customerPhone: form.customerPhone || null,
          itemSummary: form.itemSummary || null,
          notes: form.notes || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        toast({
          title: `Ticket ${data.ticket.trackingCode} created`,
          variant: "success",
          description: "Share the code or QR with your customer.",
        });
        setForm({ workflowId: "", customerName: "", customerPhone: "", itemSummary: "", notes: "" });
        setShowForm(false);
        setFilter("ALL");
        startTransition(() => router.refresh());
      } else {
        const err = await res.json();
        toast({ title: "Could not create ticket", variant: "destructive", description: JSON.stringify(err.error) });
      }
    } finally {
      setCreating(false);
    }
  };

  const act = async (ticket: Ticket, action: "advance" | "cancel") => {
    if (action === "cancel" && !window.confirm(`Cancel ticket ${ticket.trackingCode}?`)) return;
    setBusyId(ticket.id);
    try {
      const res = await fetch(`/api/admin/track/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        toast({
          title: action === "advance" ? `Ticket advanced` : "Ticket cancelled",
          variant: "success",
        });
        startTransition(() => router.refresh());
      } else {
        const err = await res.json();
        toast({ title: "Action failed", variant: "destructive", description: err.error });
      }
    } finally {
      setBusyId(null);
    }
  };

  const copyCode = async (ticket: Ticket) => {
    try {
      await navigator.clipboard.writeText(ticket.trackingCode);
      setCopiedId(ticket.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      toast({ title: "Could not copy", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      {/* Create ticket form */}
      {showForm && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">New ticket</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Workflow *</label>
                <select
                  value={form.workflowId}
                  onChange={(e) => set("workflowId", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                >
                  <option value="">Select workflow…</option>
                  {activeWorkflows.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.codePrefix}-XXXX)
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Customer name</label>
                <Input value={form.customerName} onChange={(e) => set("customerName", e.target.value)} placeholder="Sita Shrestha" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Customer phone</label>
                <Input value={form.customerPhone} onChange={(e) => set("customerPhone", e.target.value)} placeholder="98xxxxxxxx" />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Item / job summary</label>
                <Input value={form.itemSummary} onChange={(e) => set("itemSummary", e.target.value)} placeholder="Stitched suit — 2 jackets, 1 trouser" />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Internal notes</label>
                <Input value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Collect payment on pickup" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={createTicket} disabled={creating} className="bg-orange-500 hover:bg-orange-600 text-white">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create ticket
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)} disabled={creating}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex flex-wrap gap-2">
          {STATUS_ORDER.map((key) => {
            const meta = statusMeta[key] ?? { label: key };
            const active = filter === key;
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  active ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {meta.label} · {counts[key]}
              </button>
            );
          })}
        </div>
        <Button
          onClick={() => setShowForm(true)}
          disabled={activeWorkflows.length === 0}
          className="bg-orange-500 hover:bg-orange-600 text-white"
          title={activeWorkflows.length === 0 ? "Create an active workflow first." : ""}
        >
          <Plus className="w-4 h-4 mr-1" /> New ticket
        </Button>
      </div>

      {/* List */}
      {activeWorkflows.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Truck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900">No active workflows</h3>
            <p className="text-sm text-gray-500 mt-1">Create and activate a workflow before issuing tickets.</p>
            <a href="/track-admin/workflows" className="inline-flex items-center gap-1 mt-4 text-sm text-orange-600 hover:underline">
              Go to workflows <ChevronRight className="w-4 h-4" />
            </a>
          </CardContent>
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-400 text-sm">No {filter === "ALL" ? "" : `${statusMeta[filter]?.label ?? filter} `}tickets yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((ticket) => {
            const meta = statusMeta[ticket.status] ?? { label: ticket.status, badge: "" };
            const action = advanceLabel(ticket.status);
            const canCancel = ticket.status !== "COMPLETED" && ticket.status !== "CANCELLED";
            return (
              <Card key={ticket.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => copyCode(ticket)}
                          className="font-mono font-extrabold text-orange-600 hover:underline flex items-center gap-1"
                          title="Copy code"
                        >
                          {ticket.trackingCode}
                          {copiedId === ticket.id ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <Badge className={`${meta.badge} border`}>{meta.label}</Badge>
                        <Badge className="bg-gray-50 text-gray-500 border border-gray-200">{ticket.workflow.name}</Badge>
                      </div>
                      <p className="text-sm text-gray-500 mt-1.5">
                        {ticket.customerName || "Walk-in"}
                        {ticket.customerPhone ? ` · ${ticket.customerPhone}` : ""} · {formatWhen(ticket.createdAt)}
                      </p>
                      {ticket.itemSummary && <p className="text-sm text-gray-700 mt-1">{ticket.itemSummary}</p>}
                      {ticket.currentStep && (
                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                          Now: <span className="text-gray-600 font-medium">{ticket.currentStep.name}</span>
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="flex gap-2">
                        <a
                          href={`/track/${ticket.trackingCode}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
                          title="Open customer tracking page"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> View
                        </a>
                        <button
                          onClick={() => setQrId(qrId === ticket.id ? null : ticket.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
                        >
                          <QrCode className="w-3.5 h-3.5" /> {qrId === ticket.id ? "Hide QR" : "QR"}
                        </button>
                      </div>
                      <div className="flex gap-2">
                        {action && (
                          <button
                            onClick={() => act(ticket, "advance")}
                            disabled={busyId === ticket.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50"
                          >
                            {busyId === ticket.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                            {action}
                          </button>
                        )}
                        {canCancel && (
                          <button
                            onClick={() => act(ticket, "cancel")}
                            disabled={busyId === ticket.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            <Ban className="w-3.5 h-3.5" /> Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {qrId === ticket.id && (
                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-4">
                      <div className="rounded-xl border border-gray-200 p-3 bg-white">
                        <QRCodeSVG value={`${window.location.origin}/track/${ticket.trackingCode}`} size={96} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Tracking QR</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Print this and attach it to the job. Customers scan it to follow progress.
                        </p>
                        <a
                          href={`${window.location.origin}/track/${ticket.trackingCode}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                        >
                          {window.location.origin}/track/{ticket.trackingCode}
                        </a>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}