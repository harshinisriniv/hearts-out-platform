import type { ReactNode } from "react";

const TONE_BG: Record<"brick" | "sage" | "ochre", string> = {
  brick: "bg-brick",
  sage: "bg-sage",
  ochre: "bg-ochre",
};

const PETAL_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

export function PageHero({
  eyebrow,
  title,
  tone,
  tagline,
  chip,
}: {
  eyebrow: string;
  title: string;
  tone: "brick" | "sage" | "ochre";
  tagline?: string;
  chip?: ReactNode;
}) {
  return (
    <div
      className={`pop-card relative overflow-hidden rounded-[26px] px-9 py-8 mb-6 ${TONE_BG[tone]}`}
    >
      <svg
        viewBox="0 0 100 100"
        width="150"
        height="150"
        className="absolute -top-7 -right-4 opacity-[0.16] pointer-events-none"
        aria-hidden="true"
      >
        <g transform="translate(50,50)" fill="var(--paper-raised)">
          {PETAL_ANGLES.map((deg) => (
            <ellipse key={deg} cx="0" cy="-27" rx="10" ry="25" transform={`rotate(${deg})`} />
          ))}
        </g>
      </svg>

      <span className="relative inline-block bg-paper-raised border-2 border-ink text-ink font-mono text-[11px] font-bold uppercase tracking-wider px-3.5 py-1 rounded-full mb-4">
        {eyebrow}
      </span>
      <h1 className="relative font-display text-4xl text-paper-raised tracking-tight leading-[1.1] max-w-xl">
        {title}
      </h1>
      {tagline && (
        <p className="relative font-script text-2xl text-paper-raised/90 mt-2">{tagline}</p>
      )}
      {chip && <div className="relative mt-4">{chip}</div>}
    </div>
  );
}
