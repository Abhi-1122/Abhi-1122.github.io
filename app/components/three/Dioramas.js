"use client";
import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { PLASTIC, textTexture } from "./textures";

// Per-tile animated toy dioramas. Each fits ~1.3 × 1.3 × 0.8 around the origin.
// Geometries/materials are module-level and shared by every instance.

// ---------- shared resources ----------
const geos = new Map();
const rbox = (w, h, d, r = 0.04) => {
  const k = `${w},${h},${d},${r}`;
  if (!geos.has(k)) geos.set(k, new RoundedBoxGeometry(w, h, d, 3, r));
  return geos.get(k);
};
const SPHERE = new THREE.SphereGeometry(1, 20, 14);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 14);
const PLANE = new THREE.PlaneGeometry(1, 1);
const CONE = new THREE.ConeGeometry(0.035, 0.08, 8);
const ARC = new THREE.TorusGeometry(0.42, 0.055, 10, 18, Math.PI / 3);
const HALF_DISC = new THREE.CylinderGeometry(0.55, 0.55, 0.1, 32, 1, false, Math.PI / 2, Math.PI);
const DISC = new THREE.CylinderGeometry(0.4, 0.4, 0.1, 40);
const RIM = new THREE.TorusGeometry(0.4, 0.05, 12, 48);
const HANDLE = new THREE.TorusGeometry(0.17, 0.03, 8, 20, Math.PI);
const HALO = new THREE.TorusGeometry(0.24, 0.035, 8, 40);
const RING = new THREE.TorusGeometry(0.06, 0.03, 8, 20);

// slight self-lift keeps light plastic in the top LCD shade even on shadowed faces
const plastic = (color, lift = 0.3) => new THREE.MeshPhysicalMaterial({ ...PLASTIC, color, emissive: color, emissiveIntensity: lift });
const glow = (color, i = 2.2) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: i, toneMapped: false });
const M = {
  cream: plastic("#fff4e0"),
  white: plastic("#ffffff"),
  base: plastic("#ffffff"), // instanced meshes tint this via instanceColor
  mid: plastic("#8e97a4"), // mid value: reads as the middle LCD shade
  ink: plastic("#2a2e38"),
  red: plastic("#ff4d4d"),
  maroon: plastic("#b8263a"),
  gold: plastic("#d99a1e"),
  yellow: plastic("#ffc62e"),
  green: plastic("#3ccf6e"),
  blue: plastic("#3d9bff"),
  pink: plastic("#ff6fb1"),
  orange: plastic("#ff9a3c"),
  gGreen: glow("#5cff8a"),
  gYellow: glow("#ffd84a"),
  gBlue: glow("#6cc4ff"),
  gOrange: glow("#ffa040"),
  gRed: glow("#ff5a5a", 1.6),
  gPink: glow("#ff7cc0"),
};
const O = new THREE.Object3D(); // scratch for instance matrices
const C = new THREE.Color();
const UP = new THREE.Vector3(0, 1, 0);
const { damp, clamp, lerp } = THREE.MathUtils;
const frac = (x) => x - Math.floor(x);
const ease = (x) => x * x * (3 - 2 * x);

// Cylinder transform spanning a → b.
function edge(a, b, r = 0.032) {
  const A = new THREE.Vector3(...a);
  const d = new THREE.Vector3(...b).sub(A);
  const len = d.length();
  return {
    position: A.addScaledVector(d, 0.5).toArray(),
    quaternion: new THREE.Quaternion().setFromUnitVectors(UP, d.normalize()),
    scale: [r, len, r],
  };
}


function Label({ text, font, color, height, ...props }) {
  const { texture, aspect } = useMemo(() => textTexture(text, { font: font ?? "800 80px Rubik, sans-serif", color, height: 110, padding: 6 }), [text, font, color]);
  return (
    <mesh geometry={PLANE} scale={[height * aspect, height, 1]} {...props}>
      <meshBasicMaterial map={texture} transparent toneMapped={false} depthWrite={false} />
    </mesh>
  );
}

// Runs fn(t, dt) every frame while active (plus once on mount to pose the idle frame at t0).
function useActive(active, fn, t0 = 0) {
  const s = useRef({ t: t0, primed: false });
  useFrame((_, delta) => {
    const st = s.current;
    if (!active && st.primed) return;
    const dt = active ? Math.min(delta, 0.1) : 0;
    st.t += dt;
    st.primed = true;
    fn(st.t, dt);
  });
}

// Idle sway/bob for every diorama; `spin` dioramas turn continuously while active.
function Shell({ active, spin, phase, children }) {
  const ref = useRef();
  useFrame((s, delta) => {
    const g = ref.current;
    const t = s.clock.elapsedTime + phase;
    const dt = Math.min(delta, 0.1);
    g.position.y = Math.sin(t * 1.3) * (active ? 0.045 : 0.025);
    if (active && spin) g.rotation.y += dt * spin;
    else {
      const r = Math.atan2(Math.sin(g.rotation.y), Math.cos(g.rotation.y));
      g.rotation.y = damp(r, Math.sin(t * 0.6) * 0.28, 3, dt);
    }
  });
  return <group ref={ref}>{children}</group>;
}

// ---------- about: GA medal ----------
function About() {
  return (
    <group position={[0, -0.1, 0]}>
      <mesh geometry={rbox(0.2, 0.5, 0.04, 0.02)} material={M.blue} position={[-0.12, 0.52, -0.06]} rotation-z={-0.35} />
      <mesh geometry={rbox(0.2, 0.5, 0.04, 0.02)} material={M.red} position={[0.12, 0.52, -0.06]} rotation-z={0.35} />
      <mesh geometry={RING} material={M.gold} position={[0, 0.46, 0]} />
      <mesh geometry={DISC} material={M.cream} rotation-x={Math.PI / 2} />
      <mesh geometry={RIM} material={M.gold} />
      <Label text="GA" color="#e6231e" height={0.42} position={[0, 0, 0.052]} />
      <Label text="GA" color="#e6231e" height={0.42} position={[0, 0, -0.052]} rotation-y={Math.PI} />
    </group>
  );
}

