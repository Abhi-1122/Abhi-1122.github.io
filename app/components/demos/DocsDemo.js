"use client";
import { useRef, useState } from "react";
import { useElementWidth } from "../../hooks/useElementWidth";
import { DemoFrame, DemoButton, stepped, useSimLoop } from "./DemoFrame";

// Docs++ (DocsCLI) in miniature. Op names, request flow and error codes follow the repo's C source
// (name_server/ns_client.c, ns_file_ops.c, ns_trie.c, client/client_commands.c); the network is simulated.

const HOP = 480;
const TRIE_TICK = 95;
const CACHE_SLOTS = 2; // real CACHE_SIZE is 100; shrunk so evictions show
const USERS = ["alice", "bob"];
const FILES = ["alice.txt", "bob.txt", "shared.txt", "new.txt"];
const LEVEL = ["no access", "READ", "WRITE"]; // ACCESS_NONE / ACCESS_READ / ACCESS_WRITE
const ERR = { 1: "File not found", 2: "Permission denied", 3: "File already exists" };
const WRITE_WORDS = ["and", "bob", "say", "hi"];

// Two topology layouts: wide (desktop, everything in a row) and tall (phones, SS row underneath).
function makeLayout(sx, g, ns, cs) {
  const R = { "C-NS": g.ctrlRoute };
  [1, 2, 3].forEach((n) => {
    R[`NS-S${n}`] = ns(sx[n - 1]);
    R[`C-S${n}`] = cs(sx[n - 1]);
  });
  return { ...g, SX: { S1: sx[0], S2: sx[1], S3: sx[2] }, R };
}
const WIDE = makeLayout(
  [196, 326, 456],
  { W: 520, H: 168, maxW: 760, C: { x: 8, y: 10, w: 88, h: 130 }, NS: { x: 214, y: 10, w: 140, h: 44 }, deny: { x: 364, y: 10, w: 92, h: 44 }, ssY: 92, ssW: 110, ctrlRoute: [[96, 32], [214, 32]], ctrlLabel: [155, 23, 48], dataLabel: [122, 166, "DATA PATH · CLIENT TO STORAGE, DIRECT"], icon: true },
  (x) => [[284, 54], [284, 74], [x, 74], [x, 92]],
  (x) => [[96, 128], [114, 128], [114, 152], [x, 152], [x, 138]]
);
const TALL = makeLayout(
  [56, 175, 294],
  { W: 350, H: 202, maxW: 440, C: { x: 6, y: 8, w: 94, h: 96 }, NS: { x: 196, y: 8, w: 144, h: 44 }, deny: { x: 108, y: 52, w: 82, h: 40 }, ssY: 130, ssW: 100, ctrlRoute: [[100, 30], [196, 30]], ctrlLabel: [148, 22, 44], dataLabel: [108, 110, "DATA PATH · DIRECT"], icon: false },
  (x) => [[340, 30], [346, 30], [346, 194], [x, 194], [x, 176]],
  (x) => [[53, 104], [53, 117], [x, 117], [x, 130]]
);
const pts = (p) => p.map((q) => q.join(",")).join(" ");

function along(p, t) {
  const seg = p.slice(1).map((q, i) => Math.abs(q[0] - p[i][0]) + Math.abs(q[1] - p[i][1]));
  let d = t * seg.reduce((a, b) => a + b, 0);
  for (let i = 0; i < seg.length; i++) {
    if (d <= seg[i]) {
      const f = seg[i] ? d / seg[i] : 0;
      return [Math.round(p[i][0] + (p[i + 1][0] - p[i][0]) * f), Math.round(p[i][1] + (p[i + 1][1] - p[i][1]) * f)];
    }
    d -= seg[i];
  }
  return p[p.length - 1];
}

const stem = (n) => n.replace(/\.txt$/, "");
const text = (words) => words.join(" ").replace(/ ([.!?])/g, "$1");

