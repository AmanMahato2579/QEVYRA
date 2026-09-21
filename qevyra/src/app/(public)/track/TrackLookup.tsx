"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TrackLookup() {
  const router = useRouter();
  const [value, setValue] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = value.trim();
    if (!code) return;
    router.push(`/track/${code.toUpperCase()}`);
  };

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="e.g. MOMO-0001"
        className="flex-1 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-500 uppercase"
        autoFocus
      />
      <button
        type="submit"
        disabled={!value.trim()}
        className="px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Track
      </button>
    </form>
  );
}