// ---------- blockdrop: self-playing falling blocks ----------
const COLS = 6, ROWS = 9, CELL = 0.125;
const PIECES = [
  [[0, 0], [1, 0], [2, 0], [3, 0]], [[0, 0], [1, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [2, 0], [1, 1]],
  [[0, 0], [1, 0], [2, 0], [2, 1]], [[0, 0], [1, 0], [2, 0], [0, 1]], [[0, 0], [1, 0], [1, 1], [2, 1]], [[1, 0], [2, 0], [0, 1], [1, 1]],
];
const ROTS = PIECES.map((p) => {
  const out = [];
  let c = p;
  for (let r = 0; r < 4; r++) {
    const mx = Math.min(...c.map((v) => v[0])), my = Math.min(...c.map((v) => v[1]));
    out.push(c.map(([x, y]) => [x - mx, y - my]));
    c = c.map(([x, y]) => [y, -x]);
  }
  return out;
});
const fits = (g, cells, x, y) => cells.every(([cx, cy]) => {
  const X = x + cx, Y = y + cy;
  return X >= 0 && X < COLS && Y >= 0 && (Y >= ROWS || !g[Y * COLS + X]);
});
function score(h) {
  let s = 0, prev = -1;
  for (let y = 0; y < ROWS; y++) {
    let full = true;
    for (let x = 0; x < COLS; x++) if (!h[y * COLS + x]) full = false;
    if (full) s += 3;
  }
  for (let x = 0; x < COLS; x++) {
    let top = 0;
    for (let y = ROWS - 1; y >= 0; y--) if (h[y * COLS + x]) { top = y + 1; break; }
    for (let y = 0; y < top; y++) if (!h[y * COLS + x]) s -= 3.5;
    s -= top * 0.5 + (prev >= 0 ? Math.abs(top - prev) * 0.3 : 0);
    prev = top;
  }
  return s;
}
// Greedy placement for a random piece; null when the well is topped out.
function plan(g) {
  let best = null, bs = -Infinity;
  for (const cells of ROTS[(Math.random() * 7) | 0]) {
    const w = Math.max(...cells.map((c) => c[0])) + 1;
    for (let x = 0; x <= COLS - w; x++) {
      let y = ROWS;
      while (y > 0 && fits(g, cells, x, y - 1)) y--;
      if (cells.some((c) => y + c[1] >= ROWS)) continue;
      const h = g.slice();
      for (const [cx, cy] of cells) h[(y + cy) * COLS + x + cx] = 1;
      const s = score(h) + Math.random() * 0.4;
      if (s > bs) (bs = s), (best = { cells, x, y: ROWS });
    }
  }
  return best;
}
const CREAM = new THREE.Color("#fff4e0"), YELLOW = new THREE.Color("#ff5a5a"), FLASH = new THREE.Color("#ffffff");

function BlockDrop({ active }) {
  const ref = useRef();
  const s = useMemo(() => {
    const grid = new Uint8Array(COLS * ROWS);
    [[1, 1, 1, 1, 0, 1], [1, 1, 0, 1, 0, 1], [0, 1, 0, 0, 0, 1]].forEach((row, y) => row.forEach((v, x) => (grid[y * COLS + x] = v)));
    const piece = plan(grid);
    piece.y = ROWS - 3;
    return { grid, piece, acc: 0, clear: null, clearT: 0 };
  }, []);

  const draw = () => {
    const m = ref.current;
    for (let i = 0; i < COLS * ROWS; i++) {
      const X = i % COLS, Y = (i / COLS) | 0;
      const flash = s.clear?.includes(Y);
      const sc = s.grid[i] ? (flash ? 1 + 0.15 * Math.sin(s.clearT * 40) : 1) : 0;
      O.position.set((X - (COLS - 1) / 2) * CELL, (Y - (ROWS - 1) / 2) * CELL, 0);
      O.scale.setScalar(sc);
      O.updateMatrix();
      m.setMatrixAt(i, O.matrix);
      m.setColorAt(i, flash ? FLASH : CREAM);
    }
    if (s.piece) for (const [cx, cy] of s.piece.cells) {
      const X = s.piece.x + cx, Y = s.piece.y + cy;
      if (Y >= ROWS) continue;
      O.position.set((X - (COLS - 1) / 2) * CELL, (Y - (ROWS - 1) / 2) * CELL, 0.01);
      O.scale.setScalar(1);
      O.updateMatrix();
      m.setMatrixAt(Y * COLS + X, O.matrix);
      m.setColorAt(Y * COLS + X, YELLOW);
    }
    m.instanceMatrix.needsUpdate = true;
    m.instanceColor.needsUpdate = true;
  };
  useLayoutEffect(draw, []);

  const spawn = () => {
    s.piece = plan(s.grid);
    if (!s.piece) (s.grid.fill(0), (s.piece = plan(s.grid)));
  };
  useActive(active, (t, dt) => {
    if (s.clear) {
      s.clearT += dt;
      if (s.clearT > 0.35) {
        const g = s.grid, keep = [];
        for (let y = 0; y < ROWS; y++) if (!s.clear.includes(y)) keep.push(g.slice(y * COLS, y * COLS + COLS));
        g.fill(0);
        keep.forEach((row, y) => g.set(row, y * COLS));
        s.clear = null;
        spawn();
      }
      return draw();
    }
    s.acc += dt;
    if (s.acc < 0.1) return;
    s.acc = 0;
    const p = s.piece;
    if (fits(s.grid, p.cells, p.x, p.y - 1)) p.y--;
    else {
      for (const [cx, cy] of p.cells) s.grid[(p.y + cy) * COLS + p.x + cx] = 1;
      s.piece = null;
      const full = [];
      for (let y = 0; y < ROWS; y++) if (s.grid.subarray(y * COLS, y * COLS + COLS).every(Boolean)) full.push(y);
      if (full.length) (s.clear = full), (s.clearT = 0);
      else spawn();
    }
    draw();
  });

  return (
    <group>
      <mesh geometry={rbox(0.93, 1.3, 0.1, 0.06)} material={M.cream} position-z={-0.12} />
      <mesh geometry={rbox(COLS * CELL + 0.02, ROWS * CELL + 0.02, 0.04, 0.02)} material={M.ink} position-z={-0.07} />
      <instancedMesh ref={ref} args={[rbox(CELL * 0.9, CELL * 0.9, CELL * 0.9, 0.025), M.base, COLS * ROWS]} frustumCulled={false} />
    </group>
  );
}

// ---------- pixeljumper: cube hopping over blocks ----------
const JX = -0.28, GROUND = -0.36, JW = 0.22, LOOP = 1.5;
function PixelJumper({ active }) {
  const hero = useRef(), obs = useRef([]);
  useActive(active, (t) => {
    let near = 1;
    obs.current.forEach((o, i) => {
      const x = 0.75 - frac((t * 0.75 + i * 0.5) / LOOP) * LOOP;
      o.position.x = x;
      o.scale.setScalar(clamp((0.75 - Math.abs(x)) / 0.12, 0, 1));
      const dx = (x - JX) / JW;
      if (Math.abs(dx) < Math.abs(near)) near = dx;
    });
    const air = Math.abs(near) < 1 ? 1 - near * near : 0;
    const h = hero.current;
    h.position.y = GROUND + 0.12 + air * 0.4;
    h.scale.set(1 - air * 0.12, 1 + air * 0.18, 1);
    h.rotation.z = -near * air * 0.25;
  }, 1.04);
  return (
    <group>
      <mesh geometry={rbox(1.3, 0.14, 0.4, 0.05)} material={M.cream} position-y={GROUND - 0.1} />
      <mesh geometry={rbox(1.32, 0.07, 0.42, 0.03)} material={M.green} position-y={GROUND - 0.03} />
      <group ref={hero} position={[JX, GROUND + 0.12, 0]}>
        <mesh geometry={rbox(0.24, 0.24, 0.24, 0.05)} material={M.white} />
        <mesh geometry={rbox(0.05, 0.09, 0.02, 0.015)} material={M.ink} position={[0.015, 0.03, 0.12]} />
        <mesh geometry={rbox(0.05, 0.09, 0.02, 0.015)} material={M.ink} position={[0.085, 0.03, 0.12]} />
      </group>
      {[0.16, 0.24, 0.16].map((hgt, i) => (
        <group key={i} ref={(o) => (obs.current[i] = o)} position={[0.75 - i * 0.5, GROUND, 0]}>
          <mesh geometry={rbox(0.16, hgt, 0.2, 0.04)} material={i === 1 ? M.orange : M.red} position-y={hgt / 2} />
        </group>
      ))}
      <mesh geometry={rbox(0.12, 0.12, 0.04, 0.03)} material={M.yellow} position={[0.35, 0.3, 0]} rotation-z={Math.PI / 4} />
    </group>
  );
}

// ---------- bytesnake: snake on a checker board ----------
let checkerMat;
function checker() {
  if (checkerMat) return checkerMat;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d");
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) (x.fillStyle = (i + j) % 2 ? "#fff4e0" : "#efdcb8"), x.fillRect(i * 16, j * 16, 16, 16);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  return (checkerMat = new THREE.MeshPhysicalMaterial({ ...PLASTIC, map: tex }));
}
const SEGS = 9;
const snakeAt = (u, out) => out.set(0.36 * Math.sin(u), 0.28 * Math.sin(2 * u), 0.12);
const V = new THREE.Vector3();
function ByteSnake({ active }) {
  const body = useRef(), head = useRef();
  const mat = useMemo(checker, []);
  useLayoutEffect(() => {
    for (let i = 0; i < SEGS; i++) body.current.setColorAt(i, C.set(i % 2 ? "#2f9e57" : "#6be38f"));
  }, []);
  useActive(active, (t) => {
    const u = t * 1.4 + 0.6;
    for (let i = 0; i < SEGS; i++) {
      snakeAt(u - (i + 1) * 0.17, O.position);
      O.scale.setScalar(0.068 - i * 0.003);
      O.updateMatrix();
      body.current.setMatrixAt(i, O.matrix);
    }
    body.current.instanceMatrix.needsUpdate = true;
    head.current.position.copy(snakeAt(u, V));
    head.current.rotation.z = Math.atan2(0.56 * Math.cos(2 * u), 0.36 * Math.cos(u));
  });
  return (
    <group rotation-x={-0.55}>
      <mesh geometry={rbox(1.15, 1.15, 0.1, 0.05)} material={mat} />
      <instancedMesh ref={body} args={[SPHERE, M.base, SEGS]} frustumCulled={false} />
      <group ref={head}>
        <mesh geometry={SPHERE} material={M.ink} scale={[0.1, 0.085, 0.08]} />
        {[-1, 1].map((k) => (
          <group key={k} position={[0.045, k * 0.045, 0.05]}>
            <mesh geometry={SPHERE} material={M.white} scale={0.034} />
                      </group>
        ))}
      </group>
      <group position={[0.42, 0.4, 0.12]}>
        <mesh geometry={SPHERE} material={M.red} scale={0.075} />
        <mesh geometry={rbox(0.05, 0.025, 0.02, 0.01)} material={M.green} position={[0.03, 0.08, 0]} rotation-z={0.5} />
      </group>
    </group>
  );
}

