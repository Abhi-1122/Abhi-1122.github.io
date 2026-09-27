"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { DemoFrame, DemoButton } from "./DemoFrame";

// Mirrors Abhi-1122/buy_sell-IIITH: categories from pages/Sell.jsx, GET /item's find(), the
// /verify-token cookie check, POST /cart/place-order, POST /otp (buyer gets the OTP) and
// POST /otp/:id (seller enters it, bcrypt.compare against order.hashedOTP).

const px = (s) => s.split("|").map((r, y) => [...r].map((c, x) => (c === "#" ? `M${x} ${y}h1v1h-1z` : "")).join("")).join("");

const ITEMS = [
  { id: 1, title: "Casio fx-991ES", price: 650, category: "Electronics", icon: px(".######.|.#....#.|.######.|.#.##.#.|.######.|.#.##.#.|.######.|........") },
  { id: 2, title: "CLRS 3rd ed.", price: 450, category: "Books", icon: px(".######.|.#....##|.#.##.##|.#....##|.#.##.##|.#....##|.######.|..#####.") },
  { id: 3, title: "Maggi 12-pack", price: 168, category: "Food", icon: px("..#.#...|...#.#..|########|#......#|.#....#.|.#....#.|..####..|........") },
  { id: 4, title: "Drafter + A2 sheets", price: 300, category: "Stationary", icon: px("......##|.....###|....###.|...###..|..###...|.###....|##......|#.......") },
  { id: 5, title: "Felicity hoodie", price: 500, category: "Fashion", icon: px("..#..#..|###..###|########|#.####.#|..####..|..####..|..####..|........") },
  { id: 6, title: "Study lamp", price: 250, category: "Home", icon: px("..####..|.######.|########|...##...|...##...|...##...|..####..|.######.") },
  { id: 7, title: "Badminton racket", price: 700, category: "Sports", icon: px("..###...|.#.#.#..|#.#.#.#.|.#.#.#..|..###...|...#....|....#...|.....##.") },
  { id: 8, title: "Headphones", price: 899, category: "Electronics", icon: px("..####..|.#....#.|#......#|#......#|##....##|##....##|##....##|........") },
];
const CATS = [...new Set(ITEMS.map((i) => i.category))];
const USERS = {
  buyer: { name: "Asha", email: "asha@students.iiit.ac.in", id: "65f1c2a9e4b0a1d2c3f40a11" },
  seller: { name: "Ravi", email: "ravi@students.iiit.ac.in", id: "65f1c2a9e4b0a1d2c3f40b22" },
};
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const BCRYPT = "./ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const rand = (n, chars) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
const b64url = (o) => btoa(JSON.stringify(o)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
const STEP = (t) => Math.floor(t * 4) / 4;

// digits in the display face so numbers stay legible inside prose
const nums = (s) => String(s).split(/(\d+)/).map((p, i) => (i % 2 ? <span key={i} className="font-display text-[0.7em]">{p}</span> : p));

// true for a moment after `value` changes (skipping mount): stepped on/off highlight
function useFlash(value) {
  const [on, setOn] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setOn(true);
    const t = setTimeout(() => setOn(false), 700);
    return () => clearTimeout(t);
  }, [value]);
  return on;
}

function Flash({ value, className = "", children }) {
  const on = useFlash(value);
  return <div className={`${className} ${on ? "bg-gb-hi !text-gb-0" : ""}`}>{children}</div>;
}

function Icon({ d, size = 24 }) {
  return (
    <svg viewBox="0 0 8 8" width={size} height={size} shapeRendering="crispEdges" aria-hidden="true" className="flex-shrink-0">
      <path d={d} className="fill-gb-3" />
    </svg>
  );
}

function Stamp({ children, className = "items-center justify-center" }) {
  const reduced = useReducedMotion();
  return (
    <div className={`pointer-events-none absolute inset-0 flex p-2 ${className}`}>
      <motion.div
        initial={reduced ? false : { scale: 2.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.32, ease: STEP }}
        style={{ rotate: -8 }}
        className="border-4 border-gb-hi bg-gb-0 px-2 py-1.5 font-display text-[12px] leading-none text-gb-hi"
      >
        {children}
      </motion.div>
    </div>
  );
}

