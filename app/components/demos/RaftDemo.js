"use client";
import { useRef } from "react";
import { DemoFrame, DemoButton, Stat, stepped, useSimLoop } from "./DemoFrame";

const N = 5;
const NAMES = "ABCDE";
const HEARTBEAT = 1000;
const TRAVEL = 550;
const CX = 160;
const CY = 128;
const R = 88;
const POS = Array.from({ length: N }, (_, i) => {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / N;
  return [Math.round(CX + R * Math.cos(a)), Math.round(CY + R * Math.sin(a))];
});
const MSG_CLASS = { hb: "fill-gb-2", vote: "fill-gb-hi", grant: "fill-gb-3" };
const NODE_CLASS = {
  leader: ["fill-gb-3", "fill-gb-0"],
  candidate: ["fill-gb-1", "fill-gb-3"],
  follower: ["fill-gb-0", "fill-gb-3"],
  dead: ["fill-gb-2", "fill-gb-0"],
};

const electionTimeout = () => 2200 + Math.random() * 1400;

function freshSim() {
  const nodes = Array.from({ length: N }, (_, i) => ({
    state: i === 0 ? "leader" : "follower",
    term: 1,
    votedFor: 0,
    votes: 0,
    nextHb: 0,
    deadline: 2400 + i * 300, // deterministic so SSR and client agree
    span: 2400 + i * 300,
  }));
  return { t: 0, nodes, msgs: [], log: ["A is leader (term 1)"], id: 0 };
}

function resetTimer(s, n) {
  n.span = electionTimeout();
  n.deadline = s.t + n.span;
}

function send(s, from, kind) {
  for (let to = 0; to < N; to++) {
    if (to !== from) s.msgs.push({ id: s.id++, from, to, kind, term: s.nodes[from].term, at: s.t });
  }
}

function addLog(s, text) {
  s.log = [text, ...s.log].slice(0, 3);
}

