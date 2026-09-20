"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { Globe, Loader2, Save, ExternalLink, Lock } from "lucide-react";

interface WebsiteData {
  id: string;
  themeId: string | null;
  isPublished: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroImageUrl: string | null;
  heroCtaLabel: string | null;
  heroCtaLink: string | null;
  aboutTitle: string | null;
  aboutText: string | null;
  aboutImageUrl: string | null;
  servicesTitle: string | null;
  servicesText: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  addressText: string | null;
  mapUrl: string | null;
  footerText: string | null;
}

interface Theme {
  id: string;
  name: string;
  description: string | null;
  primaryColor: string;
  background: string;
}

interface Props {
  slug: string;
  website: WebsiteData | null;
  themes: Theme[];
  canUse: boolean;
}

const inputCls =
  "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500";
const labelCls = "block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5";

export default function WebsiteClient({ slug, website, themes, canUse }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);

  const [draft, setDraft] = useState(() => ({
    themeId: website?.themeId ?? themes[0]?.id ?? null,
    isPublished: website?.isPublished ?? false,
    metaTitle: website?.metaTitle ?? "",
    metaDescription: website?.metaDescription ?? "",
    heroTitle: website?.heroTitle ?? "",
    heroSubtitle: website?.heroSubtitle ?? "",
    heroImageUrl: website?.heroImageUrl ?? "",
    heroCtaLabel: website?.heroCtaLabel ?? "",
    heroCtaLink: website?.heroCtaLink ?? "",
    aboutTitle: website?.aboutTitle ?? "",
    aboutText: website?.aboutText ?? "",
    aboutImageUrl: website?.aboutImageUrl ?? "",
    servicesTitle: website?.servicesTitle ?? "",
    servicesText: website?.servicesText ?? "",
    contactPhone: website?.contactPhone ?? "",
    contactEmail: website?.contactEmail ?? "",
    addressText: website?.addressText ?? "",
    mapUrl: website?.mapUrl ?? "",
    footerText: website?.footerText ?? "",
  }));

  const set = (key: keyof typeof draft, value: string | boolean) =>
    setDraft((d) => ({ ...d, [key]: value }));

  if (!canUse) {
    return (
      <div className="max-w-lg mx-auto mt-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center mx-auto mb-5">
          <Lock className="w-8 h-8 text-purple-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">Website editor not available</h1>
        <p className="text-gray-400 mt-3 text-sm">
          Your current plan does not include the customisable business website.
          Upgrade to Silver or Star to publish a storefront at{" "}
          <span className="text-purple-300">qevyra.com/b/{slug}</span>.
        </p>
      </div>
    );
  }

  const save = async (publish: boolean) => {
    setSaving(true);
    const body = { ...draft, isPublished: publish };
    try {
      const res = await fetch("/api/admin/website", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast({
          title: publish ? "Website published live" : "Website saved as draft",
          variant: "success",
        });
        startTransition(() => router.refresh());
      } else {
        const err = await res.json();
        toast({ title: "Could not save website", variant: "destructive", description: JSON.stringify(err.error) });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Globe className="w-6 h-6 text-purple-400" /> Business Website
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Your public storefront lives at{" "}
            <a href={`/b/${slug}`} target="_blank" className="text-purple-300 hover:underline">
              /b/{slug} <ExternalLink className="w-3 h-3 inline" />
            </a>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => save(false)}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 text-gray-200 text-sm font-medium hover:bg-white/10 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save draft
          </button>
          <button
            onClick={() => save(true)}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {draft.isPublished ? "Update live site" : "Publish"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: editor */}
        <div className="lg:col-span-2 space-y-5">
          {/* Theme */}
          <section className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h2 className="font-semibold text-white mb-3">Theme</h2>
            <div className="flex flex-wrap gap-3">
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => set("themeId", theme.id)}
                  className={`text-left rounded-xl p-3 border transition-colors ${
                    draft.themeId === theme.id ? "border-purple-500 bg-purple-500/10" : "border-white/10 hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-full border border-white/20" style={{ backgroundColor: theme.primaryColor }} />
                    <span className="text-sm font-medium text-white">{theme.name}</span>
                  </div>
                  {theme.description && <p className="text-xs text-gray-400 max-w-[180px]">{theme.description}</p>}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 mt-4 text-sm text-gray-200 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.isPublished}
                onChange={(e) => set("isPublished", e.target.checked)}
                className="w-4 h-4 accent-purple-500"
              />
              Published (visible at /b/{slug})
            </label>
          </section>

          {/* Hero */}
          <section className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
            <h2 className="font-semibold text-white">Hero banner</h2>
            <div>
              <label className={labelCls}>Title</label>
              <input className={inputCls} value={draft.heroTitle} onChange={(e) => set("heroTitle", e.target.value)} placeholder="Demo Momo House" />
            </div>
            <div>
              <label className={labelCls}>Subtitle</label>
              <input className={inputCls} value={draft.heroSubtitle} onChange={(e) => set("heroSubtitle", e.target.value)} placeholder="Authentic Nepali momo, served fast" />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>CTA label</label>
                <input className={inputCls} value={draft.heroCtaLabel} onChange={(e) => set("heroCtaLabel", e.target.value)} placeholder="View Menu & Order" />
              </div>
              <div>
                <label className={labelCls}>CTA link</label>
                <input className={inputCls} value={draft.heroCtaLink} onChange={(e) => set("heroCtaLink", e.target.value)} placeholder="/r/demo-restaurant" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Hero image URL</label>
              <input className={inputCls} value={draft.heroImageUrl} onChange={(e) => set("heroImageUrl", e.target.value)} placeholder="https://…" />
            </div>
          </section>

          {/* About */}
          <section className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
            <h2 className="font-semibold text-white">About</h2>
            <div>
              <label className={labelCls}>Title</label>
              <input className={inputCls} value={draft.aboutTitle} onChange={(e) => set("aboutTitle", e.target.value)} placeholder="About us" />
            </div>
            <div>
              <label className={labelCls}>Text</label>
              <textarea className={inputCls} rows={4} value={draft.aboutText} onChange={(e) => set("aboutText", e.target.value)} placeholder="Founded in Thamel, we serve fresh momo daily…" />
            </div>
            <div>
              <label className={labelCls}>About image URL</label>
              <input className={inputCls} value={draft.aboutImageUrl} onChange={(e) => set("aboutImageUrl", e.target.value)} placeholder="https://…" />
            </div>
          </section>

          {/* Services */}
          <section className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
            <h2 className="font-semibold text-white">Services / offerings</h2>
            <div>
              <label className={labelCls}>Title</label>
              <input className={inputCls} value={draft.servicesTitle} onChange={(e) => set("servicesTitle", e.target.value)} placeholder="What we offer" />
            </div>
            <div>
              <label className={labelCls}>Text</label>
              <textarea className={inputCls} rows={4} value={draft.servicesText} onChange={(e) => set("servicesText", e.target.value)} placeholder="Dine-in, takeaway and catering…" />
            </div>
          </section>

          {/* Contact */}
          <section className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
            <h2 className="font-semibold text-white">Contact & location</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Phone</label>
                <input className={inputCls} value={draft.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input className={inputCls} value={draft.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Address text</label>
              <input className={inputCls} value={draft.addressText} onChange={(e) => set("addressText", e.target.value)} placeholder="Thamel, Kathmandu" />
            </div>
            <div>
              <label className={labelCls}>Map link (Google Maps embed / directions URL)</label>
              <input className={inputCls} value={draft.mapUrl} onChange={(e) => set("mapUrl", e.target.value)} placeholder="https://maps.google.com/…" />
            </div>
            <div>
              <label className={labelCls}>Footer text</label>
              <input className={inputCls} value={draft.footerText} onChange={(e) => set("footerText", e.target.value)} placeholder="Demo Momo House © 2026" />
            </div>
          </section>

          {/* SEO */}
          <section className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
            <h2 className="font-semibold text-white">SEO</h2>
            <div>
              <label className={labelCls}>Meta title</label>
              <input className={inputCls} value={draft.metaTitle} onChange={(e) => set("metaTitle", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Meta description</label>
              <textarea className={inputCls} rows={2} value={draft.metaDescription} onChange={(e) => set("metaDescription", e.target.value)} />
            </div>
          </section>
        </div>

        {/* Right: live preview */}
        <div className="lg:col-span-1">
          <div className="sticky top-20 space-y-3">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Live preview</p>
            <div
              className="rounded-2xl overflow-hidden border border-white/10"
              style={{
                backgroundColor: themes.find((t) => t.id === draft.themeId)?.background ?? "#0b0f19",
              }}
            >
              <div className="px-5 py-6 text-center">
                <p className="text-lg font-bold text-white truncate">{draft.heroTitle || "Your business name"}</p>
                {draft.heroSubtitle && <p className="text-xs opacity-70 mt-1 line-clamp-2">{draft.heroSubtitle}</p>}
                <div className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white">
                  {draft.heroCtaLabel || "View Menu & Order"}
                </div>
              </div>
              {draft.aboutText && (
                <div className="px-5 py-4 border-t border-white/10">
                  <p className="text-xs font-semibold text-white mb-1">{draft.aboutTitle || "About"}</p>
                  <p className="text-[11px] opacity-70 line-clamp-3">{draft.aboutText}</p>
                </div>
              )}
              {draft.contactPhone && (
                <div className="px-5 py-4 border-t border-white/10 flex items-center justify-between text-xs">
                  <span className="text-white/80">Contact</span>
                  <span className="text-white">{draft.contactPhone}</span>
                </div>
              )}
            </div>
            <a
              href={`/b/${slug}`}
              target="_blank"
              className="text-xs text-purple-300 hover:text-purple-200 inline-flex items-center gap-1"
            >
              Open live site <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}