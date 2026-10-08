import { SKILLS, TILES } from "../data/portfolioData.js";
import { PALETTES } from "./palettes.js";

// One colour per SKILLS group. Brand hues, spaced in luminance (light → dark) so groups still differ
// when the LCD filter maps everything onto 4 shades.
export const SKILL_GROUP_COLORS = {
  Languages: "#FF3B3B",
  "Systems & Networking": "#3FD8F0",
  "Distributed Systems": "#7B5CFF",
  "ML & AI": "#1E9E4A",
  "Web & Backend": "#FFE14D",
  "Data & Infra": "#2A4FD6",
  "Hardware Acceleration": "#E0218A",
  Quant: "#FF9A1F",
};

// DOM swatch for a group: its hue on full-colour screens, otherwise a palette shade.
export const groupSwatch = (group, palette) => (PALETTES[palette]?.full ? SKILL_GROUP_COLORS[group] : "var(--gb-2)");

export const skillColor = (skill) => SKILL_GROUP_COLORS[SKILLS.find((g) => g.items.includes(skill))?.group] ?? "#00C3E3";

// Other names a skill goes by in tile stacks.
const ALIASES = {
  JavaScript: ["react", "node", "express"],
  SQL: ["clickhouse"],
  Multithreading: ["pthreads"],
  "Socket Programming": ["networking"],
  LLMs: ["llm pretraining", "llm inference"],
  HBM: ["hbm2"],
  "Graph Neural Nets": ["graph neural networks", "gnns"],
  "Contextual Bandits": ["linucb", "thompson sampling"],
  "Off-Policy Eval": ["doubly robust ope"],
  "Multi-omics": ["scrna seq"],
  "JWT Auth": ["jwt"],
  "Market Making": ["avellaneda stoikov"],
};

// Skills a tile's write-up shows but its stack doesn't list.
const EVIDENCE = {
  Python: ["bharatslm"],
  "Socket Programming": ["docspp"],
  Replication: ["cuffka", "docspp"],
  "Message Brokers": ["cuffka"],
  LLMs: ["churnsense"],
  SHAP: ["churnsense"],
  "REST APIs": ["buysell", "churnsense"],
  Git: TILES.filter((t) => t.repo).map((t) => t.id),
};

// "C/C++" → ["c", "c++"]; "React.js" → ["react"]; "C++17" → ["c++"]; "Scikit-Learn" → ["scikit learn"]
const terms = (s) =>
  s
    .toLowerCase()
    .split(/[\/&,]/)
    .map((t) =>
      t
        .replace(/\.js\b/g, "")
        .replace(/-/g, " ")
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => w.replace(/(\D)\d+$/, "$1"))
        .join(" ")
    )
    .filter(Boolean);

// Whole-word containment, so "linux" ⊂ "linux cli" but "c" never matches "css".
const match = (a, b) => ` ${a} `.includes(` ${b} `) || ` ${b} `.includes(` ${a} `);

// Tiles (projects, experience, games — not "About Me") whose stack uses this skill.
export function tilesForSkill(skill) {
  const want = [...terms(skill), ...(ALIASES[skill] ?? [])];
  const extra = EVIDENCE[skill] ?? [];
  return TILES.filter(
    (t) => (t.category || t.game) && (extra.includes(t.id) || t.stack?.some((s) => terms(s).some((x) => want.some((w) => match(x, w)))))
  );
}
