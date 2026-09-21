"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy } from "lucide-react";
import { t } from "@/lib/i18n";

/** Page poller: the customer's tracking page refreshes itself every few seconds
 *  so the status moves without the customer reloading. Also offers copy-code. */
export default function TicketLive({ code, lang }: { code: string; lang?: string }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const id = setInterval(() => router.refresh(), 6000);
    return () => clearInterval(id);
  }, [router]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — ignore
    }
  };

  return (
    <button
      onClick={copy}
      title="Copy code"
      className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-white/20 hover:bg-white/10"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? t(lang, "Copied", "प्रतिलिपि भयो") : t(lang, "Copy code", "कोड प्रतिलिपि गर्नुहोस्")}
    </button>
  );
}