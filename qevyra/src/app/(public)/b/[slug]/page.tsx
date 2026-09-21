import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicWebsite, serviceButtonWording, categoryBlurb } from "@/modules/website/services";
import { t } from "@/lib/i18n";
import { Phone, MapPin, Clock, Globe, MessageCircle, Mail, ChevronRight, Utensils, CalendarCheck, Star, Languages } from "lucide-react";
import TrackLookup from "./TrackLookup";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}

function whatsappLink(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.length < 7) return null;
  return `https://wa.me/${digits}`;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const site = await getPublicWebsite(slug);
  if (!site) return { title: "QEVYRA" };
  return {
    title: site.meta.metaTitle || `${site.business.name} — QEVYRA`,
    description: site.meta.metaDescription || site.business.description || undefined,
  };
}

export default async function BusinessWebsitePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { lang: langParam } = await searchParams;
  const lang = langParam === "NEP" ? "NEP" : "EN";
  const toggleHref = lang === "NEP" ? `/b/${slug}` : `/b/${slug}?lang=NEP`;

  const site = await getPublicWebsite(slug);
  if (!site) notFound();

  const { business, theme, content } = site;
  const primary = theme?.primaryColor ?? "#f97316";
  const background = theme?.background ?? "#0b0f19";
  const fontFamily = theme?.fontFamily ?? "inter";

  const hasAbout = content.aboutTitle || content.aboutText;
  const hasServices = content.servicesTitle || content.servicesText;
  const wa = whatsappLink(business.whatsapp || business.phone);
  const mapHref = content.mapUrl || business.mapUrl;

  const fontClass =
    fontFamily === "serif" ? "font-serif" : fontFamily === "mono" ? "font-mono" : "font-sans";

  const words = serviceButtonWording(business.type, lang);
  const blurb = content.heroSubtitle || categoryBlurb(business.type, lang);
  const hasReviewLink = Boolean(content.googleReviewUrl);
  const showTrack = site.services.track;
  const showMenu = site.services.menu;

  return (
    <div className={`min-h-screen ${fontClass}`} style={{ backgroundColor: background, color: "#f8fafc" }}>
      {/* Top bar: name + logo, language toggle */}
      <header className="border-b border-white/10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {business.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={business.logoUrl} alt={business.name} className="w-9 h-9 rounded-xl object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-sm" style={{ backgroundColor: primary }}>
                {business.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-bold truncate">{business.name}</p>
              {business.description && <p className="text-xs opacity-60 truncate">{business.description}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href={toggleHref}
              title="Language"
              className="text-xs opacity-70 hover:opacity-100 flex items-center gap-1"
            >
              <Languages className="w-3.5 h-3.5" /> {lang === "EN" ? "नेपाली" : "English"}
            </Link>
            <Link href="/" className="text-xs opacity-70 hover:opacity-100 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" /> QEVYRA
            </Link>
          </div>
        </div>
      </header>

      {/* Hero: name + category blurb + actions */}
      <section className="relative">
        {business.coverUrl && (
          <div className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={business.coverUrl} alt="" className="w-full h-full object-cover opacity-20" />
            <div className="absolute inset-0" style={{ backgroundColor: background }} />
          </div>
        )}
        <div className="relative max-w-5xl mx-auto px-6 py-20 text-center">
          {(content.heroTitle || business.name) && (
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight">
              {content.heroTitle || business.name}
            </h1>
          )}
          {blurb && <p className="mt-5 text-lg md:text-xl opacity-80 max-w-2xl mx-auto leading-relaxed">{blurb}</p>}

          <div className="mt-9 flex flex-col items-center justify-center gap-4">
            {showMenu && !showTrack && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                {site.services.bookings && (
                  <Link
                    href={`/r/${business.slug}/book`}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white"
                    style={{ backgroundColor: primary }}
                  >
                    <CalendarCheck className="w-4 h-4" />
                    {words.booking}
                  </Link>
                )}
                <Link
                  href={`/r/${business.slug}`}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white"
                  style={{ backgroundColor: primary }}
                >
                  <Utensils className="w-4 h-4" />
                  {words.menu}
                </Link>
              </div>
            )}

            {showTrack && (
              <TrackLookup
                lang={lang}
                primaryColor={primary}
                buttonLabel={t(lang, "Track", "ट्र्याक गर्नुहोस्")}
              />
            )}

            {content.heroCtaLink && (
              <Link
                href={content.heroCtaLink}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white"
                style={{ backgroundColor: primary }}
              >
                {content.heroCtaLabel || t(lang, "Get started", "सुरु गर्नुहोस्")}
              </Link>
            )}
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold border border-white/20 hover:bg-white/10"
              >
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </a>
            )}
          </div>
        </div>
      </section>

      {/* About */}
      {hasAbout && (
        <section className="max-w-5xl mx-auto px-6 py-16">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            {content.aboutImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={content.aboutImageUrl} alt={content.aboutTitle || "About"} className="rounded-2xl w-full object-cover aspect-[4/3]" />
            )}
            <div>
              {content.aboutTitle && <h2 className="text-3xl font-bold">{content.aboutTitle}</h2>}
              {content.aboutText && <p className="mt-4 opacity-80 whitespace-pre-line leading-relaxed">{content.aboutText}</p>}
            </div>
          </div>
        </section>
      )}

      {/* Services */}
      {hasServices && (
        <section className="border-t border-white/10">
          <div className="max-w-5xl mx-auto px-6 py-16">
            {content.servicesTitle && <h2 className="text-3xl font-bold">{content.servicesTitle}</h2>}
            {content.servicesText && <p className="mt-4 opacity-80 whitespace-pre-line leading-relaxed max-w-2xl">{content.servicesText}</p>}
          </div>
        </section>
      )}

      {/* Google review */}
      {hasReviewLink && (
        <section className="border-t border-white/10">
          <div className="max-w-5xl mx-auto px-6 py-16 text-center">
            <Star className="w-8 h-8 mx-auto mb-4" style={{ color: primary }} />
            <h2 className="text-3xl font-bold">{t(lang, "Liked what you saw?", "हाम्रो सेवा मन पर्यो?")}</h2>
            <p className="mt-3 opacity-70 max-w-lg mx-auto">
              {t(
                lang,
                "Your review on Google helps a small business like ours grow. It takes a minute and means a lot.",
                "गुगलमा तपाईंको रिभ्युले हामीजस्तो सानो व्यवसायलाई बढ्न मद्दत गर्छ। एक मिनेट लाग्छ, धेरै अर्थ राख्छ।",
              )}
            </p>
            <a
              href={content.googleReviewUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white"
              style={{ backgroundColor: primary }}
            >
              <Star className="w-4 h-4" />
              {t(lang, "Write a review", "रिभ्यु लेख्नुहोस्")}
            </a>
          </div>
        </section>
      )}

      {/* Contact */}
      <section className="border-t border-white/10">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold mb-8">{t(lang, "Contact", "सम्पर्क")}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {content.contactPhone && (
              <a href={`tel:${content.contactPhone}`} className="rounded-2xl border border-white/10 p-5 hover:bg-white/5">
                <Phone className="w-5 h-5 mb-3" style={{ color: primary }} />
                <p className="text-xs opacity-60 uppercase tracking-wider">{t(lang, "Phone", "फोन")}</p>
                <p className="mt-1 font-medium break-all">{content.contactPhone}</p>
              </a>
            )}
            {content.contactEmail && (
              <a href={`mailto:${content.contactEmail}`} className="rounded-2xl border border-white/10 p-5 hover:bg-white/5">
                <Mail className="w-5 h-5 mb-3" style={{ color: primary }} />
                <p className="text-xs opacity-60 uppercase tracking-wider">{t(lang, "Email", "इमेल")}</p>
                <p className="mt-1 font-medium break-all">{content.contactEmail}</p>
              </a>
            )}
            {content.addressText && (
              <div className="rounded-2xl border border-white/10 p-5">
                <MapPin className="w-5 h-5 mb-3" style={{ color: primary }} />
                <p className="text-xs opacity-60 uppercase tracking-wider">{t(lang, "Address", "ठेगाना")}</p>
                <p className="mt-1 font-medium">{content.addressText}</p>
              </div>
            )}
            {business.openingHours && (
              <div className="rounded-2xl border border-white/10 p-5">
                <Clock className="w-5 h-5 mb-3" style={{ color: primary }} />
                <p className="text-xs opacity-60 uppercase tracking-wider">{t(lang, "Opening hours", "खुल्ने समय")}</p>
                <p className="mt-1 font-medium whitespace-pre-line">{business.openingHours}</p>
              </div>
            )}
          </div>

          {mapHref && (
            <a
              href={mapHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium hover:underline"
              style={{ color: primary }}
            >
              {t(lang, "View on map", "नक्सामा हेर्नुहोस्")} <ChevronRight className="w-4 h-4" />
            </a>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-sm opacity-60">
        {content.footerText || `${business.name} · QEVYRA`}
      </footer>
    </div>
  );
}