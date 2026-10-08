"use client";
import { useRef, useState } from "react";
import { useElementWidth } from "../../hooks/useElementWidth";
import { DemoFrame, DemoButton, Stat, useSimLoop } from "./DemoFrame";

// TokenGEMM: FP32 GEMM on an Alveo U50. Every number below is measured and comes straight from the
// TokenGEMM README (per-shape breakdown table, engineering notes, headline results). Only arithmetic
// intensity is derived, from the shape itself (FLOPs over the minimum bytes moved for A, B and C).
const PEAK = 133; // GFLOP/s = 256 MACs x 260 MHz x 2
const HBM_PC = 14.4; // GB/s, one HBM pseudo-channel
const SHAPES = [
  { id: "attn", name: "ATTN", M: 288, K: 288, 1: { time: "55 µs", gf: 3.0, bound: "overhead" }, 32: { time: "86 µs", gf: 61.9, bound: "compute" } },
  { id: "up", name: "FFN UP", M: 768, K: 288, 1: { time: "101 µs", gf: 4.4, bound: "memory" }, 32: { time: "153 µs", gf: 92.4, bound: "compute" } },
  { id: "down", name: "FFN DOWN", M: 288, K: 768, 1: { time: "100 µs", gf: 4.4, bound: "memory" }, 32: { time: "178 µs", gf: 79.7, bound: "compute" } },
  { id: "vocab", name: "VOCAB", M: 32000, K: 288, 1: { time: "3.50 ms", gf: 5.3, bound: "memory" }, 32: { time: "4.78 ms", gf: 123.4, bound: "compute" } },
];
const BOUND = { overhead: "PER-CALL OVERHEAD", memory: "MEMORY", compute: "COMPUTE" };
const intensity = ({ M, K }, N) => (2 * M * K * N) / (4 * (M * K + K * N + M * N));

function say(sh, n) {
  if (n === 1 && sh.id === "attn")
    return "N = 1 picks the streaming path. This matrix is small, so the fixed cost of launching a call takes most of the 55 µs.";
  if (n === 1 && sh.id === "vocab")
    return "N = 1 picks the streaming path. Each weight is read once and used once: 37 MB per call at 10.5 GB/s, 73% of one HBM pseudo-channel.";
  if (n === 1) return "N = 1 picks the streaming path. Each weight is read once and used once, so the multipliers wait on HBM.";
  return "N = 32 picks the batched path. Each weight is reused 32 times, so the two engines (256 MACs per cycle) set the speed, not HBM.";
}

// Diagram geometry: 4 columns after the HBM block. Compact layout for phones.
function layout(compact) {
  const W = compact ? 360 : 520;
  const hw = compact ? 34 : 50;
  const g = compact ? 14 : 22;
  const bw = Math.floor((W - hw - g * 4) / 4);
  const col = (i) => hw + g + i * (bw + g);
  const ew = 2 * bw + g;
  return { W, H: 206, hw, g, bw, col, ew, cell: Math.floor((ew - 10) / 32), dcell: Math.floor((bw - 8) / 16), fs: compact ? 7 : 8 };
}

// Animated link: square "packets" marching left to right in steps.
function Link({ x1, x2, y, on, tick, hot }) {
  return (
    <line
      x1={x1}
      x2={x2}
      y1={y}
      y2={y}
      className={hot ? "stroke-gb-hi" : on ? "stroke-gb-3" : "stroke-gb-1"}
      strokeWidth="4"
      strokeDasharray="4 4"
      strokeDashoffset={on ? -((tick % 4) * 2) : 0}
    />
  );
}

function Box({ x, y, w, h, name, detail, fs, hot, children }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} className={`fill-gb-0 ${hot ? "stroke-gb-hi" : "stroke-gb-3"}`} strokeWidth="3" />
      <text x={x + w / 2} y={y + 13} textAnchor="middle" fontSize={fs} className="fill-gb-3 font-display">
        {name}
      </text>
      {detail && (
        <text x={x + w / 2} y={y + h - 8} textAnchor="middle" fontSize="7" className="fill-gb-2 font-display">
          {detail}
        </text>
      )}
      {children}
    </g>
  );
}

