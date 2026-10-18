"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TrackLookup() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !phone.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/track/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.token) {
        router.push(`/track/${encodeURIComponent(data.token)}`);
      } else {
        setError(data.error || "We couldn't find a ticket with that code and phone number.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 text-left">
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="e.g. MOMO-0001"
        className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-500 uppercase"
        autoFocus
      />
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        inputMode="tel"
        placeholder="Phone number on the ticket"
        className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={!code.trim() || !phone.trim() || loading}
        className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm py-3 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? "Checking…" : "Track"}
      </button>
    </form>
  );
}
