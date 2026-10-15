"use client";

import Link from "next/link";
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
  Trash2,
  ListPlus,
} from "lucide-react";

interface TicketItem {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  unitPrice: number | null;
  currency: string | null;
}

interface Ticket {
  id: string;
  trackingCode: string;
  publicToken: string;
  ticketNumber: number;
  status: "PLACED" | "IN_PROGRESS" | "READY" | "COMPLETED" | "CANCELLED";
  customerName: string | null;
  customerPhone: string | null;
  itemSummary: string | null;
  items: TicketItem[];
  createdAt: string | Date;
  statusChangedAt: string | Date;
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

function formatMoney(value: number, currency: string | null) {
  const rounded = Math.round(value * 100) / 100;
  return `${currency ? `${currency} ` : ""}${rounded}`;
}

/** Total of a ticket's priced lines; null when no line carries a price, so an
 *  amount is never invented. */
function itemsTotal(items: TicketItem[]): { currency: string | null; total: number } | null {
  const priced = items.filter((i) => i.unitPrice != null);
  if (priced.length === 0) return null;
  const total = priced.reduce((sum, i) => sum + (i.unitPrice ?? 0) * i.quantity, 0);
  const currency = priced.find((i) => i.currency)?.currency ?? null;
  return { currency, total };
}

const advanceLabel = (status: Ticket["status"]) =>
  status === "PLACED" ? "Start" : status === "IN_PROGRESS" ? "Advance" : status === "READY" ? "Complete" : null;

interface ItemDraft {
  name: string;
  quantity: string;
  unitPrice: string;
  currency: string;
}

const EMPTY_DRAFT: ItemDraft = { name: "", quantity: "1", unitPrice: "", currency: "" };

function draftToPayload(d: ItemDraft) {
  const qty = Number(d.quantity);
  return {
    name: d.name.trim(),
    quantity: Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 1,
    unitPrice: d.unitPrice.trim() === "" ? null : Number(d.unitPrice),
    currency: d.currency.trim() || null,
  };
}

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
  const [formItems, setFormItems] = useState<ItemDraft[]>([]);

