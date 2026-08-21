"use client";

import { useState } from "react";
import { X, UserPlus, Mail } from "lucide-react";
import { createTask, updateTask, type TaskInput } from "@/app/(app)/tasks/actions";
import { createVolunteer } from "@/app/(app)/volunteers/actions";

export type VolunteerOption = { id: number; name: string; email: string | null };

export type EditableTask = {
  id: number;
  title: string;
  description: string | null;
  dueDate: string | null;
  assignedVolunteerId: number | null;
};

export function TaskFormModal({
  task,
  volunteerOptions,
  onClose,
}: {
  task: EditableTask | null;
  volunteerOptions: VolunteerOption[];
  onClose: () => void;
}) {
  const isEditing = !!task;
  const [form, setForm] = useState<TaskInput>({
    title: task?.title ?? "",
    description: task?.description ?? "",
    dueDate: task?.dueDate ?? null,
    assignedVolunteerId: task?.assignedVolunteerId ?? null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [addingVolunteer, setAddingVolunteer] = useState(false);
  const [newVolunteerName, setNewVolunteerName] = useState("");
  const [newVolunteerEmail, setNewVolunteerEmail] = useState("");
  const [localVolunteers, setLocalVolunteers] = useState(volunteerOptions);

  function patch(update: Partial<TaskInput>) {
    setForm((prev) => ({ ...prev, ...update }));
  }

  const selectedVolunteer = localVolunteers.find((v) => v.id === form.assignedVolunteerId);

  async function handleAddVolunteer() {
    if (!newVolunteerName.trim()) return;
    const created = await createVolunteer({
      name: newVolunteerName,
      email: newVolunteerEmail,
      phone: "",
    });
    setLocalVolunteers((prev) => [...prev, { id: created.id, name: created.name, email: created.email }]);
    patch({ assignedVolunteerId: created.id });
    setNewVolunteerName("");
    setNewVolunteerEmail("");
    setAddingVolunteer(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (isEditing) {
        await updateTask(task.id, form, task.assignedVolunteerId);
      } else {
        await createTask(form);
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
        className="bg-paper-raised rounded-2xl border-2 border-line w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl text-ink">
            {isEditing ? "Edit task" : "New task"}
          </h2>
          <button onClick={onClose} aria-label="Close" className="text-ink-soft hover:text-ink">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Title</label>
            <input
              value={form.title}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder="e.g. Pick up donation boxes from La Centerra"
              className="w-full rounded-md border border-line bg-paper px-3 py-2 text-ink"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1">
              Description (optional)
            </label>
            <textarea
              value={form.description}
              onChange={(e) => patch({ description: e.target.value })}
              rows={2}
              className="w-full rounded-md border border-line bg-paper px-3 py-2 text-ink"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1">Due date (optional)</label>
            <input
              type="date"
              value={form.dueDate ?? ""}
              onChange={(e) => patch({ dueDate: e.target.value || null })}
              className="w-full rounded-md border border-line bg-paper px-3 py-2 text-ink"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1">Assign to</label>
            {addingVolunteer ? (
              <div className="space-y-2">
                <input
                  autoFocus
                  value={newVolunteerName}
                  onChange={(e) => setNewVolunteerName(e.target.value)}
                  placeholder="Volunteer name"
                  className="w-full rounded-md border border-line bg-paper px-3 py-2 text-ink"
                />
                <div className="flex items-center gap-2">
                  <input
                    value={newVolunteerEmail}
                    onChange={(e) => setNewVolunteerEmail(e.target.value)}
                    placeholder="Email (for notifications)"
                    className="flex-1 rounded-md border border-line bg-paper px-3 py-2 text-ink"
                  />
                  <button
                    type="button"
                    onClick={handleAddVolunteer}
                    className="text-sm text-brick hover:text-brick-dark font-medium whitespace-nowrap"
                  >
                    Add
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <select
                  value={form.assignedVolunteerId ?? ""}
                  onChange={(e) =>
                    patch({ assignedVolunteerId: e.target.value ? Number(e.target.value) : null })
                  }
                  className="flex-1 rounded-md border border-line bg-paper px-3 py-2 text-ink"
                >
                  <option value="">Unassigned</option>
                  {localVolunteers.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setAddingVolunteer(true)}
                  aria-label="Add new volunteer"
                  className="text-ink-soft hover:text-brick p-2"
                >
                  <UserPlus className="w-4 h-4" />
                </button>
              </div>
            )}
            {selectedVolunteer && !selectedVolunteer.email && (
              <p className="text-xs text-ochre mt-1">
                This volunteer has no email on file — they won&apos;t get a notification.
              </p>
            )}
            {selectedVolunteer?.email && (
              <p className="text-xs text-ink-soft mt-1 flex items-center gap-1">
                <Mail className="w-3 h-3" />
                Will email {selectedVolunteer.email}
              </p>
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
              {saving ? "Saving…" : isEditing ? "Save changes" : "Create task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
