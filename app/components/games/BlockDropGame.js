"use client";
import { useEffect, useRef, useState } from "react";

const COLS = 10;
const ROWS = 18;
const CELL = 16;

// Base shape per piece (one rotation state); the other 3 states are derived
// by rotating this shape 90° at a time — no need to hand-author all four.
const BASE_SHAPES = {
  I: { size: 4, cells: [[0, 1], [1, 1], [2, 1], [3, 1]], color: "#8b5cf6" },
  O: { size: 2, cells: [[0, 0], [1, 0], [0, 1], [1, 1]], color: "#f2c98a" },
  T: { size: 3, cells: [[1, 0], [0, 1], [1, 1], [2, 1]], color: "#00C3E3" },
  S: { size: 3, cells: [[1, 0], [2, 0], [0, 1], [1, 1]], color: "#ff9ecb" },
  Z: { size: 3, cells: [[0, 0], [1, 0], [1, 1], [2, 1]], color: "#0aa39a" },
  J: { size: 3, cells: [[0, 0], [0, 1], [1, 1], [2, 1]], color: "#1a5aa3" },
  L: { size: 3, cells: [[2, 0], [0, 1], [1, 1], [2, 1]], color: "#c2417a" },
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
  const cells = cellsFor(piece);
  const color = BASE_SHAPES[piece.type].color;
  for (const [cx, cy] of cells) {
    const gx = piece.x + cx, gy = piece.y + cy;
    if (gy >= 0) grid[gy][gx] = color;
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

export default function BlockDropGame({ sound }) {
  const canvasRef = useRef(null);
  const touchRef = useRef(null);
  const statusRef = useRef("ready");
  const [status, setStatusState] = useState("ready");
  const gridRef = useRef(emptyGrid());
  const pieceRef = useRef(null);
  const dropTimerRef = useRef(0);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [best, setBest] = useState(0);

  function setStatus(s) {
    statusRef.current = s;
    setStatusState(s);
  }

  useEffect(() => {
    setBest(Number(window.localStorage.getItem("block-drop-best") || 0));
  }, []);

  function start() {
    gridRef.current = emptyGrid();
    pieceRef.current = spawnPiece();
    dropTimerRef.current = 0;
    setScore(0);
    setLines(0);
    setLevel(1);
    setStatus("playing");
  }

  function lockAndAdvance() {
    const grid = gridRef.current;
    const p = pieceRef.current;
    lockPiece(grid, p);
    const cleared = clearLines(grid);
    if (cleared > 0) {
      sound?.playChime?.();
      setScore((s) => s + [0, 100, 300, 500, 800][cleared] * level);
      setLines((l) => {
        const nl = l + cleared;
        setLevel(1 + Math.floor(nl / 10));
        return nl;
      });
    } else {
      sound?.playClick?.();
    }
    const next = spawnPiece();
    if (!canPlace(grid, next, next.x, next.y, 0)) {
      sound?.playBonk?.();
      setStatus("over");
      setScore((s) => {
        setBest((b) => {
          const nb = Math.max(b, s);
          window.localStorage.setItem("block-drop-best", String(nb));
          return nb;
        });
        return s;
      });
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
    p.y = ny;
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
      setScore((s) => s + 1);
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
      if (statusRef.current !== "playing") {
        if (e.code === "Space" || e.code === "Enter") start();
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
  }, [level]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let raf;
    let last = performance.now();

    function loop(now) {
      const dt = now - last;
      last = now;

      if (statusRef.current === "playing") {
        dropTimerRef.current += dt;
        const interval = Math.max(120, 800 - (level - 1) * 60);
        if (dropTimerRef.current > interval) {
          dropTimerRef.current = 0;
          const grid = gridRef.current;
          const p = pieceRef.current;
          if (canPlace(grid, p, p.x, p.y + 1, p.rot)) p.y += 1;
          else lockAndAdvance();
        }
      }

      ctx.clearRect(0, 0, COLS * CELL, ROWS * CELL);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);

      const grid = gridRef.current;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (grid[r][c]) {
            ctx.fillStyle = grid[r][c];
            ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
          }
        }
      }

      const p = pieceRef.current;
      if (p && statusRef.current === "playing") {
        ctx.fillStyle = BASE_SHAPES[p.type].color;
        for (const [cx, cy] of cellsFor(p)) {
          const gy = p.y + cy;
          if (gy >= 0) ctx.fillRect((p.x + cx) * CELL + 1, gy * CELL + 1, CELL - 2, CELL - 2);
        }
      }

      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      for (let c = 0; c <= COLS; c++) {
        ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, ROWS * CELL); ctx.stroke();
      }
      for (let r = 0; r <= ROWS; r++) {
        ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(COLS * CELL, r * CELL); ctx.stroke();
      }

      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [level]);

  return (
    <div className="flex flex-col items-center gap-2.5 sm:flex-row sm:items-start sm:justify-center sm:gap-4">
      <canvas
        ref={canvasRef}
        width={COLS * CELL}
        height={ROWS * CELL}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: "none", width: COLS * CELL, height: ROWS * CELL }}
        className="max-w-full flex-shrink-0 rounded-xl shadow-inner"
      />
      <div className="flex w-full max-w-[200px] flex-col gap-2 sm:gap-3">
        <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold text-[#4b5563] dark:text-slate-300">
          <div><div className="text-[10px] uppercase opacity-70">Score</div><div className="text-sm">{score}</div></div>
          <div><div className="text-[10px] uppercase opacity-70">Lines</div><div className="text-sm">{lines}</div></div>
          <div><div className="text-[10px] uppercase opacity-70">Level</div><div className="text-sm">{level}</div></div>
        </div>
        <div className="text-center text-xs font-semibold text-[#4b5563] dark:text-slate-400">Best: {best}</div>

        {status !== "playing" && (
          <button
            type="button"
            onClick={start}
            className="rounded-lg bg-[#14181c] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 dark:bg-white dark:text-[#14181c]"
          >
            {status === "over" ? "Try Again" : "Start"}
          </button>
        )}

        <div className="grid grid-cols-4 gap-1.5">
          <button type="button" onClick={() => move(-1)} className="rounded-lg bg-[#eef1f4] py-1.5 text-sm font-bold dark:bg-white/10">◀</button>
          <button type="button" onClick={rotate} className="rounded-lg bg-[#eef1f4] py-1.5 text-sm font-bold dark:bg-white/10">⟳</button>
          <button type="button" onClick={softDrop} className="rounded-lg bg-[#eef1f4] py-1.5 text-sm font-bold dark:bg-white/10">▼</button>
          <button type="button" onClick={() => move(1)} className="rounded-lg bg-[#eef1f4] py-1.5 text-sm font-bold dark:bg-white/10">▶</button>
        </div>
        <button type="button" onClick={hardDrop} className="rounded-lg bg-[#eef1f4] py-1.5 text-xs font-bold dark:bg-white/10">
          Hard Drop (Space)
        </button>

        <p className="text-center text-[11px] leading-snug text-[#4b5563] dark:text-slate-400">
          ← → move · ↑ rotate · ↓ drop · Space hard drop
          <span className="block sm:hidden">Swipe to move/drop · tap to rotate</span>
        </p>
      </div>
    </div>
  );
}
