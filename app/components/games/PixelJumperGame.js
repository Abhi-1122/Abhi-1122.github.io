"use client";
import { useEffect, useRef, useState } from "react";

const W = 480;
const H = 260;
const GROUND_Y = H - 40;
const GRAVITY = 1800;
const JUMP_VELOCITY = -620;
const PLAYER_X = 60;
const PLAYER_SIZE = 28;

function freshState() {
  return {
    playerY: GROUND_Y - PLAYER_SIZE,
    velocityY: 0,
    onGround: true,
    obstacles: [],
    speed: 260,
    spawnTimer: 0.6,
    elapsed: 0,
  };
}

export default function PixelJumperGame({ sound }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(freshState());
  const statusRef = useRef("ready");
  const [status, setStatusState] = useState("ready");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);

  function setStatus(s) {
    statusRef.current = s;
    setStatusState(s);
  }

  useEffect(() => {
    setBest(Number(window.localStorage.getItem("pixel-jumper-best") || 0));
  }, []);

  function start() {
    stateRef.current = freshState();
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
      sound?.playHover?.();
    }
  }

  useEffect(() => {
    function onKey(e) {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        jump();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let raf;
    let last = performance.now();

    function loop(now) {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const s = stateRef.current;

      if (statusRef.current === "playing" && s) {
        s.elapsed += dt;
        s.speed = 260 + s.elapsed * 14;
        s.velocityY += GRAVITY * dt;
        s.playerY += s.velocityY * dt;
        if (s.playerY >= GROUND_Y - PLAYER_SIZE) {
          s.playerY = GROUND_Y - PLAYER_SIZE;
          s.velocityY = 0;
          s.onGround = true;
        }

        s.spawnTimer -= dt;
        if (s.spawnTimer <= 0) {
          const h = 26 + Math.random() * 30;
          s.obstacles.push({ x: W + 20, w: 18 + Math.random() * 10, h });
          s.spawnTimer = Math.max(0.55, 1.35 - s.elapsed * 0.02);
        }
        s.obstacles.forEach((o) => (o.x -= s.speed * dt));
        s.obstacles = s.obstacles.filter((o) => o.x + o.w > -10);

        const px = PLAYER_X, py = s.playerY, pw = PLAYER_SIZE, ph = PLAYER_SIZE;
        for (const o of s.obstacles) {
          const oy = GROUND_Y - o.h;
          if (px < o.x + o.w && px + pw > o.x && py < GROUND_Y && py + ph > oy) {
            const finalScore = Math.floor(s.elapsed * 10);
            setScore(finalScore);
            setBest((b) => {
              const nb = Math.max(b, finalScore);
              window.localStorage.setItem("pixel-jumper-best", String(nb));
              return nb;
            });
            sound?.playBonk?.();
            setStatus("over");
            break;
          }
        }
        if (statusRef.current === "playing") setScore(Math.floor(s.elapsed * 10));
      }

      // render
      ctx.clearRect(0, 0, W, H);
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "#0f2a3d");
      grad.addColorStop(1, "#123b4f");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = "rgba(0,195,227,0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y + 1);
      ctx.lineTo(W, GROUND_Y + 1);
      ctx.stroke();

      const s2 = stateRef.current;
      if (s2) {
        ctx.fillStyle = "#f2c98a";
        s2.obstacles.forEach((o) => ctx.fillRect(o.x, GROUND_Y - o.h, o.w, o.h));

        ctx.fillStyle = "#00C3E3";
        const r = 6, px2 = PLAYER_X, py2 = s2.playerY;
        ctx.beginPath();
        ctx.moveTo(px2 + r, py2);
        ctx.arcTo(px2 + PLAYER_SIZE, py2, px2 + PLAYER_SIZE, py2 + PLAYER_SIZE, r);
        ctx.arcTo(px2 + PLAYER_SIZE, py2 + PLAYER_SIZE, px2, py2 + PLAYER_SIZE, r);
        ctx.arcTo(px2, py2 + PLAYER_SIZE, px2, py2, r);
        ctx.arcTo(px2, py2, px2 + PLAYER_SIZE, py2, r);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#0a1419";
        ctx.fillRect(px2 + PLAYER_SIZE - 10, py2 + 8, 3, 3);
      }

      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onClick={jump}
        className="w-full max-w-[480px] cursor-pointer rounded-xl shadow-inner"
      />
      <div className="flex w-full max-w-[480px] items-center justify-between text-sm font-semibold text-[#4b5563] dark:text-slate-300">
        <span>Score: {score}</span>
        <span>Best: {best}</span>
      </div>
      {status !== "playing" && (
        <button
          type="button"
          onClick={start}
          className="rounded-lg bg-[#14181c] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 dark:bg-white dark:text-[#14181c]"
        >
          {status === "over" ? "Try Again" : "Start"}
        </button>
      )}
      <p className="text-center text-xs text-[#4b5563] dark:text-slate-400">
        Space / ↑ / tap the canvas to jump. Gets faster the longer you survive.
      </p>
    </div>
  );
}
