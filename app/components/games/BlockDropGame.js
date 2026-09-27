"use client";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { createJuice, drawBanner, gb, text } from "./juice";
import { useLeaderboard, Leaderboard, InitialsPicker } from "./Leaderboard";

const COLS = 10;
const ROWS = 18;
const CELL = 8;
// Native 160×144 GB screen: brick wall | 10×18 well | wall | stats panel.
const W = 160;
const H = 144;
const BX = 16;
const PANEL_X = BX + COLS * CELL + CELL;
const SCALE = 2;
const CLEAR_POINTS = [0, 100, 300, 500, 800];
const CLEAR_NAMES = ["", "", "DOUBLE", "TRIPLE", "TETRIS"];

// Base shape per piece (one rotation state); the other 3 states are derived
// by rotating this shape 90° at a time — no need to hand-author all four.
// `face` = palette shade, `mark` = GB-style tile pattern.
const BASE_SHAPES = {
  I: { size: 4, cells: [[0, 1], [1, 1], [2, 1], [3, 1]], face: 2, mark: "bar" },
  O: { size: 2, cells: [[0, 0], [1, 0], [0, 1], [1, 1]], face: 1, mark: "dot" },
  T: { size: 3, cells: [[1, 0], [0, 1], [1, 1], [2, 1]], face: 2, mark: "" },
  S: { size: 3, cells: [[1, 0], [2, 0], [0, 1], [1, 1]], face: 1, mark: "box" },
  Z: { size: 3, cells: [[0, 0], [1, 0], [1, 1], [2, 1]], face: 2, mark: "box" },
  J: { size: 3, cells: [[0, 0], [0, 1], [1, 1], [2, 1]], face: 1, mark: "" },
  L: { size: 3, cells: [[2, 0], [0, 1], [1, 1], [2, 1]], face: 3, mark: "dot" },
};
const TYPES = Object.keys(BASE_SHAPES);

function rotateCells(cells, size) {
  return cells.map(([x, y]) => [size - 1 - y, x]);
}
function getRotations(shape) {
  const states = [shape.cells];
  let cur = shape.cells;
  for (let i = 0; i < 3; i++) {
    cur = rotateCells(cur, shape.size);
    states.push(cur);
  }
  return states;
}
const ROTATIONS = Object.fromEntries(TYPES.map((t) => [t, getRotations(BASE_SHAPES[t])]));

function emptyGrid() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}
function spawnPiece() {
  const type = TYPES[Math.floor(Math.random() * TYPES.length)];
  const shape = BASE_SHAPES[type];
  return { type, rot: 0, x: Math.floor((COLS - shape.size) / 2), y: -1 };
}
function cellsFor(piece) {
  return ROTATIONS[piece.type][piece.rot];
}
function canPlace(grid, piece, x, y, rot) {
  const cells = ROTATIONS[piece.type][rot];
  for (const [cx, cy] of cells) {
    const gx = x + cx, gy = y + cy;
    if (gx < 0 || gx >= COLS || gy >= ROWS) return false;
    if (gy >= 0 && grid[gy][gx]) return false;
  }
  return true;
}
function lockPiece(grid, piece) {
  for (const [cx, cy] of cellsFor(piece)) {
    const gy = piece.y + cy;
    if (gy >= 0) grid[gy][piece.x + cx] = piece.type;
  }
}
function clearLines(grid) {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (grid[r].every((c) => c)) {
      grid.splice(r, 1);
      grid.unshift(Array(COLS).fill(null));
      cleared++;
      r++;
    }
  }
  return cleared;
}

