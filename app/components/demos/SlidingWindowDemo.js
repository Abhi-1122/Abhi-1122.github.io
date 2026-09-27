"use client";
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { DemoFrame, DemoButton, Stat, stepped, useSimLoop } from "./DemoFrame";

const TOTAL = 12;
const WIN = 4;
const TRAVEL = 800;
const RTO = 2200;
const GAP = 260;
const COL = 38;
const X0 = 12;
const BOX = 30;
const SEND_Y = 34;
const RECV_Y = 186;
const colX = (seq) => X0 + (seq - 1) * COL;

function freshSim() {
  return { t: 0, base: 1, next: 1, pk: {}, flights: [], recv: {}, delivered: 0, sent: 0, retx: 0, nextSendAt: 0, doneAt: 0, id: 0, status: "Sending packets 1-4..." };
}

export default function SlidingWindowDemo({ sound }) {
  const sim = useRef(null);
  if (!sim.current) sim.current = freshSim();
  const [lossy, setLossy] = useState(false);
  const [dropArmed, setDropArmed] = useState(false);
  const dropRef = useRef(false);
  const s = sim.current;

  function transmit(seq) {
    const drop = dropRef.current || (lossy && Math.random() < 0.1);
    if (dropRef.current) {
      dropRef.current = false;
      setDropArmed(false);
    }
    s.flights.push({ id: s.id++, seq, kind: "data", at: s.t, drop });
    s.sent++;
  }

  useSimLoop((dt) => {
    s.t += dt;
    if (s.doneAt) {
      if (s.t - s.doneAt > 2600) sim.current = freshSim();
      return;
    }
    const replies = [];
    s.flights = s.flights.filter((f) => {
      const age = s.t - f.at;
      if (f.drop) {
        if (age >= TRAVEL / 2 && !f.lost) {
          f.lost = true;
          s.status = `Packet ${f.seq} lost in transit`;
          sound?.playBonk?.();
        }
        return age < TRAVEL / 2 + 600;
      }
      if (age < TRAVEL) return true;
      if (f.kind === "data") {
        s.recv[f.seq] = true;
        while (s.recv[s.delivered + 1]) s.delivered++;
        replies.push({ id: s.id++, seq: f.seq, kind: "ack", at: s.t });
      } else {
        s.pk[f.seq].acked = true;
        while (s.pk[s.base]?.acked) s.base++;
        if (s.base > TOTAL) {
          s.doneAt = s.t;
          s.status = `All ${TOTAL} packets delivered in order. Restarting...`;
          sound?.playCoin?.();
        }
      }
      return false;
    });
    s.flights.push(...replies);
    for (let q = s.base; q < s.next; q++) {
      const p = s.pk[q];
      if (!p.acked && s.t >= p.deadline) {
        p.rto *= 2;
        p.tries++;
        p.span = p.rto;
        p.deadline = s.t + p.rto;
        s.retx++;
        s.status = `Timeout on ${q} -> retransmit, RTO backs off to ${(p.rto / 1000).toFixed(1)}s`;
        sound?.playClick?.();
        transmit(q);
      }
    }
    if (s.next < s.base + WIN && s.next <= TOTAL && s.t >= s.nextSendAt) {
      s.pk[s.next] = { acked: false, rto: RTO, span: RTO, deadline: s.t + RTO, tries: 1 };
      transmit(s.next++);
      s.nextSendAt = s.t + GAP;
    }
  });

  const hi = Math.min(s.base + WIN - 1, TOTAL);
  const width = X0 * 2 + TOTAL * COL - (COL - BOX);

  return (
    <DemoFrame
      title="drop a packet over UDP"
      controls={
        <>
          <DemoButton
            disabled={dropArmed}
            onClick={() => {
              dropRef.current = true;
              setDropArmed(true);
            }}
          >
            {dropArmed ? "Doomed..." : "Drop next packet"}
          </DemoButton>
          <DemoButton pressed={lossy} aria-pressed={lossy} onClick={() => setLossy((v) => !v)}>
            10% loss: {lossy ? "on" : "off"}
          </DemoButton>
        </>
      }
    >
      <svg viewBox={`0 0 ${width} 240`} shapeRendering="crispEdges" className="mx-auto block h-auto w-full max-w-[600px] select-none" aria-label="Sliding window transfer">
        <text x={X0} y={SEND_Y - 12} fontSize="8" className="fill-gb-3 font-display">SENDER</text>
        <text x={X0} y={RECV_Y + BOX + 18} fontSize="8" className="fill-gb-3 font-display">RECEIVER</text>
        <text x={width - X0} y={SEND_Y - 10} textAnchor="end" fontSize="9" className="fill-gb-3 font-display">
          window [{Math.min(s.base, TOTAL)}-{hi}]
        </text>
        <motion.rect
          initial={false}
          animate={{ x: colX(Math.min(s.base, TOTAL)) - 5, width: (hi - Math.min(s.base, TOTAL) + 1) * COL - (COL - BOX) + 10 }}
          transition={{ duration: 0.12, ease: "linear" }}
          y={SEND_Y - 5}
          height={BOX + 20}
          fill="none"
          className="stroke-gb-hi"
          strokeWidth="3"
        />
        {Array.from({ length: TOTAL }, (_, i) => {
          const seq = i + 1;
          const p = s.pk[seq];
          const x = colX(seq);
          const state = !p ? "idle" : p.acked ? "acked" : "flight";
          const frac = p && !p.acked ? Math.max(0, (p.deadline - s.t) / p.span) : 0;
          const got = seq <= s.delivered ? "done" : s.recv[seq] ? "buffered" : "empty";
          return (
            <g key={seq}>
              <rect x={x} y={SEND_Y} width={BOX} height={BOX} className={`stroke-gb-3 ${{ idle: "fill-gb-0", flight: "fill-gb-1", acked: "fill-gb-3" }[state]}`} strokeWidth="2" />
              <text x={x + BOX / 2} y={SEND_Y + BOX / 2 + 1} textAnchor="middle" dominantBaseline="middle" fontSize="10" className={`font-display ${state === "acked" ? "fill-gb-0" : "fill-gb-3"}`}>
                {seq}
              </text>
              {frac > 0 && <rect x={x} y={SEND_Y + BOX + 4} width={Math.ceil(stepped(frac, 8) * BOX)} height="4" className={p.tries > 1 ? "fill-gb-hi" : "fill-gb-2"} />}
              {p?.tries > 1 && !p.acked && (
                <text x={x + BOX / 2} y={SEND_Y + BOX + 21} textAnchor="middle" fontSize="8" className="fill-gb-hi font-display">
                  x{2 ** (p.tries - 1)}
                </text>
              )}
              <rect
                x={x}
                y={RECV_Y}
                width={BOX}
                height={BOX}
                className={{ done: "fill-gb-3 stroke-gb-3", buffered: "fill-gb-1 stroke-gb-3", empty: "fill-gb-0 stroke-gb-2" }[got]}
                strokeWidth="2"
                strokeDasharray={got === "empty" ? "3 3" : undefined}
              />
              <text x={x + BOX / 2} y={RECV_Y + BOX / 2 + 1} textAnchor="middle" dominantBaseline="middle" fontSize="10" className={`font-display ${{ done: "fill-gb-0", buffered: "fill-gb-3", empty: "fill-gb-2" }[got]}`}>
                {seq}
              </text>
            </g>
          );
        })}
        {s.flights.map((f) => {
          const age = s.t - f.at;
          const x = colX(f.seq) + BOX / 2;
          const from = f.kind === "data" ? SEND_Y + BOX + 8 : RECV_Y - 8;
          const to = f.kind === "data" ? RECV_Y - 8 : SEND_Y + BOX + 8;
          const p = stepped(Math.min(age, f.drop ? TRAVEL / 2 : TRAVEL) / TRAVEL, 10);
          const fall = f.lost ? stepped((age - TRAVEL / 2) / 600, 4) : 0;
          const y = Math.round(from + (to - from) * p + fall * 40);
          if (f.kind === "ack") {
            return (
              <g key={f.id}>
                <rect x={x - 14} y={y - 8} width="28" height="16" className="fill-gb-3" />
                <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle" fontSize="8" className="fill-gb-0 font-display">ACK</text>
              </g>
            );
          }
          return (
            <g key={f.id} opacity={1 - fall}>
              <rect x={x - 10 + fall * 12} y={y - 8} width="20" height="16" className={f.lost ? "fill-gb-hi" : "fill-gb-2"} />
              <text x={x + fall * 12} y={y + 1} textAnchor="middle" dominantBaseline="middle" fontSize="8" className="fill-gb-0 font-display">{f.lost ? "X" : f.seq}</text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        <Stat label="SENT">{s.sent}</Stat>
        <Stat label="RETX">{s.retx}</Stat>
        <Stat label="DELIVERED">{s.delivered}</Stat>
      </div>
      <p className="mt-2 font-sans text-[16px] leading-tight" aria-live="polite">{s.status}</p>
    </DemoFrame>
  );
}
