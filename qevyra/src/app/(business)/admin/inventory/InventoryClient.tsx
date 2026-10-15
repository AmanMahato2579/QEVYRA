"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { t } from "@/lib/i18n";
import {
  Plus,
  Loader2,
  X,
  Package,
  Pencil,
  History,
  Trash2,
  ArrowDownRight,
  ArrowUpRight,
  AlertTriangle,
} from "lucide-react";

type MovementType = "RECEIVED" | "USED" | "WASTE" | "ADJUSTMENT";

interface Item {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  currentStock: string;
  reorderThreshold: string;
  isActive: boolean;
  _count: { movements: number };
}

interface Movement {
  id: string;
  type: MovementType;
  quantity: string;
  stockAfter: string;
  note: string | null;
  createdAt: string;
  actor: { id: string; name: string } | null;
}

interface Props {
  initialItems: Item[];
  language: string;
}

const emptyForm = { name: "", sku: "", unit: "unit", reorderThreshold: "0", initialStock: "0" };

function isLow(item: Item): boolean {
  return item.isActive && Number(item.currentStock) <= Number(item.reorderThreshold);
}

function formatQty(value: string | number): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return Number.isInteger(n) ? n.toString() : n.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

const movementLabels: Record<MovementType, { en: string; np: string }> = {
  RECEIVED: { en: "Received", np: "प्राप्त" },
  USED: { en: "Used / Sold", np: "प्रयोग / बिक्री" },
  WASTE: { en: "Waste", np: "क्षय" },
  ADJUSTMENT: { en: "Adjustment", np: "समायोजन" },
};

