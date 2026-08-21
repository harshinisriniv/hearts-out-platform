"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Hammer } from "lucide-react";
import {
  KitTemplateFormModal,
  type CatalogItem,
  type EditableTemplate,
} from "./KitTemplateFormModal";
import { BuildKitModal } from "./BuildKitModal";
import { deleteKitTemplate } from "@/app/(app)/kits/actions";

export type TemplateForDisplay = {
  id: number;
  name: string;
  description: string | null;
  ingredients: Array<{
    itemId: number;
    itemName: string;
    unit: string;
    quantityPerKit: number;
    currentQuantity: number;
  }>;
  buildableCount: number;
};

export function KitsClient({
  templates,
  catalogItems,
}: {
  templates: TemplateForDisplay[];
  catalogItems: CatalogItem[];
}) {
  const [formTarget, setFormTarget] = useState<EditableTemplate | null | "new">(null);
  const [buildTarget, setBuildTarget] = useState<TemplateForDisplay | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TemplateForDisplay | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-ink-soft">
          {templates.length} kit template{templates.length === 1 ? "" : "s"}
        </p>
        <button
          onClick={() => setFormTarget("new")}
          className="flex items-center gap-2 bg-brick text-paper-raised rounded-md px-4 py-2 text-sm font-medium hover:bg-brick-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          New kit template
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="hang-tag hang-tag--ochre p-6 bg-paper-raised text-center">
          <p className="text-ink-soft">
            No kit templates yet. Create one to define what goes in a
            standard care kit.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {templates.map((t) => (
            <div
              key={t.id}
              className="bg-paper-raised border-2 border-line rounded-2xl p-5 flex flex-col"
            >
              <div className="flex items-start justify-between mb-1">
                <h3 className="font-display text-lg text-ink">{t.name}</h3>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() =>
                      setFormTarget({
                        id: t.id,
                        name: t.name,
                        description: t.description,
                        ingredients: t.ingredients.map((i) => ({
                          itemId: i.itemId,
                          quantityPerKit: i.quantityPerKit,
                        })),
                      })
                    }
                    aria-label={`Edit ${t.name}`}
                    className="text-ink-soft hover:text-ink p-1.5 rounded hover:bg-paper"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(t)}
                    aria-label={`Delete ${t.name}`}
                    className="text-ink-soft hover:text-danger p-1.5 rounded hover:bg-paper"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {t.description && (
                <p className="text-sm text-ink-soft mb-3">{t.description}</p>
              )}

              <ul className="text-sm text-ink-soft space-y-1 mb-4 flex-1">
                {t.ingredients.map((ing) => (
                  <li key={ing.itemId} className="flex justify-between">
                    <span>{ing.itemName}</span>
                    <span className="font-mono tabular">
                      x{ing.quantityPerKit}
                    </span>
                  </li>
                ))}
                {t.ingredients.length === 0 && (
                  <li className="text-ochre">No items defined yet</li>
                )}
              </ul>

              <div
                className={`hang-tag ${
                  t.buildableCount > 0 ? "hang-tag--sage" : "hang-tag--ochre"
                } p-3 mb-3 flex items-center justify-between`}
              >
                <span className="text-sm text-ink">Kits buildable now</span>
                <span
                  className={`font-mono tabular text-lg ${
                    t.buildableCount > 0 ? "text-sage" : "text-ochre"
                  }`}
                >
                  {t.buildableCount}
                </span>
              </div>

              <button
                onClick={() => setBuildTarget(t)}
                disabled={t.ingredients.length === 0}
                className="flex items-center justify-center gap-2 border-2 border-brick text-brick rounded-md py-2 text-sm font-medium hover:bg-brick hover:text-paper-raised transition-colors disabled:opacity-40"
              >
                <Hammer className="w-4 h-4" />
                Build kits
              </button>
            </div>
          ))}
        </div>
      )}

      {formTarget !== null && (
        <KitTemplateFormModal
          template={formTarget === "new" ? null : formTarget}
          catalogItems={catalogItems}
          onClose={() => setFormTarget(null)}
        />
      )}

      {buildTarget && (
        <BuildKitModal
          templateId={buildTarget.id}
          templateName={buildTarget.name}
          maxBuildable={buildTarget.buildableCount}
          onClose={() => setBuildTarget(null)}
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
              This removes the kit recipe. Kits already built and distributed
              aren&apos;t affected — just the template itself.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-md border border-line py-2 text-ink font-medium hover:bg-paper"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await deleteKitTemplate(deleteTarget.id);
                  setDeleteTarget(null);
                }}
                className="flex-1 rounded-md bg-danger text-paper-raised py-2 font-medium hover:opacity-90"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
