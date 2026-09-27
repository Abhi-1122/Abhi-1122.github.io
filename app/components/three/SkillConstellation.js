"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { QuadraticBezierLine } from "@react-three/drei";
import Stage from "./Stage";
import { PLASTIC, gradientTexture, paletteColors, themeColors } from "./textures";
import { useGfx } from "../../lib/gfx";
import { SKILLS, TILES } from "../../data/portfolioData";
import { SKILL_GROUP_COLORS, groupSwatch, tilesForSkill } from "../../lib/skills";

// Skill map: a tidy board. The DOM lays out group panels + a cartridge rail (so labels can never
// collide), and an orthographic canvas behind it (1 unit = 1 CSS px) draws the 3D gems, carts and
// link lines at the measured slot positions.

// Chunky low-poly gem per group (unit radius), so groups also differ by shape, not just hue.
const SHAPES = [
  <icosahedronGeometry args={[1, 0]} />,
  <boxGeometry args={[1.3, 1.3, 1.3]} />,
  <octahedronGeometry args={[1.2, 0]} />,
  <dodecahedronGeometry args={[1, 0]} />,
  <cylinderGeometry args={[0.95, 0.95, 1.2, 6]} />,
  <tetrahedronGeometry args={[1.3, 0]} />,
  <coneGeometry args={[1, 1.5, 5]} />,
];

const GROUPS = SKILLS.map((g, gi) => ({
  group: g.group,
  color: SKILL_GROUP_COLORS[g.group],
  shape: gi % SHAPES.length,
  skills: g.items.map((skill) => ({ skill, tiles: tilesForSkill(skill) })),
}));
const ALL = GROUPS.flatMap((g) => g.skills.map((s) => ({ ...s, g })));
const CARTS = TILES.filter((t) => t.category || t.game);
const LEGEND = [1, 3, 8];

// gem radius (px) grows with the number of projects using the skill
const radius = (n) => (n ? 4.5 + 2.4 * Math.sqrt(n) : 3.5);

// What the current hover lights up: skills, carts and the links between them.
function related(hover) {
  if (!hover) return null;
  if (hover.kind === "skill") {
    const s = ALL.find((x) => x.skill === hover.key);
    return { skills: new Set([s.skill]), carts: new Set(s.tiles.map((t) => t.id)), links: s.tiles.map((t) => [s.skill, t.id]) };
  }
  const users = ALL.filter((x) => x.tiles.some((t) => t.id === hover.key));
  return { skills: new Set(users.map((x) => x.skill)), carts: new Set([hover.key]), links: users.map((x) => [x.skill, hover.key]) };
}

function Gem({ p, r, color, shape, dim, active, still }) {
  const ref = useRef();
  useFrame((_, dt) => {
    const m = ref.current;
    const k = r * (active ? 1.12 : 1); // stays inside its slot so it never covers the label
    m.scale.setScalar(m.scale.x + (k - m.scale.x) * Math.min(1, dt * 12));
    if (!still) m.rotation.y += dt * (active ? 1.6 : 0.35);
  });
  return (
    <mesh ref={ref} position={[p[0], p[1], 20]} rotation={[0.45, 0, 0]} scale={r}>
      {SHAPES[shape]}
      <meshPhysicalMaterial {...PLASTIC} flatShading color={color} transparent opacity={dim ? 0.18 : 1} />
    </mesh>
  );
}

function Cart({ p, tile, dim, active, still }) {
  const ref = useRef();
  const map = useMemo(() => gradientTexture(themeColors(tile), 64), [tile]);
  useFrame(({ clock }) => {
    ref.current.rotation.y = still ? 0.35 : 0.35 + Math.sin(clock.elapsedTime * 0.8 + p[1] * 0.05) * 0.25;
    ref.current.scale.setScalar(active ? 1.25 : 1);
  });
  return (
    <mesh ref={ref} position={[p[0], p[1], 20]}>
      <boxGeometry args={[12, 15, 4]} />
      <meshPhysicalMaterial {...PLASTIC} map={map} transparent opacity={dim ? 0.2 : 1} />
    </mesh>
  );
}

function Link({ a, b, color }) {
  const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + Math.min(60, Math.abs(a[0] - b[0]) * 0.15), 10];
  return <QuadraticBezierLine start={[a[0], a[1], 10]} end={[b[0], b[1], 10]} mid={mid} color={color} lineWidth={2} />;
}

