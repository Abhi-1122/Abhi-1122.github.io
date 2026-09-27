"use client";
import { useEffect, useMemo, useState } from "react";
import { DemoFrame } from "./DemoFrame";

// Real BharatSLM attention: weights recovered from the repo's eval heatmaps
// (Hindi|Assamese/eval/outputs/attention_{pretrained,finetuned}_reasoning_layer{0,10}_head{0,1}.png,
// re-rendered and checked against the originals), tokens from its real BPE tokenizers,
// per-layer entropy/distance from reasoning_metrics.json, Q&A from reasoning_samples.json.
// Data is lazy-loaded so the ~40KB JSON stays out of the main bundle.

const LABEL_W = 92;
const CELL = 22;
const TOP = 22;

function Toggle({ label, options, value, onChange }) {
  return (
    <div>
      <div className="mb-1 font-display text-[8px]">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map(([v, text]) => (
          <button
            key={String(v)}
            type="button"
            aria-pressed={value === v}
            onClick={() => onChange(v)}
            className={`px-2 py-1.5 font-display text-[8px] leading-none ${value === v ? "bg-gb-3 text-gb-0" : "border-2 border-gb-3"}`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

// 11 layers × (pretrained, finetuned) mini bar chart for one metric; current layer outlined.
function LayerBars({ title, hint, pre, fin, layer }) {
  const max = Math.max(...pre, ...fin);
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2 font-display text-[8px]">
        <span>{title}</span>
        <span className="font-sans text-[12px] opacity-80">{hint}</span>
      </div>
      <svg viewBox="0 0 220 54" className="w-full" shapeRendering="crispEdges" aria-hidden="true">
        {pre.map((p, i) => {
          const f = fin[i];
          const x = 4 + i * 19.6;
          const hp = (p / max) * 40;
          const hf = (f / max) * 40;
          return (
            <g key={i}>
              {(i === 0 || i === 10) && layer === i && <rect x={x - 2} y={2} width={17} height={44} className="fill-none stroke-gb-hi" strokeWidth="2" />}
              <rect x={x} y={44 - hp} width={6} height={hp} className="fill-gb-1" />
              <rect x={x + 7} y={44 - hf} width={6} height={hf} className="fill-gb-3" />
              <text x={x + 6.5} y={53} textAnchor="middle" fontSize="6" className="fill-gb-3 font-display">
                {i}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function AttentionDemo({ sound }) {
  const [data, setData] = useState(null);
  const [lang, setLang] = useState("hindi");
  const [model, setModel] = useState("finetuned");
  const [layer, setLayer] = useState(10);
  const [head, setHead] = useState(0);
  const [row, setRow] = useState(null);
  const [hover, setHover] = useState(null);
  const [ex, setEx] = useState(0);

  useEffect(() => {
    import("./bharatAttention.json").then((m) => setData(m.default));
  }, []);

  const d = data?.[lang];
  const T = d?.tokens.length ?? 0;
  const M = d?.attention[`${model}-L${layer}-H${head}`];
  // default row: the one that reaches furthest back with the strongest single weight (most telling)
  const autoRow = useMemo(() => {
    if (!M) return 0;
    let best = 0, score = -1;
    M.forEach((r, ri) => r.forEach((w, k) => {
      if (ri - k >= 4 && w * Math.log2(ri - k) > score) {
        score = w * Math.log2(ri - k);
        best = ri;
      }
    }));
    return best;
  }, [M]);
  const q = row ?? autoRow;

  const top = useMemo(() => {
    if (!M) return [];
    return M[q]
      .map((w, k) => ({ k, w }))
      .sort((a, b) => b.w - a.w)
      .slice(0, 3);
  }, [M, q]);

  const set = (fn) => (v) => {
    sound?.playClick?.();
    fn(v);
  };

  if (!d) return <DemoFrame title="look inside the attention">Loading real attention maps…</DemoFrame>;

  const W = LABEL_W + T * CELL;
  const H = TOP + T * CELL;
  const example = d.examples[ex % d.examples.length];
  const pct = (x) => `${Math.round(x * 1000) / 10}%`;

  return (
    <DemoFrame title="look inside the attention (real weights)">
      <p className="mb-3 font-sans text-[15px] leading-snug">
        Each <b>row</b> is a token the model is reading; the squares show which <b>earlier</b> tokens it looks at while doing so (darker = more attention).
        The top-right half is empty because a language model can never look ahead. Click a row.
      </p>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* heatmap */}
        <div className="min-w-0">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full select-none" shapeRendering="crispEdges" role="img" aria-label="Attention heatmap">
            <defs>
              <pattern id="attn-mask" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="6" height="6" className="fill-gb-0" />
                <rect width="2" height="6" className="fill-gb-1" opacity="0.5" />
              </pattern>
            </defs>
            {/* column indices */}
            {d.tokens.map((_, c) =>
              c % 5 === 0 ? (
                <text key={c} x={LABEL_W + c * CELL + CELL / 2} y={TOP - 7} textAnchor="middle" fontSize="8" className="fill-gb-3 font-display">
                  {c}
                </text>
              ) : null
            )}
            {/* masked future (upper-right triangle) */}
            <polygon
              points={`${LABEL_W + CELL},${TOP} ${LABEL_W + T * CELL},${TOP} ${LABEL_W + T * CELL},${TOP + (T - 1) * CELL} `}
              fill="url(#attn-mask)"
            />
            <text x={LABEL_W + T * CELL - 8} y={TOP + 22} textAnchor="end" fontSize="9" className="fill-gb-2 font-display">
              FUTURE · HIDDEN
            </text>
            {M.map((r, ri) => (
              <g key={ri} onClick={() => setRow(ri)} onMouseEnter={() => setRow(ri)} className="cursor-pointer">
                <text
                  x={LABEL_W - 6}
                  y={TOP + ri * CELL + CELL / 2 + 5}
                  textAnchor="end"
                  fontSize="13"
                  className={`font-sans ${ri === q ? "fill-gb-hi" : "fill-gb-3"}`}
                >
                  {d.tokens[ri]}
                </text>
                {r.map((w, ci) => (
                  <rect
                    key={ci}
                    x={LABEL_W + ci * CELL + 1}
                    y={TOP + ri * CELL + 1}
                    width={CELL - 2}
                    height={CELL - 2}
                    className="fill-gb-3"
                    fillOpacity={w < 0.02 ? 0.05 : 0.12 + 0.88 * Math.pow(w, 0.75)}
                    onMouseEnter={() => setHover({ r: ri, c: ci, w })}
                    onMouseLeave={() => setHover(null)}
                  />
                ))}
              </g>
            ))}
            <rect x={LABEL_W} y={TOP + q * CELL} width={(q + 1) * CELL} height={CELL} className="fill-none stroke-gb-hi" strokeWidth="3" />
            {top.map(({ k }) => (
              <rect key={k} x={LABEL_W + k * CELL} y={TOP} width={CELL} height={(q + 1) * CELL} className="fill-none stroke-gb-hi" strokeWidth="1.5" strokeDasharray="4 3" />
            ))}
          </svg>
          <p className="mt-2 font-sans text-[13px] leading-snug opacity-80">
            Question it reads: <span className="font-sans text-[14px]">{d.prompt}</span>
          </p>
        </div>

        {/* controls + readouts */}
        <div className="flex flex-col gap-3.5">
          <Toggle label="LANGUAGE" value={lang} onChange={set((v) => { setLang(v); setRow(null); setEx(0); })} options={[["hindi", "HINDI"], ["assamese", "ASSAMESE"]]} />
          <Toggle label="MODEL" value={model} onChange={set(setModel)} options={[["pretrained", "PRETRAINED"], ["finetuned", "FINETUNED"]]} />
          <div className="flex gap-4">
            <Toggle label="LAYER" value={layer} onChange={set(setLayer)} options={[[0, "FIRST (0)"], [10, "LAST (10)"]]} />
            <Toggle label="HEAD" value={head} onChange={set(setHead)} options={[[0, "0"], [1, "1"]]} />
          </div>

          <div className="border-2 border-gb-3 p-2.5">
            <div className="mb-2 font-display text-[8px] leading-relaxed">
              READING <span className="font-sans text-[15px] text-gb-hi">“{d.tokens[q]}”</span> (TOKEN {q}) LOOKS AT:
            </div>
            {top.map(({ k, w }) => (
              <div key={k} className="mb-1.5 flex items-center gap-2">
                <span className="w-[74px] truncate text-right font-sans text-[15px]">{d.tokens[k]}</span>
                <div className="h-[10px] flex-1 border-2 border-gb-3 p-[1px]">
                  <div className="h-full bg-gb-3" style={{ width: pct(w) }} />
                </div>
                <span className="w-[42px] text-right font-display text-[9px]">{pct(w)}</span>
              </div>
            ))}
            <div className="mt-1 min-h-[18px] font-sans text-[13px] opacity-80">
              {hover ? `“${d.tokens[hover.r]}” → “${d.tokens[hover.c]}”: ${pct(hover.w)}` : "Hover a square for its exact weight."}
            </div>
          </div>

          <LayerBars title="FOCUS BY LAYER" hint="entropy · lower = sharper" pre={d.summary.pretrained.entropy} fin={d.summary.finetuned.entropy} layer={layer} />
          <LayerBars title="LOOK-BACK BY LAYER" hint="mean distance (tokens)" pre={d.summary.pretrained.distance} fin={d.summary.finetuned.distance} layer={layer} />
          <div className="flex items-center gap-3 font-display text-[7px]">
            <span className="inline-block h-2 w-2 bg-gb-1" /> PRETRAINED
            <span className="inline-block h-2 w-2 bg-gb-3" /> FINETUNED
          </div>
        </div>
      </div>

      {/* real Q&A the finetuned model got right */}
      <div className="mt-5 border-t-[3px] border-gb-3 pt-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="font-display text-[9px]">
            ASK IT · REAL TEST QUESTIONS ({ex % d.examples.length + 1}/{d.examples.length})
          </span>
          <div className="flex items-center gap-2">
            <button type="button" className="pixel-btn px-2 py-1 font-display text-[8px]" onClick={() => set(setEx)((ex + d.examples.length - 1) % d.examples.length)} aria-label="Previous question">
              ◀
            </button>
            <button type="button" className="pixel-btn px-2 py-1 font-display text-[8px]" onClick={() => set(setEx)((ex + 1) % d.examples.length)} aria-label="Next question">
              ▶
            </button>
          </div>
        </div>
        <p className="font-sans text-[17px] leading-snug">{example.q}</p>
        <p className="mb-3 font-sans text-[14px] italic opacity-80">“{example.gloss}”</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="border-2 border-dashed border-gb-2 p-2.5">
            <div className="mb-1 font-display text-[8px]">PRETRAINED · ✘ keeps writing</div>
            <p className="font-sans text-[15px] leading-snug">{example.pretrained}…</p>
          </div>
          <div className="border-[3px] border-gb-3 p-2.5">
            <div className="mb-1 font-display text-[8px]">FINETUNED · ✔ CORRECT</div>
            <p className="font-sans text-[20px] leading-snug">
              {example.finetuned} <span className="text-[14px] opacity-80">({example.glossAnswer})</span>
            </p>
          </div>
        </div>
        <p className="mt-3 font-sans text-[13px] leading-snug opacity-80">
          Reasoning accuracy on 500 unseen test questions: {pct(d.accuracy.pretrained)} → {pct(d.accuracy.finetuned)}. Heatmaps: layers 0 and 10 as published in the repo;
          focus/look-back bars average all 6 heads over 10 held-out prompts.
        </p>
      </div>
    </DemoFrame>
  );
}
