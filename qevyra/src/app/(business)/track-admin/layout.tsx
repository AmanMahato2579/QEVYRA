import { redirect } from "next/navigation";
import { requireBusinessAdmin } from "@/lib/auth-guard";
import { isTrackBusinessType } from "@/lib/business-kind";
import { canUse } from "@/lib/plans";
import TrackAdminShell from "./TrackAdminShell";

export const dynamic = "force-dynamic";

export default async function TrackAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireBusinessAdmin();

  if (!isTrackBusinessType(ctx.business.type)) {
    redirect("/admin");
  }

  if (!canUse(ctx.access, "business_track")) {
    redirect("/track-admin");
  }

  return (
    <TrackAdminShell
      userName={ctx.user.name ?? ctx.user.email}
      userEmail={ctx.user.email}
      businessName={ctx.business.name}
      businessType={ctx.business.type}
    >
      {children}
    </TrackAdminShell>
  );
}