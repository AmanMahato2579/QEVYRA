import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { QRCodeSVG } from "qrcode.react";
import { getPublicTicket } from "@/modules/track/services";
import { validBrandColor } from "@/lib/brand";
import { t, orderStatusLabel } from "@/lib/i18n";
import {
  MessageCircle,
  MapPin,
  Globe,
  Search,
  History,
  CheckCircle2,
  Circle,
  Truck,
  Languages,
} from "lucide-react";
import TicketLive from "./TicketLive";

interface Props {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ lang?: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  return { title: `Track ${code.toUpperCase()} | QEVYRA` };
}

const DARK_BADGES: Record<string, string> = {
  PLACED: "bg-sky-400/10 text-sky-300 border-sky-400/30",
  IN_PROGRESS: "bg-blue-400/10 text-blue-300 border-blue-400/30",
  READY: "bg-green-400/10 text-green-300 border-green-400/30",
  COMPLETED: "bg-gray-400/10 text-gray-300 border-gray-400/30",
  CANCELLED: "bg-red-400/10 text-red-300 border-red-400/30",
};

function whatsappLink(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.length < 7) return null;
  return `https://wa.me/${digits}`;
}

export default async function TrackCodePage({ params, searchParams }: Props) {
  const { code } = await params;
  const { lang: langParam } = await searchParams;
  const lang = langParam === "NEP" ? "NEP" : "EN";
  const ticket = await getPublicTicket(code);
  if (!ticket) notFound();

  const toggleHref =
    lang === "NEP" ? `/track/${code}` : `/track/${code}?lang=NEP`;

  const steps = ticket.steps;
  const badge = DARK_BADGES[ticket.status] ?? DARK_BADGES["PLACED"];
  const currentIdx = steps.findIndex((s) => s.id === ticket.currentStepId);
  const done =
    ticket.status === "READY" || ticket.status === "COMPLETED";
  const isCurrent = (i: number) =>
    ticket.status === "IN_PROGRESS" && i === currentIdx && !steps[i].isReadyStep;
  const stepDone = (i: number) =>
    (i < currentIdx) ||
    (i === currentIdx && done) ||
    ticket.status === "COMPLETED";

  const isReady = ticket.status === "READY";
  const wa = whatsappLink(ticket.business.whatsapp || ticket.business.phone);
  const scanUrl =
    (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000") +
    `/track/${ticket.trackingCode}`;

  return (
    <div data-brand={validBrandColor(ticket.business.brandColor)} className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 text-white">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm bg-white/5 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between gap-3">
          <Link href={`/b/${ticket.business.slug}`} className="flex items-center gap-2 min-w-0">
            {ticket.business.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ticket.business.logoUrl} alt="" className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-lg menu-hero-gradient flex items-center justify-center font-bold text-sm shrink-0">
                {ticket.business.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <span className="text-sm font-semibold truncate">{ticket.business.name}</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${badge}`}>
              {orderStatusLabel(ticket.status, lang)}
            </span>
            <Link href={toggleHref} title="Language" className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-white/20 hover:bg-white/10">
              <Languages className="w-3.5 h-3.5" /> {lang === "EN" ? "नेपाली" : "English"}
            </Link>
            <Link href="/track" title="Track another" className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-white/20 hover:bg-white/10">
              <Search className="w-3.5 h-3.5" /> {t(lang, "Track another", "अर्को ट्र्याक गर्नुहोस्")}
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {/* Code card */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8 text-center">
          <div className="flex items-center justify-center gap-2 text-orange-400 mb-3">
            <Truck className="w-5 h-5" />
            <span className="text-sm uppercase tracking-wider opacity-80">{t(lang, "Tracking", "ट्र्याकिङ")}</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <h1 className="font-mono text-4xl md:text-5xl font-extrabold tracking-wide">{ticket.trackingCode}</h1>
            <TicketLive code={ticket.trackingCode} lang={lang} />
          </div>
          {ticket.itemSummary && (
            <p className="text-gray-300 mt-3">{ticket.itemSummary}</p>
          )}
          {ticket.notes && <p className="text-gray-500 text-sm mt-1">{t(lang, "Note:", "टिप्पणी:")} {ticket.notes}</p>}
        </div>

        {/* Progress timeline */}
        <section className="mt-8">
          <h2 className="text-sm uppercase tracking-wider text-gray-400 mb-4">{t(lang, "Progress ·", "प्रगति ·")} {ticket.workflow.name}</h2>
          <ol className="space-y-0">
            {steps.length === 0 ? (
              <li className="text-sm text-gray-400">{t(lang, "No steps defined.", "कुनै चरण परिभाषित छैन।")}</li>
            ) : (
              steps.map((step, i) => {
                const d = stepDone(i);
                const cur = isCurrent(i);
                return (
                  <li key={step.id} className="relative flex gap-4 pb-8 last:pb-0">
                    {i < steps.length - 1 && (
                      <span className={`absolute left-[13px] top-8 bottom-0 w-px ${d || isReady ? "bg-green-400/50" : "bg-white/10"}`} />
                    )}
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                      {d ? (
                        <CheckCircle2 className="w-7 h-7 text-green-400" />
                      ) : cur ? (
                        <span className="w-7 h-7 rounded-full border-2 border-orange-400 flex items-center justify-center text-xs font-bold text-orange-400 animate-pulse">
                          {i + 1}
                        </span>
                      ) : (
                        <Circle className="w-7 h-7 text-white/15" />
                      )}
                    </div>
                    <div>
                      <p className={`font-semibold ${d ? "text-white" : cur ? "text-white" : "text-white/50"}`}>
                        {step.name}
                      </p>
                      {step.description && <p className="text-sm text-white/40">{step.description}</p>}
                      <p className="text-xs text-white/40 mt-0.5">{step.isReadyStep ? t(lang, "Ready · collect", "तयार · उठाउनुहोस्") : ""}</p>
                    </div>
                  </li>
                );
              })
            )}
          </ol>
        </section>

        {/* History */}
        <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="flex items-center gap-2 text-sm uppercase tracking-wider text-gray-400 mb-4">
            <History className="w-4 h-4" /> {t(lang, "Timeline", "समयरेखा")}
          </h2>
          <ul className="space-y-4">
            {ticket.history.length === 0 ? (
              <li className="text-sm text-gray-500">{t(lang, "No updates yet.", "अहिलेसम्म कुनै अपडेट छैन।")}</li>
            ) : (
              ticket.history.map((h) => (
                <li key={h.id} className="flex gap-3 text-sm">
                  <span className="text-white/20 mt-0.5">•</span>
                  <div>
                    <p className="text-gray-200">
                      <span className="font-semibold">{orderStatusLabel(h.toStatus, lang)}</span>
                      {h.toStepName ? ` — ${h.toStepName}` : ""}
                    </p>
                    <p className="text-xs text-white/40">
                      {new Date(h.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      {h.note ? ` · ${h.note}` : ""}
                    </p>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>

        {/* QR + contact */}
        <section className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 flex flex-col items-center text-center md:col-span-1">
            <div className="rounded-2xl bg-white p-3">
              <QRCodeSVG value={scanUrl} size={110} />
            </div>
            <p className="text-xs text-white/50 mt-3">{t(lang, "Scan to revisit this tracking page", "यो ट्र्याकिङ पृष्ठ फेरि खोल्न स्क्यान गर्नुहोस्")}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 md:col-span-2 space-y-4">
            <h2 className="text-sm uppercase tracking-wider text-gray-400">{t(lang, "Questions?", "प्रश्नहरू?")}</h2>
            {wa ? (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-2xl border border-green-400/30 bg-green-400/10 px-4 py-3 hover:bg-green-400/20 transition-colors"
              >
                <MessageCircle className="w-5 h-5 text-green-400" />
                <span className="text-sm font-medium">{t(lang, "Message the business on WhatsApp", "WhatsApp मार्फत व्यवसायलाई सन्देश पठाउनुहोस्")}</span>
              </a>
            ) : ticket.business.phone ? (
              <a href={`tel:${ticket.business.phone}`} className="flex items-center gap-3 rounded-2xl border border-white/20 px-4 py-3 hover:bg-white/10">
                <MessageCircle className="w-5 h-5" />
                <span className="text-sm font-medium">{t(lang, "Call", "कल गर्नुहोस्")} {ticket.business.phone}</span>
              </a>
            ) : null}
            <a href={`/b/${ticket.business.slug}`} className="flex items-center gap-3 rounded-2xl border border-white/20 px-4 py-3 hover:bg-white/10">
              <Globe className="w-5 h-5" />
              <span className="text-sm font-medium">{t(lang, "Visit website", "वेबसाइट हेर्नुहोस्")} · {ticket.business.name}</span>
            </a>
            {ticket.business.address && (
              <p className="flex items-center gap-3 text-sm text-white/60 px-2">
                <MapPin className="w-5 h-5" /> {ticket.business.address}
              </p>
            )}
          </div>
        </section>

        <footer className="text-center mt-12 text-xs text-white/40">
          {t(lang, "Tracked with", "द्वारा ट्र्याक गरिएको")} <Link href="/" className="text-orange-400 hover:underline">QEVYRA</Link> · {ticket.business.name}
        </footer>
      </main>
    </div>
  );
}