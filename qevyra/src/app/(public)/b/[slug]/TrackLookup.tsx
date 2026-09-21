"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Truck, Search } from "lucide-react";
import { t } from "@/lib/i18n";

export default function TrackLookup({
  lang,
  primaryColor,
  buttonLabel,
}: {
  lang: "EN" | "NEP";
  primaryColor: string;
  buttonLabel: string;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");

  const go = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    router.push(`/track/${encodeURIComponent(trimmed)}`);
  };

  return (
    <form onSubmit={go} className="w-full max-w-md mx-auto">
      <label className="block text-sm opacity-75 mb-2">
        {t(lang, "Enter your ticket code", "तपाईंको टिकट कोड लेख्नुहोस्")}
      </label>
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-3">
          <Truck className="w-4 h-4 opacity-60 shrink-0" />
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. DRY-0001"
            className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-white/40"
          />
        </div>
        <button
          type="submit"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-white shrink-0"
          style={{ backgroundColor: primaryColor }}
        >
          <Search className="w-4 h-4" /> {buttonLabel}
        </button>
      </div>
    </form>
  );
}