// ---------- research: gene-regulatory graph ----------
const NODES = Array.from({ length: 10 }, (_, i) => {
  const y = 1 - (2 * (i + 0.5)) / 10, r = Math.sqrt(1 - y * y), a = i * 2.39996;
  return [Math.cos(a) * r * 0.48, y * 0.48, Math.sin(a) * r * 0.36];
});
const LINKS = (() => {
  const set = new Set();
  NODES.forEach((a, i) => {
    NODES.map((b, j) => [j, (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2])
      .filter(([j]) => j !== i).sort((p, q) => p[1] - q[1]).slice(0, 2)
      .forEach(([j]) => set.add(i < j ? `${i}-${j}` : `${j}-${i}`));
  });
  return [...set].map((k) => k.split("-").map(Number));
})();
const LINK_T = LINKS.map(([a, b]) => edge(NODES[a], NODES[b]));
const HUBS = [1, 4, 7];
function Research({ active }) {
  const hubs = useRef([]), beads = useRef([]);
  useActive(active, (t) => {
    hubs.current.forEach((m, i) => m.scale.setScalar(0.1 * (1 + 0.25 * Math.max(0, Math.sin(t * 3 - i * 2)))));
    beads.current.forEach((m, i) => {
      const [a, b] = LINKS[i * 3];
      m.position.lerpVectors(V.set(...NODES[a]), O.position.set(...NODES[b]), frac(t * 0.7 + i * 0.33));
    });
  });
  return (
    <group rotation-x={0.25}>
      {LINK_T.map((e, i) => <mesh key={i} geometry={CYL} material={M.mid} {...e} />)}
      {NODES.map((p, i) =>
        HUBS.includes(i)
          ? <mesh key={i} ref={(m) => (hubs.current[HUBS.indexOf(i)] = m)} geometry={SPHERE} material={M.pink} position={p} scale={0.1} />
          : <mesh key={i} geometry={SPHERE} material={M.cream} position={p} scale={0.07} />
      )}
      {[0, 1, 2].map((i) => <mesh key={i} ref={(m) => (beads.current[i] = m)} geometry={SPHERE} material={M.gPink} scale={0.045} position={NODES[LINKS[i * 3][0]]} />)}
    </group>
  );
}

// ---------- jocata: heartbeat waveform + SLI bars ----------
const BEADS = 34;
const gauss = (p, c, w, a) => a * Math.exp(-((p - c) ** 2) / (2 * w * w));
const ecg = (p) => gauss(p, 0.2, 0.04, 0.03) + gauss(p, 0.42, 0.02, -0.05) + gauss(p, 0.47, 0.03, 0.2) + gauss(p, 0.52, 0.02, -0.07) + gauss(p, 0.72, 0.05, 0.05);
const SLI = [[M.green, 0.9], [M.yellow, 0.7], [M.blue, 0.8]];
function Jocata({ active }) {
  const wave = useRef(), bars = useRef([]);
  useActive(active, (t) => {
    for (let i = 0; i < BEADS; i++) {
      const x = -0.5 + i / (BEADS - 1);
      O.position.set(x, 0.07 + ecg(frac((x - t * 0.45) / 0.8 + 0.6)), 0);
      O.scale.setScalar(0.03);
      O.updateMatrix();
      wave.current.setMatrixAt(i, O.matrix);
    }
    wave.current.instanceMatrix.needsUpdate = true;
    bars.current.forEach((m, i) => {
      const f = SLI[i][1] + 0.08 * Math.sin(t * (1.5 + i * 0.7) + i);
      m.scale.x = f;
      m.position.x = -0.42 + (0.84 * f) / 2;
    });
  });
  return (
    <group rotation-x={-0.12}>
      <mesh geometry={rbox(1.3, 0.98, 0.14, 0.08)} material={M.cream} />
      <mesh geometry={rbox(1.14, 0.5, 0.04, 0.04)} material={M.ink} position={[0, 0.16, 0.06]} />
      <instancedMesh ref={wave} args={[SPHERE, M.gGreen, BEADS]} position={[0, 0.06, 0.09]} frustumCulled={false} />
      {SLI.map(([mat, f], i) => (
        <group key={i} position={[0, -0.17 - i * 0.1, 0.075]}>
          <mesh geometry={rbox(0.92, 0.09, 0.02, 0.03)} material={M.ink} />
          <mesh ref={(m) => (bars.current[i] = m)} geometry={rbox(0.84, 0.065, 0.03, 0.025)} material={mat} position={[-0.42 + (0.84 * f) / 2, 0, 0.01]} scale={[f, 1, 1]} />
        </group>
      ))}
    </group>
  );
}

// ---------- cloudnuro: cloud routing to three tiers ----------
const TIERS = [[-0.42, M.yellow, M.gYellow], [0, M.blue, M.gBlue], [0.42, M.green, M.gGreen]];
const ROUTE_TOP = [0, 0.12, 0];
const ROUTES = TIERS.map(([x]) => edge(ROUTE_TOP, [x, -0.34, 0], 0.035));
const PUFFS = [[0, 0.34, 0, 0.25], [-0.26, 0.24, 0, 0.19], [0.27, 0.25, 0, 0.19], [-0.12, 0.44, -0.02, 0.19], [0.14, 0.46, -0.03, 0.17]];
function CloudNuro({ active }) {
  const routes = useRef([]), caps = useRef([]), pads = useRef([]), pkt = useRef();
  useActive(active, (t) => {
    const k = Math.floor(t / 1.1) % 3, p = frac(t / 1.1);
    TIERS.forEach(([, mat, lit], i) => {
      routes.current[i].material = i === k ? lit : M.mid;
      caps.current[i].material = i === k && p > 0.75 ? lit : mat;
      pads.current[i].scale.setScalar(i === k && p > 0.75 ? 1 + 0.12 * Math.sin((p - 0.75) * 4 * Math.PI) : 1);
    });
    pkt.current.position.lerpVectors(V.set(...ROUTE_TOP), O.position.set(TIERS[k][0], -0.34, 0), ease(Math.min(p / 0.8, 1)));
  });
  return (
    <group>
      {PUFFS.map(([x, y, z, r], i) => <mesh key={i} geometry={SPHERE} material={M.white} position={[x, y, z]} scale={r} />)}
      <mesh geometry={rbox(0.76, 0.2, 0.34, 0.1)} material={M.white} position-y={0.2} />
      {ROUTES.map((e, i) => <mesh key={i} ref={(m) => (routes.current[i] = m)} geometry={CYL} material={M.mid} {...e} />)}
      {TIERS.map(([x, mat], i) => (
        <group key={i} ref={(m) => (pads.current[i] = m)} position={[x, -0.45, 0]}>
          <mesh geometry={rbox(0.26, 0.16, 0.26, 0.05)} material={M.cream} />
          <mesh ref={(m) => (caps.current[i] = m)} geometry={rbox(0.27, 0.05, 0.27, 0.02)} material={mat} position-y={0.09} />
        </group>
      ))}
      <mesh ref={pkt} geometry={SPHERE} material={M.gBlue} scale={0.055} position={ROUTE_TOP} />
    </group>
  );
}

// ---------- cuffka: 3 brokers, Raft leader with crown ----------
const BROKERS = [[0, 0.24, 0], [-0.42, -0.3, 0], [0.42, -0.3, 0]];
const BROKER_LINKS = [[0, 1], [0, 2], [1, 2]].map(([a, b]) => edge(BROKERS[a], BROKERS[b]));
function Crown(props) {
  return (
    <group {...props}>
      <mesh geometry={CYL} material={M.yellow} scale={[0.11, 0.07, 0.11]} />
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} geometry={CONE} material={M.yellow} position={[Math.cos(i * 1.2566) * 0.09, 0.07, Math.sin(i * 1.2566) * 0.09]} />
      ))}
    </group>
  );
}
function Cuffka({ active }) {
  const crown = useRef(), halo = useRef(), pk = useRef([]);
  useActive(active, (t) => {
    const term = Math.floor(t / 5), u = t - term * 5;
    const L = term % 3, prev = (term + 2) % 3;
    const a = BROKERS[prev], b = BROKERS[L], m = ease(clamp(u / 0.7, 0, 1));
    crown.current.position.set(lerp(a[0], b[0], m), lerp(a[1], b[1], m) + 0.24 + Math.sin(m * Math.PI) * 0.25, 0);
    crown.current.rotation.y = t * 1.5;
    halo.current.position.set(b[0], b[1], b[2]);
    halo.current.scale.setScalar(m * (1 + 0.06 * Math.sin(t * 5)));
    let j = 0;
    BROKERS.forEach((f, i) => {
      if (i === L) return;
      const q = frac(t * 0.8 + j * 0.5), show = u > 0.9;
      pk.current[j].visible = show;
      pk.current[j].position.set(lerp(b[0], f[0], q), lerp(b[1], f[1], q), 0);
      j++;
    });
  }, 1.5);
  return (
    <group>
      {BROKER_LINKS.map((e, i) => <mesh key={i} geometry={CYL} material={M.mid} {...e} />)}
      {BROKERS.map((p, i) => (
        <group key={i} position={p}>
          <mesh geometry={rbox(0.3, 0.3, 0.3, 0.07)} material={M.cream} />
          <mesh geometry={rbox(0.18, 0.06, 0.02, 0.02)} material={M.ink} position={[0, 0.05, 0.15]} />
          <mesh geometry={rbox(0.18, 0.06, 0.02, 0.02)} material={M.ink} position={[0, -0.04, 0.15]} />
        </group>
      ))}
      <mesh ref={halo} geometry={HALO} material={M.gYellow} position={BROKERS[0]} />
      <Crown ref={crown} position={[0, 0.48, 0]} />
      {[0, 1].map((i) => <mesh key={i} ref={(m) => (pk.current[i] = m)} geometry={SPHERE} material={M.gBlue} scale={0.06} visible={false} />)}
    </group>
  );
}

