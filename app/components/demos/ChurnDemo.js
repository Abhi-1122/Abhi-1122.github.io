"use client";
import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { DemoFrame, DemoButton } from "./DemoFrame";

// ChurnSense-AI runs on the Kaggle auto-insurance churn set (1.68M policies, 11.51% churned).
// Transparent surrogate: logistic model, base = logit(11.51%), one additive log-odds term per feature,
// each centred on a typical customer so terms read like SHAP values. Weights are sized to the repo's
// mean |SHAP| ranking (age > premium > income > tenure > residence); directions follow the risk agent's
// rules (short tenure, poor credit, high premium vs income -> up). Age direction is assumed (younger -> up).
const BASE_RATE = 0.1151;
const BASE = Math.log(BASE_RATE / (1 - BASE_RATE));
const sigmoid = (z) => 1 / (1 + Math.exp(-z));

const FEATURES = [
  { key: "tenure", label: "TENURE", min: 0.5, max: 20, step: 0.5, fmt: (v) => (v < 1 ? `${v * 12}MO` : `${v}Y`), w: (v) => -0.75 * (Math.log1p(v) - Math.log(9)) },
  { key: "premium", label: "PREMIUM", min: 400, max: 2000, step: 20, fmt: (v) => `$${v}`, w: (v) => 0.0013 * (v - 940) },
  { key: "income", label: "INCOME", min: 10, max: 250, step: 5, fmt: (v) => `$${v}K`, w: (v) => -0.55 * Math.log(v / 70) },
  { key: "age", label: "AGE", min: 18, max: 90, step: 1, fmt: (v) => `${v}`, w: (v) => -0.028 * (v - 52) },
  { key: "residence", label: "AT ADDRESS", min: 0, max: 15, step: 1, fmt: (v) => `${v}Y`, w: (v) => -0.09 * (v - 6) },
  { key: "credit", label: "CREDIT", fmt: (v) => (v ? "GOOD" : "POOR"), w: (v) => 0.55 * (0.8 - v) },
];

const PRESETS = [
  { name: "Maya R.", tenure: 0.5, premium: 1480, income: 35, age: 24, residence: 1, credit: 0 },
  { name: "Dev P.", tenure: 3, premium: 1100, income: 60, age: 38, residence: 4, credit: 1 },
  { name: "Ruth K.", tenure: 14, premium: 780, income: 95, age: 67, residence: 12, credit: 1 },
];

// risk bands + timelines from the repo's risk_assessment_agent / recommendation fallbacks
const band = (p) => (p < 0.3 ? "LOW" : p < 0.5 ? "MEDIUM" : p < 0.7 ? "HIGH" : "CRITICAL");
const TIMELINE = { LOW: "within 6 months", MEDIUM: "within 1 week", HIGH: "within 3 days", CRITICAL: "immediate" };

// per top driver: Speculation agent's reason, Recommendation agent's action, email line
const PLAYBOOK = {
  tenure: { why: "early tenure, still price-shopping", act: "free policy review", line: () => "You've unlocked a free policy review and first-claim accident forgiveness." },
  premium: { why: "renewal price shock", act: "12% loyalty discount", line: (c) => `We re-quoted your policy: a 12% loyalty discount brings it to $${Math.round(c.premium * 0.88)}/yr.` },
  income: { why: "premium strains the budget", act: "monthly instalments", line: () => "You can now split your premium into interest-free monthly payments." },
  age: { why: "young driver, very rate-sensitive", act: "safe-driver course", line: () => "Finish our safe-driver app course to take up to 15% off at renewal." },
  residence: { why: "recent move, re-shopping cover", act: "home + auto bundle", line: () => "New address? Bundle renters or home cover for an extra 10% off." },
  credit: { why: "payment friction at renewal", act: "autopay, fees waived", line: () => "Switch on autopay and we'll waive every instalment fee." },
};

const AGENTS = ["RISK ASSESS", "EXPLAIN", "SPECULATE", "RECOMMEND"];
const STEP_MS = 650;

