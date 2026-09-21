// QEVYRA Track — pure UI catalog (no server imports, client-safe).
// Shared labels/badges for ticket statuses so admin + public pages stay in
// sync with the TicketStatus enum.

export const WORKFLOW_LIMIT_KEY = "workflows";

export const TRACK_STATUS_META: Record<string, { label: string; badge: string }> = {
  PLACED: { label: "Placed", badge: "bg-sky-100 text-sky-800 border-sky-200" },
  IN_PROGRESS: { label: "In progress", badge: "bg-blue-100 text-blue-800 border-blue-200" },
  READY: { label: "Ready", badge: "bg-green-100 text-green-800 border-green-200" },
  COMPLETED: { label: "Completed", badge: "bg-gray-100 text-gray-800 border-gray-200" },
  CANCELLED: { label: "Cancelled", badge: "bg-red-100 text-red-800 border-red-200" },
};

export function trackStatusMeta(status: string): { label: string; badge: string } {
  return TRACK_STATUS_META[status] ?? { label: status, badge: "bg-gray-100 text-gray-800 border-gray-200" };
}

export type TicketAction = "advance" | "cancel";

export const TICKET_ACTIONS: Record<TicketAction, { label: string; confirm: string }> = {
  advance: { label: "Advance", confirm: "Advance this ticket to its next step?" },
  cancel: { label: "Cancel", confirm: "Cancel this ticket? The customer tracking page will show it as cancelled." },
};