// ---------- docspp: server stacks passing a file ----------
const RACKS = [-0.36, 0.36].flatMap((x) => [-0.4, -0.17, 0.06].map((y) => [x, y]));
function Docspp({ active }) {
  const leds = useRef([]), card = useRef();
  useActive(active, (t) => {
    leds.current.forEach((m, i) => (m.material = Math.sin(t * (5 + (i % 5) * 2.3) + i * 1.7) > -0.3 ? (i % 2 ? M.gYellow : M.gGreen) : M.ink));
    const k = frac(t / 3.2) * 2, p = ease(k < 1 ? k : 2 - k);
    card.current.position.set(lerp(-0.36, 0.36, p), 0.33 + Math.sin(p * Math.PI) * 0.2, 0.02);
    card.current.rotation.z = (k < 1 ? -1 : 1) * Math.sin(p * Math.PI) * 0.35;
  });
  return (
    <group>
      {RACKS.map(([x, y], i) => (
        <group key={i} position={[x, y, 0]}>
          <mesh geometry={rbox(0.5, 0.2, 0.44, 0.05)} material={M.cream} />
          <mesh geometry={rbox(0.44, 0.08, 0.02, 0.03)} material={M.ink} position={[0, 0, 0.22]} />
          <mesh geometry={rbox(0.16, 0.04, 0.02, 0.015)} material={M.mid} position={[-0.1, 0, 0.23]} />
          {[0, 1].map((j) => (
            <mesh key={j} ref={(m) => (leds.current[i * 2 + j] = m)} geometry={SPHERE} material={j ? M.gYellow : M.gGreen} scale={0.032} position={[0.07 + j * 0.1, 0, 0.235]} />
          ))}
        </group>
      ))}
      <group ref={card} position={[-0.36, 0.33, 0.02]}>
        <mesh geometry={rbox(0.2, 0.26, 0.03, 0.02)} material={M.white} />
        {[0.07, 0.01, -0.05].map((y, i) => (
          <mesh key={i} geometry={rbox(i === 3 ? 0.08 : 0.14, 0.04, 0.01, 0.012)} material={i ? M.mid : M.blue} position={[i === 3 ? -0.025 : 0, y, 0.017]} />
        ))}
      </group>
    </group>
  );
}

