// Game Boy screen kit shared by the canvas games: live 4-shade palette + pixel fonts,
// pixel text, banner, and arcade juice (pooled square particles, pop-ups, shake, invert flash).
// Games draw at native GB resolution and CSS upscales with image-rendering: pixelated.

const FALLBACK = ["#cadc9f", "#8bac0f", "#306230", "#0f380f"];
let pal = null;

function readPalette() {
  const cs = getComputedStyle(document.documentElement);
  const v = (k, d) => cs.getPropertyValue(k).trim() || d;
  pal = {
    c: FALLBACK.map((d, i) => v(`--gb-${i}`, d)), // 0 = paper … 3 = ink
    hi: v("--gb-hi", "#a3195b"),
    display: v("--font-display", "monospace"),
    mono: v("--font-mono", "monospace"),
  };
}

// Current palette, re-read whenever <html> style/data-palette changes (live palette switching).
export function gb() {
  if (!pal) {
    readPalette();
    new MutationObserver(readPalette).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style", "data-palette", "class"],
    });
  }
  return pal;
}

// Pixel text, snapped to whole pixels so the 8px pixel font stays crisp.
export function text(ctx, str, x, y, color, { align = "left", size = 8, font = "display", outline } = {}) {
  const P = gb();
  ctx.font = `${size}px ${font === "mono" ? P.mono : P.display}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const w = ctx.measureText(str).width;
  const x0 = Math.round(align === "center" ? x - w / 2 : align === "right" ? x - w : x);
  const y0 = Math.round(y);
  if (outline) {
    ctx.fillStyle = outline;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.fillText(str, x0 + dx, y0 + dy);
  }
  ctx.fillStyle = color;
  ctx.fillText(str, x0, y0);
}

// Sprite from rows of '.' (transparent) and '0'-'3' (palette shade).
export function sprite(ctx, rows, x, y, C, flip = false) {
  const w = rows[0].length;
  for (let r = 0; r < rows.length; r++) {
    for (let i = 0; i < w; i++) {
      const ch = rows[r][flip ? w - 1 - i : i];
      if (ch === ".") continue;
      ctx.fillStyle = C[ch];
      ctx.fillRect(x + i, y + r, 1, 1);
    }
  }
}

// RPG-window banner (double frame) with a blinking "press start" line.
export function drawBanner(ctx, w, h, C, title, sub, cx = w / 2) {
  const P = gb();
  ctx.font = `8px ${P.display}`;
  const bw = Math.ceil(Math.max(ctx.measureText(title).width, ctx.measureText(sub).width)) + 16;
  const bh = 34;
  const x = Math.round(cx - bw / 2), y = Math.round((h - bh) / 2);
  ctx.fillStyle = C[3];
  ctx.fillRect(x, y, bw, bh);
  ctx.fillStyle = C[0];
  ctx.fillRect(x + 1, y + 1, bw - 2, bh - 2);
  ctx.fillStyle = C[2];
  ctx.fillRect(x + 2, y + 2, bw - 4, bh - 4);
  ctx.fillStyle = C[0];
  ctx.fillRect(x + 3, y + 3, bw - 6, bh - 6);
  text(ctx, title, cx, y + 7, C[3], { align: "center" });
  if (Math.floor(performance.now() / 500) % 2 === 0) text(ctx, sub, cx, y + 20, C[2], { align: "center" });
}

// "SCORE 00123      HI 00456" strip across the top of a 160px screen.
export function drawHud(ctx, w, C, score, hi) {
  text(ctx, `SCORE ${String(score).padStart(5, "0")}`, 2, 2, C[3]);
  text(ctx, `HI ${String(hi).padStart(5, "0")}`, w - 2, 2, C[3], { align: "right" });
}

export function createJuice(maxParticles = 160) {
  const parts = Array.from({ length: maxParticles }, () => ({ life: 0 }));
  const pops = [];
  let shake = 0;
  let invert = 0; // frames left with the palette inverted

  return {
    calm: false, // reduced motion: no shake, no flashing

    // Positions/speeds in screen pixels; `shade` is a palette index so live palette swaps apply.
    burst(x, y, { n = 10, shade = 3, speed = 50, gravity = 160, size = 1, up = 0 } = {}) {
      for (let i = 0; i < maxParticles && n > 0; i++) {
        const p = parts[i];
        if (p.life > 0) continue;
        const a = Math.random() * Math.PI * 2;
        const v = speed * (0.35 + Math.random() * 0.65);
        p.x = x;
        p.y = y;
        p.vx = Math.cos(a) * v;
        p.vy = Math.sin(a) * v - up;
        p.g = gravity;
        p.shade = shade;
        p.size = size + (Math.random() < 0.3 ? 1 : 0);
        p.life = 0.3 + Math.random() * 0.45;
        n--;
      }
    },

    pop(x, y, str, shade = 3) {
      if (pops.length >= 6) pops.shift();
      pops.push({ x, y, str, shade, life: 1 });
    },

    kick(amount = 2, flash = false) {
      shake = Math.max(shake, amount);
      if (flash && !this.calm) invert = 2;
    },

    reset() {
      parts.forEach((p) => (p.life = 0));
      pops.length = 0;
      shake = invert = 0;
    },

    update(dt) {
      for (const p of parts) {
        if (p.life <= 0) continue;
        p.life -= dt;
        p.vy += p.g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      for (let i = pops.length - 1; i >= 0; i--) {
        pops[i].life -= dt * 1.1;
        pops[i].y -= 10 * dt;
        if (pops[i].life <= 0) pops.splice(i, 1);
      }
      shake = shake > 0.5 ? shake * Math.exp(-dt * 10) : 0;
    },

    // Palette for this frame — call once per frame; inverted for 2 frames after a flash.
    colors(C) {
      if (invert > 0) {
        invert--;
        return [C[3], C[2], C[1], C[0]];
      }
      return C;
    },

    // Call between ctx.save()/restore(), before drawing the world. Whole-pixel offsets only.
    applyShake(ctx) {
      if (shake && !this.calm) ctx.translate(Math.round((Math.random() * 2 - 1) * shake), Math.round((Math.random() * 2 - 1) * shake));
    },

    draw(ctx, C) {
      for (const p of parts) {
        if (p.life <= 0) continue;
        ctx.fillStyle = C[p.shade];
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      }
      for (const q of pops) {
        if (q.life < 0.3 && Math.floor(q.life * 20) % 2) continue; // blink out
        text(ctx, q.str, q.x, q.y, C[q.shade], { align: "center", outline: C[q.shade === 0 ? 3 : 0] });
      }
    },
  };
}
