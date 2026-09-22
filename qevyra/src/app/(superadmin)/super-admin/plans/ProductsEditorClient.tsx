"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { Save, Loader2, ShieldCheck } from "lucide-react";
import type { ProductTypeId } from "@/lib/plan-catalog";

interface ProductRow {
  id: ProductTypeId;
  name: string;
  description: string | null;
  featureKeys: string;
  limitKeys: string;
  sortOrder: number;
  isVisible: boolean;
  isActive: boolean;
}

interface FeatureDef {
  key: string;
  label: string;
  group: "menu" | "ordering" | "operations";
}

interface GroupDef {
  key: FeatureDef["group"];
  label: string;
}

interface LimitDef {
  key: string;
  label: string;
}

interface Props {
  products: ProductRow[];
  features: FeatureDef[];
  groups: GroupDef[];
  limits: LimitDef[];
}

interface Draft {
  id: ProductTypeId;
  name: string;
  description: string | null;
  featureKeys: Set<string>;
  limitKeys: Record<string, number>;
  isVisible: boolean;
  isActive: boolean;
}

const cardCls = "bg-white/5 border border-white/10 rounded-2xl p-5";
const inputCls = "w-full bg-white/10 border border-white/20 text-white rounded-lg px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500";

function parseFeatures(json: string): Set<string> {
  try {
    const arr = JSON.parse(json);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function parseLimits(json: string): Record<string, number> {
  try {
    const obj = JSON.parse(json);
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

export default function ProductsEditorClient({ products, features, groups, limits }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(
      products.map((p) => [
        p.id,
        {
          id: p.id,
          name: p.name,
          description: p.description,
          featureKeys: parseFeatures(p.featureKeys),
          limitKeys: parseLimits(p.limitKeys),
          isVisible: p.isVisible,
          isActive: p.isActive,
        },
      ])
    )
  );
  const [savingId, setSavingId] = useState<string | null>(null);

  const setDraft = (id: string, patch: Partial<Draft>) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const toggleFeature = (id: string, key: string) => {
    const next = new Set(drafts[id].featureKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setDraft(id, { featureKeys: next });
  };

  const setLimit = (id: string, key: string, value: string) => {
    const num = Number(value);
    const next: Record<string, number> = { ...drafts[id].limitKeys };
    if (Number.isFinite(num) && num >= 0) next[key] = num;
    setDraft(id, { limitKeys: next });
  };

  const save = async (draft: Draft) => {
    setSavingId(draft.id);
    try {
      const res = await fetch(`/api/super-admin/products/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          description: draft.description,
          featureKeys: [...draft.featureKeys],
          limitKeys: draft.limitKeys,
          isVisible: draft.isVisible,
          isActive: draft.isActive,
        }),
      });
      if (res.ok) {
        toast({ title: `${draft.name} saved`, variant: "success" });
        router.refresh();
      } else {
        const err = await res.json();
        toast({ title: "Could not save product", variant: "destructive", description: JSON.stringify(err.error ?? err) });
      }
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {products.map((product) => {
        const draft = drafts[product.id];
        if (!draft) return null;
        return (
          <div key={product.id} className={`${cardCls} ${!draft.isActive ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-purple-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold">{draft.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-300 border border-white/10">{draft.id}</span>
                  </div>
                  <input
                    value={draft.description ?? ""}
                    onChange={(e) => setDraft(draft.id, { description: e.target.value })}
                    placeholder="Short description (used in onboarding + super admin)"
                    className={`${inputCls} mt-1 text-xs`}
                  />
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <label className="flex items-center gap-1.5 text-gray-300 cursor-pointer">
                  <input type="checkbox" checked={draft.isVisible} onChange={(e) => setDraft(draft.id, { isVisible: e.target.checked })} className="w-4 h-4 accent-purple-500" />
                  Offerable
                </label>
                <label className="flex items-center gap-1.5 text-gray-300 cursor-pointer">
                  <input type="checkbox" checked={draft.isActive} onChange={(e) => setDraft(draft.id, { isActive: e.target.checked })} className="w-4 h-4 accent-purple-500" />
                  Active
                </label>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Limits</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {limits.map((limit) => (
                  <div key={limit.key} className="space-y-1">
                    <label className="text-xs text-gray-400">{limit.label}</label>
                    <input
                      type="number" min={0}
                      value={draft.limitKeys[limit.key] ?? 0}
                      onChange={(e) => setLimit(draft.id, limit.key, e.target.value)}
                      className={inputCls}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Features this product unlocks</p>
              <div className="space-y-3">
                {groups.map((group) => (
                  <div key={group.key}>
                    <p className="text-xs font-medium text-gray-300 mb-2">{group.label}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {features.filter((f) => f.group === group.key).map((feature) => (
                        <label key={feature.key} className="flex items-center gap-2 text-sm text-gray-200 cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10 transition-colors">
                          <input
                            type="checkbox"
                            checked={draft.featureKeys.has(feature.key)}
                            onChange={() => toggleFeature(draft.id, feature.key)}
                            className="w-4 h-4 accent-purple-500"
                          />
                          {feature.label}
                          <span className="ml-auto text-[10px] text-gray-500">{feature.key}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => save(draft)}
                disabled={savingId === draft.id}
                className="flex items-center gap-2 px-5 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium text-sm disabled:opacity-50 transition-colors"
              >
                {savingId === draft.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save {draft.name}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}