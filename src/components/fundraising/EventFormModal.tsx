"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { createEvent, updateEvent, type EventInput } from "@/app/(app)/fundraising/event-actions";

const EVENT_TYPES = [
  { value: "fundraiser", label: "Fundraiser event" },
  { value: "restaurant_night", label: "Restaurant profit-share night" },
  { value: "other", label: "Other" },
];

export type EditableEvent = {
  id: number;
  name: string;
  type: string;
  eventDate: string; // yyyy-mm-dd
  location: string | null;
  goalAmount: number | null;
  amountRaised: number;
  attendeeCount: number | null;
  notes: string | null;
};

export function EventFormModal({
  event,
  onClose,
}: {
  event: EditableEvent | null;
  onClose: () => void;
}) {
  const isEditing = !!event;
  const [form, setForm] = useState<EventInput>({
    name: event?.name ?? "",
    type: event?.type ?? "fundraiser",
    eventDate: event?.eventDate ?? new Date().toISOString().slice(0, 10),
    location: event?.location ?? "",
    goalAmount: event?.goalAmount ?? null,
    amountRaised: event?.amountRaised ?? 0,
    attendeeCount: event?.attendeeCount ?? null,
    notes: event?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isRestaurantNight = form.type === "restaurant_night";

  function patch(update: Partial<EventInput>) {
    setForm((prev) => ({ ...prev, ...update }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (isEditing) {
        await updateEvent(event.id, form);
      } else {
        await createEvent(form);
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
            {isEditing ? "Edit event" : "Add an event"}
          </h2>
          <button onClick={onClose} aria-label="Close" className="text-ink-soft hover:text-ink">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Type</label>
            <select
              value={form.type}
              onChange={(e) => patch({ type: e.target.value })}
              className="w-full rounded-md border border-line bg-paper px-3 py-2 text-ink"
            >
              {EVENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1">
              {isRestaurantNight ? "Restaurant / event name" : "Event name"}
            </label>
            <input
              value={form.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder={isRestaurantNight ? "e.g. Piccolo Snowman night" : "e.g. Food Drive"}
              className="w-full rounded-md border border-line bg-paper px-3 py-2 text-ink"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Date</label>
              <input
                type="date"
                value={form.eventDate}
                onChange={(e) => patch({ eventDate: e.target.value })}
                className="w-full rounded-md border border-line bg-paper px-3 py-2 text-ink"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Location</label>
              <input
                value={form.location}
                onChange={(e) => patch({ location: e.target.value })}
                className="w-full rounded-md border border-line bg-paper px-3 py-2 text-ink"
              />
            </div>
          </div>

          {!isRestaurantNight && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">
                  Goal (optional)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.goalAmount ?? ""}
                  onChange={(e) =>
                    patch({ goalAmount: e.target.value ? Number(e.target.value) : null })
                  }
                  className="w-full rounded-md border border-line bg-paper px-3 py-2 text-ink font-mono tabular"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Attendees</label>
                <input
                  type="number"
                  min={0}
                  value={form.attendeeCount ?? ""}
                  onChange={(e) =>
                    patch({ attendeeCount: e.target.value ? Number(e.target.value) : null })
                  }
                  className="w-full rounded-md border border-line bg-paper px-3 py-2 text-ink font-mono tabular"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-ink mb-1">
              {isRestaurantNight ? "Amount given" : "Amount raised"}
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.amountRaised}
              onChange={(e) => patch({ amountRaised: Number(e.target.value) })}
              className="w-full rounded-md border border-line bg-paper px-3 py-2 text-ink font-mono tabular"
            />
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
              {saving ? "Saving…" : isEditing ? "Save changes" : "Add event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
