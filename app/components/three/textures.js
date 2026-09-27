"use client";
import * as THREE from "three";

// Tile themes are Tailwind gradient strings ("from-[#1a2a6c] via-[#b21f1f] to-[#fdbb2d]");
// pull the hex stops out so 3D code can use the same palette.
export function themeColors(tile) {
  return tile?.theme?.match(/#[0-9a-f]{6}/gi) ?? ["#00C3E3", "#0a8aa3"];
}

const cache = new Map();

// next/font registers the fonts under generated family names; map friendly names used in
// canvas font strings onto the real ones. ("Rubik" is kept as an alias for the body font.)
export function resolveFont(font) {
  if (typeof document === "undefined") return font;
  const css = getComputedStyle(document.documentElement);
  const v = (name, fb) => css.getPropertyValue(name).trim() || fb;
  return font
    .replace(/['"]?Press Start 2P['"]?/g, v("--font-display", "monospace"))
    .replace(/['"]?(Space Mono|VT323)['"]?/g, v("--font-mono", "monospace"))
    .replace(/['"]?(Rubik|Pixelify Sans|DotGothic16)['"]?/g, v("--font-body", "sans-serif"));
}

// Current screen palette (4 shades, paper → ink) read from the CSS tokens.
export function paletteColors() {
  if (typeof document === "undefined") return ["#cadc9f", "#8bac0f", "#306230", "#0f380f"];
  const css = getComputedStyle(document.documentElement);
  return [0, 1, 2, 3].map((i) => css.getPropertyValue(`--gb-${i}`).trim());
}

// Diagonal gradient on a canvas → texture. Cached per colour set.
export function gradientTexture(colors, size = 256) {
  const key = `g:${colors.join()}:${size}`;
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, size, size);
  colors.forEach((col, i) => g.addColorStop(colors.length === 1 ? 0 : i / (colors.length - 1), col));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  // soft top-left sheen, same as the 2D tiles
  const r = ctx.createRadialGradient(size * 0.32, 0, 0, size * 0.32, 0, size * 0.9);
  r.addColorStop(0, "rgba(255,255,255,0.35)");
  r.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = r;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, tex);
  return tex;
}

// Text drawn with the page's loaded web font → texture (avoids fetching font files for troika).
// Returns { texture, aspect } where aspect = width / height.
export function textTexture(text, { font = "700 64px Rubik, sans-serif", color = "#ffffff", bg = null, padding = 16, height = 96 } = {}) {
  const key = `t:${text}:${font}:${color}:${bg}:${padding}:${height}`;
  if (cache.has(key)) return cache.get(key);
  font = resolveFont(font);
  const probe = document.createElement("canvas").getContext("2d");
  probe.font = font;
  const w = Math.ceil(probe.measureText(text).width + padding * 2);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = height;
  const ctx = c.getContext("2d");
  if (bg) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, height);
  }
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.fillText(text, padding, height / 2);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const out = { texture, aspect: w / height };
  cache.set(key, out);
  return out;
}

// Nintendo-toy glossy plastic. Spread into <meshPhysicalMaterial {...PLASTIC} color=… />
export const PLASTIC = { roughness: 0.32, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.12 };