function score(c) {
  const terms = FEATURES.map((f) => ({ ...f, value: c[f.key], phi: f.w(c[f.key]) })).sort((a, b) => Math.abs(b.phi) - Math.abs(a.phi));
  // walk base -> final in |phi| order so each bar is a probability step and they sum exactly
  let z = BASE;
  for (const t of terms) {
    t.from = sigmoid(z);
    z += t.phi;
    t.to = sigmoid(z);
  }
  return { terms, p: sigmoid(z) };
}

function writeUp(c, p, terms) {
  const cat = band(p);
  const up = terms.filter((t) => t.phi > 0.05).slice(0, 2);
  const first = c.name.split(" ")[0];
  const top = terms[0];
  const pb = PLAYBOOK[up[0]?.key];
  const lines = up.length ? up.map((t) => PLAYBOOK[t.key].line(c)) : [`Thanks for ${c.tenure} years with us. Here's a free roadside-assistance upgrade, on the house.`];
  return {
    steps: [
      `p = ${(p * 100).toFixed(1)}% · ${cat} · SHAP via TreeExplainer`,
      `${top.label} ${top.fmt(top.value)} pushes risk ${top.phi > 0 ? "up" : "down"} most (${top.phi > 0 ? "+" : ""}${top.phi.toFixed(2)} log-odds)`,
      pb ? `Likely reason: ${pb.why}` : "No strong churn trigger found",
      `${pb ? pb.act : "annual policy review"} · ${TIMELINE[cat]}`,
    ],
    subject: cat === "LOW" ? `Thank you, ${first}!` : `${first}, we saved you a better deal`,
    body: `Hi ${first},\n${lines.join("\n")}\nReply here or call 1-800-INSURE. - Retention Team`,
  };
}

function Gauge({ p, reduced }) {
  const cx = 90, cy = 88, R = 78, r = 56, N = 20;
  const pt = (q, rad) => `${Math.round(cx - rad * Math.cos(Math.PI * q))},${Math.round(cy - rad * Math.sin(Math.PI * q))}`;
  return (
    <svg viewBox="0 0 180 100" shapeRendering="crispEdges" className="h-auto w-full max-w-[200px]" role="img" aria-label={`Churn gauge at ${Math.round(p * 100)} percent`}>
      {Array.from({ length: N }, (_, i) => {
        const a = (i + 0.08) / N, b = (i + 0.92) / N;
        const on = (i + 0.5) / N <= p;
        return <polygon key={i} points={`${pt(a, R)} ${pt(b, R)} ${pt(b, r)} ${pt(a, r)}`} className={on ? (i >= 14 ? "fill-gb-hi" : "fill-gb-3") : "fill-gb-1"} />;
      })}
      <g style={{ transform: `rotate(${Math.round(-90 + 180 * p)}deg)`, transformOrigin: `${cx}px ${cy}px`, transition: reduced ? "none" : "transform 360ms steps(6, end)" }}>
        <rect x={cx - 2} y={cy - 70} width="4" height="70" className="fill-gb-3" />
      </g>
      <rect x={cx - 7} y={cy - 7} width="14" height="14" className="fill-gb-3" />
      <rect x={cx - 3} y={cy - 3} width="6" height="6" className="fill-gb-hi" />
      <text x="4" y="98" fontSize="7" className="fill-gb-3 font-display">0</text>
      <text x="176" y="98" textAnchor="end" fontSize="7" className="fill-gb-3 font-display">100</text>
    </svg>
  );
}

const GRID = "grid grid-cols-[104px_minmax(0,1fr)_42px] gap-1.5";

function Row({ label, delta, deltaClass = "", children }) {
  return (
    <div className={`${GRID} h-[18px] items-center`}>
      <span className="truncate font-display text-[7px] leading-none">{label}</span>
      <div className="relative h-[12px]">
        <div className="absolute inset-y-[-4px] w-[2px] bg-gb-1" style={{ left: `${BASE_RATE * 100}%` }} />
        {children}
      </div>
      <span className={`text-right font-display text-[8px] leading-none ${deltaClass}`}>{delta}</span>
    </div>
  );
}