  // Inline "add line item" state for an existing ticket.
  const [itemTicketId, setItemTicketId] = useState<string | null>(null);
  const [itemDraft, setItemDraft] = useState<ItemDraft>(EMPTY_DRAFT);
  const [savingItem, setSavingItem] = useState(false);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const setFormItem = (idx: number, key: keyof ItemDraft, value: string) =>
    setFormItems((rows) => rows.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));

  const activeWorkflows = workflows.filter((w) => w.isActive);

  const counts = STATUS_ORDER.reduce<Record<string, number>>((acc, key) => {
    acc[key] = key === "ALL" ? tickets.length : tickets.filter((t) => t.status === key).length;
    return acc;
  }, {});

  const visible = filter === "ALL" ? tickets : tickets.filter((t) => t.status === filter);

  const createTicket = async () => {
    if (!form.workflowId) {
      toast({ title: "Select a workflow", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const items = formItems.filter((it) => it.name.trim()).map(draftToPayload);
      const res = await fetch("/api/admin/track/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          customerName: form.customerName || null,
          customerPhone: form.customerPhone || null,
          itemSummary: form.itemSummary || null,
          notes: form.notes || null,
          items,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        toast({
          title: `Ticket ${data.ticket.trackingCode} created`,
          variant: "success",
          description: `Share: ${window.location.origin}/track/${data.ticket.publicToken}`,
        });
        setForm({ workflowId: "", customerName: "", customerPhone: "", itemSummary: "", notes: "" });
        setFormItems([]);
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

  const addItem = async (ticket: Ticket) => {
    if (!itemDraft.name.trim()) {
      toast({ title: "Item name is required", variant: "destructive" });
      return;
    }
    setSavingItem(true);
    try {
      const res = await fetch(`/api/admin/track/tickets/${ticket.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draftToPayload(itemDraft)),
      });
      if (res.ok) {
        setItemDraft(EMPTY_DRAFT);
        setItemTicketId(null);
        startTransition(() => router.refresh());
      } else {
        const err = await res.json();
        toast({ title: "Could not add item", variant: "destructive", description: JSON.stringify(err.error) });
      }
    } finally {
      setSavingItem(false);
    }
  };

  const removeItem = async (ticket: Ticket, item: TicketItem) => {
    if (!window.confirm(`Remove "${item.name}" from ${ticket.trackingCode}?`)) return;
    setBusyItemId(item.id);
    try {
      const res = await fetch(`/api/admin/track/tickets/${ticket.id}/items/${item.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        startTransition(() => router.refresh());
      } else {
        const err = await res.json();
        toast({ title: "Could not remove item", variant: "destructive", description: err.error });
      }
    } finally {
      setBusyItemId(null);
    }
  };

  const shareLink = (ticket: Ticket) => `${window.location.origin}/track/${ticket.publicToken}`;

  const copyLink = async (ticket: Ticket) => {
    try {
      await navigator.clipboard.writeText(shareLink(ticket));
      setCopiedId(ticket.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      toast({ title: "Could not copy", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <Button
          onClick={() => setShowForm((v) => !v)}
          disabled={activeWorkflows.length === 0}
          className="bg-orange-500 hover:bg-orange-600 text-white"
          title={activeWorkflows.length === 0 ? "Create an active workflow first." : ""}
        >
          <Plus className="w-4 h-4 mr-1" /> New ticket
        </Button>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_ORDER.map((key) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filter === key
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              }`}
            >
              {statusMeta[key]?.label ?? key} · {counts[key]}
            </button>
          ))}
        </div>
      </div>

      {activeWorkflows.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-center gap-2 flex-wrap">
          <Truck className="w-4 h-4" />
          Create and activate a workflow before issuing tickets.
          <Link href="/track-admin/workflows" className="underline font-medium inline-flex items-center gap-0.5">
            Workflows <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {showForm && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">New ticket</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="space-y-1 md:col-span-2">
                <span className="text-xs font-medium text-gray-600">Workflow</span>
                <select
                  value={form.workflowId}
                  onChange={(e) => set("workflowId", e.target.value)}
                  className="w-full h-9 rounded-md border border-gray-200 px-3 text-sm bg-white"
                >
                  <option value="">Select a workflow…</option>
                  {activeWorkflows.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.codePrefix})
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-gray-600">Customer name</span>
                <Input value={form.customerName} onChange={(e) => set("customerName", e.target.value)} placeholder="Optional" />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-gray-600">Customer phone</span>
                <Input value={form.customerPhone} onChange={(e) => set("customerPhone", e.target.value)} placeholder="Optional" />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-xs font-medium text-gray-600">Summary (free text)</span>
                <Input value={form.itemSummary} onChange={(e) => set("itemSummary", e.target.value)} placeholder="Optional — e.g. wedding suit" />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-xs font-medium text-gray-600">Internal notes</span>
                <Input value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Optional" />
              </label>
            </div>

            <div className="rounded-lg border border-gray-200 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700">Line items</span>
                <button
                  type="button"
                  onClick={() => setFormItems((r) => [...r, { ...EMPTY_DRAFT }])}
                  className="text-xs text-orange-600 hover:underline inline-flex items-center gap-1"
                >
                  <ListPlus className="w-3.5 h-3.5" /> Add item
                </button>
              </div>
              {formItems.length === 0 ? (
                <p className="text-xs text-gray-400">Optional structured items — prices are optional.</p>
              ) : (
                <div className="space-y-2">
                  {formItems.map((it, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input
                        className="flex-1"
                        placeholder="Item name"
                        value={it.name}
                        onChange={(e) => setFormItem(idx, "name", e.target.value)}
                      />
                      <Input
                        className="w-16"
                        type="number"
                        min={1}
                        placeholder="Qty"
                        value={it.quantity}
                        onChange={(e) => setFormItem(idx, "quantity", e.target.value)}
                      />
                      <Input
                        className="w-24"
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="Price"
                        value={it.unitPrice}
                        onChange={(e) => setFormItem(idx, "unitPrice", e.target.value)}
                      />
                      <Input
                        className="w-16"
                        placeholder="Cur"
                        value={it.currency}
                        onChange={(e) => setFormItem(idx, "currency", e.target.value)}
                      />
                      <button
                        onClick={() => setFormItems((rows) => rows.filter((_, i) => i !== idx))}
                        className="text-gray-400 hover:text-red-500"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={createTicket} disabled={creating} className="bg-orange-500 hover:bg-orange-600 text-white">
                {creating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />} Create ticket
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)} disabled={creating}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {visible.length === 0 ? (
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
            const total = itemsTotal(ticket.items);
            return (
              <Card key={ticket.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => copyLink(ticket)}
                          className="font-mono font-extrabold text-orange-600 hover:underline flex items-center gap-1"
                          title="Copy tracking link"
                        >
                          {ticket.trackingCode}
                          {copiedId === ticket.id ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <Badge className={`${meta.badge} border`}>{meta.label}</Badge>
                        <Badge className="bg-gray-50 text-gray-500 border border-gray-200">{ticket.workflow.name}</Badge>
                      </div>
                      <p className="text-sm text-gray-500 mt-1.5">
                        {ticket.customerName || "Walk-in"}
                        {ticket.customerPhone ? ` · ${ticket.customerPhone}` : ""} ·{" "}
                        {new Date(ticket.createdAt).toLocaleString()}
                      </p>
                      {ticket.itemSummary && <p className="text-sm text-gray-700 mt-1">{ticket.itemSummary}</p>}

                      {ticket.items.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {ticket.items.map((it) => (
                            <li key={it.id} className="text-sm text-gray-700 flex items-center gap-2">
                              <span className="text-gray-400">{it.quantity}×</span>
                              <span>{it.name}</span>
                              {it.unitPrice != null && (
                                <span className="text-gray-500">{formatMoney(it.unitPrice, it.currency)}</span>
                              )}
                              <button
                                onClick={() => removeItem(ticket, it)}
                                disabled={busyItemId === it.id}
                                className="text-gray-300 hover:text-red-500 disabled:opacity-50"
                                title="Remove item"
                              >
                                {busyItemId === it.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                              </button>
                            </li>
                          ))}
                          {total && (
                            <li className="text-sm font-semibold text-gray-900 pt-0.5">
                              Total: {formatMoney(total.total, total.currency)}
                            </li>
                          )}
                        </ul>
                      )}

                      {ticket.currentStep && (
                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                          Now: <span className="text-gray-600 font-medium">{ticket.currentStep.name}</span>
                        </p>
                      )}

                      {itemTicketId === ticket.id ? (
                        <div className="flex gap-2 items-center mt-3 flex-wrap">
                          <Input
                            className="flex-1 min-w-[10rem]"
                            placeholder="Item name"
                            value={itemDraft.name}
                            onChange={(e) => setItemDraft((d) => ({ ...d, name: e.target.value }))}
                          />
                          <Input
                            className="w-16"
                            type="number"
                            min={1}
                            placeholder="Qty"
                            value={itemDraft.quantity}
                            onChange={(e) => setItemDraft((d) => ({ ...d, quantity: e.target.value }))}
                          />
                          <Input
                            className="w-24"
                            type="number"
                            min={0}
                            step="0.01"
                            placeholder="Price"
                            value={itemDraft.unitPrice}
                            onChange={(e) => setItemDraft((d) => ({ ...d, unitPrice: e.target.value }))}
                          />
                          <Input
                            className="w-16"
                            placeholder="Cur"
                            value={itemDraft.currency}
                            onChange={(e) => setItemDraft((d) => ({ ...d, currency: e.target.value }))}
                          />
                          <Button size="sm" onClick={() => addItem(ticket)} disabled={savingItem} className="bg-orange-500 hover:bg-orange-600 text-white">
                            {savingItem ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setItemTicketId(null);
                              setItemDraft(EMPTY_DRAFT);
                            }}
                            disabled={savingItem}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setItemTicketId(ticket.id);
                            setItemDraft(EMPTY_DRAFT);
                          }}
                          className="mt-2 text-xs text-orange-600 hover:underline inline-flex items-center gap-1"
                        >
                          <ListPlus className="w-3.5 h-3.5" /> Add line item
                        </button>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="flex gap-2">
                        <a
                          href={`/track/${ticket.publicToken}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Open
                        </a>
                        <button
                          onClick={() => setQrId((v) => (v === ticket.id ? null : ticket.id))}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50"
                        >
                          <QrCode className="w-3.5 h-3.5" /> QR
                        </button>
                      </div>
                      {(action || canCancel) && (
                        <div className="flex gap-2">
                          {action && (
                            <Button size="sm" onClick={() => act(ticket, "advance")} disabled={busyId === ticket.id}>
                              {busyId === ticket.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : action}
                            </Button>
                          )}
                          {canCancel && (
                            <Button size="sm" variant="outline" onClick={() => act(ticket, "cancel")} disabled={busyId === ticket.id}>
                              <Ban className="w-3.5 h-3.5 mr-1" /> Cancel
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {qrId === ticket.id && (
                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-4">
                      <div className="rounded-xl border border-gray-200 p-3 bg-white">
                        <QRCodeSVG value={shareLink(ticket)} size={96} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Tracking QR</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Print this and attach it to the job. Customers scan it to follow progress.
                        </p>
                        <a
                          href={shareLink(ticket)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-gray-500 hover:underline break-all"
                        >
                          {shareLink(ticket)}
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
