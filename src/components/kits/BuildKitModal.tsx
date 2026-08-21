"use client";

import { useState } from "react";
import { X, Check } from "lucide-react";
import { buildKits } from "@/app/(app)/kits/actions";

export function BuildKitModal({
  templateId,
  templateName,
  maxBuildable,
  onClose,
}: {
  templateId: number;
  templateName: string;
  maxBuildable: number;
  onClose: () => void;
}) {
  const [quantity, setQuantity] = useState(Math.max(1, maxBuildable));
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleBuild() {
    setError("");
    setBuilding(true);
    try {
      await buildKits({ kitTemplateId: templateId, quantityToBuild: quantity });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBuilding(false);
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
        {done ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-12 h-12 rounded-full bg-sage-soft flex items-center justify-center">
              <Check className="w-6 h-6 text-sage" />
            </div>
            <p className="text-ink font-medium">
              Built {quantity} {templateName} kit{quantity === 1 ? "" : "s"}
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
              <h2 className="font-display text-lg text-ink">Build {templateName}</h2>
              <button onClick={onClose} aria-label="Close" className="text-ink-soft hover:text-ink">
                <X className="w-5 h-5" />
              </button>
            </div>

            {maxBuildable === 0 ? (
              <p className="text-sm text-danger mb-4">
                Not enough inventory to build even one of these right now.
              </p>
            ) : (
              <p className="text-sm text-ink-soft mb-4">
                You can build up to <strong className="text-ink">{maxBuildable}</strong> right
                now. Building will deduct the ingredients from inventory.
              </p>
            )}

            <label className="block text-sm font-medium text-ink mb-1">
              How many to build
            </label>
            <input
              type="number"
              min={1}
              max={maxBuildable}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              disabled={maxBuildable === 0}
              className="w-full rounded-md border border-line bg-paper px-3 py-2 text-ink font-mono tabular mb-4 disabled:opacity-50"
            />

            {error && <p className="text-danger text-sm mb-3">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-md border border-line py-2 text-ink font-medium hover:bg-paper"
              >
                Cancel
              </button>
              <button
                onClick={handleBuild}
                disabled={building || maxBuildable === 0 || quantity < 1 || quantity > maxBuildable}
                className="flex-1 rounded-md bg-brick text-paper-raised py-2 font-medium hover:bg-brick-dark transition-colors disabled:opacity-50"
              >
                {building ? "Building…" : "Build kits"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
