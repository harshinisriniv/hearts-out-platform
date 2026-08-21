"use client";

import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import {
  createKitTemplate,
  updateKitTemplate,
  type TemplateItemInput,
} from "@/app/(app)/kits/actions";

export type CatalogItem = {
  id: number;
  name: string;
  unit: string;
};

export type EditableTemplate = {
  id: number;
  name: string;
  description: string | null;
  ingredients: Array<{ itemId: number; quantityPerKit: number }>;
};

export function KitTemplateFormModal({
  template,
  catalogItems,
  onClose,
}: {
  template: EditableTemplate | null;
  catalogItems: CatalogItem[];
  onClose: () => void;
}) {
  const isEditing = !!template;
  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [rows, setRows] = useState<TemplateItemInput[]>(
    template?.ingredients.length
      ? template.ingredients
      : catalogItems.length
      ? [{ itemId: catalogItems[0].id, quantityPerKit: 1 }]
      : []
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateRow(index: number, patch: Partial<TemplateItemInput>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function addRow() {
    if (catalogItems.length === 0) return;
    const usedIds = new Set(rows.map((r) => r.itemId));
    const nextItem = catalogItems.find((c) => !usedIds.has(c.id)) ?? catalogItems[0];
    setRows((prev) => [...prev, { itemId: nextItem.id, quantityPerKit: 1 }]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const validRows = rows.filter((r) => r.itemId && r.quantityPerKit > 0);
    if (!name.trim()) {
      setError("Give the kit a name.");
      return;
    }
    if (validRows.length === 0) {
      setError("Add at least one item to the kit.");
      return;
    }

    setSaving(true);
    try {
      if (isEditing) {
        await updateKitTemplate({
          id: template.id,
          name,
          description,
          templateItems: validRows,
        });
      } else {
        await createKitTemplate({ name, description, templateItems: validRows });
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
            {isEditing ? "Edit kit template" : "New kit template"}
          </h2>
          <button onClick={onClose} aria-label="Close" className="text-ink-soft hover:text-ink">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Kit name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Standard Care Kit"
              className="w-full rounded-md border border-line bg-paper px-3 py-2 text-ink"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1">
              Description (optional)
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this kit for?"
              className="w-full rounded-md border border-line bg-paper px-3 py-2 text-ink"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-ink">What's in it</label>
              <button
                type="button"
                onClick={addRow}
                disabled={catalogItems.length === 0}
                className="text-sm text-brick hover:text-brick-dark flex items-center gap-1 disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" />
                Add item
              </button>
            </div>

            {catalogItems.length === 0 ? (
              <p className="text-sm text-ink-soft">
                Add some items to inventory first, then come back to build a
                kit recipe.
              </p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-ink-soft">No items yet — add one above.</p>
            ) : (
              <div className="space-y-2">
                {rows.map((row, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <select
                      value={row.itemId}
                      onChange={(e) => updateRow(index, { itemId: Number(e.target.value) })}
                      className="flex-1 rounded-md border border-line bg-paper px-2 py-1.5 text-sm text-ink"
                    >
                      {catalogItems.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={row.quantityPerKit}
                      onChange={(e) =>
                        updateRow(index, { quantityPerKit: Number(e.target.value) })
                      }
                      className="w-20 rounded-md border border-line bg-paper px-2 py-1.5 text-sm text-ink font-mono tabular"
                    />
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      aria-label="Remove item"
                      className="text-ink-soft hover:text-danger"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
              {saving ? "Saving…" : isEditing ? "Save changes" : "Create kit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