// 8×8 GB tile: ink outline, face, highlight top-left, shadow bottom-right, pattern mark.
function drawTile(ctx, x, y, C, type) {
  const { face, mark } = BASE_SHAPES[type];
  ctx.fillStyle = C[3];
  ctx.fillRect(x, y, 8, 8);
  ctx.fillStyle = C[face];
  ctx.fillRect(x + 1, y + 1, 6, 6);
  ctx.fillStyle = C[Math.max(0, face - 1)];
  ctx.fillRect(x + 1, y + 1, 5, 1);
  ctx.fillRect(x + 1, y + 2, 1, 4);
  ctx.fillStyle = C[Math.min(3, face + 1)];
  ctx.fillRect(x + 2, y + 6, 5, 1);
  ctx.fillRect(x + 6, y + 2, 1, 4);
  ctx.fillStyle = face >= 2 ? C[0] : C[3];
  if (mark === "dot") ctx.fillRect(x + 3, y + 3, 2, 2);
  else if (mark === "bar") ctx.fillRect(x + 2, y + 3, 4, 1);
  else if (mark === "box") {
    ctx.fillRect(x + 3, y + 3, 2, 1);
    ctx.fillRect(x + 3, y + 4, 1, 1);
  }
}
function drawBrick(ctx, x, y, C) {
  ctx.fillStyle = C[3];
  ctx.fillRect(x, y, 8, 8);
  ctx.fillStyle = C[1];
  ctx.fillRect(x, y, 3, 3);
  ctx.fillRect(x + 4, y, 4, 3);
  ctx.fillRect(x, y + 4, 7, 3);
}
function statBox(ctx, C, y, h, label, value) {
  ctx.fillStyle = C[3];
  ctx.fillRect(PANEL_X + 2, y, 52, h);
  ctx.fillStyle = C[0];
  ctx.fillRect(PANEL_X + 3, y + 1, 50, h - 2);
  text(ctx, label, PANEL_X + 5, y + 3, C[2]);
  if (value != null) text(ctx, String(value), PANEL_X + 52, y + 13, C[3], { align: "right" });
}

