"use client";

export const DIVIDER_LABELS = {
  experience: "EXPERIENCE",
  project: "PROJECTS",
};

export default function SectionDivider({ category, size }) {
  return (
    <div
      className="flex flex-shrink-0 items-center justify-center border-[3px] border-gb-3 bg-gb-0"
      style={{ width: size * 0.3, height: size }}
    >
      <span
        className="whitespace-nowrap font-display text-[9px] tracking-[0.2em] text-gb-3"
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
      >
        {DIVIDER_LABELS[category] || category}
      </span>
    </div>
  );
}
