"use client";

import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { logDonation, type DonationInput, type DonationLineItemInput } from "@/app/(app)/fundraising/donor-actions";
import type { CatalogItem } from "./PurchaseFormModal";

const DONATION_TYPES = [
  { value: "cash", label: "Cash" },
  { value: "check", label: "Check" },
  { value: "online", label: "Online" },
  { value: "item", label: "Item donation" },
];

export type DonorOption = { id: number; name: string | null; isAnonymous: boolean; donorType: string };
export type EventOption = { id: number; name: string };

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export function LogDonationModal({
  donorOptions,
  eventOptions,
  catalogItems,
  onClose,
}: {
  donorOptions: DonorOption[];
  eventOptions: EventOption[];
  catalogItems: CatalogItem[];
  onClose: () => void;
}) {
  const [donorId, setDonorId] = useState<number | null>(donorOptions[0]?.id ?? null);
  const [eventId, setEventId] = useState<number | null>(null);
  const [type, setType] = useState("cash");
  const [amount, setAmount] = useState<number | null>(null);
  const [itemDescription, setItemDescription] = useState("");
  const [donatedAt, setDonatedAt] = useState(todayInputValue());
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<DonationLineItemInput[]>([
    { itemId: null, itemName: "", category: "Hygiene", quantityDonated: 1 },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const catalogNames = catalogItems.map((c) => c.name);

  function updateLine(index: number, patch: Partial<DonationLineItemInput>) {
    setLineItems((prev) => prev.map((li, i) => (i === index ? { ...li, ...patch } : li)));
  }

  function handleNameChange(index: number, name: string) {
    const match = catalogItems.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());
    updateLine(index, { itemName: name, itemId: match?.id ?? null });
  }

  function addLine() {
    setLineItems((prev) => [...prev, { itemId: null, itemName: "", category: "Hygiene", quantityDonated: 1 }]);
  }

  function removeLine(index: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const validLines = lineItems.filter((li) => li.itemName.trim() && li.quantityDonated > 0);
    if (type === "item" && validLines.length === 0 && !itemDescription.trim()) {
      setError("Add at least one item, or describe what was donated.");
      return;
    }

    setSaving(true);
    try {
      const payload: DonationInput = {
        donorId,
        eventId,
        type,
        amount,
        itemDescription,
        donatedAt,
        notes,
        lineItems: validLines,
      };
      await logDonation(payload);
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
        className="bg-paper-raised rounded-2xl border-2 border-line w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl text-ink">Log a donation</h2>
          <button onClick={onClose} aria-label="Close" className="text-ink-soft hover:text-ink">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Donor</label>
            <select
              value={donorId ?? ""}
              onChange={(e) => setDonorId(e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded-md border border-line bg-paper px-3 py-2 text-ink"
            >
              <option value="">Unspecified / walk-up</option>
              {donorOptions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.isAnonymous ? "Anonymous donor" : d.name}
                  {d.donorType === "company" ? " (company)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1">
              Linked event (optional)
            </label>
            <select
              value={eventId ?? ""}
              onChange={(e) => setEventId(e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded-md border border-line bg-paper px-3 py-2 text-ink"
            >
              <option value="">None</option>
              {eventOptions.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-md border border-line bg-paper px-3 py-2 text-ink"
              >
                {DONATION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Date</label>
              <input
                type="date"
                value={donatedAt}
                onChange={(e) => setDonatedAt(e.target.value)}
                className="w-full rounded-md border border-line bg-paper px-3 py-2 text-ink"
              />
            </div>
          </div>

          {type === "item" ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-ink">Items donated</label>
                <button
                  type="button"
                  onClick={addLine}
                  className="text-sm text-brick hover:text-brick-dark flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add item
                </button>
              </div>
              <p className="text-xs text-ink-soft mb-2">
                These get added straight to inventory, same as a purchase.
              </p>
              <div className="space-y-2">
                {lineItems.map((li, index) => (
                  <div key={index} className="flex items-center gap-2 flex-wrap">
                    <input
                      list="donation-item-catalog"
                      value={li.itemName}
                      onChange={(e) => handleNameChange(index, e.target.value)}
                      placeholder="Item name"
                      className="flex-1 min-w-[120px] rounded-md border border-line bg-paper px-2 py-1.5 text-sm text-ink"
                    />
                    {!li.itemId && (
                      <select
                        value={li.category}
                        onChange={(e) => updateLine(index, { category: e.target.value })}
                        className="rounded-md border border-line bg-paper px-2 py-1.5 text-sm text-ink"
                      >
                        {["Hygiene", "Clothing", "Food", "First Aid", "Other"].map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    )}
                    <input
                      type="number"
                      min={1}
                      value={li.quantityDonated}
                      onChange={(e) => updateLine(index, { quantityDonated: Number(e.target.value) })}
                      placeholder="Qty"
                      className="w-16 rounded-md border border-line bg-paper px-2 py-1.5 text-sm text-ink font-mono tabular"
                    />
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      aria-label="Remove item"
                      className="text-ink-soft hover:text-danger"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <datalist id="donation-item-catalog">
                {catalogNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>

              <div className="mt-3">
                <label className="block text-sm font-medium text-ink mb-1">
                  Anything else not itemized (optional)
                </label>
                <input
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  placeholder="e.g. assorted loose toiletries"
                  className="w-full rounded-md border border-line bg-paper px-3 py-2 text-ink"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Amount</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={amount ?? ""}
                onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-md border border-line bg-paper px-3 py-2 text-ink font-mono tabular"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-ink mb-1">Notes</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
              {saving ? "Saving…" : "Log donation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