const Marker = ({ at, move }) => <div className="absolute inset-y-0 w-[4px] bg-gb-3" style={{ left: `calc(${at * 100}% - 2px)`, ...move }} />;

function Waterfall({ terms, p, reduced }) {
  const move = reduced ? undefined : { transition: "left 300ms steps(5, end), width 300ms steps(5, end)" };
  return (
    <div role="img" aria-label={`Waterfall from ${(BASE_RATE * 100).toFixed(1)}% base rate to ${(p * 100).toFixed(1)}%`}>
      <Row label="BASE RATE" delta={`${(BASE_RATE * 100).toFixed(1)}%`}><Marker at={BASE_RATE} move={move} /></Row>
      {terms.map((t) => {
        const lo = Math.min(t.from, t.to), d = (t.to - t.from) * 100;
        return (
          <Row key={t.key} label={`${t.label} ${t.fmt(t.value)}`} delta={`${d >= 0 ? "+" : "-"}${Math.abs(d).toFixed(1)}`} deltaClass={d > 0 ? "text-gb-hi" : ""}>
            <div className={`absolute inset-y-0 ${d > 0 ? "bg-gb-hi" : "bg-gb-2"}`} style={{ left: `${lo * 100}%`, width: `max(2px, ${Math.abs(d)}%)`, ...move }} />
          </Row>
        );
      })}
      <Row label="PREDICTED" delta={`${(p * 100).toFixed(1)}%`}><Marker at={p} move={move} /></Row>
      <div className={`${GRID} pt-1 font-display text-[7px] leading-none`}>
        <span />
        <span className="flex justify-between border-t-2 border-gb-3 pt-1"><span>0</span><span>50</span><span>100%</span></span>
        <span className="text-right">PTS</span>
      </div>
    </div>
  );
}

