import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicWebsite } from "@/modules/website/services";
import { Phone, MapPin, Clock, Globe, MessageCircle, Mail, ArrowRight, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
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

export default async function BusinessWebsitePage({ params }: PageProps) {
  const { slug } = await params;
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

  return (
    <div className={`min-h-screen ${fontClass}`} style={{ backgroundColor: background, color: "#f8fafc" }}>
      {/* Top bar */}
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
          <Link
            href="/"
            className="text-xs opacity-70 hover:opacity-100 flex items-center gap-1 shrink-0"
          >
            <Globe className="w-3.5 h-3.5" /> QEVYRA
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        {business.coverUrl && (
          <div className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={business.coverUrl} alt="" className="w-full h-full object-cover opacity-20" />
            <div className="absolute inset-0" style={{ backgroundColor: background }} />
          </div>
        )}
        <div className="relative max-w-5xl mx-auto px-6 py-20 text-center">
          {content.heroTitle || business.name ? (
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight">
              {content.heroTitle || business.name}
            </h1>
          ) : null}
          {content.heroSubtitle && (
            <p className="mt-5 text-lg md:text-xl opacity-80 max-w-2xl mx-auto">{content.heroSubtitle}</p>
          )}
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
            {content.heroCtaLink && (content.heroCtaLabel || true) && (
              <Link
                href={content.heroCtaLink}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white"
                style={{ backgroundColor: primary }}
              >
                {content.heroCtaLabel || "Get started"}
                <ArrowRight className="w-4 h-4" />
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

      {/* Contact */}
      <section className="border-t border-white/10">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold mb-8">Contact</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {content.contactPhone && (
              <a href={`tel:${content.contactPhone}`} className="rounded-2xl border border-white/10 p-5 hover:bg-white/5">
                <Phone className="w-5 h-5 mb-3" style={{ color: primary }} />
                <p className="text-xs opacity-60 uppercase tracking-wider">Phone</p>
                <p className="mt-1 font-medium break-all">{content.contactPhone}</p>
              </a>
            )}
            {content.contactEmail && (
              <a href={`mailto:${content.contactEmail}`} className="rounded-2xl border border-white/10 p-5 hover:bg-white/5">
                <Mail className="w-5 h-5 mb-3" style={{ color: primary }} />
                <p className="text-xs opacity-60 uppercase tracking-wider">Email</p>
                <p className="mt-1 font-medium break-all">{content.contactEmail}</p>
              </a>
            )}
            {content.addressText && (
              <div className="rounded-2xl border border-white/10 p-5">
                <MapPin className="w-5 h-5 mb-3" style={{ color: primary }} />
                <p className="text-xs opacity-60 uppercase tracking-wider">Address</p>
                <p className="mt-1 font-medium">{content.addressText}</p>
              </div>
            )}
            {business.openingHours && (
              <div className="rounded-2xl border border-white/10 p-5">
                <Clock className="w-5 h-5 mb-3" style={{ color: primary }} />
                <p className="text-xs opacity-60 uppercase tracking-wider">Opening hours</p>
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
              View on map <ChevronRight className="w-4 h-4" />
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