// ---------- hawkes: live-ticking candlesticks ----------
const NC = 8, CS = 0.135, TICK = 0.7;
function Hawkes({ active }) {
  const scroll = useRef(), bodies = useRef([]), wicks = useRef([]);
  const s = useMemo(() => {
    const o = new Float32Array(NC), c = new Float32Array(NC), hi = new Float32Array(NC), lo = new Float32Array(NC);
    let p = -0.15;
    for (let i = 0; i < NC; i++) (o[i] = p), (p = c[i] = clamp(p + Math.sin(i * 2.3) * 0.28 + 0.04, -0.35, 0.35)), (hi[i] = 0.04 + (i % 3) * 0.02), (lo[i] = 0.03 + (i % 2) * 0.03);
    return { o, c, hi, lo, target: c[NC - 1], last: -1 };
  }, []);
  useActive(active, (t) => {
    const n = Math.floor(t / TICK), u = t / TICK - n;
    if (n !== s.last && t > 0) {
      s.last = n;
      s.o.copyWithin(0, 1), s.c.copyWithin(0, 1), s.hi.copyWithin(0, 1), s.lo.copyWithin(0, 1);
      const o = (s.o[NC - 1] = s.c[NC - 2]);
      s.base = o;
      s.target = clamp(o + (Math.random() - 0.5) * 0.3 - o * 0.3, -0.35, 0.35);
      s.hi[NC - 1] = 0.02 + Math.random() * 0.06;
      s.lo[NC - 1] = 0.02 + Math.random() * 0.06;
    }
    if (s.base !== undefined) s.c[NC - 1] = s.base + (s.target - s.base) * ease(Math.min(u * 1.5, 1)) + 0.015 * Math.sin(t * 19);
    scroll.current.position.x = -CS * u;
    for (let i = 0; i < NC; i++) {
      const o = s.o[i], c = s.c[i], top = Math.max(o, c), bot = Math.min(o, c), b = bodies.current[i], w = wicks.current[i];
      const sx = i === 0 ? 1 - u : i === NC - 1 ? Math.min(1, u * 4) : 1;
      b.material = c >= o ? M.green : M.maroon;
      b.position.y = (top + bot) / 2;
      b.scale.set(sx, Math.max(0.02, top - bot), sx);
      w.position.y = (top + s.hi[i] + bot - s.lo[i]) / 2;
      w.scale.set(0.03 * sx, top - bot + s.hi[i] + s.lo[i], 0.03 * sx);
    }
  });
  return (
    <group>
      <mesh geometry={rbox(1.25, 1.02, 0.08, 0.06)} material={M.cream} position-z={-0.14} />
      <group ref={scroll}>
        {Array.from({ length: NC }, (_, i) => (
          <group key={i} position-x={(i - (NC - 2) / 2) * CS}>
            <mesh ref={(m) => (wicks.current[i] = m)} geometry={CYL} material={M.ink} />
            <mesh ref={(m) => (bodies.current[i] = m)} geometry={rbox(0.1, 1, 0.1, 0.02)} material={M.green} />
          </group>
        ))}
      </group>
    </group>
  );
}