export default function BlockDropGame({ sound, onEvent }) {
  const canvasRef = useRef(null);
  const touchRef = useRef(null);
  const statusRef = useRef("ready");
  const [status, setStatusState] = useState("ready");
  const gridRef = useRef(emptyGrid());
  const pieceRef = useRef(null);
  const nextRef = useRef(spawnPiece());
  const dropTimerRef = useRef(0);
  const scoreRef = useRef(0);
  const linesRef = useRef(0);
  const levelRef = useRef(1);
  const comboRef = useRef(0);
  const overAtRef = useRef(0);
  const juiceRef = useRef(null);
  if (!juiceRef.current) juiceRef.current = createJuice(200);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const lb = useLeaderboard("blockdrop");
  const lbRef = useRef(lb);
  lbRef.current = lb;
  juiceRef.current.calm = !!useReducedMotion();

  function setStatus(s) {
    statusRef.current = s;
    setStatusState(s);
  }

  function start() {
    if (statusRef.current === "entry" || performance.now() - overAtRef.current < 500) return;
    gridRef.current = emptyGrid();
    pieceRef.current = spawnPiece();
    nextRef.current = spawnPiece();
    dropTimerRef.current = 0;
    scoreRef.current = linesRef.current = comboRef.current = 0;
    levelRef.current = 1;
    juiceRef.current.reset();
    setCombo(0);
    setScore(0);
    setStatus("playing");
  }

  function lockAndAdvance() {
    const grid = gridRef.current;
    const p = pieceRef.current;
    const j = juiceRef.current;
    const level = levelRef.current;
    lockPiece(grid, p);
    const full = [];
    grid.forEach((row, r) => row.every(Boolean) && full.push(r));
    for (const r of full) {
      grid[r].forEach((type, c) =>
        j.burst(BX + c * CELL + 4, r * CELL + 4, { n: 3, shade: BASE_SHAPES[type].face, speed: 60, up: 30, gravity: 200, size: 2 })
      );
    }
    const cleared = clearLines(grid);
    if (cleared > 0) {
      const n = ++comboRef.current;
      setCombo(n);
      const pts = CLEAR_POINTS[cleared] * level + (n > 1 ? 50 * (n - 1) * level : 0);
      scoreRef.current += pts;
      const cx = BX + (COLS * CELL) / 2;
      const cy = Math.min(H - 30, Math.max(12, ((full[0] + full[full.length - 1]) / 2) * CELL));
      if (CLEAR_NAMES[cleared]) j.pop(cx, cy - 10, CLEAR_NAMES[cleared]);
      j.pop(cx, cy, `+${pts}`, 2);
      if (n > 1) {
        j.pop(cx, cy + 10, `x${n}`, 3);
        sound?.playCombo?.(n - 1);
      }
      j.kick(1 + cleared * 0.75, cleared === 4);
      if (cleared === 4) sound?.playCoin?.();
      else sound?.playChime?.();
      linesRef.current += cleared;
      levelRef.current = 1 + Math.floor(linesRef.current / 10);
    } else {
      comboRef.current = 0;
      setCombo(0);
      sound?.playClick?.();
    }
    const next = nextRef.current;
    nextRef.current = spawnPiece();
    if (!canPlace(grid, next, next.x, next.y, 0)) {
      const final = scoreRef.current;
      j.kick(3, true);
      for (let r = 0; r < 4; r++) j.burst(BX + (COLS * CELL) / 2, r * CELL, { n: 8, shade: 3, speed: 80, size: 2 });
      sound?.playCrash?.();
      setScore(final);
      const { qualifies, personalBest } = lbRef.current.check(final);
      onEventRef.current?.("gameover", { game: "blockdrop", score: final });
      if (personalBest) onEventRef.current?.("score", { game: "blockdrop", score: final });
      overAtRef.current = performance.now();
      setStatus(qualifies ? "entry" : "over");
      return;
    }
    pieceRef.current = next;
  }

  function hardDrop() {
    if (statusRef.current !== "playing") return;
    const grid = gridRef.current;
    const p = pieceRef.current;
    let ny = p.y;
    while (canPlace(grid, p, p.x, ny + 1, p.rot)) ny++;
    scoreRef.current += 2 * (ny - p.y);
    p.y = ny;
    juiceRef.current.kick(1);
    lockAndAdvance();
  }
  function move(dx) {
    if (statusRef.current !== "playing") return;
    const grid = gridRef.current;
    const p = pieceRef.current;
    if (canPlace(grid, p, p.x + dx, p.y, p.rot)) p.x += dx;
  }
  function softDrop() {
    if (statusRef.current !== "playing") return;
    const grid = gridRef.current;
    const p = pieceRef.current;
    if (canPlace(grid, p, p.x, p.y + 1, p.rot)) {
      p.y += 1;
      scoreRef.current += 1;
      dropTimerRef.current = 0;
    } else {
      lockAndAdvance();
    }
  }
  function rotate() {
    if (statusRef.current !== "playing") return;
    const grid = gridRef.current;
    const p = pieceRef.current;
    const nextRot = (p.rot + 1) % 4;
    for (const k of [0, -1, 1, -2, 2]) {
      if (canPlace(grid, p, p.x + k, p.y, nextRot)) {
        p.x += k;
        p.rot = nextRot;
        return;
      }
    }
  }

  function handleTouchStart(e) {
    if (statusRef.current !== "playing") {
      start();
      return;
    }
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY };
  }
  function handleTouchEnd(e) {
    const startPos = touchRef.current;
    touchRef.current = null;
    if (!startPos) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - startPos.x;
    const dy = t.clientY - startPos.y;
    const absX = Math.abs(dx), absY = Math.abs(dy);
    const TAP_THRESHOLD = 14;
    if (absX < TAP_THRESHOLD && absY < TAP_THRESHOLD) {
      rotate();
      return;
    }
    if (absX > absY) {
      move(dx > 0 ? 1 : -1);
    } else if (dy > 0) {
      if (dy > 90) hardDrop();
      else softDrop();
    }
  }

  useEffect(() => {
    function onKey(e) {
      if (statusRef.current === "entry") return;
      if (statusRef.current !== "playing") {
        if (e.code === "Space" || e.code === "Enter") {
          e.preventDefault();
          start();
        }
        return;
      }
      if (e.code === "ArrowLeft") { e.preventDefault(); move(-1); }
      else if (e.code === "ArrowRight") { e.preventDefault(); move(1); }
      else if (e.code === "ArrowDown") { e.preventDefault(); softDrop(); }
      else if (e.code === "ArrowUp") { e.preventDefault(); rotate(); }
      else if (e.code === "Space") { e.preventDefault(); hardDrop(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    let raf;
    let last = performance.now();

    function loop(now) {
      const dt = Math.min(100, now - last);
      last = now;
      const j = juiceRef.current;
      const st = statusRef.current;

      if (st === "playing") {
        dropTimerRef.current += dt;
        const interval = Math.max(120, 800 - (levelRef.current - 1) * 60);
        if (dropTimerRef.current > interval) {
          dropTimerRef.current = 0;
          const grid = gridRef.current;
          const p = pieceRef.current;
          if (canPlace(grid, p, p.x, p.y + 1, p.rot)) p.y += 1;
          else lockAndAdvance();
        }
      }
      j.update(dt / 1000);

      const C = j.colors(gb().c);
      ctx.fillStyle = C[0];
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      j.applyShake(ctx);
      for (let r = 0; r < ROWS; r++) {
        drawBrick(ctx, BX - CELL, r * CELL, C);
        drawBrick(ctx, BX + COLS * CELL, r * CELL, C);
      }
      const grid = gridRef.current;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) if (grid[r][c]) drawTile(ctx, BX + c * CELL, r * CELL, C, grid[r][c]);
      }
      const p = pieceRef.current;
      if (p && st === "playing") {
        for (const [cx, cy] of cellsFor(p)) {
          const gy = p.y + cy;
          if (gy >= 0) drawTile(ctx, BX + (p.x + cx) * CELL, gy * CELL, C, p.type);
        }
      }
      j.draw(ctx, C);
      ctx.restore();

      ctx.fillStyle = C[1];
      ctx.fillRect(PANEL_X, 0, W - PANEL_X, H);
      statBox(ctx, C, 4, 24, "SCORE", Math.min(999999, scoreRef.current));
      statBox(ctx, C, 32, 24, "LEVEL", levelRef.current);
      statBox(ctx, C, 60, 24, "LINES", linesRef.current);
      statBox(ctx, C, 88, 52, "NEXT");
      const nx = nextRef.current;
      const cells = ROTATIONS[nx.type][0];
      const minX = Math.min(...cells.map((c) => c[0])), maxX = Math.max(...cells.map((c) => c[0]));
      const minY = Math.min(...cells.map((c) => c[1])), maxY = Math.max(...cells.map((c) => c[1]));
      const ox = PANEL_X + 28 - ((maxX - minX + 1) * CELL) / 2 - minX * CELL;
      const oy = 120 - ((maxY - minY + 1) * CELL) / 2 - minY * CELL;
      for (const [cx, cy] of cells) drawTile(ctx, ox + cx * CELL, oy + cy * CELL, C, nx.type);

      if (st === "ready") drawBanner(ctx, W, H, C, "BLOCK DROP", "PUSH START", BX + 40);
      else if (st !== "playing") drawBanner(ctx, W, H, C, "GAME OVER", st === "entry" ? "ENTER NAME" : "PUSH START", BX + 40);

      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const pad = "pixel-btn py-1.5 font-display text-[10px]";

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:justify-center sm:gap-4">
      <div className="w-full max-w-[326px] flex-shrink-0 border-[3px] border-gb-3 sm:w-[326px]">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{ touchAction: "none", aspectRatio: `${W} / ${H}`, maxWidth: W * SCALE }}
          className="pixelated block w-full"
        />
      </div>
      <div className="flex w-full max-w-[220px] flex-col gap-3">
        <div className="h-3 text-center font-display text-[10px] leading-none">{combo > 1 && `COMBO x${combo}`}</div>
        {status === "entry" ? (
          <InitialsPicker
            score={score}
            sound={sound}
            onSubmit={(name) => {
              lb.add(name, scoreRef.current);
              setStatus("over");
            }}
          />
        ) : (
          <Leaderboard entries={lb.entries} highlight={lb.highlight} />
        )}

        {(status === "ready" || status === "over") && (
          <button type="button" onClick={start} className="pixel-btn px-4 py-2 font-display text-[10px]">
            {status === "over" ? "TRY AGAIN" : "START"}
          </button>
        )}

        <div className="grid grid-cols-4 gap-2">
          <button type="button" aria-label="Left" onClick={() => move(-1)} className={pad}>◀</button>
          <button type="button" aria-label="Rotate" onClick={rotate} className={pad}>⟳</button>
          <button type="button" aria-label="Soft drop" onClick={softDrop} className={pad}>▼</button>
          <button type="button" aria-label="Right" onClick={() => move(1)} className={pad}>▶</button>
        </div>
        <button type="button" onClick={hardDrop} className={pad}>
          HARD DROP
        </button>

        <p className="text-center font-mono text-base leading-tight">
          ←→ MOVE · ↑ ROTATE · ↓ DROP · SPACE HARD DROP
          <span className="block sm:hidden">SWIPE TO MOVE/DROP · TAP TO ROTATE</span>
        </p>
      </div>
    </div>
  );
}
