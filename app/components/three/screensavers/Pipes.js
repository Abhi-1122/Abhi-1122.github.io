"use client";
import { useLayoutEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import Stage from "../Stage";
import { PLASTIC } from "../textures";
import { useGfx } from "../../../lib/gfx";

// Homage to the Windows "3D Pipes" screensaver.
const COLORS = ["#00C3E3", "#E60012", "#FFC400", "#3FD26A", "#3F6BFF", "#FF4FB0", "#FF8A1F", "#f4f4f4"].map((c) => new THREE.Color(c));
const DIRS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].map((d) => new THREE.Vector3(...d));
const STEP = 0.09; // seconds per segment
const LIFE = 40; // restart after this long…
const FILL = 0.45; // …or once this share of the grid is used
const FADE = 1.2;
const UP = new THREE.Vector3(0, 1, 0);
const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const v = new THREE.Vector3();
const sc = new THREE.Vector3();
const ONE = new THREE.Vector3(1, 1, 1);

function PipeGrid({ n, count }) {
  const segs = useRef();
  const joints = useRef();
  const group = useRef();
  const st = useRef(null);
  const cap = n * n * n;
  const off = (n - 1) / 2;

  const idx = (p) => p.x + n * (p.y + n * p.z);
  const free = (p) => p.x >= 0 && p.y >= 0 && p.z >= 0 && p.x < n && p.y < n && p.z < n && !st.current.grid[idx(p)];
  const take = (p) => { st.current.grid[idx(p)] = 1; st.current.filled++; };

  const joint = (p, color) => {
    const s = st.current;
    m.compose(v.copy(p).subScalar(off), q.identity(), ONE);
    joints.current.setMatrixAt(s.joint, m);
    joints.current.setColorAt(s.joint, color);
    joints.current.count = ++s.joint;
    joints.current.instanceMatrix.needsUpdate = joints.current.instanceColor.needsUpdate = true;
  };

  const spawn = () => {
    const p = new THREE.Vector3();
    for (let i = 0; i < 30; i++) {
      p.set((Math.random() * n) | 0, (Math.random() * n) | 0, (Math.random() * n) | 0);
      if (!free(p)) continue;
      const pipe = { p, dir: null, color: COLORS[(Math.random() * COLORS.length) | 0] };
      take(p);
      joint(p, pipe.color);
      return pipe;
    }
    return null;
  };

  const reset = () => {
    st.current = { grid: new Uint8Array(cap), filled: 0, t: 0, acc: 0, seg: 0, joint: 0, growing: [], end: null };
    segs.current.count = joints.current.count = 0;
    st.current.pipes = Array.from({ length: count }, spawn).filter(Boolean);
  };

  const step = (pipe) => {
    const s = st.current;
    const options = DIRS.filter((d) => free(v.copy(pipe.p).add(d)));
    if (!options.length) return false;
    let d = pipe.dir;
    if (!d || !options.includes(d) || Math.random() < 0.22) d = options[(Math.random() * options.length) | 0];
    if (pipe.dir && d !== pipe.dir) joint(pipe.p, pipe.color);
    pipe.dir = d;
    segs.current.setColorAt(s.seg, pipe.color);
    segs.current.instanceColor.needsUpdate = true;
    s.growing.push({ i: s.seg, from: pipe.p.clone(), d, t0: s.t });
    segs.current.count = ++s.seg;
    pipe.p.add(d);
    take(pipe.p);
    return true;
  };

  useLayoutEffect(() => {
    // create the instanceColor buffers before first render
    segs.current.setColorAt(0, COLORS[0]);
    joints.current.setColorAt(0, COLORS[0]);
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, count]);

  useFrame((state, delta) => {
    const s = st.current;
    const dt = Math.min(delta, 0.1);
    s.t += dt;
    group.current.rotation.y += dt * 0.12;

    if (s.end === null) {
      s.acc += dt;
      while (s.acc >= STEP) {
        s.acc -= STEP;
        s.pipes = s.pipes.map((p) => (step(p) ? p : (joint(p.p, p.color), spawn()))).filter(Boolean);
      }
      if (s.t > LIFE || s.filled > cap * FILL || !s.pipes.length) s.end = s.t;
    }

    // grow the newest segments smoothly from their start cell
    s.growing = s.growing.filter((g) => {
      const k = Math.min((s.t - g.t0) / STEP, 1);
      q.setFromUnitVectors(UP, g.d);
      m.compose(v.copy(g.d).multiplyScalar(k / 2).add(g.from).subScalar(off), q, sc.set(1, k, 1));
      segs.current.setMatrixAt(g.i, m);
      return k < 1;
    });
    segs.current.instanceMatrix.needsUpdate = true;

    const fade = s.end === null ? Math.min(s.t / 0.6, 1) : 1 - (s.t - s.end) / FADE;
    state.gl.domElement.style.opacity = Math.max(fade, 0);
    if (fade <= 0) reset();
  });

  return (
    <group ref={group} rotation-x={0.35} scale={11 / (n - 1)}>
      <instancedMesh ref={segs} args={[null, null, cap]} frustumCulled={false}>
        <cylinderGeometry args={[0.19, 0.19, 1, 16, 1, true]} />
        <meshPhysicalMaterial {...PLASTIC} />
      </instancedMesh>
      <instancedMesh ref={joints} args={[null, null, cap]} frustumCulled={false}>
        <sphereGeometry args={[0.27, 20, 14]} />
        <meshPhysicalMaterial {...PLASTIC} />
      </instancedMesh>
    </group>
  );
}

export default function Pipes() {
  const { lite } = useGfx();
  return (
    <div className="absolute inset-0">
      <Stage camera={{ position: [0, 0, 30], fov: 40 }} bloom={0.12}>
        <PipeGrid n={lite ? 9 : 12} count={lite ? 3 : 5} />
      </Stage>
    </div>
  );
}