// ---------- churnsense: gauge + bars ----------
const BARS = [0.16, 0.26, 0.2, 0.34];
function ChurnSense({ active }) {
  const needle = useRef(), bars = useRef([]);
  const s = useMemo(() => ({ a: 0.6, v: 0, target: -0.4, next: 0 }), []);
  useActive(active, (t, dt) => {
    if (t > s.next) (s.target = (Math.random() * 2 - 1) * 1.3), (s.next = t + 1.2 + Math.random());
    s.v += (s.target - s.a) * 40 * dt;
    s.v *= Math.exp(-5 * dt);
    s.a += s.v * dt;
    needle.current.rotation.z = s.a;
    bars.current.forEach((m, i) => {
      const h = BARS[i] * (0.75 + 0.25 * Math.sin(t * 2.2 + i * 1.3));
      m.scale.y = h;
      m.position.y = h / 2;
    });
  });
  return (
    <group>
      <group position={[0, 0.02, 0]}>
        <mesh geometry={HALF_DISC} material={M.cream} rotation-x={Math.PI / 2} />
        <mesh geometry={rbox(1.2, 0.08, 0.16, 0.035)} material={M.cream} position-y={-0.02} />
        {[M.red, M.yellow, M.green].map((m, i) => <mesh key={i} geometry={ARC} material={m} rotation-z={(i * Math.PI) / 3} position-z={0.05} />)}
        <group ref={needle} position-z={0.08} rotation-z={0.6}>
          <mesh geometry={rbox(0.07, 0.4, 0.03, 0.025)} material={M.ink} position-y={0.17} />
        </group>
        <mesh geometry={SPHERE} material={M.red} scale={[0.07, 0.07, 0.05]} position-z={0.09} />
      </group>
      <group position={[0, -0.52, 0.05]}>
        <mesh geometry={rbox(0.8, 0.07, 0.22, 0.03)} material={M.ink} position-y={-0.035} />
        {BARS.map((h, i) => (
          <mesh key={i} ref={(m) => (bars.current[i] = m)} geometry={CYL} material={i === 3 ? M.red : M.cream} position={[-0.27 + i * 0.18, h / 2, 0]} scale={[0.06, h, 0.06]} />
        ))}
      </group>
    </group>
  );
}