// Trie over file stems (the ".txt" tail is drawn as one chip); rows laid out like a directory tree.
function buildTrie(names) {
  const root = { ch: "", kids: [], depth: 0 };
  for (const n of names) {
    let cur = root;
    for (const ch of stem(n)) {
      let k = cur.kids.find((x) => x.ch === ch);
      if (!k) cur.kids.push((k = { ch, kids: [], depth: cur.depth + 1 }));
      cur = k;
    }
    cur.end = n;
  }
  let rows = 0;
  const nodes = [];
  (function place(nd) {
    nd.kids.sort((a, b) => (a.ch < b.ch ? -1 : 1));
    if (!nd.kids.length) nd.row = rows++;
    nd.kids.forEach(place);
    if (nd.kids.length) nd.row = nd.kids[0].row;
    nodes.push(nd);
  })(root);
  return { root, nodes, rows };
}

function freshSim() {
  return {
    t: 0,
    rr: 0, // round-robin cursor: next CREATE lands on SS1
    files: {
      "alice.txt": { ss: 1, owner: "alice", acl: {}, words: ["Alice's", "private", "notes", "."] },
      "bob.txt": { ss: 2, owner: "bob", acl: {}, words: ["Bob's", "secret", "plan", "."] },
      "shared.txt": { ss: 3, owner: "alice", acl: { bob: 1 }, words: ["Team", "meeting", "at", "noon", "."] },
    },
    cache: [],
    badge: null,
    trie: null,
    deny: false,
    run: null,
    say: "Pick a file and a command. The client always asks the Name Server first.",
    out: { cmd: "alice@nfs> _", text: "", err: false },
    writes: 0,
  };
}

const canAccess = (f, u, perm) => f.owner === u || (f.acl[u] || 0) >= perm;
const levelOf = (f, u) => (!f ? "NEW" : f.owner === u ? "OWNER" : ["NONE", "READ", "WRITE"][f.acl[u] || 0]);

