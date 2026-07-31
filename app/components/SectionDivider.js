"use client";

const LABELS = {
  experience: "EXPERIENCE",
  project: "PROJECTS",
};

export default function SectionDivider({ category, size }) {
  return (
    <div
      className="glass-divider flex flex-shrink-0 items-center justify-center rounded-2xl"
      style={{ width: size * 0.3, height: size }}
    >
      <span
        className="whitespace-nowrap text-[13px] font-bold tracking-[0.25em] text-[#3d4552] dark:text-slate-200"
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
      >
        {LABELS[category] || category}
      </span>
    </div>
  );
}
