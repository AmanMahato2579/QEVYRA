"use client";

import { ArrowRight, Clock } from "lucide-react";
import { t, orderStatusLabel } from "@/lib/i18n";

export interface StatusHistoryEntry {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  note?: string | null;
  createdAt: string;
  /** Optional prefix (e.g. order "#1042") when aggregating several entities. */
  label?: string | null;
}

const KATHMANDU_TIME = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kathmandu",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const STATUS_TONE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  ACCEPTED: "bg-green-100 text-green-700 border-green-200",
  PREPARING: "bg-orange-100 text-orange-700 border-orange-200",
  READY: "bg-sky-100 text-sky-700 border-sky-200",
  SERVED: "bg-green-100 text-green-700 border-green-200",
  COMPLETED: "bg-blue-100 text-blue-700 border-blue-200",
  REJECTED: "bg-red-100 text-red-700 border-red-200",
  CANCELLED: "bg-gray-200 text-gray-600 border-gray-300",
};

export default function StatusTimeline({
  entries,
  lang,
}: {
  entries: StatusHistoryEntry[];
  lang?: string | null;
}) {
  if (entries.length === 0) {
    return (
      <p className="text-xs text-gray-400 italic py-2">
        {t(lang, "No status history yet.", "अहिलेसम्म कुनै स्थिति इतिहास छैन।")}
      </p>
    );
  }

  return (
    <ol className="space-y-2">
      {entries.map((e, idx) => (
        <li key={e.id} className="flex items-start gap-2.5">
          <span className="flex flex-col items-center pt-1.5">
            <span className={`w-2 h-2 rounded-full ${idx === 0 ? "bg-orange-500" : "bg-gray-300"}`} />
            {idx < entries.length - 1 && <span className="w-px flex-1 bg-gray-200 mt-1" />}
          </span>
          <div className="min-w-0 flex-1 pb-1">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {e.label && <span className="font-bold text-gray-700">{e.label}</span>}
              {e.fromStatus && (
                <>
                  <span className={`px-1.5 py-0.5 rounded border text-[11px] font-medium ${STATUS_TONE[e.fromStatus] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                    {orderStatusLabel(e.fromStatus, lang)}
                  </span>
                  <ArrowRight className="w-3 h-3 text-gray-400" />
                </>
              )}
              <span className={`px-1.5 py-0.5 rounded border text-[11px] font-semibold ${STATUS_TONE[e.toStatus] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                {orderStatusLabel(e.toStatus, lang)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 mt-0.5 text-[11px] text-gray-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> {KATHMANDU_TIME.format(new Date(e.createdAt))}
              </span>
              {e.note && <span className="text-gray-500">{e.note}</span>}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