function Info({ rel, hover, coarse, palette, className = "" }) {
  let body;
  if (hover?.kind === "skill") {
    const s = ALL.find((x) => x.skill === hover.key);
    body = (
      <>
        <div className="mb-1.5 flex items-center gap-1.5 font-display text-[9px] leading-tight">
          <span className="h-2.5 w-2.5 flex-none border-2 border-gb-3" style={{ background: groupSwatch(s.g.group, palette) }} />
          <span className="truncate">{s.skill.toUpperCase()}</span>
        </div>
        <div className="font-sans text-[12px] leading-snug">
          {s.tiles.length ? s.tiles.map((t) => t.title).join(" · ") : "Toolkit skill: no cartridge yet."}
        </div>
        <div className="mt-1.5 font-display text-[7px] text-gb-2">
          {s.tiles.length} CART{s.tiles.length === 1 ? "" : "S"} · {coarse ? "TAP AGAIN" : "CLICK"} TO FIND ▶
        </div>
      </>
    );
  } else if (hover?.kind === "cart") {
    const t = CARTS.find((x) => x.id === hover.key);
    body = (
      <>
        <div className="mb-1.5 truncate font-display text-[9px] leading-tight">{t.title.toUpperCase()}</div>
        <div className="font-sans text-[13px] leading-snug">{[...rel.skills].join(" · ")}</div>
      </>
    );
  } else {
    body = (
      <>
        <div className="mb-1.5 font-display text-[9px]">SKILL MAP</div>
        <div className="font-sans text-[13px] leading-snug">
          {coarse ? "Tap" : "Hover"} a skill to see which cartridges use it, or a cartridge to see its skills.
        </div>
      </>
    );
  }
  return <div className={`pixel-box overflow-hidden sm:h-[150px] ${className}`} style={{ padding: "8px 10px" }}>{body}</div>;
}

