"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/ui/toast";
import {
  ArrowLeft, ExternalLink, Building2, Loader2, Trash2, Clock3, Star, ShieldCheck, Users,
  QrCode, CheckCircle, XCircle, Globe, Workflow, Ticket,
} from "lucide-react";
import { planStyleVariant, productById, type ProductTypeId } from "@/lib/plan-catalog";
import { actionLabel } from "@/lib/activity";

interface BusinessProductRow {
  id: string;
  productId: ProductTypeId;
  isActive: boolean;
  product: {
    id: string;
    name: string;
    description: string | null;
    featureKeys: string;
    limitKeys: string;
  };
}

interface BusinessUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface ActivityRow {
  id: string;
  action: string;
  detail: string | null;
  createdAt: string;
}

interface BusinessDetail {
  id: string;
  name: string;
  slug: string;
  type: string;
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  language: string;
  brandColor: string;
  isActive: boolean;
  plan: string;
  subscriptionStatus: string | null;
  subscriptionStart: string | null;
  subscriptionExpiresAt: string | null;
  neverExpires: boolean;
  autoOff: boolean;
  starNumber: number | null;
  starNote: string | null;
  createdAt: string;
  restaurant: {
    id: string;
    tableLimit: number;
    bookingsEnabled: boolean;
    _count: { tables: number; orders: number; bookings: number };
  } | null;
  products: BusinessProductRow[];
  users: BusinessUser[];
  website: { id: string; isPublished: boolean } | null;
  _count: { workflows: number; tickets: number };
}

interface Props {
  business: BusinessDetail;
  activity: ActivityRow[];
}

const BUSINESS_TYPES: Record<string, string> = {
  RESTAURANT: "Restaurant / cafe",
  HOTEL: "Hotel",
  HOMESTAY: "Homestay",
  RETAIL: "Retail / shop",
  SERVICE: "Service shop",
  TAILOR: "Tailor",
  DRY_CLEANING: "Dry cleaning",
  GARAGE: "Garage / showroom",
  CLEANING: "Cleaning service",
  REPAIR: "Repair service",
  OTHER: "Other",
};

function subscriptionInfo(b: BusinessDetail): { label: string; className: string } {
  if (!b.isActive) return { label: "Inactive", className: "bg-red-500/20 text-red-400" };
  if (b.neverExpires) return { label: "Never expires", className: "bg-green-500/20 text-green-400" };
  if (b.subscriptionExpiresAt) {
    const days = Math.ceil((new Date(b.subscriptionExpiresAt).getTime() - Date.now()) / 86400000);
    if (days < 0) return { label: `Expired ${Math.abs(days)}d ago · auto-off ${b.autoOff ? "ON" : "OFF"}`, className: "bg-red-500/20 text-red-400" };
    if (days <= 14) return { label: `${days} days left`, className: "bg-amber-500/20 text-amber-300" };
    return { label: `${days} days left`, className: "bg-green-500/20 text-green-400" };
  }
  return { label: b.subscriptionStatus ?? "ACTIVE", className: "bg-white/10 text-gray-300" };
}