export default function DocsDemo({ sound }) {
  const sim = useRef(null);
  if (!sim.current) sim.current = freshSim();
  const s = sim.current;
  const [user, setUser] = useState("alice");
  const [file, setFile] = useState("shared.txt");
  const [heroRef, heroW] = useElementWidth();
  const g = heroW && heroW < 540 ? TALL : WIDE;
  const route = (a, b) => g.R[`${a}-${b}`] || [...g.R[`${b}-${a}`]].reverse();

  const reduced = useSimLoop((dt) => {
    s.t += dt;
    const r = s.run;
    if (!r) return;
    const st = r.steps[r.i];
    if (s.t - r.at < st.dur) return;
    st.done?.();
    r.i++;
    r.at = s.t;
    if (r.i >= r.steps.length) s.run = null;
    else enter(r.steps[r.i]);
  });

  function enter(st) {
    if (st.say) s.say = st.say;
    if (st.trie) s.trie = { name: st.trie, at: s.t, dur: st.dur };
    st.enter?.();
  }

  const fail = (code) => {
    s.out.text = `ERROR: ${ERR[code]}`;
    s.out.err = true;
    sound?.playBonk?.();
  };
  const ok = (msg) => {
    s.out.text = msg;
    sound?.playCoin?.();
  };
  const hop = (from, to, label, extra) => ({ dur: HOP, pkt: [from, to, label], ...extra });
  const wait = (dur, extra) => ({ dur, ...extra });

  // get_ss_for_file(): cache_get first, trie_search on a miss, then cache_put.
  function resolve(name, useCache = true) {
    const f = s.files[name];
    if (useCache && s.cache.includes(name)) {
      return [
        wait(700, {
          say: `Cache HIT: the Name Server already knows ${name} is on SS${f.ss}, so it skips the trie.`,
          enter: () => {
            s.badge = "HIT";
            s.trie = null;
            s.cache = [name, ...s.cache.filter((n) => n !== name)];
          },
        }),
      ];
    }
    const steps = [
      wait(TRIE_TICK * (stem(name).length + 2), {
        trie: name,
        say: f
          ? `${useCache ? "Cache MISS, so the" : "The"} Name Server walks its trie letter by letter to find ${name}.`
          : `The Name Server walks its trie for ${name}, but the path runs out: no such file.`,
        enter: () => (s.badge = useCache ? "MISS" : null),
      }),
    ];
    if (f && useCache) steps.push(wait(380, { say: `Found it on SS${f.ss}. The answer goes into the cache for next time.`, enter: () => (s.cache = [name, ...s.cache.filter((n) => n !== name)].slice(0, CACHE_SLOTS)) }));
    return steps;
  }

  // READ / WRITE / STREAM: NS checks access and returns the SS address, then data goes client <-> SS directly.
  function dataOp(name, nsOp, perm, ssSteps) {
    const f = s.files[name];
    const steps = [hop("C", "NS", nsOp, { say: `The client asks the Name Server where ${name} lives.` }), ...resolve(name)];
    if (!f) return [...steps, hop("NS", "C", "ERR 1", { done: () => fail(1) })];
    if (!canAccess(f, user, perm)) {
      const has = LEVEL[f.acl[user] || 0];
      return [
        ...steps,
        wait(800, { say: `${user} has ${has} on ${name} but this needs ${LEVEL[perm]}, so the Name Server refuses.`, enter: () => (s.deny = true) }),
        hop("NS", "C", "ERR 2", { done: () => fail(2) }),
      ];
    }
    return [
      ...steps,
      hop("NS", "C", nsOp === "ACQUIRE_LOCK" ? `LOCK+SS${f.ss}` : `SS${f.ss}:900${f.ss}`, { say: `Access OK. The Name Server replies with an address: SS${f.ss}, port 900${f.ss}.` }),
      ...ssSteps(`S${f.ss}`, f).map((st) => ({ data: true, ...st })),
    ];
  }

  function build(cmd, name) {
    const f = s.files[name];
    if (cmd === "READ")
      return dataOp(name, "READ", 1, (S, f) => [
        hop("C", S, "READ", { say: `Now the client talks to SS${f.ss} directly. The Name Server is bypassed for the data.` }),
        hop(S, "C", "TEXT", { done: () => ok(text(f.words)) }),
      ]);
    if (cmd === "STREAM")
      return dataOp(name, "STREAM", 1, (S, f) => [
        hop("C", S, "STREAM", { say: `Straight to SS${f.ss}. It streams the file back one word at a time.` }),
        ...f.words.map((w) => hop(S, "C", w, { dur: 400, done: () => (s.out.text += `${w} `) })),
        hop(S, "C", "STOP", { dur: 400, done: () => ok(text(s.out.text.trim().split(" "))) }),
      ]);
    if (cmd === "WRITE") {
      const word = WRITE_WORDS[s.writes % WRITE_WORDS.length];
      return dataOp(name, "ACQUIRE_LOCK", 2, (S, f) => {
        const idx = Math.max(0, f.words.length - 1);
        return [
          hop("C", S, `WRITE "${word}"`, { say: `The client sends the edit straight to SS${f.ss}, which holds the sentence lock.` }),
          wait(520, {
            lock: true,
            say: `SS${f.ss} locks sentence 1 and inserts "${word}".`,
            enter: () => {
              f.words = f.words.length ? [...f.words.slice(0, idx), word, ...f.words.slice(idx)] : [word, "."];
              s.writes++;
            },
          }),
          hop(S, "C", "OK", { lock: true, done: () => ok(`Write completed: ${text(f.words)}`) }),
          hop("C", "NS", "RELEASE", { data: false, say: "Done. The client tells the Name Server to release the lock." }),
        ];
      });
    }
    // CREATE: metadata op, the NS itself forwards it to a storage server
    const steps = [hop("C", "NS", "CREATE", { say: `The client asks the Name Server to create ${name}.` }), ...resolve(name, false)];
    if (f) return [...steps, hop("NS", "C", "ERR 3", { say: `${name} is already in the trie.`, done: () => fail(3) })];
    const n = (s.rr % 3) + 1;
    return [
      ...steps,
      wait(TRIE_TICK * (stem(name).length + 2), {
        trie: name,
        say: `The Name Server adds ${name} to its trie and picks SS${n} (round-robin).`,
        enter: () => {
          s.files[name] = { ss: n, owner: user, acl: {}, words: [] };
          s.rr++;
        },
      }),
      hop("NS", `S${n}`, "CREATE", { say: `The Name Server forwards CREATE to SS${n}.` }),
      hop(`S${n}`, "NS", "ACK"),
      hop("NS", "C", "OK", { done: () => ok("File created successfully") }),
    ];
  }

  function run(cmd) {
    if (s.run) return;
    sound?.playClick?.();
    s.out = { cmd: `${user}@nfs> ${cmd} ${file}${cmd === "WRITE" ? " 1" : ""}`, text: "", err: false };
    s.deny = false;
    s.badge = null;
    s.trie = null;
    const steps = build(cmd, file);
    s.run = { steps, i: 0, at: s.t };
    enter(steps[0]);
  }

  // ---------- render ----------
  const cur = s.run?.steps[s.run.i];
  const prog = cur ? Math.min(1, (s.t - s.run.at) / cur.dur) : 0;
  const pkt = cur?.pkt;
  const dataSS = cur?.data ? (pkt?.[0] === "C" ? pkt[1] : pkt?.[0]) : null;
  const active = new Set(pkt ? [pkt[0], pkt[1]] : []);
  const pktPos = pkt && along(route(pkt[0], pkt[1]), reduced ? 1 : stepped(prog, 12));
  const pktW = pkt ? pkt[2].length * 8 + 12 : 0;
  const pktCls = !pkt ? "" : pkt[2].startsWith("ERR") ? "fill-gb-hi" : dataSS ? "fill-gb-3" : "fill-gb-2";
  const controlLive = pkt && (pkt[0] === "NS" || pkt[1] === "NS") && (pkt[0] === "C" || pkt[1] === "C");

  const names = FILES.filter((n) => s.files[n]);
  const trie = buildTrie(names);
  const busy = !!s.run;

  // trie walk highlight
  const path = [];
  let ghost = null;
  let k = 0;
  if (s.trie) {
    let nd = trie.root;
    for (const ch of stem(s.trie.name)) {
      const nx = nd.kids.find((x) => x.ch === ch);
      if (!nx) {
        ghost = { ch, from: nd };
        break;
      }
      path.push(nx);
      nd = nx;
    }
    k = Math.min(path.length + 1, Math.floor(((s.t - s.trie.at) / s.trie.dur) * (path.length + 2)));
  }
  const lit = new Set(path.slice(0, k));
  const CW = 16;
  const RH = 17;
  const tx = (d) => 2 + d * CW;
  const ty = (r) => 2 + r * RH;
  const trieH = ty(trie.rows + (ghost ? 1 : 0)) + 1;

  return (
    <DemoFrame
      title="send a Docs++ request (simulated)"
      controls={
        <>
          <span className="font-display text-[8px]">USER</span>
          {USERS.map((u) => (
            <DemoButton key={u} pressed={user === u} aria-pressed={user === u} onClick={() => { sound?.playToggle?.(); setUser(u); }}>
              {u}
            </DemoButton>
          ))}
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_224px]">
        {/* hero: terminal, topology, narration */}
        <div ref={heroRef} className="flex min-w-0 flex-col gap-2">
          <div className="border-2 border-gb-3 bg-gb-3 px-2.5 py-1.5 text-gb-0" aria-live="polite">
            <div className="truncate font-display text-[8px] leading-relaxed">{s.out.cmd}</div>
            <div className={`min-h-[19px] truncate font-sans text-[15px] leading-tight ${s.out.err ? "text-gb-hi" : ""}`}>{s.out.text || (busy ? "…" : "")}</div>
          </div>

          <svg viewBox={`0 0 ${g.W} ${g.H}`} shapeRendering="crispEdges" className="mx-auto block h-auto w-full select-none" style={{ maxWidth: g.maxW }} role="img" aria-label="Client, Name Server and three Storage Servers">
            {/* NS <-> SS registration links (used by CREATE) */}
            {[1, 2, 3].map((n) => (
              <polyline key={`b${n}`} points={pts(g.R[`NS-S${n}`])} fill="none" className="stroke-gb-1" strokeWidth="2" strokeDasharray="3 3" />
            ))}
            {/* control path */}
            <polyline points={pts(g.R["C-NS"])} fill="none" className={dataSS ? "stroke-gb-1" : "stroke-gb-3"} strokeWidth={controlLive ? 5 : 3} strokeDasharray={dataSS ? "4 4" : undefined} />
            <text x={g.ctrlLabel[0]} y={g.ctrlLabel[1]} textAnchor="middle" fontSize="7" className={`font-display ${dataSS ? "fill-gb-1" : "fill-gb-3"}`}>CONTROL PATH</text>
            <text x={g.ctrlLabel[0]} y={g.ctrlLabel[2]} textAnchor="middle" fontSize="7" className={`font-display ${dataSS ? "fill-gb-1" : "fill-gb-2"}`}>LOOKUP + ACL</text>
            {/* data path lanes */}
            {[1, 2, 3].map((n) => {
              const on = dataSS === `S${n}`;
              return <polyline key={`d${n}`} points={pts(g.R[`C-S${n}`])} fill="none" className={on ? "stroke-gb-3" : "stroke-gb-1"} strokeWidth={on ? 5 : 2} strokeDasharray={on ? undefined : "2 4"} />;
            })}
            <text x={g.dataLabel[0]} y={g.dataLabel[1]} fontSize="7" className={`font-display ${dataSS ? "fill-gb-3" : "fill-gb-2"}`}>{g.dataLabel[2]}</text>

            {/* Name Server */}
            <g opacity={dataSS ? 0.4 : 1}>
              <rect x={g.NS.x} y={g.NS.y} width={g.NS.w} height={g.NS.h} className={`${s.deny ? "fill-gb-hi" : controlLive ? "fill-gb-1" : "fill-gb-0"} stroke-gb-3`} strokeWidth="3" strokeDasharray={dataSS ? "6 4" : undefined} />
              <text x={g.NS.x + g.NS.w / 2} y={g.NS.y + 19} textAnchor="middle" fontSize="9" className={`font-display ${s.deny ? "fill-gb-0" : "fill-gb-3"}`}>NAME SERVER</text>
              {!dataSS && <text x={g.NS.x + g.NS.w / 2} y={g.NS.y + 34} textAnchor="middle" fontSize="8" className={`font-display ${s.deny ? "fill-gb-0" : "fill-gb-2"}`}>:8080</text>}
            </g>
            {dataSS && (
              <g>
                <rect x={g.NS.x + g.NS.w / 2 - 43} y={g.NS.y + 24} width="86" height="16" className="fill-gb-3" />
                <text x={g.NS.x + g.NS.w / 2} y={g.NS.y + 36} textAnchor="middle" fontSize="8" className="fill-gb-0 font-display">BYPASSED</text>
              </g>
            )}
            {s.deny && (
              <g>
                <rect x={g.deny.x} y={g.deny.y} width={g.deny.w} height={g.deny.h} className="fill-gb-hi stroke-gb-3" strokeWidth="3" />
                <text x={g.deny.x + g.deny.w / 2} y={g.deny.y + g.deny.h / 2 - 3} textAnchor="middle" fontSize="9" className="fill-gb-0 font-display">ACCESS</text>
                <text x={g.deny.x + g.deny.w / 2} y={g.deny.y + g.deny.h / 2 + 12} textAnchor="middle" fontSize="9" className="fill-gb-0 font-display">DENIED</text>
              </g>
            )}

            {/* Client */}
            <rect x={g.C.x} y={g.C.y} width={g.C.w} height={g.C.h} className={`${active.has("C") ? "fill-gb-1" : "fill-gb-0"} stroke-gb-3`} strokeWidth="3" />
            <text x={g.C.x + g.C.w / 2} y={g.C.y + 20} textAnchor="middle" fontSize="9" className="fill-gb-3 font-display">CLIENT</text>
            {g.icon && (
              <g>
                <rect x={g.C.x + g.C.w / 2 - 24} y={g.C.y + 36} width="48" height="34" className="fill-gb-3" />
                <rect x={g.C.x + g.C.w / 2 - 20} y={g.C.y + 40} width="40" height="26" className="fill-gb-0" />
                <text x={g.C.x + g.C.w / 2} y={g.C.y + 57} textAnchor="middle" fontSize="8" className="fill-gb-3 font-display">&gt;_</text>
                <rect x={g.C.x + g.C.w / 2 - 8} y={g.C.y + 70} width="16" height="6" className="fill-gb-3" />
              </g>
            )}
            <text x={g.C.x + g.C.w / 2} y={g.C.y + g.C.h - 28} textAnchor="middle" fontSize="15" className="fill-gb-3 font-sans">{user}</text>

            {/* Storage Servers */}
            {[1, 2, 3].map((n) => {
              const id = `S${n}`;
              const x = g.SX[id];
              const y = g.ssY;
              const hot = active.has(id);
              const inv = hot && dataSS === id;
              const held = names.filter((f) => s.files[f].ss === n);
              return (
                <g key={id}>
                  <rect x={x - g.ssW / 2} y={y} width={g.ssW} height="46" className={`${inv ? "fill-gb-3" : hot ? "fill-gb-1" : "fill-gb-0"} stroke-gb-3`} strokeWidth="3" />
                  <text x={x} y={y + 17} textAnchor="middle" fontSize="8" className={`font-display ${inv ? "fill-gb-0" : "fill-gb-3"}`}>
                    SS{n} :900{n}
                  </text>
                  {(held.length ? held : ["(empty)"]).map((f, i, all) => (
                    <text key={f} x={x} y={all.length > 1 ? y + 30 + i * 12 : y + 36} textAnchor="middle" fontSize={all.length > 1 ? 11 : 13} className={`font-sans ${inv ? "fill-gb-0" : held.length ? "fill-gb-3" : "fill-gb-2"}`}>
                      {f}
                    </text>
                  ))}
                  {cur?.lock && dataSS === id && <path d={`M${x + g.ssW / 2 - 15} ${y - 4}v-8h2v-4h8v4h2v8z`} className="fill-gb-hi stroke-gb-3" strokeWidth="1" />}
                </g>
              );
            })}

            {/* packet */}
            {pkt && (
              <g>
                <rect x={pktPos[0] - pktW / 2} y={pktPos[1] - 9} width={pktW} height="18" className={pktCls} stroke="var(--gb-3)" strokeWidth="2" />
                <text x={pktPos[0]} y={pktPos[1] + 4} textAnchor="middle" fontSize="8" className="fill-gb-0 font-display">
                  {pkt[2]}
                </text>
              </g>
            )}
          </svg>

          <p className="min-h-[40px] font-sans text-[15px] leading-snug" aria-live="polite">{s.say}</p>
        </div>

        {/* side: file, commands, NS lookup */}
        <div className="flex flex-col gap-3">
          <div>
            <div className="mb-1.5 font-display text-[8px]">FILE · ACCESS FOR {user.toUpperCase()}</div>
            <div className="grid grid-cols-2 gap-2">
              {FILES.map((n) => {
                const lv = levelOf(s.files[n], user);
                return (
                  <DemoButton key={n} pressed={file === n} aria-pressed={file === n} aria-label={`${n}, ${user}: ${lv === "NEW" ? "not created yet" : lv}`} className="flex flex-col items-center gap-1 !px-1 !py-1.5" onClick={() => { sound?.playToggle?.(); setFile(n); }}>
                    <span>{n}</span>
                    <span className={`px-1 py-0.5 text-[7px] ${lv === "NONE" ? "bg-gb-hi text-gb-0" : lv === "OWNER" ? "bg-gb-3 text-gb-0" : "text-gb-2"}`}>{lv}</span>
                  </DemoButton>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-2 gap-y-2.5">
            {["READ", "WRITE", "STREAM", "CREATE"].map((cmd) => (
              <DemoButton key={cmd} disabled={busy} onClick={() => run(cmd)}>
                {cmd}
              </DemoButton>
            ))}
          </div>

          <div className="border-2 border-gb-3 bg-gb-0 p-2">
            <div className="mb-1.5 flex items-center justify-between gap-1">
              <span className="font-display text-[8px]">NS CACHE</span>
              {s.badge && <span className={`px-1.5 py-1 font-display text-[8px] leading-none text-gb-0 ${s.badge === "HIT" ? "bg-gb-3" : "bg-gb-hi"}`}>{s.badge}</span>}
            </div>
            <div className="mb-2 flex flex-wrap gap-1">
              {Array.from({ length: CACHE_SLOTS }, (_, i) => {
                const n = s.cache[i];
                return (
                  <span key={i} className={`border-2 px-1.5 py-0.5 font-sans text-[13px] leading-tight ${n ? "border-gb-3" : "border-dashed border-gb-1 text-gb-2"} ${n && i === 0 && s.badge === "HIT" ? "bg-gb-1" : ""}`}>
                    {n ? `${stem(n)}→SS${s.files[n].ss}` : "empty"}
                  </span>
                );
              })}
            </div>
            <div className="mb-1 font-display text-[8px]">NS TRIE{s.badge === "HIT" ? <span className="text-gb-2"> · skipped</span> : ""}</div>
            <svg viewBox={`0 0 172 ${trieH}`} shapeRendering="crispEdges" className={`block h-auto w-full max-w-[260px] ${s.badge === "HIT" ? "opacity-40" : ""}`} aria-label="Name Server file trie">
              {trie.nodes.flatMap((nd) =>
                nd.kids.map((kd) => {
                  const cls = lit.has(kd) ? "stroke-gb-3" : "stroke-gb-1";
                  const key = `${nd.depth}${nd.ch}${nd.row}-${kd.ch}${kd.row}`;
                  return kd.row === nd.row ? (
                    <line key={key} x1={tx(nd.depth) + 13} y1={ty(nd.row) + 7} x2={tx(kd.depth)} y2={ty(kd.row) + 7} className={cls} strokeWidth="2" />
                  ) : (
                    <path key={key} d={`M${tx(nd.depth) + 6} ${ty(nd.row) + 14}V${ty(kd.row) + 7}H${tx(kd.depth)}`} fill="none" className={cls} strokeWidth="2" />
                  );
                })
              )}
              {trie.nodes.map((nd) => {
                const on = nd === trie.root ? !!s.trie : lit.has(nd);
                const x = tx(nd.depth);
                const y = ty(nd.row);
                const endOn = nd.end && s.trie?.name === nd.end && k > path.length;
                return (
                  <g key={`${nd.depth}${nd.ch}${nd.row}`}>
                    <rect x={x} y={y} width="13" height="14" className={`${on ? "fill-gb-3" : "fill-gb-0"} stroke-gb-3`} strokeWidth="1" />
                    {nd.ch && (
                      <text x={x + 7} y={y + 11} textAnchor="middle" fontSize="9" className={`font-display ${on ? "fill-gb-0" : "fill-gb-3"}`}>
                        {nd.ch}
                      </text>
                    )}
                    {nd.end && (
                      <g>
                        <line x1={x + 13} y1={y + 7} x2={x + CW} y2={y + 7} className={endOn ? "stroke-gb-3" : "stroke-gb-1"} strokeWidth="2" />
                        <rect x={x + CW} y={y} width="34" height="14" className={`${endOn ? "fill-gb-3" : "fill-gb-0"} stroke-gb-3`} strokeWidth="1" />
                        <text x={x + CW + 17} y={y + 10} textAnchor="middle" fontSize="7" className={`font-display ${endOn ? "fill-gb-0" : "fill-gb-3"}`}>
                          .txt
                        </text>
                        <text x={x + CW + 38} y={y + 10} fontSize="7" className={`font-display ${endOn ? "fill-gb-hi" : "fill-gb-2"}`}>
                          SS{s.files[nd.end].ss}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
              {ghost && k > path.length && (
                <g>
                  <path d={`M${tx(ghost.from.depth) + 6} ${ty(ghost.from.row) + 14}V${ty(trie.rows) + 7}H${tx(ghost.from.depth + 1)}`} fill="none" className="stroke-gb-hi" strokeWidth="2" strokeDasharray="2 2" />
                  <rect x={tx(ghost.from.depth + 1)} y={ty(trie.rows)} width="13" height="14" fill="none" className="stroke-gb-hi" strokeWidth="2" strokeDasharray="2 2" />
                  <text x={tx(ghost.from.depth + 1) + 7} y={ty(trie.rows) + 11} textAnchor="middle" fontSize="9" className="fill-gb-hi font-display">
                    {ghost.ch}
                  </text>
                  <text x={tx(ghost.from.depth + 2) + 2} y={ty(trie.rows) + 10} fontSize="7" className="fill-gb-hi font-display">
                    NOT FOUND
                  </text>
                </g>
              )}
            </svg>
          </div>
        </div>
      </div>
    </DemoFrame>
  );
}
