import { Phone, MessageCircle } from "lucide-react";
import { sanitizePhoneDigits, formatWhatsAppDigits } from "../types";
import type { SiteData } from "../types";
import { SectionContainer } from "../SectionContainer";

export function ContactSection({
  site,
  isGrouped,
}: {
  site: SiteData;
  isGrouped?: boolean;
}) {
  const cleanPhone = sanitizePhoneDigits(site.phone);
  const cleanWhatsAppDigits = formatWhatsAppDigits(site.whatsapp);

  if (!cleanPhone && !cleanWhatsAppDigits) {
    return null;
  }

  const content = (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm h-full flex flex-col justify-between overflow-hidden">
      <div>
        <h2 className="text-base font-bold text-gray-900 mb-4">Contact Us</h2>

        <div className="flex flex-col gap-3">
          {cleanPhone && (
            <a
              href={`tel:${cleanPhone}`}
              className="flex items-start gap-3 p-3.5 rounded-xl border border-gray-100 hover:border-gray-200 bg-gray-50/50 hover:bg-gray-50 transition-colors overflow-hidden"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0 mt-0.5"
                style={{ backgroundColor: "var(--site-primary, #2563eb)" }}
              >
                <Phone className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1.5">
                  <p className="text-xs text-gray-500 font-medium">Direct Call</p>
                  <span className="text-xs font-medium text-gray-400 shrink-0">Call</span>
                </div>
                <p className="text-sm font-semibold text-gray-900 break-words leading-tight mt-0.5">
                  {cleanPhone}
                </p>
              </div>
            </a>
          )}

          {cleanWhatsAppDigits && (
            <a
              href={`https://wa.me/${cleanWhatsAppDigits}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 p-3.5 rounded-xl border border-emerald-100 hover:border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50 transition-colors overflow-hidden"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white shrink-0 mt-0.5">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1.5">
                  <p className="text-xs text-emerald-600 font-medium">WhatsApp</p>
                  <span className="text-xs font-medium text-emerald-600 shrink-0">Chat</span>
                </div>
                <p className="text-sm font-semibold text-gray-900 break-words leading-tight mt-0.5">
                  {cleanWhatsAppDigits}
                </p>
              </div>
            </a>
          )}
        </div>
      </div>
    </div>
  );

  if (isGrouped) {
    return content;
  }

  return (
    <SectionContainer className="py-5">
      {content}
    </SectionContainer>
  );
}