export default function BusinessDetailClient({ business: b, activity }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [togglingProduct, setTogglingProduct] = useState<ProductTypeId | null>(null);

  const planStyle = planStyleVariant(b.plan);

  const sub = subscriptionInfo(b);

  const patch = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/super-admin/businesses/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        toast({ title: "Error", variant: "destructive", description: JSON.stringify(err.error) });
        return false;
      }
      startTransition(() => router.refresh());
      return true;
    } finally {
      setBusy(false);
    }
  };

  const toggleProduct = async (productId: ProductTypeId, current: boolean) => {
    setTogglingProduct(productId);
    const ok = await patch({ products: [{ productId, isActive: !current }] });
    setTogglingProduct(null);
    if (ok) toast({ title: `${productById(productId)?.label ?? productId} ${!current ? "enabled" : "disabled"}`, variant: "success" });
  };

  const resetPassword = async () => {
    const password = window.prompt("Set a new temporary password for this business owner (minimum 8 characters):");
    if (!password) return;
    if (password.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    const res = await fetch(`/api/super-admin/businesses/${b.id}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    toast(res.ok ? { title: "Owner password reset", variant: "success" } : { title: "Could not reset password", variant: "destructive" });
  };

  const deleteBusiness = async () => {
    setBusy(true);
    const res = await fetch(`/api/super-admin/businesses/${b.id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) {
      toast({ title: "Business deleted", variant: "success" });
      router.push("/super-admin/businesses");
    } else {
      const err = await res.json();
      toast({ title: "Failed to delete", variant: "destructive", description: err.error });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/super-admin/businesses" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Businesses
        </Link>
        <span className="text-gray-600">/</span>
        <span className="text-sm text-gray-300">{b.name}</span>
      </div>

      {/* Header card */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center shrink-0">
              <Building2 className="w-7 h-7 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold">{b.name}</h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-300 border border-white/10">
                  {BUSINESS_TYPES[b.type] ?? b.type}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${planStyle.badge}`}>{planStyle.label}</span>
                {b.starNumber != null && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    ⭐ Star #{b.starNumber}
                  </span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full ${sub.className}`}>{sub.label}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                /{b.slug} · joined {new Date(b.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
              </p>
              {b.description && <p className="text-sm text-gray-300 mt-2 max-w-xl">{b.description}</p>}
            </div>
          </div>
          <div className="flex flex-col gap-2 items-end">
            {b.website?.isPublished && (
              <Link target="_blank" href={`/b/${b.slug}`} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/20 text-sm text-gray-200 hover:bg-white/10">
                <Globe className="w-4 h-4" /> View website
              </Link>
            )}
            <div className="flex gap-2">
              <button onClick={() => patch({ isActive: !b.isActive })}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  b.isActive ? "border-red-500/30 text-red-400 hover:bg-red-500/10" : "border-green-500/30 text-green-400 hover:bg-green-500/10"
                }`}>
                {b.isActive ? <><XCircle className="w-3.5 h-3.5" /> Deactivate</> : <><CheckCircle className="w-3.5 h-3.5" /> Activate</>}
              </button>
              <button onClick={resetPassword} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-orange-500/30 text-orange-300 hover:bg-orange-500/10">
                <Users className="w-3.5 h-3.5" /> Reset password
              </button>
              <button onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-red-500/20 text-red-400 hover:bg-red-500/10">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </div>
        </div>

        {confirmDelete && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-between gap-3">
            <p className="text-red-300 text-sm font-medium">⚠️ Permanently delete <strong>{b.name}</strong> and all its data?</p>
            <div className="flex gap-2 shrink-0">
              <button onClick={deleteBusiness} disabled={busy}
                className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium flex items-center gap-1">
                {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Yes, Delete
              </button>
              <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 border border-white/20 text-gray-300 rounded-lg text-xs">Cancel</button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Products */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Products</h2>
              <p className="text-xs text-gray-500">Product grants decide what the owner can use.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {b.products.map((row) => {
                const def = productById(row.productId);
                const on = row.isActive;
                return (
                  <div key={row.id} className={`rounded-xl border p-4 transition-colors ${on ? "border-white/20 bg-white/5" : "border-white/10 opacity-60"}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${def.badge}`}>
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{def.label}</p>
                          <p className="text-xs text-gray-400">{def.description}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleProduct(row.productId, on)}
                        disabled={togglingProduct === row.productId}
                        className={`relative w-12 h-6 rounded-full transition-colors disabled:opacity-50 ${on ? "bg-purple-500" : "bg-white/15"}`}
                        aria-label={`Toggle ${def.label}`}
                      >
                        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${on ? "left-[26px]" : "left-0.5"}`} />
                      </button>
                    </div>
                    {on && (
                      <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                        {(() => {
                          let keys: string[] = [];
                          try { keys = JSON.parse(row.product.featureKeys); } catch { /* ignore */ }
                          return keys.map((k) => (
                            <span key={k} className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-gray-300">{k}</span>
                          ));
                        })()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-bold mb-4">Usage</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-gray-400 flex items-center gap-1"><QrCode className="w-3 h-3" /> QR tables</p>
                <p className="text-xl font-bold mt-1">{b.restaurant ? `${b.restaurant._count.tables} / ${b.restaurant.tableLimit}` : "—"}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-gray-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Orders</p>
                <p className="text-xl font-bold mt-1">{b.restaurant?._count.orders ?? 0}</p>
              </div>
              {b.products.some(p => p.productId === "TRACK" && p.isActive) && (
                <>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs text-gray-400 flex items-center gap-1"><Workflow className="w-3 h-3" /> Workflows</p>
                    <p className="text-xl font-bold mt-1">{b._count.workflows}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs text-gray-400 flex items-center gap-1"><Ticket className="w-3 h-3" /> Tickets</p>
                    <p className="text-xl font-bold mt-1">{b._count.tickets}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Recent activity */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-bold mb-4">Recent platform activity</h2>
            {activity.length === 0 ? (
              <p className="text-sm text-gray-500">No platform actions recorded for this business yet.</p>
            ) : (
              <div className="space-y-2">
                {activity.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 text-sm">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                    <div>
                      <span className="text-gray-200">{actionLabel(a.action)}</span>
                      {a.detail && <span className="text-gray-400"> — {a.detail}</span>}
                      <span className="text-gray-600 text-xs block">
                        {new Date(a.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Subscription */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-bold mb-4">Subscription</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Status</span><span>{b.subscriptionStatus ?? "ACTIVE"}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Never expires</span><span>{b.neverExpires ? "Yes" : "No"}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Auto-off on expiry</span><span>{b.autoOff ? "On" : "Off"}</span></div>
              {b.subscriptionExpiresAt && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Expires</span>
                  <span>{new Date(b.subscriptionExpiresAt).toLocaleDateString()}</span>
                </div>
              )}
              {b.starNote && <p className="text-xs text-gray-500 italic mt-2">Star note: {b.starNote}</p>}
            </div>
            <div className="mt-4 space-y-2">
              <button onClick={() => patch({ extendDays: 30 })} disabled={busy}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-white/20 text-sm text-gray-200 hover:bg-white/10 disabled:opacity-50">
                <Clock3 className="w-4 h-4" /> Extend 30 days
              </button>
              <button onClick={() => patch({ extendDays: 90 })} disabled={busy}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-white/20 text-sm text-gray-200 hover:bg-white/10 disabled:opacity-50">
                <Clock3 className="w-4 h-4" /> Extend 90 days
              </button>
              <button onClick={() => patch({ neverExpires: true })} disabled={busy}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-white/20 text-sm text-gray-200 hover:bg-white/10 disabled:opacity-50">
                <Star className="w-4 h-4" /> Make never-expiring
              </button>
            </div>
          </div>

          {/* Owners */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-bold mb-4">Owners &amp; users</h2>
            <div className="space-y-3">
              {b.users.map((u) => (
                <div key={u.id} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-purple-300" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{u.name}</p>
                    <p className="text-xs text-gray-400 truncate">{u.email}</p>
                  </div>
                  <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-gray-300">{u.role}</span>
                </div>
              ))}
              {b.users.length === 0 && <p className="text-sm text-gray-500">No users yet.</p>}
            </div>
            {b.website?.isPublished ? (
              <Link target="_blank" href={`/b/${b.slug}`} className="mt-4 flex items-center gap-2 text-xs text-purple-300 hover:text-purple-200">
                <ExternalLink className="w-3.5 h-3.5" /> Public website live at /b/{b.slug}
              </Link>
            ) : null}
          </div>

          {/* Contact */}
          {(b.phone || b.whatsapp || b.address) && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-bold mb-3">Contact</h2>
              <div className="space-y-1 text-sm text-gray-300">
                {b.phone && <p>📞 {b.phone}</p>}
                {b.whatsapp && <p>💬 {b.whatsapp}</p>}
                {b.address && <p className="break-words">📍 {b.address}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}