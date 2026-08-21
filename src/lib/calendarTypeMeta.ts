import { CalendarDays, Truck, Heart, Home } from "lucide-react";

export type EntryType = "task" | "event" | "delivery" | "follow_up";

export const TYPE_META: Record<
  EntryType,
  { label: string; icon: typeof CalendarDays; tagClass: string; iconClass: string; dotClass: string }
> = {
  task: { label: "Task", icon: CalendarDays, tagClass: "hang-tag--brick", iconClass: "text-brick", dotClass: "bg-brick" },
  event: { label: "Event", icon: Heart, tagClass: "hang-tag--ochre", iconClass: "text-ochre", dotClass: "bg-ochre" },
  delivery: { label: "Delivery", icon: Truck, tagClass: "hang-tag--sage", iconClass: "text-sage", dotClass: "bg-sage" },
  follow_up: { label: "Follow-up", icon: Home, tagClass: "hang-tag--teal", iconClass: "text-teal", dotClass: "bg-teal" },
};

const FALLBACK_META = {
  label: "Other",
  icon: CalendarDays,
  tagClass: "",
  iconClass: "text-ink-soft",
  dotClass: "bg-ink-soft",
};

// Falls back instead of crashing on an unexpected type value
export function getTypeMeta(type: string) {
  return TYPE_META[type as EntryType] ?? FALLBACK_META;
}
