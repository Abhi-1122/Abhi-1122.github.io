"use client";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { createJuice, drawBanner, drawHud, gb, sprite, text } from "./juice";
import { useLeaderboard, Leaderboard, InitialsPicker } from "./Leaderboard";

// Native 160×88 screen, upscaled 3×.
const W = 160;
const H = 88;
const SCALE = 3;
const GROUND_Y = 72;
const GRAVITY = 600;
const JUMP_VELOCITY = -207;
const PLAYER_X = 20;
const PW = 10;
const PH = 12;
const COMBO_EVERY = 5; // pipes per combo step

const HERO_TOP = [
  "...3333...",
  "..33333333",
  "..311131..",
  "..3111111.",
  "...31113..",
  "..322223..",
  ".32222223.",
  ".12222221.",
  "..322223..",
];
const LEGS = [
  ["..33..33..", ".33....33.", ".3......3."],
  ["...3333...", "...3..3...", "...33.33.."],
  ["..33...33.", "..3....3..", ".33....33."], // airborne
];
const CLOUD = ["...2222.....", "..200002222.", ".20000000002", "222222222222"];

function freshState() {
  return {
    playerY: GROUND_Y - PH,
    velocityY: 0,
    onGround: true,
    obstacles: [],
    speed: 87,
    spawnTimer: 0.6,
    elapsed: 0,
    passed: 0,
    bonus: 0,
    scroll: 0,
    dead: null,
  };
}

// Green warp pipe in palette shades: rim on top, highlight stripe, shadow stripe.
function drawPipe(ctx, C, x, h, w) {
  const y = GROUND_Y - h;
  ctx.fillStyle = C[3];
  ctx.fillRect(x + 1, y + 4, w - 2, h - 4);
  ctx.fillRect(x, y, w, 5);
  ctx.fillStyle = C[1];
  ctx.fillRect(x + 2, y + 5, w - 4, h - 5);
  ctx.fillRect(x + 1, y + 1, w - 2, 3);
  ctx.fillStyle = C[0];
  ctx.fillRect(x + 3, y + 5, 1, h - 5);
  ctx.fillRect(x + 2, y + 1, 1, 3);
  ctx.fillStyle = C[2];
  ctx.fillRect(x + w - 4, y + 5, 1, h - 5);
  ctx.fillRect(x + w - 3, y + 1, 1, 3);
}

