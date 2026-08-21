"use client";

import { useRef, useState } from "react";
import { X, Plus, Trash2, Camera, ScanLine, Loader2 } from "lucide-react";
import { createPurchase, updatePurchase, analyzeReceipt, type PurchaseLineItemInput } from "@/app/(app)/fundraising/purchase-actions";

const CATEGORIES = ["Inventory", "Venue", "Marketing", "Supplies", "Other"];

export type CatalogItem = { id: number; name: string; unit: string };

export type EditablePurchase = {
  id: number;
  description: string;
  category: string;
  purchasedAt: string;
  notes: string | null;
  receiptImage: string | null;
  taxAmount: number;
  lineItems: Array<{ itemId: number | null; itemName: string; category: string; quantityPurchased: number; lineTotal: number | null }>;
};

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function compressImage(file: File, maxDimension = 800, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not supported"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function PurchaseFormModal({
  purchase,
  catalogItems,
  onClose,
}: {
  purchase: EditablePurchase | null;
  catalogItems: CatalogItem[];
  onClose: () => void;
}) {
  const isEditing = !!purchase;
  const catalogNames = catalogItems.map((c) => c.name);

  const [description, setDescription] = useState(purchase?.description ?? "");
  const [category, setCategory] = useState(purchase?.category ?? "Inventory");
  const [purchasedAt, setPurchasedAt] = useState(purchase?.purchasedAt ?? todayInputValue());
  const [notes, setNotes] = useState(purchase?.notes ?? "");
  const [taxAmount, setTaxAmount] = useState(purchase?.taxAmount ?? 0);
  const [receiptImage, setReceiptImage] = useState<string | null>(purchase?.receiptImage ?? null);
  const [lineItems, setLineItems] = useState<PurchaseLineItemInput[]>(
    purchase?.lineItems.map((li) => ({
      itemId: li.itemId,
      itemName: li.itemName,
      category: li.category,
      quantityPurchased: li.quantityPurchased,
      lineTotal: li.lineTotal,
    })) ?? [{ itemId: null, itemName: "", category: "Hygiene", quantityPurchased: 1, lineTotal: null }]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const receiptScanInputRef = useRef<HTMLInputElement>(null);

  async function handleScanReceipt(file: File) {
    setScanning(true);
    setError("");
    try {
      // Store the photo for reference, same as manual attach
      const compressed = await compressImage(file);
      setReceiptImage(compressed);

      const formData = new FormData();
      formData.append("image", file);
      const scanned = await analyzeReceipt(formData);

      setDescription(scanned.description);
      if (scanned.purchasedAt) setPurchasedAt(scanned.purchasedAt);
      if (scanned.taxAmount !== null) setTaxAmount(scanned.taxAmount);
      if (scanned.lineItems.length > 0) {
        setLineItems(
          scanned.lineItems.map((li) => {
            const match = catalogItems.find(
              (c) => c.name.toLowerCase() === li.itemName.trim().toLowerCase()
            );
            return {
              itemId: match?.id ?? null,
              itemName: li.itemName,
              category: "Hygiene",
              quantityPurchased: li.quantity,
              lineTotal: li.lineTotal,
            };
          })
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't read that receipt.");
    } finally {
      setScanning(false);
    }
  }

  const subtotal = lineItems.reduce((sum, li) => sum + (li.lineTotal ?? 0), 0);
  const total = subtotal + taxAmount;

  function updateLine(index: number, patch: Partial<PurchaseLineItemInput>) {
    setLineItems((prev) => prev.map((li, i) => (i === index ? { ...li, ...patch } : li)));
  }

  function handleNameChange(index: number, name: string) {
    const match = catalogItems.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());
    updateLine(index, { itemName: name, itemId: match?.id ?? null });
  }

  function addLine() {
    setLineItems((prev) => [
      ...prev,
      { itemId: null, itemName: "", category: "Hygiene", quantityPurchased: 1, lineTotal: null },
    ]);
  }

  function removeLine(index: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handlePhoto(file: File) {
    try {
      const compressed = await compressImage(file);
      setReceiptImage(compressed);
    } catch {
      setError("Couldn't process that photo — try a different one.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const validLines = lineItems.filter((li) => li.itemName.trim() && li.quantityPurchased > 0);
    if (!description.trim()) {
      setError("Add a short description.");
      return;
    }
    if (validLines.length === 0) {
      setError("Add at least one item you purchased.");
      return;
    }

    setSaving(true);
    try {
      const payload = { description, category, purchasedAt, notes, receiptImage, taxAmount, lineItems: validLines };
      if (isEditing) {
        await updatePurchase(purchase.id, payload);
      } else {
        await createPurchase(payload);
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
            {isEditing ? "Edit purchase" : "Log a purchase"}
          </h2>
          <button onClick={onClose} aria-label="Close" className="text-ink-soft hover:text-ink">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEditing && (
            <div>
              <button
                type="button"
                onClick={() => receiptScanInputRef.current?.click()}
                disabled={scanning}
                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-brick text-brick rounded-lg py-3 text-sm font-medium hover:bg-brick/5 transition-colors disabled:opacity-60"
              >
                {scanning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Reading receipt…
                  </>
                ) : (
                  <>
                    <ScanLine className="w-4 h-4" />
                    Scan a receipt to fill this in automatically
                  </>
                )}
              </button>
              <input
                ref={receiptScanInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleScanReceipt(file);
                }}
              />
              <p className="text-xs text-ink-soft text-center mt-1.5">or fill in the details below manually</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-ink mb-1">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Costco run for pads and wipes"
              className="w-full rounded-md border border-line bg-paper px-3 py-2 text-ink"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border border-line bg-paper px-3 py-2 text-ink"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Date</label>
              <input
                type="date"
                value={purchasedAt}
                onChange={(e) => setPurchasedAt(e.target.value)}
                className="w-full rounded-md border border-line bg-paper px-3 py-2 text-ink"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-ink">Items purchased</label>
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
              Type any item name — pick from your existing inventory, or type something new
              to add it to inventory when you save.
            </p>

            <div className="space-y-2">
              {lineItems.map((li, index) => (
                <div key={index} className="flex items-center gap-2 flex-wrap">
                  <input
                    list="purchase-item-catalog"
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
                    value={li.quantityPurchased}
                    onChange={(e) => updateLine(index, { quantityPurchased: Number(e.target.value) })}
                    placeholder="Qty"
                    className="w-16 rounded-md border border-line bg-paper px-2 py-1.5 text-sm text-ink font-mono tabular"
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={li.lineTotal ?? ""}
                    onChange={(e) =>
                      updateLine(index, { lineTotal: e.target.value ? Number(e.target.value) : null })
                    }
                    placeholder="Cost"
                    className="w-20 rounded-md border border-line bg-paper px-2 py-1.5 text-sm text-ink font-mono tabular"
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
            <datalist id="purchase-item-catalog">
              {catalogNames.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>

            <div className="text-sm text-ink-soft mt-2 space-y-0.5 text-right">
              <p>
                Subtotal: <span className="font-mono tabular text-ink">${subtotal.toFixed(2)}</span>
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1">Tax (optional)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={taxAmount}
              onChange={(e) => setTaxAmount(Number(e.target.value))}
              className="w-full rounded-md border border-line bg-paper px-3 py-2 text-ink font-mono tabular"
            />
            <p className="text-sm text-ink-soft mt-1 text-right">
              Total: <span className="font-mono tabular text-ink font-medium">${total.toFixed(2)}</span>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1">
              Receipt photo (optional)
            </label>
            {receiptImage ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={receiptImage}
                  alt="Receipt"
                  className="w-16 h-16 object-cover rounded-md border border-line"
                />
                <button
                  type="button"
                  onClick={() => setReceiptImage(null)}
                  className="text-sm text-danger hover:opacity-80"
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 text-sm border border-dashed border-line rounded-md px-3 py-2 text-ink-soft hover:border-brick hover:text-brick"
              >
                <Camera className="w-4 h-4" />
                Attach a photo
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handlePhoto(file);
              }}
            />
          </div>

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
              {saving ? "Saving…" : isEditing ? "Save changes" : "Log purchase"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
