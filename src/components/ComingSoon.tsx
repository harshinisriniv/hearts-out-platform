export function ComingSoon({ title, day }: { title: string; day: string }) {
  return (
    <div className="p-8 max-w-6xl">
      <p className="text-xs font-mono uppercase tracking-wide text-ink-soft mb-1">
        {day}
      </p>
      <h1 className="font-display text-3xl text-ink mb-3">{title}</h1>
      <p className="text-ink-soft">This module is on deck — build it next.</p>
    </div>
  );
}