// ---------- cshell: retro terminal typing `$ ls` ----------
const TERM_LEFT = -0.36, LINE_H = 0.13;
const SCRIPT = [[0.5, "$", "", ""], [0.8, "$ l", "", ""], [1.1, "$ ls", "", ""], [1.6, "$ ls", "", ""], [5, "$ ls", "a.out src", "$"]];
function CShell({ active }) {
  const lines = useRef([]), cursor = useRef();
  const mats = useMemo(() => [0, 1, 2].map(() => new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, depthWrite: false })), []);
  const last = useRef([]);
  useActive(active, (t) => {
    const u = (t + 2.2) % 5;
    const row = SCRIPT.find((r) => u < r[0]);
    let end = TERM_LEFT, endLine = 0;
    for (let i = 0; i < 3; i++) {
      const str = row[i + 1], m = lines.current[i];
      if (str !== last.current[i]) {
        last.current[i] = str;
        m.visible = !!str;
        if (str) {
          const { texture, aspect } = textTexture(str, { font: "700 48px Space Mono, monospace", color: "#7CFC7C", height: 64, padding: 4 });
          mats[i].map = texture;
          mats[i].needsUpdate = true;
          m.scale.x = LINE_H * aspect;
          m.position.x = TERM_LEFT + (LINE_H * aspect) / 2;
        }
      }
      if (str && i !== 1) (end = TERM_LEFT + m.scale.x - 0.01), (endLine = i);
    }
    cursor.current.position.set(end + 0.03, 0.21 - endLine * 0.15, 0.28);
    cursor.current.visible = frac(t * 2) < 0.6;
  });
  return (
    <group>
      <mesh geometry={rbox(1.05, 0.82, 0.5, 0.1)} material={M.cream} position-y={0.08} />
      <mesh geometry={rbox(0.86, 0.6, 0.04, 0.06)} material={M.ink} position={[0, 0.1, 0.24]} />
      {mats.map((m, i) => <mesh key={i} ref={(r) => (lines.current[i] = r)} geometry={PLANE} material={m} position={[0, 0.21 - i * 0.15, 0.265]} scale={[0.1, LINE_H, 1]} visible={false} />)}
      <mesh ref={cursor} geometry={rbox(0.07, 0.11, 0.01, 0.015)} material={M.gGreen} position={[0, 0.2, 0.28]} />
      <mesh geometry={SPHERE} material={M.gGreen} scale={0.035} position={[0.4, -0.26, 0.25]} />
      <mesh geometry={rbox(0.14, 0.05, 0.02, 0.02)} material={M.mid} position={[-0.36, -0.26, 0.25]} />
      <mesh geometry={rbox(0.26, 0.14, 0.24, 0.04)} material={M.mid} position-y={-0.38} />
      <mesh geometry={rbox(0.62, 0.07, 0.4, 0.03)} material={M.cream} position-y={-0.47} />
    </group>
  );
}

// ---------- sham: packets between endpoints, one drops & retransmits ----------
const TRIP = 0.8;
const TRIPS = [[1, M.blue], [-1, M.green], [1, M.blue, true], [1, M.orange], [-1, M.green]];
function Sham({ active }) {
  const pkt = useRef(), led = useRef();
  useActive(active, (t) => {
    const n = Math.floor(t / TRIP), p = t / TRIP - n;
    const [dir, mat, drop] = TRIPS[n % TRIPS.length];
    const m = pkt.current;
    m.material = mat;
    led.current.material = mat === M.orange ? M.gOrange : M.gBlue;
    const sc = dir < 0 ? 0.7 : 1;
    if (drop && p > 0.5) {
      const q = (p - 0.5) * TRIP;
      m.position.set(dir * 0.05 + q * 0.15, 0.33 - 4 * q * q, q * 0.8);
      m.rotation.set(q * 8, q * 6, 0);
      m.scale.setScalar(sc * (1 - (p - 0.5) * 1.6));
    } else {
      m.position.set(dir * (-0.3 + 0.6 * p), 0.05 + 0.28 * Math.sin(Math.PI * p), 0);
      m.rotation.set(0, 0, -dir * p * Math.PI);
      m.scale.setScalar(sc);
    }
  }, 0.4);
  return (
    <group>
      {[-1, 1].map((k) => (
        <group key={k} position-x={k * 0.46}>
          <mesh geometry={rbox(0.36, 0.06, 0.36, 0.025)} material={M.mid} position-y={-0.35} />
          <mesh geometry={rbox(0.26, 0.36, 0.26, 0.06)} material={M.cream} position-y={-0.14} />
          <mesh geometry={rbox(0.2, 0.12, 0.02, 0.03)} material={M.ink} position={[0, -0.07, 0.13]} />
          <mesh ref={k < 0 ? led : undefined} geometry={rbox(0.14, 0.06, 0.02, 0.02)} material={k < 0 ? M.gBlue : M.gGreen} position={[0, -0.07, 0.14]} />
          <mesh geometry={CYL} material={M.ink} scale={[0.025, 0.14, 0.025]} position={[k * 0.06, 0.1, 0]} />
          <mesh geometry={SPHERE} material={M.red} scale={0.045} position={[k * 0.06, 0.18, 0]} />
        </group>
      ))}
      <mesh ref={pkt} geometry={rbox(0.15, 0.15, 0.15, 0.04)} material={M.blue} position={[-0.3, 0.05, 0]} />
    </group>
  );
}

// ---------- buysell: shopping bag with swinging price tag ----------
function BuySell({ active }) {
  const tag = useRef();
  useActive(active, (t) => (tag.current.rotation.z = 0.25 + 0.3 * Math.sin(t * 3.2)));
  return (
    <group position-y={-0.05}>
      <mesh geometry={rbox(0.7, 0.72, 0.34, 0.07)} material={M.cream} position-y={-0.1} />
      {[-1, 1].map((k) => <mesh key={k} geometry={HANDLE} material={M.pink} position={[0, 0.25, k * 0.1]} />)}
      <mesh geometry={DISC} material={M.pink} scale={[0.42, 0.3, 0.42]} rotation-x={Math.PI / 2} position={[0, -0.08, 0.17]} />
      <Label text="₹" color="#ffffff" height={0.22} position={[0, -0.08, 0.19]} />
      <group ref={tag} position={[0.24, 0.2, 0.2]} rotation-z={0.25}>
        <mesh geometry={CYL} material={M.ink} scale={[0.022, 0.12, 0.022]} position-y={-0.06} />
        <mesh geometry={rbox(0.26, 0.15, 0.03, 0.035)} material={M.ink} position-y={-0.18} />
        <Label text="₹99" color="#ffc62e" height={0.11} position={[0, -0.18, 0.017]} />
        <Label text="₹99" color="#ffc62e" height={0.11} position={[0, -0.18, -0.017]} rotation-y={Math.PI} />
      </group>
    </group>
  );
}

