// QEVYRA outbound notification providers (platform core).
//
// A channel (WhatsApp / SMS / email) is only "connected" when its credentials
// are present in the environment. There is deliberately NO fake-success path:
// if a channel has no provider or no credentials, callers record the attempt as
// NOT_CONFIGURED. Adding a real integration later means implementing one adapter
// here — no changes to the callers.
import { NotificationChannel } from "@prisma/client";

export interface OutboundMessage {
  channel: NotificationChannel;
  to: string;
  subject?: string | null;
  body: string;
}

export interface ProviderSendResult {
  ok: boolean;
  error?: string;
}

export interface NotificationProvider {
  id: string;
  channel: NotificationChannel;
  label: string;
  /** True only when the credentials this adapter needs are present. */
  isConfigured(): boolean;
  send(message: OutboundMessage): Promise<ProviderSendResult>;
}

function digits(value: string): string {
  return value.replace(/[^0-9]/g, "");
}

// WhatsApp Cloud API (Meta). Configure with WHATSAPP_CLOUD_TOKEN +
// WHATSAPP_PHONE_NUMBER_ID.
const whatsappProvider: NotificationProvider = {
  id: "whatsapp-cloud",
  channel: NotificationChannel.WHATSAPP,
  label: "WhatsApp Cloud API",
  isConfigured: () => Boolean(process.env.WHATSAPP_CLOUD_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
  async send(message) {
    const token = process.env.WHATSAPP_CLOUD_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneId) return { ok: false, error: "WhatsApp is not configured." };
    try {
      const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: digits(message.to),
          type: "text",
          text: { body: message.body },
        }),
      });
      if (!res.ok) {
        const detail = (await res.text()).slice(0, 300);
        return { ok: false, error: `WhatsApp API ${res.status}: ${detail}` };
      }
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "WhatsApp send failed." };
    }
  },
};

// Generic SMS HTTP gateway. Configure with SMS_GATEWAY_URL + SMS_GATEWAY_TOKEN.
const smsProvider: NotificationProvider = {
  id: "sms-http",
  channel: NotificationChannel.SMS,
  label: "SMS (HTTP gateway)",
  isConfigured: () => Boolean(process.env.SMS_GATEWAY_URL && process.env.SMS_GATEWAY_TOKEN),
  async send(message) {
    const url = process.env.SMS_GATEWAY_URL;
    const token = process.env.SMS_GATEWAY_TOKEN;
    if (!url || !token) return { ok: false, error: "SMS is not configured." };
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ to: digits(message.to), text: message.body }),
      });
      if (!res.ok) return { ok: false, error: `SMS gateway responded ${res.status}` };
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "SMS send failed." };
    }
  },
};

const PROVIDERS: NotificationProvider[] = [whatsappProvider, smsProvider];

export function getProvider(channel: NotificationChannel): NotificationProvider | null {
  return PROVIDERS.find((provider) => provider.channel === channel) ?? null;
}

export interface ChannelStatus {
  channel: NotificationChannel;
  providerId: string;
  label: string;
  configured: boolean;
}

/** Honest connection state per channel, for the admin UI. */
export function notificationChannelStatus(): ChannelStatus[] {
  const channels = [NotificationChannel.WHATSAPP, NotificationChannel.SMS];
  return channels.map((channel) => {
    const provider = getProvider(channel);
    return {
      channel,
      providerId: provider?.id ?? "none",
      label: provider?.label ?? String(channel),
      configured: provider?.isConfigured() ?? false,
    };
  });
}
