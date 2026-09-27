"use client";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { createJuice, drawBanner, drawHud, gb, sprite } from "./juice";
import { useLeaderboard, Leaderboard, InitialsPicker } from "./Leaderboard";

// Native 160×144 GB screen: 16px HUD + 20×16 tile field whose outer ring is brick wall.
const CELL = 8;
const COLS = 20;
const ROWS = 16;
const TOP = 16;
const W = COLS * CELL;
const H = TOP + ROWS * CELL;
const SCALE = 2;
const COMBO_WINDOW = 3; // seconds between bytes to keep the combo alive
const DIRS = {
  ArrowUp: [0, -1], KeyW: [0, -1],
  ArrowDown: [0, 1], KeyS: [0, 1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0],
  ArrowRight: [1, 0], KeyD: [1, 0],
};
const APPLE = [
  "...3....",
  "....3...",
  ".33.33..",
  "3102223.",
  "3122223.",
  "3222223.",
  ".32223..",
  "..333...",
];

function isWall(x, y) {
  return x <= 0 || y <= 0 || x >= COLS - 1 || y >= ROWS - 1;
}

function placeFood(snake) {
  // ponytail: rejection sampling, fine until the snake fills most of the board
  for (let i = 0; i < 500; i++) {
    const f = { x: 1 + Math.floor(Math.random() * (COLS - 2)), y: 1 + Math.floor(Math.random() * (ROWS - 2)) };
    if (!snake.some((s) => s.x === f.x && s.y === f.y)) return f;
  }
  return { x: 1, y: 1 };
}

function freshState() {
  const snake = [{ x: 6, y: 8 }, { x: 5, y: 8 }, { x: 4, y: 8 }];
  return { snake, dir: [1, 0], queue: [], food: placeFood(snake), stepMs: 140, acc: 0, eaten: 0, combo: 0, lastEat: -99, t: 0 };
}

