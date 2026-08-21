"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { createDonor, updateDonor, type DonorInput } from "@/app/(app)/fundraising/donor-actions";

export type EditableDonor = {
  id: number;
  name: string | null;
  donorType: string;
  email: string | null;
  phone: string | null;
  isAnonymous: boolean;
  notes: string | null;
};

export function DonorFormModal({
  donor,
  onClose,
}: {
  donor: EditableDonor | null;
  onClose: () => void;
}) {
  const isEditing = !!donor;
  const [form, setForm] = useState<DonorInput>({
    name: donor?.name ?? "",
    donorType: donor?.donorType ?? "individual",
    email: donor?.email ?? "",
    phone: donor?.phone ?? "",
    isAnonymous: donor?.isAnonymous ?? false,
    notes: donor?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function patch(update: Partial<DonorInput>) {
    setForm((prev) => ({ ...prev, ...update }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.isAnonymous && !form.name.trim()) {
      setError("Enter a name, or mark this donor as anonymous.");
      return;
    }
    setSaving(true);
    try {
      if (isEditing) {
        await updateDonor(donor.id, form);
      } else {
        await createDonor(form);
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
        className="bg-paper-raised rounded-2xl border-2 border-line w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl text-ink">
            {isEditing ? "Edit donor" : "Add a donor"}
          </h2>
          <button onClick={onClose} aria-label="Close" className="text-ink-soft hover:text-ink">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Donor type</label>
            <div className="flex gap-2">
              {[
                { value: "individual", label: "Individual" },
                { value: "company", label: "Company / organization" },
              ].map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => patch({ donorType: t.value })}
                  className={`flex-1 rounded-md border py-2 text-sm font-medium transition-colors ${
                    form.donorType === t.value
                      ? "bg-brick text-paper-raised border-brick"
                      : "border-line text-ink-soft hover:bg-paper"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={form.isAnonymous}
              onChange={(e) => patch({ isAnonymous: e.target.checked })}
              className="w-4 h-4"
            />
            This donor wishes to remain anonymous
          </label>

          {!form.isAnonymous && (
            <div>
              <label className="block text-sm font-medium text-ink mb-1">
                {form.donorType === "company" ? "Organization name" : "Name"}
              </label>
              <input
                value={form.name}
                onChange={(e) => patch({ name: e.target.value })}
                className="w-full rounded-md border border-line bg-paper px-3 py-2 text-ink"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Email</label>
              <input
                value={form.email}
                onChange={(e) => patch({ email: e.target.value })}
                className="w-full rounded-md border border-line bg-paper px-3 py-2 text-ink"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => patch({ phone: e.target.value })}
                className="w-full rounded-md border border-line bg-paper px-3 py-2 text-ink"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => patch({ notes: e.target.value })}
              rows={2}
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
              {saving ? "Saving…" : isEditing ? "Save changes" : "Add donor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
