import { requireSuperAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { PRODUCT_CATALOG, FEATURE_CATALOG, FEATURE_GROUPS, LIMIT_CATALOG } from "@/lib/plan-catalog";
import PlanEditorClient from "./PlanEditorClient";
import ProductsEditorClient from "./ProductsEditorClient";

export const metadata = { title: "Plans – Super Admin" };
export const dynamic = "force-dynamic";

export default async function PlansPage() {
  await requireSuperAdmin();
  const plans = await prisma.plan.findMany({ orderBy: { sortOrder: "asc" } });
  const products = await prisma.product.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Products &amp; Plans</h1>
        <p className="text-gray-400 text-sm mt-1">
          Products are what a business is granted (Website, Menu, Order, Track). Access is derived from a
          business&apos;s active products; the legacy BRONZE / SILVER / STAR billing tiers below are kept for
          pricing and history only.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold">Product access</h2>
        <ProductsEditorClient
          products={JSON.parse(JSON.stringify(products))}
          features={FEATURE_CATALOG}
          groups={FEATURE_GROUPS}
          limits={LIMIT_CATALOG}
        />
      </div>

      <div className="pt-6 border-t border-white/10 space-y-4">
        <h2 className="text-xl font-bold">Legacy billing tiers</h2>
        <p className="text-gray-400 text-sm -mt-2">
          Kept for reference and used as the automatic fallback when a business has no product grants.
          STAR uses the <code className="text-purple-300">ALL_CURRENT_FEATURES</code> marker — new platform features are granted automatically.
        </p>
        <PlanEditorClient
          plans={JSON.parse(JSON.stringify(plans))}
          features={FEATURE_CATALOG}
          groups={FEATURE_GROUPS}
          limits={LIMIT_CATALOG}
        />
        <p className="text-xs text-gray-500">
          Catalog defaults: {PRODUCT_CATALOG.map((p) => p.label).join(", ")}.
        </p>
      </div>
    </div>
  );
}