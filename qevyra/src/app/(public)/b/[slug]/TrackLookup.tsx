"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Truck, Phone, Loader2 } from "lucide-react";
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
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const go = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed || !phone.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/track/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed, phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.token) {
        router.push(`/track/${encodeURIComponent(data.token)}`);
      } else {
        setError(
          data.error ||
            t(
              lang,
              "We couldn't find a ticket with that code and phone number.",
              "त्यो कोड र फोन नम्बरको टिकट भेटिएन।"
            )
        );
      }
    } catch {
      setError(t(lang, "Something went wrong. Please try again.", "केही गडबड भयो। फेरि प्रयास गर्नुहोस्।"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={go} className="w-full max-w-md mx-auto">
      <label className="block text-sm opacity-75 mb-2">
        {t(lang, "Enter your ticket code and phone number", "तपाईंको टिकट कोड र फोन नम्बर लेख्नुहोस्")}
      </label>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-3">
          <Truck className="w-4 h-4 opacity-60 shrink-0" />
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. DRY-0001"
            className="flex-1 bg-transparent py-3 text-sm focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-3">
          <Phone className="w-4 h-4 opacity-60 shrink-0" />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            placeholder="98xxxxxxxx"
            className="flex-1 bg-transparent py-3 text-sm focus:outline-none"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={!code.trim() || !phone.trim() || loading}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: primaryColor }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {buttonLabel}
        </button>
      </div>
    </form>
  );
}
