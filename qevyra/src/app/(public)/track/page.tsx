import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Truck, Languages } from "lucide-react";
import { t } from "@/lib/i18n";
import TrackLookup from "./TrackLookup";

export const dynamic = "force-dynamic";

export default async function TrackHomePage({
  searchParams,
}: {
  searchParams: Promise<{ business?: string; lang?: string }>;
}) {
  const { business, lang: langParam } = await searchParams;
  const lang = langParam === "NEP" ? "NEP" : "EN";
  const toggleHref =
    lang === "NEP"
      ? `/track${business ? `?business=${business}` : ""}`
      : `/track${business ? `?business=${business}&` : "?"}lang=NEP`;
  let businessName: string | null = null;
  if (business) {
    const row = await prisma.business.findUnique({
      where: { slug: business, isActive: true },
      select: { name: true },
    });
    businessName = row?.name ?? null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 text-white">
      <header className="border-b border-white/10 backdrop-blur-sm bg-white/5">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold">QEVYRA <span className="text-orange-400">Track</span></span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href={toggleHref}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-white/20 hover:bg-white/10"
            >
              <Languages className="w-3.5 h-3.5" />
              {lang === "EN" ? "नेपाली" : "English"}
            </Link>
            <Link href="/" className="text-sm text-white/60 hover:text-white">{t(lang, "Back to QEVYRA", "QEVYRA मा फर्कनुहोस्")}</Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-20 max-w-lg text-center">
        <div className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-500/30 rounded-full px-4 py-2 text-sm text-orange-400 mb-8">
          {businessName ? `${businessName} · ` : ""}{t(lang, "Track your job", "आफ्नो कामको अवस्था हेर्नुहोस्")}
        </div>
        <h1 className="text-4xl font-extrabold mb-3">{t(lang, "Where is my order/job?", "मेरो अर्डर/काम कहाँ छ?")}</h1>
        <p className="text-gray-400 mb-10">
          {t(
            lang,
            "Enter the tracking code you received — like",
            "तपाईंले पाउनुभएको ट्र्याकिङ कोड लेख्नुहोस् — जस्तै",
          )}{" "}
          <span className="font-mono text-orange-300">MOMO-0001</span> — {t(lang, "to see live progress.", "लाइभ प्रगति हेर्न।")}
        </p>

        <TrackLookup />

        <p className="text-sm text-gray-500 mt-10">
          {t(lang, "You only get a tracking code when you use this service. Looking to add tracking to your own business?", "तपाईंले यो सेवा प्रयोग गर्दा मात्र ट्र्याकिङ कोड पाउनुहुन्छ। आफ्नो व्यवसायमा ट्र्याकिङ थप्न चाहनुहुन्छ?")}{" "}
          <Link href="/" className="text-orange-400 hover:underline">{t(lang, "Talk to QEVYRA", "QEVYRA सँग कुरा गर्नुहोस्")}</Link>.
        </p>
      </main>
    </div>
  );
}