// ---------- bharatslm: token cubes rising through a transformer stack, bubble says hello ----------
const SLABS = [0, 1, 2, 3, 4].map((i) => -0.36 + i * 0.13);
const TOK_Y0 = -0.44, TOK_Y1 = 0.3, TOK_T = 2.4, HELLO_T = 3;
const TOKS = [M.gOrange, M.white, M.gGreen]; // saffron / white / green
const TOK_YS = new Float32Array(TOKS.length); // scratch
const HELLO = [["नमस्ते", "700 80px Rubik, 'Noto Sans Devanagari', sans-serif"], ["নমস্কাৰ", "700 80px Rubik, 'Noto Sans Bengali', sans-serif"]];
function BharatSLM({ active }) {
  const toks = useRef([]), pips = useRef([]), words = useRef([]), bubble = useRef();
  useActive(active, (t) => {
    toks.current.forEach((m, i) => {
      const p = frac(t / TOK_T + i / TOKS.length);
      const y = lerp(TOK_Y0, TOK_Y1, p);
      TOK_YS[i] = y;
      m.position.y = y;
      m.scale.setScalar(clamp(Math.min(p, 1 - p) / 0.08, 0, 1));
      m.rotation.y = p * Math.PI;
    });
    pips.current.forEach((m, i) => {
      let lit = false;
      for (let j = 0; j < TOKS.length; j++) if (Math.abs(TOK_YS[j] - SLABS[i >> 1]) < 0.06) lit = true;
      m.material = lit ? M.gYellow : M.ink;
    });
    const k = Math.floor(t / HELLO_T) % 2, u = t / HELLO_T - Math.floor(t / HELLO_T);
    words.current.forEach((g, i) => (g.visible = i === k));
    bubble.current.scale.setScalar(1 + 0.14 * Math.exp(-u * 18) * Math.sin(u * 60));
  }, 0.5);
  return (
    <group position-y={-0.03}>
      <mesh geometry={rbox(1.0, 0.12, 0.6, 0.04)} material={M.ink} position-y={-0.48} />
      {[M.orange, M.white, M.green].map((m, i) => (
        <mesh key={i} geometry={rbox(0.28, 0.07, 0.02, 0.02)} material={m} position={[(i - 1) * 0.29, -0.48, 0.3]} />
      ))}
      <mesh geometry={rbox(0.2, 0.68, 0.1, 0.03)} material={M.ink} position={[0, -0.1, -0.12]} />
      {SLABS.map((y, i) => (
        <group key={i} position-y={y}>
          {[-1, 1].map((k) => (
            <group key={k} position-x={k * 0.25}>
              <mesh geometry={rbox(0.3, 0.09, 0.45, 0.035)} material={M.cream} />
              <mesh ref={(m) => (pips.current[i * 2 + (k + 1) / 2] = m)} geometry={rbox(0.1, 0.06, 0.02, 0.02)} material={M.ink} position={[k * 0.06, 0, 0.226]} />
            </group>
          ))}
        </group>
      ))}
      {TOKS.map((m, i) => <mesh key={i} ref={(r) => (toks.current[i] = r)} geometry={rbox(0.1, 0.1, 0.1, 0.025)} material={m} position={[0, TOK_Y0, 0.06]} />)}
      <group ref={bubble} position={[0, 0.46, 0.02]}>
        <mesh geometry={rbox(0.84, 0.32, 0.08, 0.1)} material={M.ink} position-z={-0.02} />
        <mesh geometry={rbox(0.78, 0.26, 0.1, 0.09)} material={M.white} />
        <mesh geometry={rbox(0.12, 0.12, 0.08, 0.03)} material={M.ink} position={[-0.2, -0.16, -0.02]} rotation-z={Math.PI / 4} />
        <mesh geometry={rbox(0.08, 0.08, 0.1, 0.02)} material={M.white} position={[-0.2, -0.13, 0]} rotation-z={Math.PI / 4} />
        {HELLO.map(([text, font], i) => (
          <group key={i} ref={(g) => (words.current[i] = g)} visible={i === 0}>
            <Label text={text} font={font} color="#2a2e38" height={0.2} position-z={0.052} />
            <Label text={text} font={font} color="#2a2e38" height={0.2} position-z={-0.052} rotation-y={Math.PI} />
          </group>
        ))}
      </group>
    </group>
  );
}

// ---------- fallback: "?" item box ----------
function ItemBox() {
  return (
    <group rotation={[0.25, 0.5, 0]}>
      <mesh geometry={rbox(0.7, 0.7, 0.7, 0.12)} material={M.cream} />
      {[0, 1, 2, 3].map((i) => (
        <group key={i} rotation-y={(i * Math.PI) / 2}>
          <Label text="?" color="#ff4d4d" height={0.46} position-z={0.352} />
        </group>
      ))}
    </group>
  );
}

// id → [component, spin speed while active]
const MAP = {
  about: [About, 1.6],
  blockdrop: [BlockDrop],
  pixeljumper: [PixelJumper],
  bytesnake: [ByteSnake],
  research: [Research, 0.6],
  jocata: [Jocata],
  cloudnuro: [CloudNuro],
  cuffka: [Cuffka],
  docspp: [Docspp],
  hawkes: [Hawkes],
  churnsense: [ChurnSense],
  cshell: [CShell],
  sham: [Sham],
  buysell: [BuySell, 0.9],
  bharatslm: [BharatSLM],
};
export const DIORAMA_IDS = Object.keys(MAP);

export default function Diorama({ id, active = false, colors }) {
  const [Comp, spin] = MAP[id] ?? [ItemBox, 1.2];
  const phase = useMemo(() => [...(id ?? "")].reduce((a, c) => a + c.charCodeAt(0), 0) % 7, [id]);
  return (
    <Shell active={active} spin={spin} phase={phase}>
      <Comp active={active} colors={colors} />
    </Shell>
  );
}