export default function PixelJumperGame({ sound, onEvent }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(freshState());
  const juiceRef = useRef(null);
  if (!juiceRef.current) juiceRef.current = createJuice();
  const statusRef = useRef("ready");
  const overAtRef = useRef(0);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const [status, setStatusState] = useState("ready");
  const [score, setScore] = useState(0);
  const lb = useLeaderboard("pixeljumper");
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
    setScore(0);
    setStatus("playing");
  }

  function jump() {
    if (statusRef.current !== "playing") {
      start();
      return;
    }
    const s = stateRef.current;
    if (s.onGround) {
      s.velocityY = JUMP_VELOCITY;
      s.onGround = false;
      juiceRef.current.burst(PLAYER_X + PW / 2, GROUND_Y - 1, { n: 4, shade: 2, speed: 25, gravity: 60 });
      sound?.playHover?.();
    }
  }

  function crash(finalScore) {
    const s = stateRef.current;
    const j = juiceRef.current;
    j.burst(PLAYER_X + PW / 2, s.playerY + PH / 2, { n: 18, shade: 3, speed: 90, up: 40, size: 2 });
    j.burst(PLAYER_X + PW, s.playerY + PH / 2, { n: 10, shade: 1, speed: 70, up: 30, size: 2 });
    j.kick(3, true);
    s.dead = { y: s.playerY, vy: -150 }; // classic hop-and-fall
    sound?.playCrash?.();
    setScore(finalScore);
    const { qualifies, personalBest } = lbRef.current.check(finalScore);
    onEventRef.current?.("gameover", { game: "pixeljumper", score: finalScore });
    if (personalBest) onEventRef.current?.("score", { game: "pixeljumper", score: finalScore });
    overAtRef.current = performance.now();
    setStatus(qualifies ? "entry" : "over");
  }

  useEffect(() => {
    function onKey(e) {
      if (statusRef.current === "entry") return;
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        jump();
      }
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
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const s = stateRef.current;
      const j = juiceRef.current;
      const st = statusRef.current;

      if (st === "playing") {
        s.elapsed += dt;
        s.speed = 87 + s.elapsed * 4.7;
        s.scroll += s.speed * dt;
        s.velocityY += GRAVITY * dt;
        s.playerY += s.velocityY * dt;
        if (s.playerY >= GROUND_Y - PH) {
          if (!s.onGround && s.velocityY > 100) {
            j.burst(PLAYER_X + 1, GROUND_Y - 1, { n: 4, shade: 2, speed: 30, gravity: 80, up: 15 });
            j.burst(PLAYER_X + PW - 1, GROUND_Y - 1, { n: 4, shade: 2, speed: 30, gravity: 80, up: 15 });
          }
          s.playerY = GROUND_Y - PH;
          s.velocityY = 0;
          s.onGround = true;
        }

        s.spawnTimer -= dt;
        if (s.spawnTimer <= 0) {
          s.obstacles.push({ x: W + 8, w: 10 + Math.round(Math.random() * 2) * 2, h: 9 + Math.round(Math.random() * 10), passed: false });
          s.spawnTimer = Math.max(0.55, 1.35 - s.elapsed * 0.02);
        }
        for (const o of s.obstacles) {
          o.x -= s.speed * dt;
          if (!o.passed && o.x + o.w < PLAYER_X) {
            o.passed = true;
            s.passed++;
            if (s.passed % COMBO_EVERY === 0) {
              const step = s.passed / COMBO_EVERY;
              const pts = step * 25;
              s.bonus += pts;
              j.pop(PLAYER_X + 30, s.playerY - 6, `x${step} +${pts}`);
              j.kick(1);
              sound?.playCombo?.(step);
            }
          }
        }
        s.obstacles = s.obstacles.filter((o) => o.x + o.w > -4);

        const px = PLAYER_X + 1, py = s.playerY + 1;
        for (const o of s.obstacles) {
          if (px < o.x + o.w - 1 && px + PW - 2 > o.x + 1 && py + PH - 1 > GROUND_Y - o.h) {
            crash(Math.floor(s.elapsed * 10) + s.bonus);
            break;
          }
        }
      } else if (s.dead) {
        s.dead.vy += GRAVITY * dt;
        s.dead.y += s.dead.vy * dt;
      }
      j.update(dt);

      // render
      const C = j.colors(gb().c);
      ctx.fillStyle = C[0];
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      j.applyShake(ctx);

      const cloudX = (off, y) => sprite(ctx, CLOUD, Math.round(W - ((s.scroll * 0.25 + off) % (W + 24))), y, C);
      cloudX(0, 16);
      cloudX(95, 28);

      s.obstacles.forEach((o) => drawPipe(ctx, C, Math.round(o.x), o.h, o.w));

      // ground: ink edge + scrolling dotted soil
      ctx.fillStyle = C[3];
      ctx.fillRect(-4, GROUND_Y, W + 8, 1);
      ctx.fillStyle = C[1];
      ctx.fillRect(-4, GROUND_Y + 1, W + 8, H - GROUND_Y);
      ctx.fillStyle = C[2];
      const off = Math.floor(s.scroll) % 8;
      for (let x = -off; x < W + 8; x += 8) {
        ctx.fillRect(x, GROUND_Y + 4, 2, 1);
        ctx.fillRect(x + 4, GROUND_Y + 9, 2, 1);
      }

      const hy = Math.round(s.dead ? s.dead.y : s.playerY);
      if (!s.dead || hy < H) {
        const legs = s.dead || !s.onGround ? LEGS[2] : st === "playing" ? LEGS[Math.floor(s.elapsed * 10) % 2] : LEGS[0];
        sprite(ctx, HERO_TOP, PLAYER_X, hy, C);
        sprite(ctx, legs, PLAYER_X, hy + HERO_TOP.length, C);
      }
      j.draw(ctx, C);
      ctx.restore();

      drawHud(ctx, W, C, Math.floor(s.elapsed * 10) + s.bonus, lbRef.current.best);
      if (st === "playing" && s.passed >= COMBO_EVERY) text(ctx, `x${Math.floor(s.passed / COMBO_EVERY)}`, W - 2, 12, C[2], { align: "right" });
      if (st === "ready") drawBanner(ctx, W, H, C, "PIXEL JUMPER", "PUSH START");
      else if (st !== "playing") drawBanner(ctx, W, H, C, "GAME OVER", st === "entry" ? "ENTER NAME" : "PUSH START");

      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="flex w-full max-w-[486px] flex-col items-center gap-3">
      <div className="w-full border-[3px] border-gb-3">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onClick={jump}
          style={{ aspectRatio: `${W} / ${H}`, maxWidth: W * SCALE }}
          className="pixelated block w-full cursor-pointer"
        />
      </div>
      <div className="w-full max-w-[300px]">
        {status === "entry" ? (
          <InitialsPicker
            score={score}
            sound={sound}
            onSubmit={(name) => {
              lb.add(name, score);
              setStatus("over");
            }}
          />
        ) : (
          <Leaderboard entries={lb.entries} highlight={lb.highlight} />
        )}
      </div>
      {(status === "ready" || status === "over") && (
        <button type="button" onClick={start} className="pixel-btn px-4 py-2 font-display text-[10px]">
          {status === "over" ? "TRY AGAIN" : "START"}
        </button>
      )}
      <p className="text-center font-mono text-base leading-tight">
        SPACE / ↑ / TAP TO JUMP. EVERY {COMBO_EVERY} PIPES CLEARED BUILDS A COMBO BONUS.
      </p>
    </div>
  );
}