const Rs = ({ v, className = "" }) => (
  <span className={`whitespace-nowrap font-display ${className}`}>
    <span className="font-sans text-[1.4em] leading-none">₹</span>
    {v}
  </span>
);
const Label = ({ children, className = "" }) => <div className={`mb-1 font-display text-[8px] ${className}`}>{children}</div>;
const Box = ({ className = "", children }) => <div className={`border-2 border-gb-3 bg-gb-0 px-2 py-1.5 ${className}`}>{children}</div>;

export default function MarketDemo({ sound }) {
  const [tab, setTab] = useState("browse");
  const [q, setQ] = useState("");
  const [cats, setCats] = useState([]);
  const [sort, setSort] = useState(0);
  const [pick, setPick] = useState(1);
  const [session, setSession] = useState(null);
  const [tamper, setTamper] = useState(false);
  const [resp, setResp] = useState(null);
  const [order, setOrder] = useState(null);
  const [entry, setEntry] = useState("");

  const needle = q.trim().toLowerCase();
  const match = (it) => it.id !== order?.item && (!needle || it.title.toLowerCase().includes(needle)) && (!cats.length || cats.includes(it.category));
  const hits = ITEMS.filter(match).sort((a, b) => sort * (a.price - b.price));
  const shown = [...hits, ...ITEMS.filter((i) => !match(i))];
  const item = ITEMS.find((i) => i.id === (order?.item ?? pick));
  const stages = [
    ["$match", "stock: true, sellerID: {$ne: me}", "GET /item"],
    ["$match", needle && `title: {$regex: /${needle.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}/i}`, "type to add"],
    ["$match", cats.length > 0 && `category: {$in: [${cats.map((c) => `"${c}"`).join(", ")}]}`, "tap a category"],
    ["$sort", sort !== 0 && `price: ${sort}`, "tap ₹ sort"],
  ];

  function login(who) {
    const u = USERS[who];
    const iat = Math.floor(Date.now() / 1000);
    setSession({ who, iat, header: b64url({ alg: "HS256", typ: "JWT" }), payload: b64url({ email: u.email, id: u.id, iat }), sig: rand(43, B64) });
    setTamper(false);
    setResp(null);
    sound?.playClick?.();
  }

  function verify() {
    const [code, msg] = !session ? [403, "Access Denied"] : tamper ? [403, "Invalid Token"] : [200, "Valid Token"];
    setResp((r) => ({ n: (r?.n ?? 0) + 1, code, msg }));
    code === 200 ? sound?.playChime?.() : sound?.playBonk?.();
  }

  function placeOrder() {
    setOrder({ id: "66a0" + rand(20, "0123456789abcdef"), item: pick, status: "pending", hash: null, otp: null, msg: "Order placed successfully!", n: 0 });
    setEntry("");
    sound?.playClick?.();
  }

  function getOtp() {
    // crypto.randomInt(100000, 999999), then bcrypt.hash(otp, genSalt(10)) stored on the order
    const otp = String(100000 + Math.floor(Math.random() * 899999));
    setOrder((o) => ({ ...o, otp, hash: "$2b$10$" + rand(53, BCRYPT), msg: null }));
    setEntry("");
    sound?.playChime?.();
  }

  function deliver(e) {
    e.preventDefault();
    if (entry === order.otp) {
      setOrder((o) => ({ ...o, status: "closed", msg: "OTP verified. Item Delivered Successfully :)", ok: true }));
      sound?.playCoin?.();
    } else {
      setOrder((o) => ({ ...o, msg: "Invalid OTP! Please Try Again", ok: false, n: o.n + 1 }));
      sound?.playBonk?.();
    }
  }

  const step = !order ? 0 : !order.hash ? 1 : order.status === "closed" ? 3 : 2;
  const tokenParts = session && [
    ["HEADER", session.header, "text-gb-2", "border-gb-2"],
    ["PAYLOAD", session.payload, "text-gb-hi", "border-gb-hi"],
    ["SIGNATURE", tamper ? "tAmPeR" + session.sig.slice(6) : session.sig, "text-gb-3", "border-gb-3"],
  ];

  return (
    <DemoFrame
      title="buy & sell on campus"
      controls={["browse", "auth", "order"].map((t, i) => (
        <DemoButton
          key={t}
          pressed={tab === t}
          aria-pressed={tab === t}
          onClick={() => {
            setTab(t);
            sound?.playClick?.();
          }}
        >
          {i + 1} {t}
        </DemoButton>
      ))}
    >
      <div className="flex flex-col gap-3 sm:min-h-[330px] sm:flex-row">
        {tab === "browse" && (
          <>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex gap-2">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  placeholder="Search by title"
                  aria-label="Search by title"
                  spellCheck={false}
                  className="min-w-0 flex-1 border-2 border-gb-3 bg-gb-0 px-2 py-1 font-sans text-[15px] text-gb-3 outline-none placeholder:text-gb-2 focus-visible:border-gb-hi"
                />
                <DemoButton pressed={sort !== 0} aria-label="Sort by price" onClick={() => setSort((s) => (s === 0 ? 1 : s === 1 ? -1 : 0))}>
                  <span className="font-sans text-[12px]">₹</span> {sort === 1 ? "ASC" : sort === -1 ? "DESC" : "SORT"}
                </DemoButton>
              </div>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Categories">
                {CATS.map((c) => {
                  const on = cats.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setCats((cs) => (on ? cs.filter((x) => x !== c) : [...cs, c]))}
                      className={`border-2 border-gb-3 px-1.5 py-1 font-display text-[7px] leading-none ${on ? "bg-gb-3 text-gb-0" : "hover:bg-gb-1"}`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-1.5 min-[520px]:grid-cols-4">
                {shown.map((it) => {
                  const ok = match(it);
                  const sold = it.id === order?.item;
                  return (
                    <button
                      key={it.id}
                      type="button"
                      disabled={!ok}
                      aria-pressed={pick === it.id}
                      onClick={() => {
                        setPick(it.id);
                        sound?.playClick?.();
                      }}
                      className={`flex min-w-0 flex-col items-start gap-1 border-2 p-1.5 text-left ${pick === it.id && !order ? "border-gb-hi bg-gb-1" : "border-gb-3 bg-gb-0 hover:bg-gb-1"} ${ok ? "" : "opacity-30"}`}
                    >
                      <div className="flex w-full items-center justify-between gap-1">
                        <Icon d={it.icon} />
                        <Rs v={it.price} className="text-[9px]" />
                      </div>
                      <span className="w-full truncate font-sans text-[13px] leading-tight">{it.title}</span>
                      <span className="font-display text-[6px] text-gb-2">{sold ? "SOLD (stock: false)" : it.category}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[13px] leading-snug">
                <span className="font-display text-[9px]">{hits.length}/{ITEMS.length}</span> match. Pick an item, then log in and order it.
              </p>
            </div>
            <div className="flex w-full flex-col gap-1.5 sm:w-60 sm:flex-shrink-0" aria-live="polite">
              <Label>db.items.aggregate([</Label>
              {stages.map(([op, body, hint], i) => (
                <Flash key={i} value={body} className={`border-2 px-2 py-1 ${body ? "border-gb-3" : "border-dashed border-gb-2 text-gb-2"}`}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-display text-[8px]">{op}</span>
                    {i === 0 && <span className="text-[12px]">{hint}</span>}
                  </div>
                  <div className="break-words font-sans text-[13px] leading-tight">{body ? nums(body) : hint}</div>
                </Flash>
              ))}
              <Label className="mb-0">]) <span className="font-sans text-[12px]">→</span> {hits.length} docs</Label>
              <p className="text-[12px] leading-snug text-gb-2">Repo: Item.find() on the server, title/category filtered in React. Shown here as the equivalent pipeline.</p>
            </div>
          </>
        )}

        {tab === "auth" && (
          <>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                {Object.keys(USERS).map((who) => (
                  <DemoButton key={who} pressed={session?.who === who} aria-pressed={session?.who === who} onClick={() => login(who)}>
                    Login {who}
                  </DemoButton>
                ))}
                <DemoButton
                  disabled={!session}
                  onClick={() => {
                    setSession(null);
                    setResp(null);
                  }}
                >
                  Logout
                </DemoButton>
              </div>
              <p className="text-[13px] leading-snug">
                POST /auth/login: bcrypt.compare(password, user.password), then jwt.sign({"{"}email, id{"}"}) into the token cookie. Also /auth/register (reCAPTCHA + bcrypt hash) and /auth/cas (IIIT SSO).
              </p>
              <Box className="min-h-[52px] break-all font-sans text-[13px] leading-tight">
                <Label>COOKIE token=</Label>
                {session ? tokenParts.map(([k, v, c], i) => (
                      <span key={k} className={c}>
                        {i > 0 && <span className="text-gb-3">.</span>}
                        {k === "SIGNATURE" && tamper ? (
                          <>
                            <span className="bg-gb-hi text-gb-0">{v.slice(0, 6)}</span>
                            {v.slice(6)}
                          </>
                        ) : (
                          v
                        )}
                      </span>
                    )) : <span className="text-gb-2">(none, logged out)</span>}
              </Box>
              {session && (
                <div className="grid gap-1.5 min-[520px]:grid-cols-3">
                  <Box className={`border-gb-2 text-[13px] leading-tight`}>
                    <Label className="text-gb-2">HEADER</Label>
                    alg: &quot;HS256&quot;<br />typ: &quot;JWT&quot;
                  </Box>
                  <Box className="border-gb-hi text-[13px] leading-tight">
                    <Label className="text-gb-hi">PAYLOAD</Label>
                    <div className="break-all">email: {USERS[session.who].email}</div>
                    <div className="break-all">id: {nums(USERS[session.who].id.slice(0, 8))}…</div>
                    <div>iat: {nums(session.iat)}</div>
                    <div className="mt-1 text-[12px] text-gb-2">No role or exp claim: one account buys and sells; the order&apos;s buyerID/sellerID decides who is who.</div>
                  </Box>
                  <Flash value={tamper} className="border-2 border-gb-3 bg-gb-0 px-2 py-1.5 text-[13px] leading-tight">
                    <Label>SIGNATURE</Label>
                    HMACSHA256(header.payload, JWT_SECRET)
                    {tamper && <div className="mt-1 text-gb-hi">edited: no longer matches</div>}
                  </Flash>
                </div>
              )}
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-60 sm:flex-shrink-0">
              <Box>
                <Label>PROTECTED ROUTE</Label>
                <div className="font-sans text-[15px]">GET /verify-token</div>
                <div className="text-[12px] text-gb-2">{session ? `as ${USERS[session.who].name}` : "no cookie"}</div>
              </Box>
              <div className="flex flex-wrap gap-2">
                <DemoButton onClick={verify}>Send</DemoButton>
                <DemoButton disabled={!session} pressed={tamper} aria-pressed={tamper} onClick={() => setTamper((t) => !t)}>
                  Tamper sig
                </DemoButton>
              </div>
              <div className="relative min-h-[96px] border-2 border-gb-3 bg-gb-0 px-2 py-1.5" aria-live="polite">
                <Label>RESPONSE</Label>
                {resp ? (
                  <>
                    <div className="font-display text-[20px] leading-none">{resp.code}</div>
                    <div className="mt-1 font-sans text-[14px]">{`{ message: "${resp.msg}" }`}</div>
                    <Stamp key={resp.n} className="items-start justify-end pt-4">{resp.code === 200 ? "OK" : "BLOCKED"}</Stamp>
                  </>
                ) : (
                  <div className="text-[13px] text-gb-2">Send a request.</div>
                )}
              </div>
              <p className="text-[12px] leading-snug text-gb-2">On 403, Protected.jsx redirects to /login.</p>
            </div>
          </>
        )}

        {tab === "order" && (
          <>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Box className="flex items-center gap-2">
                <Icon d={item.icon} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-sans text-[15px] leading-tight">{item.title}</div>
                  <div className="text-[12px] text-gb-2">{item.category} · buyer Asha · seller Ravi</div>
                </div>
                <Rs v={item.price} className="text-[11px]" />
              </Box>
              <ol className="flex flex-wrap gap-1.5 font-display text-[7px] leading-none">
                {["ORDER", "OTP", "DELIVER"].map((s, i) => (
                  <li key={s} className={`border-2 px-1.5 py-1 ${step === i ? "border-gb-hi bg-gb-hi text-gb-0" : step > i ? "border-gb-3 bg-gb-3 text-gb-0" : "border-gb-2 text-gb-2"}`}>
                    {i + 1} {s}
                  </li>
                ))}
              </ol>
              <div className="grid gap-2 min-[420px]:grid-cols-2">
                <Box className="flex flex-col gap-1.5">
                  <Label className="mb-0">BUYER · ASHA</Label>
                  {step === 0 && (
                    <>
                      <DemoButton className="self-start" onClick={placeOrder}>Place order</DemoButton>
                      <div className="text-[12px] text-gb-2">POST /cart/place-order</div>
                    </>
                  )}
                  {step === 1 && (
                    <>
                      <DemoButton className="self-start" onClick={getOtp}>Get OTP</DemoButton>
                      <div className="text-[12px] text-gb-2">POST /otp {"{"}orderId{"}"}: the OTP comes back to the buyer only.</div>
                    </>
                  )}
                  {step >= 2 && (
                    <>
                      <div className="font-display text-[18px] leading-none tracking-wider" aria-label={`OTP ${order.otp}`}>{order.otp}</div>
                      <div className="text-[12px] leading-snug text-gb-2">{step === 2 ? "Say it to Ravi at handover." : "Handed over. Order closed."}</div>
                      {step === 2 && (
                        <DemoButton className="self-start" onClick={getOtp}>New OTP</DemoButton>
                      )}
                    </>
                  )}
                </Box>
                <Box className="relative flex flex-col gap-1.5">
                  <Label className="mb-0">SELLER · RAVI</Label>
                  <form onSubmit={deliver} className="flex gap-1.5">
                    <input
                      value={entry}
                      onChange={(e) => setEntry(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      onKeyDown={(e) => e.stopPropagation()}
                      disabled={step !== 2}
                      inputMode="numeric"
                      placeholder="OTP"
                      aria-label="Enter OTP"
                      className="w-0 min-w-0 flex-1 border-2 border-gb-3 bg-gb-0 px-1.5 py-1 font-display text-[10px] text-gb-3 outline-none placeholder:text-gb-2 focus-visible:border-gb-hi disabled:opacity-50"
                    />
                    <DemoButton type="submit" disabled={step !== 2 || entry.length !== 6}>Deliver</DemoButton>
                  </form>
                  <div className="text-[12px] text-gb-2">/deliver/:id → POST /otp/:id, bcrypt.compare(otp, hashedOTP)</div>
                  {order?.msg && order.ok !== undefined && (
                    <Flash value={order.n} className={`px-1 text-[13px] leading-tight ${order.ok ? "" : "text-gb-hi"}`}>
                      {order.msg}
                    </Flash>
                  )}
                  {step < 2 && <div className="text-[13px] text-gb-2">Waiting for the buyer&apos;s OTP.</div>}
                  {step === 3 && <Stamp>DELIVERED</Stamp>}
                </Box>
              </div>
              {step === 3 && (
                <DemoButton
                  className="self-start"
                  onClick={() => {
                    setOrder(null);
                    setEntry("");
                  }}
                >
                  New order
                </DemoButton>
              )}
            </div>
            <div className="flex w-full flex-col gap-1.5 sm:w-60 sm:flex-shrink-0" aria-live="polite">
              <Label>db.orders</Label>
              {order ? (
                <Box className="flex flex-col gap-0.5 font-sans text-[13px] leading-tight">
                  <div className="break-all">_id: {nums(order.id.slice(0, 10))}…</div>
                  <div>buyerID: Asha · sellerID: Ravi</div>
                  <div>amount: <Rs v={item.price} className="text-[9px]" /></div>
                  <Flash value={order.status} className="-mx-1 px-1">status: &quot;{order.status}&quot;</Flash>
                  <Flash value={order.hash} className="-mx-1 break-all px-1">hashedOTP: {order.hash ? nums(order.hash.slice(0, 7)).concat(order.hash.slice(7, 29) + "…") : "null"}</Flash>
                  <div className="mt-1 text-gb-2">item.stock: false</div>
                </Box>
              ) : (
                <Box className="text-[13px] text-gb-2">No order yet.</Box>
              )}
              <p className="text-[12px] leading-snug">
                The server keeps only the bcrypt hash of the OTP (and of every password), so even the seller&apos;s view of the order can&apos;t reveal it. Only the buyer&apos;s copy can close the order.
              </p>
            </div>
          </>
        )}
      </div>
      <p className="mt-2 text-[12px] text-gb-2">Simulated in your browser: no server, so the token signature, bcrypt hash and OTP are made up locally.</p>
    </DemoFrame>
  );
}
