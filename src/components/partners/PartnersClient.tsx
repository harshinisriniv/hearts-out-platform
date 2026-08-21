"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, AlertCircle, ExternalLink } from "lucide-react";
import { PartnerFormModal, type EditablePartner, type KitTemplateOption } from "./PartnerFormModal";
import { deletePartner } from "@/app/(app)/partners/actions";

export type PartnerRow = EditablePartner & {
  totalKitsReceived: number;
  lastDistributionAt: string | null;
  upcomingCount: number;
};

function isOverdue(nextFollowUpAt: string | null) {
  if (!nextFollowUpAt) return false;
  return new Date(nextFollowUpAt) < new Date(new Date().toDateString());
}

const TYPE_LABELS: Record<string, string> = {
  pantry: "Pantry",
  shelter: "Shelter",
  outreach: "Outreach",
};

export function PartnersClient({
  partners,
  kitTemplateOptions,
}: {
  partners: PartnerRow[];
  kitTemplateOptions: KitTemplateOption[];
}) {
  const [formTarget, setFormTarget] = useState<EditablePartner | null | "new">(null);
  const [deleteTarget, setDeleteTarget] = useState<PartnerRow | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-ink-soft">
          {partners.length} partner organization{partners.length === 1 ? "" : "s"}
        </p>
        <button
          onClick={() => setFormTarget("new")}
          className="flex items-center gap-2 bg-brick text-paper-raised rounded-md px-4 py-2 text-sm font-medium hover:bg-brick-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add organization
        </button>
      </div>

      {partners.length === 0 ? (
        <div className="hang-tag hang-tag--ochre p-6 bg-paper-raised text-center">
          <p className="text-ink-soft">
            No partner organizations yet. Add the pantries and shelters you
            work with to start tracking deliveries.
          </p>
        </div>
      ) : (
        <div className="bg-paper-raised border border-line rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-ink-soft">
                <th className="px-4 py-2.5 font-medium">Organization</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 font-medium">Kits received</th>
                <th className="px-4 py-2.5 font-medium">Last delivery</th>
                <th className="px-4 py-2.5 font-medium">Upcoming</th>
                <th className="px-4 py-2.5 font-medium">Next follow-up</th>
                <th className="px-4 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => {
                const overdue = isOverdue(p.nextFollowUpAt);
                return (
                  <tr key={p.id} className="border-b border-line last:border-0 align-top">
                    <td className="px-4 py-3">
                      <Link
                        href={`/partners/${p.id}`}
                        className="text-ink font-medium hover:text-brick flex items-center gap-1.5 group"
                      >
                        {p.name}
                        <ExternalLink className="w-3 h-3 text-ink-soft opacity-0 group-hover:opacity-100" />
                      </Link>
                      {p.primaryContactName && (
                        <p className="text-xs text-ink-soft">{p.primaryContactName}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {TYPE_LABELS[p.type] ?? p.type}
                    </td>
                    <td className="px-4 py-3 font-mono tabular text-ink">
                      {p.totalKitsReceived.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-ink-soft font-mono tabular">
                      {p.lastDistributionAt ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-mono tabular text-ochre">
                      {p.upcomingCount > 0 ? p.upcomingCount : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {p.nextFollowUpAt ? (
                        <span
                          className={`inline-flex items-center gap-1 font-mono tabular ${
                            overdue ? "text-danger" : "text-ink-soft"
                          }`}
                        >
                          {overdue && <AlertCircle className="w-3.5 h-3.5" />}
                          {p.nextFollowUpAt}
                        </span>
                      ) : (
                        <span className="text-ink-soft">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setFormTarget(p)}
                          aria-label={`Edit ${p.name}`}
                          className="text-ink-soft hover:text-ink p-1.5 rounded hover:bg-paper"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(p)}
                          aria-label={`Delete ${p.name}`}
                          className="text-ink-soft hover:text-danger p-1.5 rounded hover:bg-paper"
                          title="Delete"
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
      )}

      {formTarget !== null && (
        <PartnerFormModal
          partner={formTarget === "new" ? null : formTarget}
          kitTemplateOptions={kitTemplateOptions}
          onClose={() => setFormTarget(null)}
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
              This removes the organization and its delivery history. This can&apos;t be undone.
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
                  await deletePartner(deleteTarget.id);
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
