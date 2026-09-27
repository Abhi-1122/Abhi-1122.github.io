"use client";
import { useRef, useState } from "react";
import { DemoFrame, DemoButton, Stat, useSimLoop } from "./DemoFrame";

const MU = 0.6;
const WINDOW = 10;
const W = 600;
const H = 200;
const TOP = 10;
const BASE = 168;
const LAMBDA_CAP = 30;

function freshSim() {
  return { t: 0, exc: 0, ofi: 0, mid: 10000, samples: [], events: [], lastSample: -1, yMax: 3 };
}

export default function HawkesDemo({ sound }) {
  const sim = useRef(null);
  if (!sim.current) sim.current = freshSim();
  const [alpha, setAlpha] = useState(0.8);
  const [beta, setBeta] = useState(1.2);
  const s = sim.current;

  function fire(side) {
    s.exc = Math.min(LAMBDA_CAP, s.exc + alpha);
    s.ofi += side;
    s.mid += side;
    s.events.push({ t: s.t, side });
  }

  useSimLoop((ms) => {
    const dt = ms / 1000;
    s.t += dt;
    const decay = Math.exp(-beta * dt);
    s.exc *= decay;
    s.ofi *= decay;
    // per-frame Bernoulli approximation of the point process: P(event) ≈ λ·dt
    if (Math.random() < Math.min(1, (MU + s.exc) * dt)) fire(Math.random() < 0.5 + 0.3 * Math.tanh(s.ofi / 2) ? 1 : -1);
    if (s.t - s.lastSample > 0.04) {
      s.samples.push({ t: s.t, l: MU + s.exc });
      s.lastSample = s.t;
    }
    const cut = s.t - WINDOW - 0.5;
    while (s.samples.length && s.samples[0].t < cut) s.samples.shift();
    while (s.events.length && s.events[0].t < cut) s.events.shift();
    const peak = Math.max(3, ...s.samples.map((p) => p.l)) * 1.15;
    s.yMax += (peak - s.yMax) * Math.min(1, dt * 3);
  });

  function burst() {
    const side = Math.random() < 0.5 ? 1 : -1;
    for (let i = 0; i < 5; i++) fire(side);
    sound?.playCombo?.(4);
  }

  const lambda = MU + s.exc;
  const xOf = (t) => Math.round(W * (1 - (s.t - t) / WINDOW));
  const yOf = (l) => Math.round(BASE - ((BASE - TOP) * l) / s.yMax);
  // stepped (H/V) path reads as a pixel chart
  const line = s.samples.map((p, i) => (i ? `H${xOf(p.t)}V${yOf(p.l)}` : `M${xOf(p.t)} ${yOf(p.l)}`)).join("");
  const area = s.samples.length ? `${line}V${BASE}H${xOf(s.samples[0].t)}Z` : "";

  // Avellaneda-Stoikov-flavoured quotes: spread widens with excitation, centre skews with order-flow imbalance
  const half = 1 + 0.8 * s.exc;
  const centre = s.mid + 0.6 * s.ofi;
  const bid = (centre - half) / 100;
  const ask = (centre + half) / 100;
  const ratio = alpha / beta;

  return (
    <DemoFrame title="excite the order flow" controls={<DemoButton onClick={burst}>Burst</DemoButton>}>
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="min-w-0 flex-1 border-2 border-gb-3 bg-gb-0 p-1.5">
          <svg viewBox={`0 0 ${W} ${H}`} shapeRendering="crispEdges" className="h-auto w-full" aria-label={`Intensity chart, current lambda ${lambda.toFixed(2)} events per second`}>
            <path d={area} className="fill-gb-1" />
            <path d={line} fill="none" className="stroke-gb-3" strokeWidth="3" />
            <line x1="0" x2={W} y1={yOf(MU)} y2={yOf(MU)} className="stroke-gb-2" strokeDasharray="6 6" strokeWidth="2" />
            <text x="4" y={yOf(MU) - 6} fontSize="7" className="fill-gb-2 font-display">mu = {MU}</text>
            <line x1="0" x2={W} y1={BASE} y2={BASE} className="stroke-gb-3" strokeWidth="2" />
            {s.events.map((e, i) => (
              <rect key={e.t + "-" + i} x={xOf(e.t) - 4} y={BASE + 10 + (e.side > 0 ? -4 : 6)} width="8" height="8" className={e.side > 0 ? "fill-gb-3" : "fill-gb-hi"} />
            ))}
            <text x={W - 4} y={TOP + 14} textAnchor="end" fontSize="8" className="fill-gb-3 font-display">
              λ(t) = {lambda.toFixed(2)}/s
            </text>
            <text x={W - 4} y={H - 2} textAnchor="end" fontSize="6" className="fill-gb-2 font-display">now</text>
            <text x="4" y={H - 2} fontSize="6" className="fill-gb-2 font-display">
              -{WINDOW}s  <tspan className="fill-gb-3">■</tspan> buy <tspan className="fill-gb-hi">■</tspan> sell
            </text>
          </svg>
        </div>
        <div className="flex flex-col gap-2.5 md:w-52 md:flex-shrink-0">
          <div className="grid grid-cols-2 gap-2 text-center">
            <Stat label="BID">{bid.toFixed(2)}</Stat>
            <Stat label="ASK"><span className="text-gb-hi">{ask.toFixed(2)}</span></Stat>
          </div>
          <div className="text-[13px]">
            Spread {(2 * half).toFixed(1)}c
            <div className="mt-1 h-2 border-2 border-gb-3 bg-gb-0">
              <div className="h-full bg-gb-3" style={{ width: `${Math.min(100, Math.round(half * 2) * 4)}%` }} />
            </div>
          </div>
          {[
            ["α excitation", alpha, setAlpha, 0, 2],
            ["β decay", beta, setBeta, 0.3, 3],
          ].map(([label, v, set, min, max]) => (
            <label key={label} className="block text-[13px]">
              <span className="flex justify-between"><span>{label}</span><span className="font-display text-[9px] leading-none">{v.toFixed(2)}</span></span>
              <input type="range" min={min} max={max} step="0.05" value={v} onChange={(e) => set(Number(e.target.value))} className="w-full accent-[var(--gb-3)]" />
            </label>
          ))}
          <p className={`text-[13px] leading-snug ${ratio >= 1 ? "text-gb-hi" : ""}`}>
            α/β = {ratio.toFixed(2)}{ratio >= 1 ? ": explosive, each event spawns ≥1 more" : ": stationary; each event bumps λ by α, decaying at rate β"}
          </p>
        </div>
      </div>
    </DemoFrame>
  );
}