export default function RaftDemo({ sound }) {
  const sim = useRef(null);
  if (!sim.current) sim.current = freshSim();
  const s = sim.current;

  function deliver(m) {
    const n = s.nodes[m.to];
    if (n.state === "dead") return;
    if (m.term > n.term) {
      n.term = m.term;
      n.votedFor = null;
      if (n.state !== "follower") n.state = "follower";
    }
    if (m.term < n.term) return;
    if (m.kind === "hb") {
      if (n.state === "candidate") n.state = "follower";
      resetTimer(s, n);
    } else if (m.kind === "vote" && n.state === "follower" && (n.votedFor == null || n.votedFor === m.from)) {
      n.votedFor = m.from;
      resetTimer(s, n);
      s.msgs.push({ id: s.id++, from: m.to, to: m.from, kind: "grant", term: n.term, at: s.t });
    } else if (m.kind === "grant" && n.state === "candidate" && ++n.votes > N / 2) {
      n.state = "leader";
      n.nextHb = s.t;
      addLog(s, `${NAMES[m.to]} wins ${n.votes}/${N} votes -> leader (term ${n.term})`);
      sound?.playCoin?.();
    }
  }

  useSimLoop((dt) => {
    s.t += dt;
    const arrived = s.msgs.filter((m) => s.t - m.at >= TRAVEL);
    s.msgs = s.msgs.filter((m) => s.t - m.at < TRAVEL);
    arrived.forEach(deliver);
    s.nodes.forEach((n, i) => {
      if (n.state === "dead") return;
      if (n.state === "leader") {
        if (s.t >= n.nextHb) {
          send(s, i, "hb");
          n.nextHb = s.t + HEARTBEAT;
        }
      } else if (s.t >= n.deadline) {
        n.state = "candidate";
        n.term++;
        n.votedFor = i;
        n.votes = 1;
        resetTimer(s, n);
        send(s, i, "vote");
        addLog(s, `${NAMES[i]} timed out -> candidate (term ${n.term})`);
      }
    });
  });

  function toggle(i) {
    const n = s.nodes[i];
    if (n.state === "dead") {
      n.state = "follower";
      resetTimer(s, n);
      addLog(s, `${NAMES[i]} rejoins as follower`);
      sound?.playClick?.();
    } else {
      addLog(s, `${NAMES[i]}${n.state === "leader" ? " (leader)" : ""} crashed`);
      n.state = "dead";
      sound?.playCrash?.();
    }
  }

  const leader = s.nodes.findIndex((n) => n.state === "leader");
  const firstDead = s.nodes.findIndex((n) => n.state === "dead");
  const alive = s.nodes.filter((n) => n.state !== "dead").length;
  const term = Math.max(...s.nodes.map((n) => n.term));

  return (
    <DemoFrame
      title="kill the Raft leader"
      controls={
        <>
          <DemoButton disabled={leader < 0} onClick={() => toggle(leader)}>Kill leader</DemoButton>
          <DemoButton disabled={firstDead < 0} onClick={() => toggle(firstDead)}>Revive</DemoButton>
        </>
      }
    >
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-stretch sm:justify-center">
        <svg viewBox="0 0 320 250" shapeRendering="crispEdges" className="h-auto w-full max-w-[400px] select-none" aria-label="Raft cluster">
          {POS.map((a, i) =>
            POS.slice(i + 1).map((b, j) => (
              <line key={`${i}-${j}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} className="stroke-gb-1" strokeWidth="2" strokeDasharray="2 4" />
            ))
          )}
          {s.msgs.map((m) => {
            const p = stepped((s.t - m.at) / TRAVEL);
            const [x1, y1] = POS[m.from];
            const [x2, y2] = POS[m.to];
            const k = m.kind === "hb" ? 3 : 4;
            return <rect key={m.id} x={Math.round(x1 + (x2 - x1) * p) - k} y={Math.round(y1 + (y2 - y1) * p) - k} width={k * 2} height={k * 2} className={MSG_CLASS[m.kind]} />;
          })}
          {s.nodes.map((n, i) => {
            const [x, y] = POS[i];
            const dead = n.state === "dead";
            const frac = n.state === "leader" || dead ? 0 : Math.max(0, (n.deadline - s.t) / n.span);
            const [body, ink] = NODE_CLASS[n.state];
            return (
              <g
                key={i}
                role="button"
                tabIndex={0}
                aria-label={`Node ${NAMES[i]}, ${n.state}. ${dead ? "Revive" : "Kill"}`}
                onClick={() => toggle(i)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggle(i);
                  }
                }}
                className="cursor-pointer outline-none [&:focus-visible>rect:first-child]:stroke-gb-hi"
              >
                <rect x={x - 30} y={y - 30} width="60" height="60" fill="transparent" stroke="transparent" strokeWidth="2" strokeDasharray="4 3" />
                <rect
                  x={x - 25}
                  y={y - 25}
                  width="50"
                  height="50"
                  fill="none"
                  className={n.state === "candidate" ? "stroke-gb-hi" : "stroke-gb-2"}
                  strokeWidth="3"
                  pathLength="1"
                  strokeDasharray={`${stepped(frac, 20)} 1`}
                  opacity={frac ? 1 : 0}
                />
                <rect x={x - 19} y={y - 19} width="38" height="38" className={`${body} stroke-gb-3`} strokeWidth="3" strokeDasharray={dead ? "4 3" : undefined} />
                <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle" fontSize="12" className={`${ink} font-display`}>
                  {dead ? "X" : NAMES[i]}
                </text>
                <text x={x} y={y + 40} textAnchor="middle" fontSize="8" className="fill-gb-3 font-display">
                  {dead ? "offline" : `${n.state} t${n.term}`}
                </text>
                {n.state === "leader" && (
                  <path d={`M${x - 10} ${y - 22}v-10l5 5l5 -7l5 7l5 -5v10z`} className="fill-gb-hi stroke-gb-3" strokeWidth="2" />
                )}
              </g>
            );
          })}
        </svg>
        <div className="flex w-full flex-col gap-2 sm:w-56 sm:flex-shrink-0">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="TERM">{term}</Stat>
            <Stat label="LEADER">{leader >= 0 ? NAMES[leader] : alive > N / 2 ? "..." : "none"}</Stat>
          </div>
          <div className="border-2 border-gb-3 bg-gb-0 px-2 py-1.5" aria-live="polite">
            <div className="mb-1 font-display text-[8px]">EVENTS</div>
            {s.log.map((l, i) => (
              <div key={l + i} className={`font-sans text-[15px] leading-tight ${i ? "text-gb-2" : ""}`}>{l}</div>
            ))}
          </div>
          <p className="text-[13px] leading-snug">
            {alive > N / 2 ? "Frames are election timers; heartbeats reset them. Click a node to crash or revive it." : `Only ${alive}/${N} alive: no majority, so no leader can be elected.`}
          </p>
          <div className="flex flex-wrap gap-x-3 text-[13px]">
            {Object.entries({ heartbeat: "bg-gb-2", "vote req": "bg-gb-hi", "vote granted": "bg-gb-3" }).map(([k, c]) => (
              <span key={k} className="inline-flex items-center gap-1"><span className={`h-2 w-2 ${c}`} />{k}</span>
            ))}
          </div>
        </div>
      </div>
    </DemoFrame>
  );
}