function Datapath({ n, bound, tick, compact }) {
  const L = layout(compact);
  const { W, H, hw, g, bw, col, ew, cell, dcell, fs } = L;
  const dec = n === 1;
  const t = tick;
  const DY = 18; // decode lane top
  const DH = 44;
  const dMid = DY + DH / 2;
  const AY = 108; // batched lane rows
  const BY = 158;
  const EH = 40;
  const aMid = AY + EH / 2;
  const bMid = BY + EH / 2;
  const memHot = bound === "memory";
  const cmpHot = bound === "compute";
  const xm = col(1) - g / 2;

  // HBM rows: in decode one row scans down the weights; in batched, the A and B regions take turns.
  const rows = 12;
  const rowH = Math.floor((H - 40) / rows);
  const scan = t % rows;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} shapeRendering="crispEdges" className="block h-auto w-full select-none" role="img" aria-label={`Datapath. N = ${n} uses the ${dec ? "decode streaming" : "batched engine"} path.`}>
      {/* HBM */}
      <rect x="1" y={DY} width={hw - 2} height={H - DY - 8} className={`fill-gb-0 ${memHot ? "stroke-gb-hi" : "stroke-gb-3"}`} strokeWidth="3" />
      <text x={hw / 2} y={DY + 13} textAnchor="middle" fontSize={fs} className="fill-gb-3 font-display">
        HBM
      </text>
      {Array.from({ length: rows }, (_, i) => {
        const y = DY + 20 + i * rowH;
        const lit = dec ? i === scan : i === (t >> 1) % 6 || i === 6 + ((t >> 1) % 6);
        return <rect key={i} x="7" y={y} width={hw - 14} height={rowH - 3} className={lit ? (memHot ? "fill-gb-hi" : "fill-gb-3") : "fill-gb-1"} />;
      })}

      {/* decode lane */}
      <g opacity={dec ? 1 : 0.25}>
        <text x={col(0)} y="10" fontSize="7" className={`font-display ${dec ? "fill-gb-3" : "fill-gb-2"}`}>
          {dec ? "▶ " : ""}DECODE · N = 1{dec ? "" : " · IDLE"}
        </text>
        <Link x1={hw} x2={col(0)} y={dMid} on={dec} tick={t} hot={dec && memHot} />
        {[0, 1, 2].map((i) => (
          <Link key={i} x1={col(i) + bw} x2={col(i + 1)} y={dMid} on={dec} tick={t} />
        ))}
        <Box x={col(0)} y={DY} w={bw} h={DH} name="READER" detail="512-BIT" fs={fs} />
        <Box x={col(1)} y={DY} w={bw} h={DH} name="PACKER" detail="32 ROWS" fs={fs}>
          {Array.from({ length: 8 }, (_, i) => (
            <rect key={i} x={col(1) + bw / 2 - 20 + i * 5} y={DY + 18} width="4" height="7" className={dec && i <= t % 9 ? "fill-gb-3" : "fill-gb-1"} />
          ))}
        </Box>
        <Box x={col(2)} y={DY} w={bw} h={DH} name="DOT" detail="16 MAC" fs={fs}>
          {Array.from({ length: 16 }, (_, i) => (
            <rect key={i} x={col(2) + (bw - 16 * dcell) / 2 + i * dcell} y={DY + 18} width={dcell - 1} height="7" className={!dec ? "fill-gb-1" : (i + t) % 16 < 3 ? "fill-gb-hi" : "fill-gb-3"} />
          ))}
        </Box>
        <Box x={col(3)} y={DY} w={bw} h={DH} name="WRITER" detail="TO HBM" fs={fs} />
      </g>

      <line x1={hw + 6} x2={W} y1="80" y2="80" className="stroke-gb-1" strokeWidth="2" strokeDasharray="2 4" />

      {/* batched lane */}
      <g opacity={dec ? 0.25 : 1}>
        <text x={col(0)} y="96" fontSize="7" className={`font-display ${dec ? "fill-gb-2" : "fill-gb-3"}`}>
          {dec ? "" : "▶ "}BATCHED · N &gt; 1{dec ? " · IDLE" : ""}
        </text>
        <Link x1={hw} x2={col(0)} y={aMid} on={!dec} tick={t} />
        <Link x1={hw} x2={col(0)} y={bMid} on={!dec} tick={t} />
        {/* A tiles feed both engines, each engine has its own B panel copy */}
        <Link x1={col(0) + bw} x2={col(1)} y={aMid} on={!dec} tick={t} />
        <Link x1={col(0) + bw} x2={col(1)} y={bMid} on={!dec} tick={t} />
        <path d={`M${xm - 3} ${aMid}V${bMid - 7}H${col(1)}`} fill="none" className={dec ? "stroke-gb-1" : "stroke-gb-2"} strokeWidth="2" />
        <path d={`M${xm + 3} ${bMid}V${aMid + 7}H${col(1)}`} fill="none" className={dec ? "stroke-gb-1" : "stroke-gb-2"} strokeWidth="2" />
        <Link x1={col(1) + ew} x2={col(3)} y={aMid} on={!dec} tick={t} />
        <Link x1={col(1) + ew} x2={col(3)} y={bMid} on={!dec} tick={t} />
        <Box x={col(0)} y={AY} w={bw} h={EH} name="A TILES" detail="48 ROWS" fs={fs} />
        <Box x={col(0)} y={BY} w={bw} h={EH} name="B PANEL" detail="768×128" fs={fs} />
        {[AY, BY].map((y, e) => (
          <g key={e}>
            <rect x={col(1)} y={y} width={ew} height={EH} className={`fill-gb-0 ${cmpHot ? "stroke-gb-hi" : "stroke-gb-3"}`} strokeWidth="3" />
            <text x={col(1) + 6} y={y + 12} fontSize="7" className="fill-gb-3 font-display">
              ENGINE {e}
            </text>
            <text x={col(1) + ew - 6} y={y + 12} textAnchor="end" fontSize="7" className="fill-gb-2 font-display">
              4×32 MAC
            </text>
            {Array.from({ length: 128 }, (_, k) => {
              const r = k >> 5;
              const c = k & 31;
              const hi = (c + r * 2 + t * 3 + e * 6) % 16 < 3;
              return (
                <rect
                  key={k}
                  x={col(1) + (ew - 32 * cell) / 2 + c * cell}
                  y={y + 17 + r * 5}
                  width={cell - 1}
                  height="4"
                  className={dec ? "fill-gb-1" : hi ? "fill-gb-hi" : "fill-gb-3"}
                />
              );
            })}
          </g>
        ))}
        <Box x={col(3)} y={AY} w={bw} h={BY + EH - AY} name="C WRITER" detail="TO HBM" fs={fs} />
      </g>
    </svg>
  );
}