export default function SnakeGame({ sound, onEvent }) {
  const canvasRef = useRef(null);
  const touchRef = useRef(null);
  const stateRef = useRef(freshState());
  const juiceRef = useRef(null);
  if (!juiceRef.current) juiceRef.current = createJuice();
  const statusRef = useRef("ready");
  const scoreRef = useRef(0);
  const overAtRef = useRef(0);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const [status, setStatusState] = useState("ready");
  const [score, setScore] = useState(0);
  const lb = useLeaderboard("bytesnake");
  const lbRef = useRef(lb);
  lbRef.current = lb;
  juiceRef.current.calm = !!useReducedMotion();

  function setStatus(s) {
    statusRef.current = s;
    setStatusState(s);
  }

  function start() {
    if (statusRef.current === "entry" || performance.now() - overAtRef.current < 500) return;
    stateRef.current = freshState();
    juiceRef.current.reset();
    scoreRef.current = 0;
    setScore(0);
    setStatus("playing");
  }

  function turn([dx, dy]) {
    if (statusRef.current !== "playing") {
      start();
      return;
    }
    const s = stateRef.current;
    const [lx, ly] = s.queue.length ? s.queue[s.queue.length - 1] : s.dir;
    if ((dx === lx && dy === ly) || (dx === -lx && dy === -ly) || s.queue.length >= 2) return;
    s.queue.push([dx, dy]);
  }

  function die() {
    const s = stateRef.current;
    const j = juiceRef.current;
    s.snake.forEach((seg, i) => {
      if (i < 30) j.burst(seg.x * CELL + 4, TOP + seg.y * CELL + 4, { n: i === 0 ? 12 : 3, shade: i === 0 ? 3 : 2, speed: 60, up: 20, size: 2 });
    });
    j.kick(3, true);
    sound?.playCrash?.();
    const final = scoreRef.current;
    setScore(final);
    const { qualifies, personalBest } = lbRef.current.check(final);
    onEventRef.current?.("gameover", { game: "bytesnake", score: final });
    if (personalBest) onEventRef.current?.("score", { game: "bytesnake", score: final });
    overAtRef.current = performance.now();
    setStatus(qualifies ? "entry" : "over");
  }

  function step() {
    const s = stateRef.current;
    const j = juiceRef.current;
    if (s.queue.length) s.dir = s.queue.shift();
    const head = { x: s.snake[0].x + s.dir[0], y: s.snake[0].y + s.dir[1] };
    const ate = head.x === s.food.x && head.y === s.food.y;
    // The tail moves away this step unless we grow, so it's safe to enter.
    const body = ate ? s.snake : s.snake.slice(0, -1);
    if (isWall(head.x, head.y) || body.some((b) => b.x === head.x && b.y === head.y)) {
      die();
      return;
    }
    s.snake.unshift(head);
    if (!ate) {
      s.snake.pop();
      return;
    }
    s.eaten++;
    s.combo = s.t - s.lastEat <= COMBO_WINDOW ? s.combo + 1 : 1;
    s.lastEat = s.t;
    const pts = 10 * s.combo;
    scoreRef.current += pts;
    const fx = s.food.x * CELL + 4, fy = TOP + s.food.y * CELL + 4;
    j.burst(fx, fy, { n: 8 + s.combo * 2, shade: 2, speed: 50, gravity: 0 });
    j.pop(Math.min(W - 24, Math.max(24, fx)), Math.max(TOP + 2, fy - 12), s.combo > 1 ? `+${pts} x${s.combo}` : `+${pts}`);
    if (s.combo > 1) {
      sound?.playCombo?.(s.combo - 1);
      j.kick(Math.min(3, s.combo * 0.5), s.combo % 5 === 0);
    } else {
      sound?.playCoin?.();
    }
    s.stepMs = Math.max(60, 140 - s.eaten * 3);
    s.food = placeFood(s.snake);
  }

  useEffect(() => {
    function onKey(e) {
      if (statusRef.current === "entry") return;
      const d = DIRS[e.code];
      if (statusRef.current !== "playing") {
        if (e.code === "Space" || e.code === "Enter") {
          e.preventDefault();
          start();
        }
        return;
      }
      if (d) {
        e.preventDefault();
        turn(d);
      } else if (e.code === "Space") e.preventDefault();
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
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = stateRef.current;
      const j = juiceRef.current;
      const st = statusRef.current;
      if (st === "playing") {
        s.t += dt;
        s.acc += dt * 1000;
        while (s.acc >= s.stepMs && statusRef.current === "playing") {
          s.acc -= s.stepMs;
          step();
        }
        if (s.combo > 1 && s.t - s.lastEat > COMBO_WINDOW) s.combo = 0;
      }
      j.update(dt);

      const C = j.colors(gb().c);
      ctx.fillStyle = C[0];
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      j.applyShake(ctx);

      for (let x = 0; x < COLS; x++) {
        for (let y = 0; y < ROWS; y++) {
          const px = x * CELL, py = TOP + y * CELL;
          if (isWall(x, y)) {
            ctx.fillStyle = C[3];
            ctx.fillRect(px, py, 8, 8);
            ctx.fillStyle = C[1];
            ctx.fillRect(px, py, 3, 3);
            ctx.fillRect(px + 4, py, 4, 3);
            ctx.fillRect(px, py + 4, 7, 3);
          } else if ((x + y) % 2 === 0) {
            ctx.fillStyle = C[1];
            ctx.fillRect(px + 4, py + 4, 1, 1);
          }
        }
      }

      const bob = Math.floor(now / 300) % 2;
      sprite(ctx, APPLE, s.food.x * CELL, TOP + s.food.y * CELL - bob, C);

      if (st === "playing" || st === "ready") {
        const n = s.snake.length;
        s.snake.forEach((seg, i) => {
          const px = seg.x * CELL, py = TOP + seg.y * CELL;
          ctx.fillStyle = C[3];
          if (i === 0) {
            ctx.fillRect(px, py, 8, 8);
            return;
          }
          const inset = i === n - 1 ? 2 : 1;
          ctx.fillRect(px + inset, py + inset, 8 - inset * 2, 8 - inset * 2);
          ctx.fillStyle = C[i % 2 ? 2 : 1];
          ctx.fillRect(px + inset + 1, py + inset + 1, 6 - inset * 2, 6 - inset * 2);
          ctx.fillStyle = C[0];
          ctx.fillRect(px + inset + 1, py + inset + 1, 1, 1);
        });
        // eyes: two paper pixels with ink pupils, looking the way we move
        const h = s.snake[0], [dx, dy] = s.dir;
        const cx = h.x * CELL + 3 + dx, cy = TOP + h.y * CELL + 3 + dy;
        for (const side of [-1, 1]) {
          const ex = cx + (dy ? side * 2 : 0), ey = cy + (dx ? side * 2 : 0);
          ctx.fillStyle = C[0];
          ctx.fillRect(ex, ey, 2, 2);
          ctx.fillStyle = C[3];
          ctx.fillRect(ex + (dx > 0 ? 1 : 0), ey + (dy > 0 ? 1 : 0), 1, 1);
        }
      }
      j.draw(ctx, C);
      ctx.restore();

      drawHud(ctx, W, C, scoreRef.current, lbRef.current.best);
      if (st === "playing" && s.combo > 1) {
        ctx.fillStyle = C[2];
        ctx.fillRect(2, 12, Math.round((W - 4) * Math.max(0, 1 - (s.t - s.lastEat) / COMBO_WINDOW)), 2);
      }
      if (st === "ready") drawBanner(ctx, W, H, C, "BYTE SNAKE", "PUSH START");
      else if (st !== "playing") drawBanner(ctx, W, H, C, "GAME OVER", st === "entry" ? "ENTER NAME" : "PUSH START");

      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  function handleTouchStart(e) {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY };
  }
  function handleTouchEnd(e) {
    const s0 = touchRef.current;
    touchRef.current = null;
    if (!s0) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s0.x, dy = t.clientY - s0.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) {
      if (statusRef.current !== "playing") start();
      return;
    }
    turn(Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)]);
  }

  const pad = "pixel-btn py-2 font-display text-[10px]";

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:justify-center sm:gap-4">
      <div className="w-full max-w-[326px] flex-shrink-0 border-[3px] border-gb-3 sm:w-[326px]">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onClick={() => statusRef.current !== "playing" && start()}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{ touchAction: "none", aspectRatio: `${W} / ${H}`, maxWidth: W * SCALE }}
          className="pixelated block w-full cursor-pointer"
        />
      </div>
      <div className="flex w-full max-w-[220px] flex-col items-center gap-3">
        <div className="grid w-40 grid-cols-3 gap-2 sm:hidden">
          <span />
          <button type="button" aria-label="Up" className={pad} onClick={() => turn([0, -1])}>▲</button>
          <span />
          <button type="button" aria-label="Left" className={pad} onClick={() => turn([-1, 0])}>◀</button>
          <button type="button" aria-label="Down" className={pad} onClick={() => turn([0, 1])}>▼</button>
          <button type="button" aria-label="Right" className={pad} onClick={() => turn([1, 0])}>▶</button>
        </div>
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
          <button type="button" onClick={start} className="pixel-btn w-full px-4 py-2 font-display text-[10px]">
            {status === "over" ? "TRY AGAIN" : "START"}
          </button>
        )}
        <p className="text-center font-mono text-base leading-tight">
          ARROWS / WASD / SWIPE TO STEER. EAT FAST TO CHAIN COMBOS. IT SPEEDS UP AS YOU GROW.
        </p>
      </div>
    </div>
  );
}
