import { requireSuperAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import BusinessDetailClient from "./BusinessDetailClient";

export const metadata = { title: "Business – Super Admin" };
export const dynamic = "force-dynamic";

export default async function BusinessDetailPage({ params }: { params: Promise<{ businessId: string }> }) {
  await requireSuperAdmin();
  const { businessId } = await params;

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: {
      restaurant: {
        include: {
          _count: { select: { tables: true, orders: true, bookings: true } },
        },
      },
      products: { include: { product: true } },
      users: { select: { id: true, name: true, email: true, role: true, createdAt: true }, orderBy: { createdAt: "asc" } },
      website: { select: { id: true, isPublished: true } },
      _count: { select: { workflows: true, tickets: true } },
    },
  });
  if (!business) notFound();

  const activity = await prisma.adminActivity.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    take: 15,
  });

  return <BusinessDetailClient business={JSON.parse(JSON.stringify(business))} activity={JSON.parse(JSON.stringify(activity))} />;
}