export default function SkillConstellation({ onPickSkill }) {
  const { reducedMotion, palette, coarse } = useGfx();
  const root = useRef();
  const slots = useRef({});
  const [pos, setPos] = useState(null);
  const [hover, setHover] = useState(null);
  const ink = useMemo(() => paletteColors()[3], [palette]);
  const rel = useMemo(() => related(hover), [hover]);
  const slot = (key) => (el) => void (el ? (slots.current[key] = el) : delete slots.current[key]);

  // Measure every slot's centre relative to the board, in scene units (origin at the centre, y up).
  useLayoutEffect(() => {
    const el = root.current;
    const measure = () => {
      const box = el.getBoundingClientRect();
      const W = el.offsetWidth, H = el.offsetHeight;
      const k = box.width / W || 1; // undo any CSS scale on an ancestor
      const next = {};
      for (const [key, s] of Object.entries(slots.current)) {
        const r = s.getBoundingClientRect();
        if (r.width) next[key] = [(r.left + r.width / 2 - box.left) / k - W / 2, H / 2 - (r.top + r.height / 2 - box.top) / k];
      }
      next.wide = W >= 640; // rail sits beside the board → draw link lines
      setPos(next);
    };
    measure();
    document.fonts?.ready.then(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isOn = (kind, key) => hover?.kind === kind && hover.key === key;
  const dimCls = (lit) => (rel && !lit ? "opacity-30" : "");
  const mouse = (e) => e.pointerType === "mouse";
  // touch: first tap previews, second tap picks
  const pick = (skill) => (coarse && !isOn("skill", skill) ? setHover({ kind: "skill", key: skill }) : onPickSkill?.(skill));

  return (
    <div ref={root} className="relative" onPointerLeave={(e) => mouse(e) && setHover(null)}>
      <Stage orthographic camera={{ position: [0, 0, 200], zoom: 1, near: 1, far: 1000 }} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {pos &&
          GROUPS.flatMap((g) =>
            g.skills.map((s) =>
              pos[s.skill] ? (
                <Gem
                  key={s.skill}
                  p={pos[s.skill]}
                  r={radius(s.tiles.length)}
                  color={g.color}
                  shape={g.shape}
                  dim={rel && !rel.skills.has(s.skill)}
                  active={isOn("skill", s.skill)}
                  still={reducedMotion}
                />
              ) : null
            )
          )}
        {pos &&
          CARTS.map((t) =>
            pos[t.id] ? <Cart key={t.id} p={pos[t.id]} tile={t} dim={rel && !rel.carts.has(t.id)} active={isOn("cart", t.id)} still={reducedMotion} /> : null
          )}
        {pos &&
          LEGEND.map((n) =>
            pos[`legend${n}`] ? <Gem key={n} p={pos[`legend${n}`]} r={radius(n)} color={ink} shape={0} still={reducedMotion} /> : null
          )}
        {pos?.wide && rel?.links.map(([s, t]) => pos[s] && pos[t] && <Link key={s + t} a={pos[s]} b={pos[t]} color={ink} />)}
      </Stage>

      <div className="relative grid gap-3 p-2 sm:grid-cols-[minmax(0,1fr)_184px] sm:p-4">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-display text-[7px] leading-none text-gb-2">
            <span>GEM SIZE = # PROJECTS</span>
            {LEGEND.map((n) => (
              <span key={n} className="flex items-center">
                <span ref={slot(`legend${n}`)} className="inline-block h-6 w-6" />
                <span className="font-mono text-[15px]">{n}</span>
              </span>
            ))}
          </div>
          <div className="columns-2 gap-2 sm:gap-3 md:columns-3 lg:columns-4">
            {GROUPS.map((g) => (
              <section key={g.group} className="mb-3 break-inside-avoid border-2 border-gb-3 px-1 pb-1 pt-1.5 sm:px-1.5">
                <h4 className="mb-1 flex items-center gap-1.5 px-0.5 font-display text-[8px] leading-tight">
                  <span className="h-2.5 w-2.5 flex-none border-2 border-gb-3" style={{ background: groupSwatch(g.group, palette) }} />
                  <span className="min-w-0 flex-1">{g.group.toUpperCase()}</span>
                </h4>
                {g.skills.map((s) => (
                  <button
                    key={s.skill}
                    type="button"
                    data-skill-label={s.skill}
                    onPointerEnter={(e) => mouse(e) && setHover({ kind: "skill", key: s.skill })}
                    onFocus={(e) => e.target.matches(":focus-visible") && setHover({ kind: "skill", key: s.skill })}
                    onClick={() => pick(s.skill)}
                    className={`flex h-6 w-full items-center gap-1 text-left ${isOn("skill", s.skill) ? "shadow-[inset_0_0_0_2px_var(--gb-3)]" : ""} ${dimCls(rel?.skills.has(s.skill))}`}
                  >
                    <span ref={slot(s.skill)} className="h-6 w-5 flex-none sm:w-6" />
                    <span className={`min-w-0 flex-1 truncate font-sans text-[12px] sm:text-[13px] ${s.tiles.length ? "" : "opacity-60"} ${isOn("skill", s.skill) ? "bg-gb-1 px-1" : ""}`}>{s.skill}</span>
                  </button>
                ))}
              </section>
            ))}
          </div>
        </div>

        <aside className="flex min-w-0 flex-col gap-3">
          <Info rel={rel} hover={hover} coarse={coarse} palette={palette} className="hidden sm:block" />
          <section className="border-2 border-gb-3 px-1.5 pb-1 pt-1.5">
            <h4 className="mb-1 px-0.5 font-display text-[8px]">CARTRIDGES</h4>
            <div className="grid grid-cols-2 sm:grid-cols-1">
              {CARTS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  data-cart={t.id}
                  onPointerEnter={(e) => mouse(e) && setHover({ kind: "cart", key: t.id })}
                  onClick={() => coarse && setHover(isOn("cart", t.id) ? null : { kind: "cart", key: t.id })}
                  className={`flex h-6 min-w-0 items-center gap-1 text-left ${isOn("cart", t.id) ? "shadow-[inset_0_0_0_2px_var(--gb-3)]" : ""} ${dimCls(rel?.carts.has(t.id))}`}
                >
                  <span ref={slot(t.id)} className="h-6 w-5 flex-none" />
                  <span className="min-w-0 flex-1 truncate font-sans text-[13px]">{t.title}</span>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>
      <Info rel={rel} hover={hover} coarse={coarse} palette={palette} className="sticky bottom-2 mx-2 mb-2 sm:hidden" />
    </div>
  );
}
