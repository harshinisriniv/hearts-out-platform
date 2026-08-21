"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { createVolunteer, updateVolunteer } from "@/app/(app)/volunteers/actions";

export type EditableVolunteer = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
};

export function VolunteerFormModal({
  volunteer,
  onClose,
}: {
  volunteer: EditableVolunteer | null;
  onClose: () => void;
}) {
  const isEditing = !!volunteer;
  const [name, setName] = useState(volunteer?.name ?? "");
  const [email, setEmail] = useState(volunteer?.email ?? "");
  const [phone, setPhone] = useState(volunteer?.phone ?? "");
  const [isActive, setIsActive] = useState(volunteer?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    try {
      if (isEditing) {
        await updateVolunteer(volunteer.id, { name, email, phone, isActive });
      } else {
        await createVolunteer({ name, email, phone });
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
        className="bg-paper-raised rounded-2xl border-2 border-line w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl text-ink">
            {isEditing ? "Edit volunteer" : "Add a volunteer"}
          </h2>
          <button onClick={onClose} aria-label="Close" className="text-ink-soft hover:text-ink">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="w-full rounded-md border border-line bg-paper px-3 py-2 text-ink"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Needed for task notifications"
              className="w-full rounded-md border border-line bg-paper px-3 py-2 text-ink"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1">Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-md border border-line bg-paper px-3 py-2 text-ink"
            />
          </div>

          {isEditing && (
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4"
              />
              Currently active
            </label>
          )}

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
              {saving ? "Saving…" : isEditing ? "Save changes" : "Add volunteer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