export default function InventoryClient({ initialItems, language }: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const [items, setItems] = useState<Item[]>(initialItems);
  const [filter, setFilter] = useState<"all" | "low">("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const [recordFor, setRecordFor] = useState<Item | null>(null);
  const [movement, setMovement] = useState<{ type: MovementType; quantity: string; note: string }>({
    type: "RECEIVED",
    quantity: "",
    note: "",
  });

  const [historyFor, setHistoryFor] = useState<Item | null>(null);
  const [history, setHistory] = useState<Movement[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const lowCount = items.filter(isLow).length;
  const visible = filter === "low" ? items.filter(isLow) : items;

  const reload = async () => {
    const res = await fetch("/api/admin/inventory/items");
    if (res.ok) setItems(await res.json());
    router.refresh();
  };

  const showError = async (res: Response, title: string) => {
    let description = "";
    try {
      const body = await res.json();
      description = typeof body.error === "string" ? body.error : JSON.stringify(body.error);
    } catch {
      description = res.statusText;
    }
    toast({ title, variant: "destructive", description });
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (item: Item) => {
    setEditing(item);
    setForm({
      name: item.name,
      sku: item.sku ?? "",
      unit: item.unit,
      reorderThreshold: formatQty(item.reorderThreshold),
      initialStock: "0",
    });
    setShowForm(true);
  };

  const submitForm = async () => {
    if (!form.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      if (editing) {
        const res = await fetch(`/api/admin/inventory/items/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            sku: form.sku || null,
            unit: form.unit,
            reorderThreshold: Number(form.reorderThreshold) || 0,
          }),
        });
        if (res.ok) {
          toast({ title: "Item updated", variant: "success" });
          setShowForm(false);
          await reload();
        } else {
          await showError(res, "Could not update item");
        }
      } else {
        const res = await fetch("/api/admin/inventory/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            sku: form.sku || null,
            unit: form.unit,
            reorderThreshold: Number(form.reorderThreshold) || 0,
            initialStock: Number(form.initialStock) || 0,
          }),
        });
        if (res.ok) {
          toast({ title: "Item added", variant: "success" });
          setShowForm(false);
          await reload();
        } else {
          await showError(res, "Could not add item");
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (item: Item) => {
    const res = await fetch(`/api/admin/inventory/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !item.isActive }),
    });
    if (res.ok) await reload();
    else await showError(res, "Could not update item");
  };

  const removeItem = async (item: Item) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    const res = await fetch(`/api/admin/inventory/items/${item.id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: "Item deleted", variant: "success" });
      await reload();
    } else {
      await showError(res, "Could not delete item");
    }
  };

  const openHistory = async (item: Item) => {
    setHistoryFor(item);
    setHistory([]);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/admin/inventory/items/${item.id}/movements`);
      if (res.ok) setHistory(await res.json());
      else await showError(res, "Could not load history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const submitMovement = async () => {
    if (!recordFor) return;
    const qty = Number(movement.quantity);
    if (!Number.isFinite(qty) || qty === 0) {
      toast({ title: "Enter a non-zero quantity", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/inventory/items/${recordFor.id}/movements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: movement.type,
          quantity: qty,
          note: movement.note || null,
        }),
      });
      if (res.ok) {
        toast({ title: "Stock updated", variant: "success" });
        setRecordFor(null);
        setMovement({ type: "RECEIVED", quantity: "", note: "" });
        await reload();
      } else {
        await showError(res, "Could not update stock");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {showForm && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">{editing ? "Edit item" : "New item"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Name</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Basmati rice" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">SKU / code</label>
                <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="RICE-001" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Unit</label>
                <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="kg / pc / litre" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Reorder at</label>
                <Input
                  type="number"
                  min="0"
                  step="0.001"
                  value={form.reorderThreshold}
                  onChange={(e) => setForm({ ...form, reorderThreshold: e.target.value })}
                />
              </div>
              {!editing && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Opening stock</label>
                  <Input
                    type="number"
                    min="0"
                    value={form.initialStock}
                    onChange={(e) => setForm({ ...form, initialStock: e.target.value })}
                  />
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={submitForm} disabled={submitting} className="bg-orange-500 hover:bg-orange-600 text-white">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {editing ? "Save changes" : "Add item"}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)} disabled={submitting}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              filter === "all" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
            }`}
          >
            All · {items.length}
          </button>
          <button
            onClick={() => setFilter("low")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              filter === "low" ? "bg-red-600 text-white border-red-600" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
            }`}
          >
            Low stock · {lowCount}
          </button>
        </div>
        <Button onClick={openCreate} className="bg-orange-500 hover:bg-orange-600 text-white">
          <Plus className="w-4 h-4 mr-1" /> New item
        </Button>
      </div>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Package className="w-7 h-7 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">
              {filter === "low" ? "Nothing is low on stock." : "No inventory items yet. Add your first item."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((item) => {
            const low = isLow(item);
            return (
              <Card key={item.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{item.name}</span>
                        {item.sku && <span className="text-xs font-mono text-gray-400">{item.sku}</span>}
                        {low && (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Low
                          </Badge>
                        )}
                        {!item.isActive && <Badge variant="secondary">Inactive</Badge>}
                      </div>
                      <p className="text-sm text-gray-500 mt-1.5">
                        <span className="text-2xl font-bold text-gray-900">{formatQty(item.currentStock)}</span>{" "}
                        <span className="text-gray-500">{item.unit}</span>
                        <span className="text-gray-400"> · reorder at {formatQty(item.reorderThreshold)}</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {item._count.movements} movement{item._count.movements === 1 ? "" : "s"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setRecordFor(item);
                          setMovement({ type: "RECEIVED", quantity: "", note: "" });
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-900 text-white hover:bg-gray-700"
                      >
                        <ArrowDownRight className="w-3.5 h-3.5" /> Record stock
                      </button>
                      <button
                        onClick={() => openHistory(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        <History className="w-3.5 h-3.5" /> History
                      </button>
                      <button
                        onClick={() => openEdit(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => toggleActive(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        {item.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => removeItem(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {recordFor && (
        <Overlay onClose={() => setRecordFor(null)}>
          <h2 className="font-bold text-gray-900 mb-1">
            {t(language, "Record stock", "स्टक रेकर्ड")} — {recordFor.name}
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            {t(language, "Current", "हाल")}: {formatQty(recordFor.currentStock)} {recordFor.unit}
          </p>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">{t(language, "Type", "प्रकार")}</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(movementLabels) as MovementType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setMovement({ ...movement, type })}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      movement.type === type ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {t(language, movementLabels[type].en, movementLabels[type].np)}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                {t(language, "Quantity", "मात्रा")}
                {movement.type === "ADJUSTMENT" ? " (+/-)" : ""}
              </label>
              <Input
                type="number"
                step="any"
                value={movement.quantity}
                onChange={(e) => setMovement({ ...movement, quantity: e.target.value })}
                placeholder={movement.type === "ADJUSTMENT" ? "e.g. -3 to correct a shortfall" : "e.g. 10"}
              />
              {movement.type === "ADJUSTMENT" && (
                <p className="text-xs text-gray-400">Use a negative number to reduce stock, positive to add.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">{t(language, "Note", "टिप्पणी")}</label>
              <Input value={movement.note} onChange={(e) => setMovement({ ...movement, note: e.target.value })} placeholder="Optional" />
            </div>
            <div className="flex gap-2">
              <Button onClick={submitMovement} disabled={submitting} className="bg-orange-500 hover:bg-orange-600 text-white">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDownRight className="w-4 h-4" />}
                {t(language, "Save", "सुरक्षित")}
              </Button>
              <Button variant="outline" onClick={() => setRecordFor(null)} disabled={submitting}>
                {t(language, "Cancel", "रद्द")}
              </Button>
            </div>
          </div>
        </Overlay>
      )}

      {historyFor && (
        <Overlay onClose={() => setHistoryFor(null)}>
          <h2 className="font-bold text-gray-900 mb-4">
            {t(language, "History", "इतिहास")} — {historyFor.name}
          </h2>
          {historyLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">{t(language, "No movements yet.", "अहिलेसम्म कुनै चलन छैन।")}</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {history.map((m) => {
                const qty = Number(m.quantity);
                const positive = qty >= 0;
                return (
                  <div key={m.id} className="flex items-center justify-between gap-3 py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      {positive ? (
                        <ArrowDownRight className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4 text-red-500 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800">
                          {t(language, movementLabels[m.type].en, movementLabels[m.type].np)}
                          <span className={positive ? "text-emerald-600" : "text-red-600"}>
                            {" "}
                            {positive ? "+" : ""}
                            {formatQty(qty)} {historyFor.unit}
                          </span>
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {new Date(m.createdAt).toLocaleString()}
                          {m.actor ? ` · ${m.actor.name}` : ""}
                          {m.note ? ` · ${m.note}` : ""}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 shrink-0">
                      = {formatQty(m.stockAfter)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Overlay>
      )}
    </div>
  );
}

function Overlay({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end -mt-1 -mr-1 mb-2">
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
