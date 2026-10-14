"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { X, Loader2, ArrowRightLeft } from "lucide-react";

export interface TransferTarget {
  id: string;
  tableNumber: number;
  occupied: boolean;
}

interface TransferModalProps {
  open: boolean;
  onClose: () => void;
  tableId: string;
  tableNumber: number;
  targets: TransferTarget[];
  lang?: string;
  onTransferred?: () => void;
}

/**
 * Move the active bill (session) from the current table to another free table.
 * Only free, active tables can be selected; the server re-validates and rejects
 * occupied destinations, so this restriction is a convenience, not the guard.
 */
export default function TransferModal({
  open,
  onClose,
  tableId,
  tableNumber,
  targets,
  lang = "EN",
  onTransferred,
}: TransferModalProps) {
  const { toast } = useToast();
  const [destinationId, setDestinationId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const freeTables = targets.filter((t) => !t.occupied);
  const canSubmit = !!destinationId && !saving;

  const submit = async () => {
    if (!destinationId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/tables/${tableId}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destinationTableId: destinationId }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        toast({
          title:
            lang === "NEP"
              ? `टेबल ${tableNumber} बाट सारियो`
              : `Moved from Table ${tableNumber} to Table ${data?.toTableNumber ?? ""}`,
          variant: "success",
        });
        onClose();
        onTransferred?.();
      } else {
        toast({
          title: "Error",
          variant: "destructive",
          description: data?.error ?? "Could not transfer this table.",
        });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive", description: "Please try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 flex flex-col max-h-[92vh]">
        <div className="bg-gradient-to-r from-sky-500 to-indigo-500 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <ArrowRightLeft className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-2xl font-black">
                {lang === "NEP" ? "टेबल सार्नुहोस्" : "Transfer Table"}
              </h3>
              <p className="text-xs text-sky-100 mt-0.5">
                {lang === "NEP"
                  ? `टेबल ${tableNumber} को बिल अर्को टेबलमा`
                  : `Move Table ${tableNumber}'s bill to another table`}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto">
          {freeTables.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">
              {lang === "NEP"
                ? "सार्नका लागि कुनै खाली टेबल छैन।"
                : "There is no free table to move this bill to."}
            </p>
          ) : (
            <>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                {lang === "NEP" ? "गन्तव्य टेबल" : "Destination table"}
              </p>
              <div className="grid grid-cols-3 gap-2.5">
                {freeTables.map((tg) => (
                  <button
                    key={tg.id}
                    onClick={() => setDestinationId(tg.id)}
                    className={`h-14 rounded-2xl border text-lg font-black transition-all ${
                      destinationId === tg.id
                        ? "border-sky-500 bg-sky-50 text-sky-700 ring-2 ring-sky-500/30"
                        : "border-gray-200 text-gray-700 hover:border-sky-300 hover:bg-sky-50/50"
                    }`}
                  >
                    #{tg.tableNumber}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t flex gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 h-12 rounded-2xl border border-gray-300 text-gray-700 font-bold text-sm"
          >
            {lang === "NEP" ? "रद्द गर्नुहोस्" : "Cancel"}
          </button>
          <button
            onClick={submit}
            disabled={!canSubmit}
            className="flex-1 h-12 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-sm shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <ArrowRightLeft className="w-5 h-5" />
                {lang === "NEP" ? "सार्नुहोस्" : "Transfer"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
