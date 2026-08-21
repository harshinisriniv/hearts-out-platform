"use client";

import { useEffect, useState, useTransition } from "react";
import { Minus, Plus } from "lucide-react";
import { adjustQuantity } from "@/app/(app)/inventory/actions";

export function QuantityStepper({
  itemId,
  quantity,
}: {
  itemId: number;
  quantity: number;
}) {
  const [pending, startTransition] = useTransition();
  const [localQuantity, setLocalQuantity] = useState(quantity);

  // Quantity can change elsewhere (e.g. the scanner), so re-sync on prop change
  useEffect(() => {
    setLocalQuantity(quantity);
  }, [quantity]);

  function handleAdjust(delta: number) {
    setLocalQuantity((q) => Math.max(0, q + delta));
    startTransition(async () => {
      await adjustQuantity(itemId, delta, "manual");
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleAdjust(-1)}
        disabled={pending || localQuantity <= 0}
        aria-label="Decrease quantity"
        className="w-7 h-7 rounded-full border border-line flex items-center justify-center text-ink-soft hover:bg-paper disabled:opacity-40"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <span className="font-mono tabular text-ink w-10 text-center">
        {localQuantity}
      </span>
      <button
        onClick={() => handleAdjust(1)}
        disabled={pending}
        aria-label="Increase quantity"
        className="w-7 h-7 rounded-full border border-line flex items-center justify-center text-ink-soft hover:bg-paper disabled:opacity-40"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
