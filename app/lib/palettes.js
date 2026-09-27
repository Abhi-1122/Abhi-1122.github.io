// Screen palettes: 4 shades, paper → ink (for the backlit "light" palette paper is dark).
// `full: true` = the 3D screen keeps full colour (posterised) instead of mapping to 4 shades.
export const PALETTES = {
  dmg: { name: "DMG", shades: ["#cadc9f", "#8bac0f", "#306230", "#0f380f"], hi: "#a3195b" },
  pocket: { name: "POCKET", shades: ["#e3e6c9", "#a9ab8f", "#5b5c4d", "#1f201b"], hi: "#c23b22" },
  color: { name: "ICE CREAM", shades: ["#fff6d3", "#f9a875", "#eb6b6f", "#7c3f58"], hi: "#3a58e8" },
  gbc: { name: "COLOR", shades: ["#f8f8f0", "#9fb4f0", "#4a5ec8", "#161630"], hi: "#e83040", full: true },
  vb: { name: "VIRTUAL", shades: ["#050000", "#5c0000", "#b30000", "#ff1a1a"], hi: "#ff1a1a", secret: true },
  light: { name: "LIGHT", shades: ["#0a1e22", "#145c58", "#2fb5a3", "#b8ffe9"], hi: "#ffd166" },
};
export const PALETTE_ORDER = ["dmg", "pocket", "color", "gbc", "light"];

// Console shells (Game Boy Color-style colourways). `stage` = backdrop [bg, marquee ink, sprite a, sprite b].
export const SHELLS = {
  classic: { name: "CLASSIC", body: ["#e2e0db", "#cbc9c4", "#a8a59f"], ink: "#2c2f7a", ab: ["#a3195b", "#6e0f3c"], stage: ["#f7c948", "#efb41c", "#e94f37", "#2c2f7a"] },
  berry: { name: "BERRY", body: ["#ec5a7c", "#d8315b", "#a51f42"], ink: "#fff0f3", ab: ["#2a2a2e", "#000000"], stage: ["#2a1846", "#3a2260", "#ffcf3f", "#ff7aa2"] },
  teal: { name: "TEAL", body: ["#4fd2cd", "#1fb5b0", "#138682"], ink: "#06302f", ab: ["#2a2a2e", "#000000"], stage: ["#ff8a5c", "#f47444", "#fff3d6", "#1d3557"] },
  dandelion: { name: "DANDELION", body: ["#ffe050", "#f6c90e", "#c89f00"], ink: "#3a2c00", ab: ["#2a2a2e", "#000000"], stage: ["#2f5cff", "#254ce0", "#ffe050", "#ffffff"] },
  grape: { name: "GRAPE", body: ["#8a6cc0", "#6a4c9c", "#4b3372"], ink: "#f2eaff", ab: ["#2a2a2e", "#000000"], stage: ["#bdf25b", "#a5dd3c", "#4b3372", "#ffffff"] },
  atomic: {
    name: "ATOMIC",
    body: ["rgba(176,146,236,0.62)", "rgba(128,92,204,0.55)", "rgba(84,52,150,0.7)"],
    ink: "#f2eaff",
    ab: ["#3a2a5e", "#1a1030"],
    stage: ["#14121f", "#1f1b30", "#a88bff", "#5ce1e6"],
  },
};
export const SHELL_ORDER = ["classic", "berry", "teal", "dandelion", "grape", "atomic"];

// Palettes that turn the room lights off override the shell's backdrop.
const NIGHT_STAGE = { light: ["#0b0d15", "#141827", "#2fb5a3", "#ffd166"], vb: ["#0c0000", "#1c0404", "#ff1a1a", "#5c0000"] };

export function applyTheme(palette, shell) {
  const p = PALETTES[palette] || PALETTES.dmg;
  const sh = SHELLS[shell] || SHELLS.classic;
  const root = document.documentElement;
  const set = (k, v) => root.style.setProperty(k, v);
  p.shades.forEach((c, i) => set(`--gb-${i}`, c));
  set("--gb-hi", p.hi);
  const night = !!NIGHT_STAGE[palette];
  const [bg, ink, a, b] = NIGHT_STAGE[palette] || sh.stage;
  set("--stage-bg", bg);
  set("--stage-ink", ink);
  set("--stage-a", a);
  set("--stage-b", b);
  const [hi, body, lo] = sh.body;
  set("--shell-hi", night ? body : hi);
  set("--shell", body);
  set("--shell-lo", lo);
  set("--shell-ink", sh.ink);
  set("--btn-ab", sh.ab[0]);
  set("--btn-ab-lo", sh.ab[1]);
  root.dataset.palette = palette;
  root.dataset.shell = shell;
}

const lum = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
};
// Shades ordered dark → light by actual luminance (for mapping rendered brightness).
export const byLuminance = (palette) => [...(PALETTES[palette] || PALETTES.dmg).shades].sort((a, b) => lum(a) - lum(b));