// Log-log roofline: sloped HBM roof, flat compute roof, all 8 measured points.
function Roofline({ n, shape }) {
  const W = 236;
  const H = 114;
  const X0 = 28;
  const X1 = W - 6;
  const Y0 = 10;
  const Y1 = H - 22;
  const lx = [0.25, 32];
  const ly = [1, 256];
  const x = (v) => Math.round(X0 + ((X1 - X0) * Math.log2(v / lx[0])) / Math.log2(lx[1] / lx[0]));
  const y = (v) => Math.round(Y1 - ((Y1 - Y0) * Math.log2(v / ly[0])) / Math.log2(ly[1] / ly[0]));
  const ridge = PEAK / HBM_PC;
  const pts = SHAPES.flatMap((s) => [1, 32].map((N) => ({ s, N, ai: intensity(s, N), gf: s[N].gf })));
  const cur = pts.find((p) => p.s === shape && p.N === n);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} shapeRendering="crispEdges" className="block h-auto w-full" role="img" aria-label={`Roofline. Current point: ${cur.gf} GFLOP/s at ${cur.ai.toFixed(1)} FLOP per byte.`}>
      <line x1={X0} x2={X0} y1={Y0 - 4} y2={Y1} className="stroke-gb-3" strokeWidth="2" />
      <line x1={X0} x2={X1} y1={Y1} y2={Y1} className="stroke-gb-3" strokeWidth="2" />
      {[1, 10, 100].map((v) => (
        <text key={v} x={X0 - 4} y={y(v) + 3} textAnchor="end" fontSize="6" className="fill-gb-3 font-display">
          {v}
        </text>
      ))}
      {[0.5, 2, 8, 32].map((v) => (
        <text key={v} x={x(v)} y={Y1 + 10} textAnchor="middle" fontSize="6" className="fill-gb-3 font-display">
          {v}
        </text>
      ))}
      <text x={X1} y={H - 1} textAnchor="end" fontSize="6" className="fill-gb-2 font-display">
        FLOP/BYTE
      </text>
      <text x={X0 + 4} y={Y0 - 2} fontSize="6" className="fill-gb-2 font-display">
        GFLOP/S
      </text>

      {/* roofs */}
      <polyline points={`${x(lx[0])},${y(HBM_PC * lx[0])} ${x(ridge)},${y(PEAK)} ${X1},${y(PEAK)}`} fill="none" className="stroke-gb-2" strokeWidth="3" />
      <text x={X1} y={y(PEAK) - 5} textAnchor="end" fontSize="6" className="fill-gb-3 font-display">
        PEAK {PEAK}
      </text>
      <text x={x(1.2)} y={y(HBM_PC * 1.2) - 10} textAnchor="end" fontSize="6" className="fill-gb-3 font-display">
        {HBM_PC} GB/S
      </text>
      <text x={x(1.1)} y={Y1 - 6} fontSize="6" className="fill-gb-2 font-display">
        MEMORY
      </text>
      <text x={x(ridge) + 6} y={Y1 - 6} fontSize="6" className="fill-gb-2 font-display">
        COMPUTE
      </text>

      {pts.map((p) => (p === cur ? null : <rect key={`${p.s.id}${p.N}`} x={x(p.ai) - 2} y={y(p.gf) - 2} width="5" height="5" className={p.N === n ? "fill-gb-3" : "fill-gb-1"} />))}
      <rect x={x(cur.ai) - 4} y={y(cur.gf) - 4} width="9" height="9" className="fill-gb-hi stroke-gb-3" strokeWidth="2" />
    </svg>
  );
}

