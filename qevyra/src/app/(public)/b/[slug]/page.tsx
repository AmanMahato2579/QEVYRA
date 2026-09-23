import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getPublicWebsite,
  serviceButtonWording,
  categoryBlurb,
  categorySectionTitle,
  parseSocialLinks,
  parseOpenNow,
  formatPrice,
} from "@/modules/website/services";
import { t } from "@/lib/i18n";
import {
  Phone,
  MapPin,
  Clock,
  Globe,
  MessageCircle,
  Mail,
  ChevronRight,
  Utensils,
  CalendarCheck,
  Star,
  Languages,
  Navigation,
  Music2,
  ArrowRight,
} from "lucide-react";
import TrackLookup from "./TrackLookup";

function SocialIcon({ kind, className }: { kind: "facebook" | "instagram" | "youtube" | "tiktok"; className?: string }) {
  if (kind === "tiktok") return <Music2 className={className} />;
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };
  if (kind === "facebook") {
    return (
      <svg {...common}>
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    );
  }
  if (kind === "instagram") {
    return (
      <svg {...common}>
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-1.92A29 29 0 0 0 23 11.75a29 29 0 0 0-.46-5.33z" />
      <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
    </svg>
  );
}

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

  const { business, theme, content, menuPreview } = site;
  const primary = theme?.primaryColor ?? "#f97316";
  const background = theme?.background ?? "#0b0f19";
  const fontFamily = theme?.fontFamily ?? "inter";

  const hasAbout = content.aboutTitle || content.aboutText;
  const hasServices = content.servicesTitle || content.servicesText;
  const wa = whatsappLink(business.whatsapp || business.phone);
  const mapHref = content.mapUrl || business.mapUrl;
  const address = content.addressText || business.address;
  const directionsHref = mapHref || (address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null);
  const mapEmbed = address ? `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed` : null;

  const fontClass =
    fontFamily === "serif" ? "font-serif" : fontFamily === "mono" ? "font-mono" : "font-sans";

  const words = serviceButtonWording(business.type, lang);
  const sectionTitle = categorySectionTitle(content, business.type, lang);
  const tagline = content.heroSubtitle || business.description;
  const heroBlurb = content.heroSubtitle ? business.description : categoryBlurb(business.type, lang);
  const hasReviewLink = Boolean(content.googleReviewUrl);
  const showTrack = site.services.track;
  const showMenu = site.services.menu;
  const showMenuSection = showMenu && menuPreview !== null;
  const showServicesSection = !showMenuSection && hasServices;
  const mainAnchor = showMenuSection ? "menu" : "services";
  const mainLabel = showMenuSection ? words.menu : t(lang, "Services", "सेवाहरू");
  const phone = content.contactPhone || business.phone;
  const email = content.contactEmail;
  const socials = parseSocialLinks(content.socialLinks);
  const openNow = parseOpenNow(business.openingHours);
  const rating = content.googleRating;
  const ratingCount = content.googleRatingCount;
  const showReviewsCard = rating !== null || hasReviewLink;
  const hasContact =
    address || phone || wa || email || business.openingHours || showReviewsCard || socials.length > 0;

  const nav: { href: string; label: string }[] = [
    { href: "#top", label: t(lang, "Home", "होम") },
    { href: `#${mainAnchor}`, label: mainLabel },
    ...(hasAbout ? [{ href: "#about", label: t(lang, "About", "हाम्रो बारेमा") }] : []),
    ...(showTrack ? [{ href: "#track", label: t(lang, "Tracking", "ट्र्याकिङ") }] : []),
    ...(hasContact ? [{ href: "#contact", label: t(lang, "Contact", "सम्पर्क") }] : []),
  ];

  return (
    <div id="top" className={`min-h-screen ${fontClass}`} style={{ backgroundColor: background, color: "#f8fafc" }}>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 backdrop-blur" style={{ backgroundColor: `${background}e6` }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <Link href="#top" className="flex items-center gap-3 min-w-0">
            {business.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={business.logoUrl} alt={business.name} className="w-10 h-10 rounded-xl object-cover shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-base shrink-0" style={{ backgroundColor: primary }}>
                {business.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-bold truncate leading-tight">{business.name}</p>
              {business.description && <p className="text-xs opacity-60 truncate">{business.description}</p>}
            </div>
          </Link>
          <nav className="hidden lg:flex items-center gap-6 text-sm">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className="opacity-75 hover:opacity-100">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={toggleHref}
              title="Language"
              className="text-xs opacity-70 hover:opacity-100 hidden sm:inline-flex items-center gap-1 px-2 py-2"
            >
              <Languages className="w-3.5 h-3.5" /> {lang === "EN" ? "नेपाली" : "English"}
            </Link>
            {showMenu ? (
              <Link
                href={`/r/${business.slug}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white"
                style={{ backgroundColor: primary }}
              >
                <Utensils className="w-4 h-4" /> {words.menu}
              </Link>
            ) : phone ? (
              <a
                href={`tel:${phone}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white"
                style={{ backgroundColor: primary }}
              >
                <Phone className="w-4 h-4" /> {t(lang, "Call Now", "कल गर्नुहोस्")}
              </a>
            ) : null}
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white bg-green-600"
              >
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {business.coverUrl && (
          <div className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={business.coverUrl} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/30" />
          </div>
        )}
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-24">
          <p className="text-xs md:text-sm font-bold tracking-[0.2em] uppercase" style={{ color: primary }}>
            {t(lang, "Welcome to", "स्वागत छ")} {business.name}
          </p>
          <h1 className="mt-3 text-4xl md:text-6xl font-extrabold leading-tight max-w-3xl">
            {content.heroTitle || business.name}
          </h1>
          {tagline && <p className="mt-3 text-xl md:text-2xl font-semibold opacity-90 max-w-2xl">{tagline}</p>}
          {heroBlurb && <p className="mt-4 text-base md:text-lg opacity-75 max-w-2xl leading-relaxed">{heroBlurb}</p>}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {showMenu && (
              <Link
                href={`/r/${business.slug}`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white"
                style={{ backgroundColor: primary }}
              >
                <Utensils className="w-4 h-4" /> {words.menu} <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            {site.services.bookings && (
              <Link
                href={`/r/${business.slug}/book`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold border border-white/25 hover:bg-white/10"
              >
                <CalendarCheck className="w-4 h-4" /> {words.booking}
              </Link>
            )}
            {showTrack && !showMenu && (
              <Link
                href="#track"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white"
                style={{ backgroundColor: primary }}
              >
                {words.track} <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            {showTrack && showMenu && (
              <Link
                href="#track"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold border border-white/25 hover:bg-white/10"
              >
                {words.track}
              </Link>
            )}
            {content.heroCtaLink && (
              <Link
                href={content.heroCtaLink}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold border border-white/25 hover:bg-white/10"
              >
                {content.heroCtaLabel || t(lang, "Get started", "सुरु गर्नुहोस्")}
              </Link>
            )}
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold border border-green-500/60 hover:bg-green-500/10"
              >
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </a>
            )}
            {directionsHref && (
              <a
                href={directionsHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold border border-white/25 hover:bg-white/10"
              >
                <Navigation className="w-4 h-4" /> {t(lang, "Get Directions", "बाटो पत्ता लगाउनुहोस्")}
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Main business section: real menu items for restaurants, services text otherwise */}
      {showMenuSection && menuPreview && (
        <section id="menu" className="bg-white text-slate-900">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 md:py-20">
            <div className="md:flex md:items-end md:justify-between gap-8">
              <div className="max-w-xl">
                <p className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: primary }}>
                  {sectionTitle}
                </p>
                <h2 className="mt-2 text-3xl md:text-4xl font-extrabold">{t(lang, "Popular Dishes", "लोकप्रिय परिकारहरू")}</h2>
              </div>
              <Link
                href={`/r/${business.slug}`}
                className="mt-4 md:mt-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold border-2 shrink-0"
                style={{ borderColor: primary, color: primary }}
              >
                {t(lang, "View Full Menu", "पूरा मेनु हेर्नुहोस्")} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {menuPreview.items.map((item) => (
                <Link
                  key={`${item.categoryName}-${item.name}`}
                  href={`/r/${business.slug}`}
                  className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt={item.name} className="w-full aspect-[4/3] object-cover" />
                  ) : (
                    <div className="w-full aspect-[4/3] flex items-center justify-center text-white text-3xl font-extrabold" style={{ backgroundColor: primary }}>
                      {item.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="p-3">
                    <p className="font-bold text-sm leading-snug">{item.name}</p>
                    {item.description && <p className="mt-1 text-xs text-slate-500 leading-snug line-clamp-2">{item.description}</p>}
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-sm font-extrabold" style={{ color: primary }}>
                        {formatPrice(item.price, menuPreview.currency)}
                      </p>
                      <ArrowRight className="w-4 h-4" style={{ color: primary }} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {showServicesSection && (
        <section id="services" className="bg-white text-slate-900">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 md:py-20">
            <p className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: primary }}>
              {t(lang, "Our Services", "हाम्रा सेवाहरू")}
            </p>
            {sectionTitle && <h2 className="mt-2 text-3xl md:text-4xl font-extrabold max-w-2xl">{sectionTitle}</h2>}
            {content.servicesText && (
              <p className="mt-4 leading-relaxed text-slate-600 whitespace-pre-line max-w-2xl">{content.servicesText}</p>
            )}
          </div>
        </section>
      )}

      {/* About */}
      {hasAbout && (
        <section id="about" className="border-t border-white/10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 md:py-20">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              {content.aboutImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={content.aboutImageUrl} alt={content.aboutTitle || "About"} className="rounded-2xl w-full object-cover aspect-[4/3]" />
              )}
              <div>
                <p className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: primary }}>
                  {t(lang, "About Us", "हाम्रो बारेमा")}
                </p>
                {content.aboutTitle && <h2 className="mt-2 text-3xl md:text-4xl font-extrabold">{content.aboutTitle}</h2>}
                {content.aboutText && <p className="mt-4 opacity-80 whitespace-pre-line leading-relaxed">{content.aboutText}</p>}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Tracking — only when the business can really track */}
      {showTrack && (
        <section id="track" className="border-t border-white/10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 md:py-20">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-10 text-center">
              <p className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: primary }}>
                {t(lang, "Track Your Job", "आफ्नो काम ट्र्याक गर्नुहोस्")}
              </p>
              <h2 className="mt-2 text-2xl md:text-3xl font-extrabold">
                {t(lang, "Enter your ticket code to see your order status.", "अर्डर स्थिति हेर्न टिकट कोड लेख्नुहोस्।")}
              </h2>
              <div className="mt-6">
                <TrackLookup
                  lang={lang}
                  primaryColor={primary}
                  buttonLabel={t(lang, "Track", "ट्र्याक गर्नुहोस्")}
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Visit + contact + hours + reviews + socials — every card needs real data */}
      {hasContact && (
        <section id="contact" className="border-t border-white/10 bg-white text-slate-900">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 md:py-20">
            <h2 className="text-3xl md:text-4xl font-extrabold">{t(lang, "Contact Us", "सम्पर्क गर्नुहोस्")}</h2>
            <div className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {address && (
                <div>
                  <p className="flex items-center gap-2 font-bold">
                    <MapPin className="w-4 h-4" style={{ color: primary }} /> {t(lang, "Visit Us", "हामीलाई भेट्नुहोस्")}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">{address}</p>
                  {directionsHref && (
                    <a
                      href={directionsHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-sm font-semibold"
                      style={{ color: primary }}
                    >
                      {t(lang, "Get Directions", "बाटो पत्ता लगाउनुहोस्")} <ChevronRight className="w-4 h-4" />
                    </a>
                  )}
                  {mapEmbed && (
                    <iframe
                      title={`${business.name} map`}
                      src={mapEmbed}
                      loading="lazy"
                      className="mt-4 w-full h-44 rounded-2xl border border-slate-200"
                    />
                  )}
                </div>
              )}
              {(phone || wa || email) && (
                <div>
                  <p className="flex items-center gap-2 font-bold">
                    <Phone className="w-4 h-4" style={{ color: primary }} /> {t(lang, "Contact Us", "सम्पर्क गर्नुहोस्")}
                  </p>
                  <div className="mt-2 space-y-2 text-sm">
                    {phone && (
                      <p>
                        <span className="text-slate-500">{t(lang, "Phone", "फोन")}: </span>
                        <a href={`tel:${phone}`} className="font-semibold hover:underline">{phone}</a>
                      </p>
                    )}
                    {wa && (
                      <p>
                        <span className="text-slate-500">WhatsApp: </span>
                        <a href={wa} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">
                          {business.whatsapp || business.phone}
                        </a>
                      </p>
                    )}
                    {email && (
                      <p>
                        <span className="text-slate-500">{t(lang, "Email", "इमेल")}: </span>
                        <a href={`mailto:${email}`} className="font-semibold hover:underline break-all">{email}</a>
                      </p>
                    )}
                  </div>
                </div>
              )}
              {business.openingHours && (
                <div>
                  <p className="flex items-center gap-2 font-bold">
                    <Clock className="w-4 h-4" style={{ color: primary }} /> {t(lang, "Opening Hours", "खुल्ने समय")}
                  </p>
                  {openNow !== null && (
                    <p
                      className={`mt-2 inline-block text-xs font-bold px-2.5 py-1 rounded-full ${
                        openNow ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}
                    >
                      {openNow ? t(lang, "Open now", "अहिले खुला छ") : t(lang, "Closed", "बन्द छ")}
                    </p>
                  )}
                  <p className="mt-2 text-sm text-slate-600 whitespace-pre-line">{business.openingHours}</p>
                </div>
              )}
              {showReviewsCard && (
                <div>
                  <p className="flex items-center gap-2 font-bold">
                    <Star className="w-4 h-4" style={{ color: primary }} /> {t(lang, "What Our Customers Say", "ग्राहकहरू के भन्छन्")}
                  </p>
                  {rating !== null && (
                    <div className="mt-2">
                      <p className="text-2xl font-extrabold inline">{rating.toFixed(1)} </p>
                      <span className="inline-flex items-center gap-0.5 align-middle">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <Star
                            key={i}
                            className="w-4 h-4"
                            style={{ color: i < Math.round(rating) ? "#f59e0b" : undefined }}
                            opacity={i < Math.round(rating) ? 1 : 0.3}
                            fill={i < Math.round(rating) ? "currentColor" : "none"}
                          />
                        ))}
                      </span>
                      {ratingCount !== null && (
                        <p className="mt-1 text-xs text-slate-500">
                          {t(lang, `Based on ${ratingCount} Google reviews`, `${ratingCount} गुगल रिभ्युका आधारमा`)}
                        </p>
                      )}
                    </div>
                  )}
                  {hasReviewLink && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a
                        href={content.googleReviewUrl!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border-2"
                        style={{ borderColor: primary, color: primary }}
                      >
                        {t(lang, "Read Google Reviews", "गुगल रिभ्यु पढ्नुहोस्")}
                      </a>
                      <a
                        href={content.googleReviewUrl!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-white"
                        style={{ backgroundColor: primary }}
                      >
                        {t(lang, "Leave a Review", "रिभ्यु दिनुहोस्")}
                      </a>
                    </div>
                  )}
                </div>
              )}
              {socials.length > 0 && (
                <div>
                  <p className="font-bold">{t(lang, "Follow Us", "फलो गर्नुहोस्")}</p>
                  <div className="mt-3 flex items-center gap-2">
                    {socials.map((s) => {
                      return (
                        <a
                          key={s.kind}
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={s.kind}
                          className="w-9 h-9 rounded-full bg-slate-900 text-white inline-flex items-center justify-center hover:opacity-80"
                        >
                          <SocialIcon kind={s.kind} className="w-4 h-4" />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-white/10 pb-24 md:pb-10" style={{ backgroundColor: "#06090f" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-3 min-w-0">
              {business.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={business.logoUrl} alt={business.name} className="w-10 h-10 rounded-xl object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shrink-0" style={{ backgroundColor: primary }}>
                  {business.name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-bold truncate">{business.name}</p>
                {business.description && <p className="text-xs opacity-60 truncate">{business.description}</p>}
              </div>
            </div>
            <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              {nav.map((item) => (
                <Link key={item.href} href={item.href} className="opacity-70 hover:opacity-100">
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-3 text-sm">
              {address && (
                <span className="inline-flex items-center gap-1.5 opacity-70">
                  <MapPin className="w-4 h-4" /> <span className="max-w-48 truncate">{address}</span>
                </span>
              )}
              {phone && (
                <a href={`tel:${phone}`} className="inline-flex items-center gap-1.5 opacity-70 hover:opacity-100">
                  <Phone className="w-4 h-4" /> {phone}
                </a>
              )}
              {socials.map((s) => {
                return (
                  <a key={s.kind} href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.kind} className="opacity-70 hover:opacity-100">
                    <SocialIcon kind={s.kind} className="w-4 h-4" />
                  </a>
                );
              })}
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs opacity-60">
            <p>© 2026 {business.name}. {t(lang, "All rights reserved.", "सर्वाधिकार सुरक्षित।")}</p>
            <p>
              {t(lang, "Powered by", "द्वारा संचालित")} <span className="font-semibold">QEVYRA</span>
            </p>
          </div>
        </div>
      </footer>

      {/* Mobile quick actions — only real channels */}
      {(phone || wa || directionsHref) && (
        <div className="fixed bottom-0 inset-x-0 z-40 md:hidden border-t border-white/10 backdrop-blur" style={{ backgroundColor: `${background}e6` }}>
          <div className="grid grid-cols-3 divide-x divide-white/10">
            {phone && (
              <a href={`tel:${phone}`} className="flex items-center justify-center gap-1.5 py-3.5 text-sm font-semibold">
                <Phone className="w-4 h-4" style={{ color: primary }} /> {t(lang, "Call", "कल")}
              </a>
            )}
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 py-3.5 text-sm font-semibold">
                <MessageCircle className="w-4 h-4 text-green-500" /> WhatsApp
              </a>
            )}
            {directionsHref && (
              <a href={directionsHref} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 py-3.5 text-sm font-semibold">
                <Navigation className="w-4 h-4" style={{ color: primary }} /> {t(lang, "Directions", "बाटो")}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
