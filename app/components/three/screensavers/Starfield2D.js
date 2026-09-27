"use client";
import { useEffect, useRef } from "react";

// Canvas-2D warp starfield for when WebGL is off.
export default function Starfield2D() {
  const ref = useRef(null);

  useEffect(() => {
    const c = ref.current;
    const ctx = c.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w, h, raf;
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      c.width = w * dpr;
      c.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const vp = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMove = (e) => {
      vp.tx = (e.clientX / w - 0.5) * -0.2 * w;
      vp.ty = (e.clientY / h - 0.5) * -0.2 * h;
    };
    window.addEventListener("pointermove", onMove);

    const spawn = (s, anyZ) => {
      s.x = (Math.random() - 0.5) * 2;
      s.y = (Math.random() - 0.5) * 2;
      s.z = anyZ ? Math.random() : 1;
      s.color = Math.random() < 0.75 ? "216,236,255" : Math.random() < 0.8 ? "0,195,227" : "255,77,94";
      return s;
    };
    const stars = Array.from({ length: 450 }, () => spawn({}, true));
    const start = performance.now();

    const draw = () => {
      const speed = 0.004 + Math.min((performance.now() - start) / 30000, 1) * 0.016;
      vp.x += (vp.tx - vp.x) * 0.05;
      vp.y += (vp.ty - vp.y) * 0.05;
      const cx = w / 2 + vp.x;
      const cy = h / 2 + vp.y;
      const f = Math.max(w, h) / 2;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, w, h);
      for (const s of stars) {
        const pz = s.z;
        s.z -= speed;
        if (s.z <= 0.01) { spawn(s, false); continue; }
        const x = cx + (s.x / s.z) * f;
        const y = cy + (s.y / s.z) * f;
        const px = cx + (s.x / (pz + speed * 2)) * f;
        const py = cy + (s.y / (pz + speed * 2)) * f;
        if (x < -50 || x > w + 50 || y < -50 || y > h + 50) { spawn(s, false); continue; }
        ctx.strokeStyle = `rgba(${s.color},${Math.min(1, 1.2 - s.z)})`;
        ctx.lineWidth = Math.max(0.6, (1 - s.z) * 2.6);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" />;
}