export default function ChurnDemo({ sound }) {
  const reduced = useReducedMotion();
  const [c, setC] = useState(PRESETS[0]);
  const [run, setRun] = useState(null); // { step: 0..4, chars }
  const { terms, p } = score(c);
  const out = writeUp(c, p, terms);

  const edit = (patch) => {
    setC((prev) => ({ ...prev, ...patch }));
    setRun(null);
  };

  function generate() {
    sound?.playLaunch?.();
    setRun(reduced ? { step: 4, chars: Infinity } : { step: 0, chars: 0 });
  }

  // agents light up one by one, then the email types out
  useEffect(() => {
    if (!run) return;
    if (run.step < 4) {
      const id = setTimeout(() => {
        sound?.playClick?.();
        setRun((r) => r && { ...r, step: r.step + 1 });
      }, STEP_MS);
      return () => clearTimeout(id);
    }
    if (run.chars < out.body.length) {
      const id = setTimeout(() => setRun((r) => r && { ...r, chars: r.chars + 3 }), 24);
      return () => clearTimeout(id);
    }
    sound?.playChime?.();
  }, [run, out.body.length, sound]);

  const busy = run && (run.step < 4 || run.chars < out.body.length);
  const cat = band(p);

  return (
    <DemoFrame title="explain a churn score">
      <div className="grid gap-4 md:grid-cols-[228px_minmax(0,1fr)]">
        {/* customer card */}
        <div className="flex flex-col gap-2.5">
          <div>
            <div className="mb-1 font-display text-[8px]">CUSTOMER</div>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((pr) => (
                <button
                  key={pr.name}
                  type="button"
                  aria-pressed={c.name === pr.name}
                  onClick={() => { sound?.playClick?.(); setC(pr); setRun(null); }}
                  className={`px-2 py-1.5 font-display text-[8px] leading-none ${c.name === pr.name ? "bg-gb-3 text-gb-0" : "border-2 border-gb-3"}`}
                >
                  {pr.name}
                </button>
              ))}
            </div>
          </div>
          {FEATURES.filter((f) => f.min != null).map((f) => (
            <label key={f.key} className="block text-[13px]">
              <span className="flex justify-between font-display text-[8px] leading-none">
                <span>{f.label}</span>
                <span>{f.fmt(c[f.key])}</span>
              </span>
              <input type="range" min={f.min} max={f.max} step={f.step} value={c[f.key]} onChange={(e) => edit({ [f.key]: Number(e.target.value) })} className="w-full accent-[var(--gb-3)]" />
            </label>
          ))}
          <div className="flex items-center justify-between gap-2">
            <span className="font-display text-[8px]">CREDIT</span>
            <div className="flex gap-1.5">
              {[[1, "GOOD"], [0, "POOR"]].map(([v, t]) => (
                <button key={t} type="button" aria-pressed={c.credit === v} onClick={() => { sound?.playToggle?.(); edit({ credit: v }); }} className={`px-2 py-1.5 font-display text-[8px] leading-none ${c.credit === v ? "bg-gb-3 text-gb-0" : "border-2 border-gb-3"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <DemoButton onClick={generate} disabled={busy} className="mt-1 w-full py-2">
            {busy ? "Agents working..." : "Generate retention email"}
          </DemoButton>
        </div>

        {/* model output */}
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="flex flex-col items-center border-2 border-gb-3 bg-gb-0 p-2 lg:w-[196px] lg:flex-shrink-0">
              <div className="self-start font-display text-[8px]">CHURN RISK</div>
              <Gauge p={p} reduced={reduced} />
              <div className="font-display text-[18px] leading-none">{Math.round(p * 100)}%</div>
              <div className={`mt-1.5 font-display text-[8px] ${p >= 0.5 ? "text-gb-hi" : ""}`}>{cat}</div>
            </div>
            <div className="min-w-0 flex-1 border-2 border-gb-3 bg-gb-0 p-2">
              <div className="mb-1 flex justify-between gap-2 font-display text-[8px]">
                <span>WHY: SHAP WATERFALL</span>
                <span className="text-gb-hi">▲ RISK</span>
              </div>
              <Waterfall terms={terms} p={p} reduced={reduced} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4" aria-label="LangChain agent pipeline">
            {AGENTS.map((a, i) => {
              const state = !run ? "idle" : run.step > i ? "done" : run.step === i ? "active" : "idle";
              return (
                <div key={a} className={`border-2 px-1.5 py-1.5 text-center font-display text-[7px] leading-none ${state === "done" ? "border-gb-3 bg-gb-3 text-gb-0" : state === "active" ? "motion-safe:animate-pulse border-gb-hi bg-gb-hi text-gb-0" : "border-dashed border-gb-2 text-gb-2"}`}>
                  {i + 1}.{a}
                </div>
              );
            })}
          </div>

          <div className="min-h-[18px] font-sans text-[13px] leading-snug" aria-live="polite">
            {run?.step > 0 ? (
              <>
                <span className="font-display text-[7px]">{AGENTS[run.step - 1]} &gt;</span> {out.steps[run.step - 1]}
              </>
            ) : (
              <span className="text-gb-2">{run ? "Risk Assessment agent scoring..." : "4 LangChain agents: Risk Assessment > Explainability > Speculation > Recommendation."}</span>
            )}
          </div>

          <div className="min-h-[112px] border-2 border-gb-3 bg-gb-0 px-2.5 py-2">
            {run?.step === 4 ? (
              <>
                <div className="font-display text-[8px] leading-relaxed">SUBJ: <span className="text-gb-hi">{out.subject}</span></div>
                <p className="whitespace-pre-line font-sans text-[14px] leading-snug">
                  {out.body.slice(0, run.chars)}
                  {busy && <span className="motion-safe:animate-pulse">▌</span>}
                </p>
              </>
            ) : (
              <p className="font-sans text-[14px] leading-snug text-gb-2">{run ? "Drafting email from the top SHAP drivers..." : "Press GENERATE to draft a retention email from this customer's top SHAP drivers."}</p>
            )}
          </div>
        </div>
      </div>
      <p className="mt-2.5 font-sans text-[12px] leading-snug text-gb-2">
        Surrogate model for the demo; real model: XGBoost, ~87% ROC-AUC. Base 11.5% = real churn rate across 1.68M auto-insurance policies.
      </p>
    </DemoFrame>
  );
}
