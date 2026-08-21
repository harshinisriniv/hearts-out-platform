"use client";

import { useState } from "react";
import { X, Check, UserPlus } from "lucide-react";
import { scheduleDelivery } from "@/app/(app)/partners/actions";
import { createVolunteer } from "@/app/(app)/volunteers/actions";
import type { KitTemplateOption } from "./PartnerFormModal";

export type VolunteerOption = { id: number; name: string };

function nowInputValue() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16); // yyyy-mm-ddThh:mm for datetime-local
}

export function DeliveryFormModal({
  partnerId,
  partnerName,
  kitTemplateOptions,
  volunteerOptions,
  onClose,
}: {
  partnerId: number;
  partnerName: string;
  kitTemplateOptions: KitTemplateOption[];
  volunteerOptions: VolunteerOption[];
  onClose: () => void;
}) {
  const [kitTemplateId, setKitTemplateId] = useState<number | null>(
    kitTemplateOptions[0]?.id ?? null
  );
  const [kitCount, setKitCount] = useState(1);
  const [distributedAt, setDistributedAt] = useState(nowInputValue());
  const [assignedVolunteerId, setAssignedVolunteerId] = useState<number | null>(null);
  const [isDelivered, setIsDelivered] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const [addingVolunteer, setAddingVolunteer] = useState(false);
  const [newVolunteerName, setNewVolunteerName] = useState("");
  const [localVolunteers, setLocalVolunteers] = useState(volunteerOptions);

  async function handleAddVolunteer() {
    if (!newVolunteerName.trim()) return;
    const created = await createVolunteer({ name: newVolunteerName, email: "", phone: "" });
    setLocalVolunteers((prev) => [...prev, { id: created.id, name: created.name }]);
    setAssignedVolunteerId(created.id);
    setNewVolunteerName("");
    setAddingVolunteer(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await scheduleDelivery({
        partnerId,
        kitTemplateId,
        kitCount,
        distributedAt,
        assignedVolunteerId,
        isDelivered,
        notes,
      });
      setDone(true);
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
        className="bg-paper-raised rounded-2xl border-2 border-line w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-12 h-12 rounded-full bg-sage-soft flex items-center justify-center">
              <Check className="w-6 h-6 text-sage" />
            </div>
            <p className="text-ink font-medium">
              {isDelivered ? "Delivery logged" : "Delivery scheduled"}
            </p>
            <button
              onClick={onClose}
              className="mt-2 rounded-md bg-brick text-paper-raised px-4 py-2 text-sm font-medium hover:bg-brick-dark"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg text-ink">Schedule a delivery</h2>
              <button onClick={onClose} aria-label="Close" className="text-ink-soft hover:text-ink">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-ink-soft mb-4">To {partnerName}</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Kit type</label>
                <select
                  value={kitTemplateId ?? ""}
                  onChange={(e) => setKitTemplateId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full rounded-md border border-line bg-paper px-3 py-2 text-ink"
                >
                  <option value="">Unspecified</option>
                  {kitTemplateOptions.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">
                    Number of kits
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={kitCount}
                    onChange={(e) => setKitCount(Number(e.target.value))}
                    className="w-full rounded-md border border-line bg-paper px-3 py-2 text-ink font-mono tabular"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Date & time</label>
                  <input
                    type="datetime-local"
                    value={distributedAt}
                    onChange={(e) => setDistributedAt(e.target.value)}
                    className="w-full rounded-md border border-line bg-paper px-3 py-2 text-ink text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1">
                  Assigned volunteer
                </label>
                {addingVolunteer ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={newVolunteerName}
                      onChange={(e) => setNewVolunteerName(e.target.value)}
                      placeholder="Volunteer name"
                      className="flex-1 rounded-md border border-line bg-paper px-3 py-2 text-ink"
                    />
                    <button
                      type="button"
                      onClick={handleAddVolunteer}
                      className="text-sm text-brick hover:text-brick-dark font-medium whitespace-nowrap"
                    >
                      Add
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <select
                      value={assignedVolunteerId ?? ""}
                      onChange={(e) =>
                        setAssignedVolunteerId(e.target.value ? Number(e.target.value) : null)
                      }
                      className="flex-1 rounded-md border border-line bg-paper px-3 py-2 text-ink"
                    >
                      <option value="">Unassigned</option>
                      {localVolunteers.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setAddingVolunteer(true)}
                      aria-label="Add new volunteer"
                      className="text-ink-soft hover:text-brick p-2"
                    >
                      <UserPlus className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={isDelivered}
                  onChange={(e) => setIsDelivered(e.target.checked)}
                  className="w-4 h-4"
                />
                This already happened — log it as delivered
              </label>

              <div>
                <label className="block text-sm font-medium text-ink mb-1">
                  Notes — extra items, special requests, etc.
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-line bg-paper px-3 py-2 text-ink"
                />
              </div>

              {error && <p className="text-danger text-sm">{error}</p>}

              <div className="flex gap-3 pt-1">
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
                  {saving ? "Saving…" : isDelivered ? "Log delivery" : "Schedule it"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
