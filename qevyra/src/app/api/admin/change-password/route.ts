import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { apiGuard } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: z.string().min(8, "New password must be at least 8 characters").max(128),
});

export async function POST(req: Request) {
  const guard = await apiGuard({});
  if (guard.error) return guard.error;
  const userId = guard.user.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = changePasswordSchema.safeParse(await req.json());
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { currentPassword, newPassword } = parsed.data;

  const record = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true, restaurantId: true },
  });
  if (!record?.passwordHash) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const matches = await bcrypt.compare(currentPassword, record.passwordHash);
  if (!matches) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: await bcrypt.hash(newPassword, 12),
      // Revoke every existing login (including this browser's) so all clients
      // must sign in again with the new password.
      tokenVersion: { increment: 1 },
    },
  });

  await logActivity("change_password", { restaurantId: record.restaurantId ?? null });
  return NextResponse.json({ success: true });
}