export default function GemmDemo({ sound }) {
  const [n, setN] = useState(1);
  const [sid, setSid] = useState("vocab");
  const sim = useRef({ t: 0 });
  const [ref, w] = useElementWidth();
  const reduced = useSimLoop((dt) => (sim.current.t += dt));
  const tick = reduced ? 0 : Math.floor(sim.current.t / 140);
  const shape = SHAPES.find((s) => s.id === sid);
  const m = shape[n];
  const pick = (fn) => (v) => {
    sound?.playClick?.();
    fn(v);
  };

  return (
    <DemoFrame title="memory bound vs compute bound">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_236px]">
        <div ref={ref} className="flex min-w-0 flex-col gap-3">
          <div className="mx-auto w-full max-w-[640px]">
            <Datapath n={n} bound={m.bound} tick={tick} compact={w > 0 && w < 480} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-[8px]">BOUND BY</span>
            <span className={`px-1.5 py-1 font-display text-[8px] leading-none text-gb-0 ${m.bound === "compute" ? "bg-gb-3" : "bg-gb-hi"}`}>{BOUND[m.bound]}</span>
          </div>
          <p className="min-h-[40px] font-sans text-[15px] leading-snug" aria-live="polite">
            {say(shape, n)}
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          <div>
            <div className="mb-1.5 font-display text-[8px]">BATCH SIZE N</div>
            <div className="grid grid-cols-2 gap-2">
              {[1, 32].map((v) => (
                <DemoButton key={v} pressed={n === v} aria-pressed={n === v} onClick={() => pick(setN)(v)}>
                  N = {v}
                </DemoButton>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1.5 font-display text-[8px]">LAYER (M×K)</div>
            <div className="grid grid-cols-2 gap-2">
              {SHAPES.map((s) => (
                <DemoButton key={s.id} pressed={sid === s.id} aria-pressed={sid === s.id} className="flex flex-col items-center gap-1 !px-1 !py-1.5" onClick={() => pick(setSid)(s.id)}>
                  <span>{s.name}</span>
                  <span className="text-[7px] text-gb-2">
                    {s.M}×{s.K}
                  </span>
                </DemoButton>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2" aria-live="polite">
            <Stat label="TIME">{m.time}</Stat>
            <Stat label="GFLOP/S">{m.gf.toFixed(1)}</Stat>
          </div>
          <div className="border-2 border-gb-3 bg-gb-0 p-1.5">
            <div className="mb-1 font-display text-[8px]">ROOFLINE</div>
            <Roofline n={n} shape={shape} />
          </div>
        </div>
      </div>
      <p className="mt-3 border-t-[3px] border-gb-3 pt-2 font-sans text-[14px] leading-snug">
        <span className="font-display text-[10px]">1,713×</span> faster than a naive HLS kernel on dense GEMM, and <span className="font-display text-[10px]">105.5</span> tokens/s end to end on TinyStories-15M.
      </p>
    </DemoFrame>
  );
}
