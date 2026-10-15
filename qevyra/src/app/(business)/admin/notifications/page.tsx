import { requireRestaurantAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { t } from "@/lib/i18n";
import { startOfBusinessDay } from "@/lib/db";
import {
  getNotificationEventCounts,
  listNotificationEvents,
  notificationChannelStatus,
} from "@/modules/notifications/services";
import NotificationsClient from "./NotificationsClient";

export const metadata = { title: "Notifications – QEVYRA Admin" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await requireRestaurantAdmin();

  const [notifications, unreadCount, restaurant] = await Promise.all([
    prisma.notification.findMany({
      // Notifications reset at the start of the business day (00:00 local).
      where: { restaurantId: user.restaurantId!, createdAt: { gte: startOfBusinessDay() } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.notification.count({
      where: { restaurantId: user.restaurantId!, createdAt: { gte: startOfBusinessDay() }, read: false },
    }),
    prisma.restaurant.findUnique({
      where: { id: user.restaurantId! },
      select: { language: true, businessId: true },
    }),
  ]);
  const lang = restaurant?.language ?? "EN";
  const businessId = user.businessId ?? restaurant?.businessId ?? null;

  const [events, counts] = businessId
    ? await Promise.all([listNotificationEvents(businessId, { take: 50 }), getNotificationEventCounts(businessId)])
    : [[], []];

  const countByStatus = new Map(counts.map((row) => [row.status as string, row._count._all]));
  const channels = notificationChannelStatus();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t(lang, "Notifications", "सूचनाहरू")}</h1>
        <p className="text-gray-500 text-sm mt-1">
          {unreadCount > 0
            ? `${unreadCount} ${t(lang, "unread notification", "नपढिएका सूचनाहरू")}${unreadCount > 1 ? (lang === "NEP" ? "" : "s") : ""}`
            : t(lang, "You're all caught up", "सबै सूचना पढिसक्नुभयो")}
        </p>
      </div>
      <NotificationsClient
        notifications={JSON.parse(JSON.stringify(notifications))}
        unreadCount={unreadCount}
        language={lang}
      />

      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{t(lang, "Outbound messages", "बाहिरी सन्देशहरू")}</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            {t(
              lang,
              "Messages QEVYRA tried to send to customers (WhatsApp / SMS). Nothing is marked sent unless a provider is connected.",
              "ग्राहकलाई पठाउन खोजिएका सन्देशहरू (WhatsApp / SMS)। कुनै प्रदायक जोडिएको छैन भने पठाइएको देखाइँदैन।"
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {channels.map((channel) => (
            <div
              key={channel.channel}
              className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between"
            >
              <div>
                <p className="font-semibold text-gray-900">{channel.label}</p>
                <p className="text-xs text-gray-400">{channel.channel}</p>
              </div>
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  channel.configured ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                }`}
              >
                {channel.configured
                  ? t(lang, "Connected", "जोडिएको")
                  : t(lang, "Not connected", "जोडिएको छैन")}
              </span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <CountChip label={t(lang, "Sent", "पठाइयो")} value={countByStatus.get("SENT") ?? 0} />
          <CountChip label={t(lang, "Failed", "असफल")} value={countByStatus.get("FAILED") ?? 0} tone="red" />
          <CountChip
            label={t(lang, "Not connected", "जोडिएको छैन")}
            value={countByStatus.get("NOT_CONFIGURED") ?? 0}
            tone="amber"
          />
        </div>

        {events.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <p className="text-sm text-gray-500">
              {t(lang, "No outbound messages yet.", "अहिलेसम्म कुनै बाहिरी सन्देश छैन।")}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
            {events.map((event) => (
              <div key={event.id} className="p-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-800">{event.channel}</span>
                  <StatusLabel status={event.status} language={lang} />
                  {event.refType && <span className="text-xs text-gray-400">{event.refType}</span>}
                </div>
                <p className="text-sm text-gray-600 mt-1 break-words">{event.body}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(event.createdAt).toLocaleString()} · {event.recipient}
                  {event.error ? ` · ${event.error}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusLabel({ status, language }: { status: string; language: string }) {
  if (status === "SENT")
    return <span className="text-xs font-semibold text-green-700">{t(language, "Sent", "पठाइयो")}</span>;
  if (status === "FAILED")
    return <span className="text-xs font-semibold text-red-700">{t(language, "Failed", "असफल")}</span>;
  if (status === "NOT_CONFIGURED")
    return <span className="text-xs font-semibold text-amber-700">{t(language, "Not connected", "जोडिएको छैन")}</span>;
  return <span className="text-xs font-semibold text-gray-500">{status}</span>;
}

function CountChip({ label, value, tone }: { label: string; value: number; tone?: "red" | "amber" }) {
  const color = tone === "red" ? "text-red-700" : tone === "amber" ? "text-amber-700" : "text-gray-700";
  return (
    <span className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-600">
      {label} · <span className={`font-semibold ${color}`}>{value}</span>
    </span>
  );
}
