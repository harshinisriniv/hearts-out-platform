"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { createPartner, updatePartner, type PartnerInput } from "@/app/(app)/partners/actions";

const PARTNER_TYPES = ["pantry", "shelter", "outreach"];

export type KitTemplateOption = { id: number; name: string };

export type EditablePartner = {
  id: number;
  name: string;
  type: string;
  address: string | null;
  primaryContactName: string | null;
  primaryContactPhone: string | null;
  primaryContactEmail: string | null;
  preferredKitTemplateId: number | null;
  typicalKitsRequested: number | null;
  notes: string | null;
  nextFollowUpAt: string | null; // yyyy-mm-dd for the date input
};

function toDateInputValue(input: EditablePartner | null) {
  return input?.nextFollowUpAt ?? "";
}

export function PartnerFormModal({
  partner,
  kitTemplateOptions,
  onClose,
}: {
  partner: EditablePartner | null;
  kitTemplateOptions: KitTemplateOption[];
  onClose: () => void;
}) {
  const isEditing = !!partner;
  const [form, setForm] = useState<PartnerInput>({
    name: partner?.name ?? "",
    type: partner?.type ?? "pantry",
    address: partner?.address ?? "",
    primaryContactName: partner?.primaryContactName ?? "",
    primaryContactPhone: partner?.primaryContactPhone ?? "",
    primaryContactEmail: partner?.primaryContactEmail ?? "",
    preferredKitTemplateId: partner?.preferredKitTemplateId ?? null,
    typicalKitsRequested: partner?.typicalKitsRequested ?? null,
    notes: partner?.notes ?? "",
    nextFollowUpAt: toDateInputValue(partner),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function patch(update: Partial<PartnerInput>) {
    setForm((prev) => ({ ...prev, ...update }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (isEditing) {
        await updatePartner(partner.id, form);
      } else {
        await createPartner(form);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-ink/30 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-paper-raised rounded-2xl border-2 border-line w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl text-ink">
            {isEditing ? "Edit organization" : "Add a partner organization"}
          </h2>
          <button onClick={onClose} aria-label="Close" className="text-ink-soft hover:text-ink">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Organization name</label>
            <input
              value={form.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="e.g. La Centerra Food Pantry"
              className="w-full rounded-md border border-line bg-paper px-3 py-2 text-ink"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => patch({ type: e.target.value })}
                className="w-full rounded-md border border-line bg-paper px-3 py-2 text-ink capitalize"
              >
                {PARTNER_TYPES.map((t) => (
                  <option key={t} value={t} className="capitalize">
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">
                Typical kits requested
              </label>
              <input
                type="number"
                min={0}
                value={form.typicalKitsRequested ?? ""}
                onChange={(e) =>
                  patch({
                    typicalKitsRequested: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="w-full rounded-md border border-line bg-paper px-3 py-2 text-ink font-mono tabular"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1">Address</label>
            <input
              value={form.address}
              onChange={(e) => patch({ address: e.target.value })}
              className="w-full rounded-md border border-line bg-paper px-3 py-2 text-ink"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Contact name</label>
              <input
                value={form.primaryContactName}
                onChange={(e) => patch({ primaryContactName: e.target.value })}
                className="w-full rounded-md border border-line bg-paper px-3 py-2 text-ink"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Phone</label>
              <input
                value={form.primaryContactPhone}
                onChange={(e) => patch({ primaryContactPhone: e.target.value })}
                className="w-full rounded-md border border-line bg-paper px-3 py-2 text-ink"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Email</label>
              <input
                value={form.primaryContactEmail}
                onChange={(e) => patch({ primaryContactEmail: e.target.value })}
                className="w-full rounded-md border border-line bg-paper px-3 py-2 text-ink"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">
                Preferred kit type
              </label>
              <select
                value={form.preferredKitTemplateId ?? ""}
                onChange={(e) =>
                  patch({
                    preferredKitTemplateId: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="w-full rounded-md border border-line bg-paper px-3 py-2 text-ink"
              >
                <option value="">No preference</option>
                {kitTemplateOptions.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Next follow-up</label>
              <input
                type="date"
                value={form.nextFollowUpAt ?? ""}
                onChange={(e) => patch({ nextFollowUpAt: e.target.value || null })}
                className="w-full rounded-md border border-line bg-paper px-3 py-2 text-ink"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => patch({ notes: e.target.value })}
              rows={3}
              className="w-full rounded-md border border-line bg-paper px-3 py-2 text-ink"
            />
          </div>

          {error && <p className="text-danger text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-line py-2 text-ink font-medium hover:bg-paper"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-md bg-brick text-paper-raised py-2 font-medium hover:bg-brick-dark transition-colors disabled:opacity-60"
            >
              {saving ? "Saving…" : isEditing ? "Save changes" : "Add organization"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
