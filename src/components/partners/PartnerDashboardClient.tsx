"use client";

import { useState } from "react";
import { Plus, Check, Trash2, Clock, Truck } from "lucide-react";
import { DeliveryFormModal, type VolunteerOption } from "./DeliveryFormModal";
import { markDelivered, deleteDelivery } from "@/app/(app)/partners/actions";
import type { KitTemplateOption } from "./PartnerFormModal";

export type DeliveryRow = {
  id: number;
  kitTemplateName: string | null;
  kitCount: number;
  distributedAt: string; // ISO datetime
  volunteerName: string | null;
  isDelivered: boolean;
  deliveredAt: string | null;
  notes: string | null;
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function PartnerDashboardClient({
  partnerId,
  partnerName,
  deliveries,
  kitTemplateOptions,
  volunteerOptions,
  totalKitsDelivered,
  upcomingCount,
  lastDeliveredAt,
}: {
  partnerId: number;
  partnerName: string;
  deliveries: DeliveryRow[];
  kitTemplateOptions: KitTemplateOption[];
  volunteerOptions: VolunteerOption[];
  totalKitsDelivered: number;
  upcomingCount: number;
  lastDeliveredAt: string | null;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [markingId, setMarkingId] = useState<number | null>(null);

  async function handleMarkDelivered(id: number) {
    setMarkingId(id);
    try {
      await markDelivered(id);
    } finally {
      setMarkingId(null);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="hang-tag hang-tag--sage p-4">
          <p className="text-xs text-ink-soft mb-1">Kits delivered</p>
          <p className="font-mono tabular text-xl text-sage">{totalKitsDelivered}</p>
        </div>
        <div className="hang-tag hang-tag--ochre p-4">
          <p className="text-xs text-ink-soft mb-1">Upcoming scheduled</p>
          <p className="font-mono tabular text-xl text-ochre">{upcomingCount}</p>
        </div>
        <div className="hang-tag p-4">
          <p className="text-xs text-ink-soft mb-1">Last delivery</p>
          <p className="font-mono tabular text-lg text-ink">
            {lastDeliveredAt ? formatDateTime(lastDeliveredAt) : "—"}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg text-ink">Delivery history</h2>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-brick text-paper-raised rounded-md px-4 py-2 text-sm font-medium hover:bg-brick-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          Schedule a delivery
        </button>
      </div>

      {deliveries.length === 0 ? (
        <div className="hang-tag hang-tag--ochre p-6 bg-paper-raised text-center">
          <p className="text-ink-soft">No deliveries scheduled or logged yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {deliveries.map((d) => (
            <div
              key={d.id}
              className={`hang-tag ${
                d.isDelivered ? "hang-tag--sage" : "hang-tag--ochre"
              } p-4 flex items-start justify-between gap-4`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  {d.isDelivered ? (
                    <Truck className="w-4 h-4 text-sage" />
                  ) : (
                    <Clock className="w-4 h-4 text-ochre" />
                  )}
                  <p className="text-ink font-medium">
                    {d.kitTemplateName ?? "Kits"} × {d.kitCount}
                  </p>
                </div>
                <p className="text-xs text-ink-soft">
                  {formatDateTime(d.distributedAt)}
                  {d.volunteerName ? ` · ${d.volunteerName}` : " · Unassigned"}
                </p>
                {d.notes && <p className="text-xs text-ink-soft mt-1">{d.notes}</p>}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!d.isDelivered && (
                  <button
                    onClick={() => handleMarkDelivered(d.id)}
                    disabled={markingId === d.id}
                    className="flex items-center gap-1 text-xs border border-sage text-sage rounded-md px-2.5 py-1.5 hover:bg-sage hover:text-paper-raised transition-colors disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Mark delivered
                  </button>
                )}
                <button
                  onClick={() => deleteDelivery(d.id)}
                  aria-label="Delete delivery"
                  className="text-ink-soft hover:text-danger p-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <DeliveryFormModal
          partnerId={partnerId}
          partnerName={partnerName}
          kitTemplateOptions={kitTemplateOptions}
          volunteerOptions={volunteerOptions}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
