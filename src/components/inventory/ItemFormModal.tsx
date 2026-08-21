"use client";

import { useRef } from "react";
import { X } from "lucide-react";
import { createItem, updateItem } from "@/app/(app)/inventory/actions";

const COMMON_CATEGORIES = [
  "Hygiene",
  "Clothing",
  "Food",
  "First Aid",
  "Other",
];

const COMMON_UNITS = ["each", "pack", "pair", "bottle", "box"];

export type EditableItem = {
  id: number;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  lowStockThreshold: number;
};

export function ItemFormModal({
  item,
  onClose,
}: {
  item: EditableItem | null;
  onClose: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const isEditing = !!item;

  async function handleSubmit(formData: FormData) {
    if (isEditing) {
      formData.set("id", String(item.id));
      await updateItem(formData);
    } else {
      await createItem(formData);
    }
    onClose();
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
            {isEditing ? "Edit item" : "Add a new item"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-ink-soft hover:text-ink"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form ref={formRef} action={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">
              Item name
            </label>
            <input
              name="name"
              required
              defaultValue={item?.name}
              placeholder="e.g. Toothbrush"
              className="w-full rounded-md border border-line bg-paper px-3 py-2 text-ink"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1">
              Category
            </label>
            <input
              name="category"
              required
              list="category-options"
              defaultValue={item?.category}
              placeholder="e.g. Hygiene"
              className="w-full rounded-md border border-line bg-paper px-3 py-2 text-ink"
            />
            <datalist id="category-options">
              {COMMON_CATEGORIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">
                Unit
              </label>
              <input
                name="unit"
                list="unit-options"
                defaultValue={item?.unit ?? "each"}
                className="w-full rounded-md border border-line bg-paper px-3 py-2 text-ink"
              />
              <datalist id="unit-options">
                {COMMON_UNITS.map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </div>

            {!isEditing && (
              <div>
                <label className="block text-sm font-medium text-ink mb-1">
                  Starting quantity
                </label>
                <input
                  name="quantity"
                  type="number"
                  min={0}
                  defaultValue={0}
                  className="w-full rounded-md border border-line bg-paper px-3 py-2 text-ink font-mono tabular"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1">
              Low-stock warning threshold
            </label>
            <input
              name="lowStockThreshold"
              type="number"
              min={0}
              defaultValue={item?.lowStockThreshold ?? 10}
              className="w-full rounded-md border border-line bg-paper px-3 py-2 text-ink font-mono tabular"
            />
            <p className="text-xs text-ink-soft mt-1">
              We&apos;ll flag this item as low stock once quantity drops to
              this number or below.
            </p>
          </div>

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
              className="flex-1 rounded-md bg-brick text-paper-raised py-2 font-medium hover:bg-brick-dark transition-colors"
            >
              {isEditing ? "Save changes" : "Add item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
