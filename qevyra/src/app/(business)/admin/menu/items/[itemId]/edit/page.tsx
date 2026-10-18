import { requireRestaurantAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import MenuItemForm from "@/components/admin/MenuItemForm";

interface Props {
  params: Promise<{ itemId: string }>;
}

export const metadata = { title: "Edit Menu Item – QEVYRA Admin" };

export default async function EditMenuItemPage({ params }: Props) {
  const { itemId } = await params;
  const user = await requireRestaurantAdmin();

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: user.restaurantId! },
    select: { businessId: true },
  });
  const businessId = user.businessId ?? restaurant?.businessId ?? null;

  const [item, categories, inventoryItems] = await Promise.all([
    prisma.menuItem.findFirst({
      where: { id: itemId, restaurantId: user.restaurantId! },
      include: {
        variants: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
        recipe: true,
      },
    }),
    prisma.category.findMany({
      where: { restaurantId: user.restaurantId!, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    businessId
      ? prisma.inventoryItem.findMany({
          where: { businessId, isActive: true },
          select: { id: true, name: true, unit: true, currentStock: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  if (!item) notFound();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Menu Item</h1>
        <p className="text-gray-500 text-sm mt-1">Update &quot;{item.name}&quot;</p>
      </div>
      <MenuItemForm
        categories={JSON.parse(JSON.stringify(categories))}
        defaultCategoryId={item.categoryId}
        item={JSON.parse(JSON.stringify(item))}
        inventoryItems={JSON.parse(JSON.stringify(inventoryItems))}
      />
    </div>
  );
}
