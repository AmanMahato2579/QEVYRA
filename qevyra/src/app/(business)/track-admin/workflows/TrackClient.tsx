"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
  Plus,
  Trash2,
  Pencil,
  Loader2,
  Save,
  XCircle,
  CheckCircle2,
  ListOrdered,
} from "lucide-react";

interface WorkflowStep {
  id: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  isReadyStep: boolean;
}

interface Workflow {
  id: string;
  name: string;
  description?: string | null;
  codePrefix: string;
  isActive: boolean;
  createdAt: string;
  steps: WorkflowStep[];
  _count: { tickets: number };
}

interface Props {
  workflows: Workflow[];
  limit: number;
}

interface DraftStep {
  name: string;
  description: string;
}

export default function TrackClient({ workflows, limit }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [codePrefix, setCodePrefix] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [steps, setSteps] = useState<DraftStep[]>([{ name: "", description: "" }]);

  const canAdd = workflows.length >= limit;

  const openNew = () => {
    setEditingId(null);
    setName("");
    setDescription("");
    setCodePrefix("");
    setIsActive(true);
    setSteps([{ name: "", description: "" }]);
    setShowForm(true);
  };

  const openEdit = (w: Workflow) => {
    setEditingId(w.id);
    setName(w.name);
    setDescription(w.description ?? "");
    setCodePrefix(w.codePrefix);
    setIsActive(w.isActive);
    setSteps(w.steps.map((s) => ({ name: s.name, description: s.description ?? "" })));
    setShowForm(true);
  };

  const updateStep = (i: number, key: "name" | "description", value: string) =>
    setSteps((arr) => arr.map((s, idx) => (idx === i ? { ...s, [key]: value } : s)));

  const addStep = () => setSteps((arr) => [...arr, { name: "", description: "" }]);

  const removeStep = (i: number) =>
    setSteps((arr) => (arr.length === 1 ? arr : arr.filter((_, idx) => idx !== i)));

  const save = async () => {
    const cleanName = name.trim();
    const cleanSteps = steps.filter((s) => s.name.trim().length > 0);
    if (!cleanName) {
      toast({ title: "Workflow name is required", variant: "destructive" });
      return;
    }
    if (!codePrefix.trim()) {
      toast({
        title: "Code prefix is required",
        variant: "destructive",
        description: "Short prefix used in tracking codes, e.g. GAR or MOMO.",
      });
      return;
    }
    if (cleanSteps.length === 0) {
      toast({ title: "Add at least one step", variant: "destructive" });
      return;
    }

    setSaving(true);
    const body = {
      ...(editingId ? { id: editingId } : {}),
      name: cleanName,
      description: description.trim() || null,
      codePrefix: codePrefix.trim(),
      isActive,
      steps: cleanSteps,
    };
    try {
      const res = await fetch("/api/admin/track/workflows", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast({
          title: editingId ? "Workflow updated" : "Workflow created",
          variant: "success",
        });
        setShowForm(false);
        startTransition(() => router.refresh());
      } else {
        const err = await res.json();
        toast({ title: "Could not save workflow", variant: "destructive", description: JSON.stringify(err.error) });
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    setDeletingId(id);
    const res = await fetch("/api/admin/track/workflows", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setDeletingId(null);
    setConfirmDelete(null);
    if (res.ok) {
      toast({ title: "Workflow deleted", variant: "success" });
      startTransition(() => router.refresh());
    } else {
      const err = await res.json();
      toast({ title: "Could not delete workflow", variant: "destructive", description: err.error });
    }
  };

  return (
    <div className="space-y-4">
      {/* Workflow form */}
      {showForm && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="font-bold text-gray-900">{editingId ? "Edit workflow" : "New workflow"}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Workflow name *</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Garage service"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Code prefix *</label>
                <Input
                  value={codePrefix}
                  onChange={(e) => setCodePrefix(e.target.value.toUpperCase())}
                  placeholder="GAR"
                  maxLength={8}
                />
                <p className="text-xs text-gray-400">Used in codes like GAR-0001.</p>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Description</label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Vehicle repair service with parts ordering"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Steps (in order)</label>
                <Button type="button" variant="outline" size="sm" onClick={addStep}>
                  <Plus className="w-4 h-4 mr-1" /> Add step
                </Button>
              </div>
              <div className="space-y-2">
                {steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <Input
                      value={step.name}
                      onChange={(e) => updateStep(i, "name", e.target.value)}
                      placeholder={`Step ${i + 1}`}
                      className="flex-1"
                    />
                    <Input
                      value={step.description}
                      onChange={(e) => updateStep(i, "description", e.target.value)}
                      placeholder="Optional note (hidden on customer page)"
                      className="flex-1 hidden sm:block"
                    />
                    <button
                      type="button"
                      onClick={() => removeStep(i)}
                      disabled={steps.length === 1}
                      className="text-gray-400 hover:text-red-500 disabled:opacity-30"
                      aria-label="Remove step"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                The last step is marked as the &quot;ready&quot; step — reaching it turns the ticket Ready.
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 accent-orange-500"
              />
              Active (can issue new tickets)
            </label>

            <div className="flex gap-2">
              <Button onClick={save} disabled={saving} className="bg-orange-500 hover:bg-orange-600 text-white">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingId ? "Save changes" : "Create workflow"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={saving}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-gray-500">
          {workflows.length} / {limit} workflows on your plan
        </p>
        <Button onClick={openNew} disabled={canAdd} className="bg-orange-500 hover:bg-orange-600 text-white">
          <Plus className="w-4 h-4 mr-1" /> New workflow
        </Button>
      </div>

      {/* Workflow list */}
      {workflows.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center mx-auto mb-4">
              <ListOrdered className="w-7 h-7 text-orange-500" />
            </div>
            <h3 className="font-semibold text-gray-900">No workflows yet</h3>
            <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
              Create one to start issuing tracking codes to your customers.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {workflows.map((w) => (
            <Card key={w.id} className="relative">
              {confirmDelete === w.id && (
                <div className="absolute inset-x-4 top-4 z-10 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between gap-3">
                  <p className="text-red-700 text-sm font-medium">
                    Delete <strong>{w.name}</strong>? Tracking codes would stop working.
                  </p>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => remove(w.id)}
                      disabled={deletingId === w.id}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium"
                    >
                      {deletingId === w.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Delete"}
                    </button>
                    <button onClick={() => setConfirmDelete(null)} className="px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg text-xs">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <h3 className="font-bold text-gray-900 truncate">{w.name}</h3>
                    {!w.isActive && (
                      <Badge className="bg-gray-100 text-gray-600 border border-gray-200">Inactive</Badge>
                    )}
                  </div>
                  <Badge className="bg-orange-50 text-orange-700 border border-orange-200 font-mono">
                    {w.codePrefix}-XXXX
                  </Badge>
                </div>
                {w.description && <p className="text-sm text-gray-500 mt-1">{w.description}</p>}

                <div className="mt-4 space-y-1.5">
                  {w.steps.map((s, i) => (
                    <div key={s.id} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className={`w-4 h-4 shrink-0 ${s.isReadyStep ? "text-green-500" : "text-gray-300"}`} />
                      <span className="text-gray-700">{s.name}</span>
                      {i === w.steps.length - 1 && (
                        <span className="text-[10px] uppercase tracking-wider text-gray-400">Ready</span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-xs text-gray-500">{w._count.tickets} ticket{w._count.tickets === 1 ? "" : "s"}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(w)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => setConfirmDelete(w.id)}
                      disabled={w._count.tickets > 0}
                      title={w._count.tickets > 0 ? "Deactivate instead of deleting — this workflow has tickets." : ""}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-100">
        <CardContent className="p-5 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-orange-700">What is a workflow?</p>
            <p className="text-sm text-orange-700/80 mt-1">
              A workflow is your process, e.g. &quot;Garage service&quot;. Each job gets a ticket with
              a code like <span className="font-mono">GAR-0001</span>. Hand the code or QR to your
              customer — they can follow their job&apos;s progress without an account.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}