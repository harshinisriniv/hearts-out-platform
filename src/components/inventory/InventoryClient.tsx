"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, AlertTriangle, Camera, Check } from "lucide-react";
import { ItemFormModal, type EditableItem } from "./ItemFormModal";
import { QuantityStepper } from "./QuantityStepper";
import { ScannerModal } from "./ScannerModal";
import { deleteItem } from "@/app/(app)/inventory/actions";

type Item = EditableItem;

export function InventoryClient({ items }: { items: Item[] }) {
  const [modalItem, setModalItem] = useState<Item | null | "new">(null);
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  const grouped = useMemo(() => {
    const groups: Record<string, Item[]> = {};
    for (const item of items) {
      groups[item.category] = groups[item.category] || [];
      groups[item.category].push(item);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  return (
    <div>
      <div className="flex items-center justify-end gap-3 mb-6">
        <button
          onClick={() => setScannerOpen(true)}
          className="flex items-center gap-2 border-2 border-ink text-brick-dark bg-paper-raised rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wide hover:bg-brick hover:text-paper-raised transition-colors"
        >
          <Camera className="w-4 h-4" />
          Scan donations
        </button>
        <button
          onClick={() => setModalItem("new")}
          className="flex items-center gap-2 bg-brick text-paper-raised border-2 border-ink rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wide hover:bg-brick-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add item
        </button>
      </div>

      {items.length === 0 ? (
        <div className="hang-tag hang-tag--ochre p-6 bg-paper-raised text-center">
          <p className="text-ink-soft">
            No items yet. Add your first item, or use the scanner once it's
            built to populate inventory from a photo.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(([category, categoryItems]) => (
            <div key={category}>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="relative border-[2.5px] border-sage-dark rounded-[8px_18px_18px_8px] bg-sage-soft pl-7 pr-4 py-1.5">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-sage-dark">
                    ♥
                  </span>
                  <h3 className="font-display text-base text-sage-dark">{category}</h3>
                </div>
                <span className="text-xs font-bold text-ink-soft bg-paper-raised border-2 border-ink rounded-full px-2.5 py-0.5">
                  {categoryItems.length} item{categoryItems.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="pop-card bg-paper-raised rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-sage-soft border-b-2 border-ink text-left text-sage-dark">
                      <th className="px-4 py-2.5 font-bold text-xs uppercase tracking-wide">Item</th>
                      <th className="px-4 py-2.5 font-bold text-xs uppercase tracking-wide">Unit</th>
                      <th className="px-4 py-2.5 font-bold text-xs uppercase tracking-wide">Quantity</th>
                      <th className="px-4 py-2.5 font-bold text-xs uppercase tracking-wide">Status</th>
                      <th className="px-4 py-2.5 font-bold text-xs uppercase tracking-wide text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryItems.map((item) => {
                      const isLow = item.quantity <= item.lowStockThreshold;
                      return (
                        <tr
                          key={item.id}
                          className="border-b border-line last:border-0"
                        >
                          <td className="px-4 py-3 text-ink font-medium">
                            {item.name}
                          </td>
                          <td className="px-4 py-3 text-ink-soft">
                            {item.unit}
                          </td>
                          <td className="px-4 py-3">
                            <QuantityStepper
                              itemId={item.id}
                              quantity={item.quantity}
                            />
                          </td>
                          <td className="px-4 py-3">
                            {isLow ? (
                              <span className="inline-flex items-center gap-1.5 bg-ochre-soft border-[1.5px] border-ochre-dark rounded-full px-2.5 py-1 text-xs font-bold text-ochre-dark">
                                <AlertTriangle className="w-3 h-3" />
                                Low stock
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 bg-sage-soft border-[1.5px] border-sage-dark rounded-full px-2.5 py-1 text-xs font-bold text-sage-dark">
                                <Check className="w-3 h-3" />
                                In stock
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setModalItem(item)}
                                aria-label={`Edit ${item.name}`}
                                className="text-ink-soft hover:text-ink p-1.5 rounded hover:bg-paper"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(item)}
                                aria-label={`Delete ${item.name}`}
                                className="text-ink-soft hover:text-danger p-1.5 rounded hover:bg-paper"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {scannerOpen && <ScannerModal onClose={() => setScannerOpen(false)} />}

      {modalItem !== null && (
        <ItemFormModal
          item={modalItem === "new" ? null : modalItem}
          onClose={() => setModalItem(null)}
        />
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 bg-ink/30 flex items-center justify-center p-4 z-50"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-paper-raised rounded-2xl border-2 border-line w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-lg text-ink mb-2">
              Delete {deleteTarget.name}?
            </h2>
            <p className="text-sm text-ink-soft mb-5">
              This removes it from inventory entirely, including its history.
              This can&apos;t be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-md border border-line py-2 text-ink font-medium hover:bg-paper"
              >
                Cancel
              </button>
              <form
                action={async (formData) => {
                  await deleteItem(formData);
                  setDeleteTarget(null);
                }}
                className="flex-1"
              >
                <input type="hidden" name="id" value={deleteTarget.id} />
                <button
                  type="submit"
                  className="w-full rounded-md bg-danger text-paper-raised py-2 font-medium hover:opacity-90"
                >
                  Delete
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
