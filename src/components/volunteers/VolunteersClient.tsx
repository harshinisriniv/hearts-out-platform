"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Mail, AlertTriangle } from "lucide-react";
import { VolunteerFormModal, type EditableVolunteer } from "./VolunteerFormModal";
import { deleteVolunteer } from "@/app/(app)/volunteers/actions";

export type VolunteerRow = EditableVolunteer & {
  activeTaskCount: number;
  upcomingDeliveryCount: number;
};

export function VolunteersClient({ volunteers }: { volunteers: VolunteerRow[] }) {
  const [formTarget, setFormTarget] = useState<EditableVolunteer | null | "new">(null);
  const [deleteTarget, setDeleteTarget] = useState<VolunteerRow | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-ink-soft">
          {volunteers.length} volunteer{volunteers.length === 1 ? "" : "s"}
        </p>
        <button
          onClick={() => setFormTarget("new")}
          className="flex items-center gap-2 bg-brick text-paper-raised rounded-md px-4 py-2 text-sm font-medium hover:bg-brick-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add volunteer
        </button>
      </div>

      {volunteers.length === 0 ? (
        <div className="hang-tag hang-tag--ochre p-6 bg-paper-raised text-center">
          <p className="text-ink-soft">
            No volunteers yet. Add people here so they can be assigned tasks
            and deliveries — and so notifications actually reach them.
          </p>
        </div>
      ) : (
        <div className="bg-paper-raised border border-line rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-ink-soft">
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Contact</th>
                <th className="px-4 py-2.5 font-medium">Open tasks</th>
                <th className="px-4 py-2.5 font-medium">Upcoming deliveries</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {volunteers.map((v) => (
                <tr key={v.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 text-ink font-medium">{v.name}</td>
                  <td className="px-4 py-3 text-ink-soft">
                    {v.email ? (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {v.email}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-ochre">
                        <AlertTriangle className="w-3 h-3" />
                        No email on file
                      </span>
                    )}
                    {v.phone && <p className="text-xs">{v.phone}</p>}
                  </td>
                  <td className="px-4 py-3 font-mono tabular text-ink">{v.activeTaskCount}</td>
                  <td className="px-4 py-3 font-mono tabular text-ink">{v.upcomingDeliveryCount}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`hang-tag ${v.isActive ? "hang-tag--sage" : ""} inline-flex px-2 py-1 text-xs ${
                        v.isActive ? "text-sage" : "text-ink-soft"
                      }`}
                    >
                      {v.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setFormTarget(v)}
                        aria-label={`Edit ${v.name}`}
                        className="text-ink-soft hover:text-ink p-1.5 rounded hover:bg-paper"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(v)}
                        aria-label={`Delete ${v.name}`}
                        className="text-ink-soft hover:text-danger p-1.5 rounded hover:bg-paper"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formTarget !== null && (
        <VolunteerFormModal
          volunteer={formTarget === "new" ? null : formTarget}
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
            <h2 className="font-display text-lg text-ink mb-2">Delete {deleteTarget.name}?</h2>
            <p className="text-sm text-ink-soft mb-5">
              Tasks and deliveries assigned to them will become unassigned,
              not deleted. This can&apos;t be undone.
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
                  await deleteVolunteer(deleteTarget.id);
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
