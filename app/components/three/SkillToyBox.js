"use client";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { CuboidCollider, Physics, RigidBody } from "@react-three/rapier";
import Stage from "./Stage";
import { PLASTIC, paletteColors, textTexture } from "./textures";
import { useGfx } from "../../lib/gfx";
import { SKILLS } from "../../data/portfolioData";
import { SKILL_GROUP_COLORS } from "../../lib/skills";

const WALL = 0.9, T = 0.2; // tray wall height, thickness
const CH = 0.34, CD = 0.62, LH = 0.4; // chip height, depth, label height
const GRAB_Y = 1.4;

const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -GRAB_Y);
const hit = new THREE.Vector3();

// Chips wear a paper "cartridge sticker" with ink text: max contrast through the LCD filter.
function Chip({ skill, color, sticker, index, tray: [W, D], drag, bodies, onPickSkill }) {
  const label = textTexture(skill, { font: "48px DotGothic16", color: sticker[1], bg: sticker[0], height: 60, padding: 10 });
  const w = Math.max(0.8, LH * label.aspect + 0.2);
  // rain in from a grid of columns, a layer at a time
  const spawn = useMemo(() => {
    const cols = Math.max(2, Math.floor(W / 2.2));
    const x = -W / 2 + ((index % cols) + 0.5) * (W / cols);
    return [THREE.MathUtils.clamp(x, -W / 2 + w / 2 + 0.1, W / 2 - w / 2 - 0.1), 2.5 + Math.floor(index / cols) * 0.8, (Math.random() - 0.5) * (D - 1)];
  }, [index, w, W, D]);
  const face = (y, flip) => (
    <mesh position={[0, y, 0]} rotation={[flip ? Math.PI / 2 : -Math.PI / 2, 0, 0]}>
      <planeGeometry args={[LH * label.aspect, LH]} />
      <meshBasicMaterial map={label.texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
  return (
    <RigidBody
      ref={(b) => {
        bodies.current[index] = b;
      }}
      colliders={false}
      position={spawn}
      rotation={[0, (Math.random() - 0.5) * 0.8, 0]}
      restitution={0.25}
      friction={0.7}
      angularDamping={0.6}
    >
      <CuboidCollider args={[w / 2, CH / 2, CD / 2]} />
      <group
        onPointerOver={() => !drag.current && (document.body.style.cursor = "grab")}
        onPointerOut={() => !drag.current && (document.body.style.cursor = "")}
        onPointerDown={(e) => {
          e.stopPropagation();
          e.target.setPointerCapture(e.pointerId);
          drag.current = { body: bodies.current[index], x: e.clientX, y: e.clientY, t: performance.now(), moved: false };
          document.body.style.cursor = "grabbing";
        }}
        onPointerUp={(e) => {
          const d = drag.current;
          if (!d) return;
          drag.current = null;
          document.body.style.cursor = "grab";
          e.target.releasePointerCapture?.(e.pointerId);
          if (!d.moved && performance.now() - d.t < 500) onPickSkill?.(skill);
        }}
      >
        <RoundedBox args={[w, CH, CD]} radius={0.1} smoothness={3}>
          <meshPhysicalMaterial {...PLASTIC} color={color} />
        </RoundedBox>
        {face(CH / 2 + 0.002)}
        {face(-CH / 2 - 0.002, true)}
      </group>
    </RigidBody>
  );
}

// Held chip chases the pointer's point on a horizontal plane via velocity, so letting go flings it.
function Dragger({ drag, tray: [W, D] }) {
  useFrame(({ raycaster, pointer, camera }) => {
    const d = drag.current;
    if (!d?.body) return;
    raycaster.setFromCamera(pointer, camera);
    if (!raycaster.ray.intersectPlane(plane, hit)) return;
    hit.x = THREE.MathUtils.clamp(hit.x, -W / 2 + 0.5, W / 2 - 0.5);
    hit.z = THREE.MathUtils.clamp(hit.z, -D / 2 + 0.4, D / 2 - 0.4);
    const p = d.body.translation();
    const v = new THREE.Vector3(hit.x - p.x, hit.y - p.y, hit.z - p.z).multiplyScalar(14);
    v.clampLength(0, 22);
    d.body.setLinvel(v, true);
    const a = d.body.angvel();
    d.body.setAngvel({ x: a.x * 0.85, y: a.y * 0.85, z: a.z * 0.85 }, true);
  });
  useEffect(() => {
    const move = (e) => {
      const d = drag.current;
      if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 5) d.moved = true;
    };
    const up = () => (drag.current = null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => (window.removeEventListener("pointermove", move), window.removeEventListener("pointerup", up));
  }, [drag]);
  return null;
}

function Tray({ tray: [W, D], onShake }) {
  const wall = (pos, size, color) => (
    <RoundedBox args={size} position={pos} radius={0.08} smoothness={3}>
      <meshPhysicalMaterial {...PLASTIC} color={color} />
    </RoundedBox>
  );
  const hw = W / 2 + T / 2, hd = D / 2 + T / 2, ww = W + T * 2;
  return (
    <RigidBody type="fixed" colliders={false}>
      {/* floor, walls, plus tall invisible walls + lid so flung chips stay in */}
      <CuboidCollider args={[W / 2 + T, 0.25, D / 2 + T]} position={[0, -0.25, 0]} />
      <CuboidCollider args={[T / 2, 15, D / 2 + T]} position={[-hw, 15, 0]} />
      <CuboidCollider args={[T / 2, 15, D / 2 + T]} position={[hw, 15, 0]} />
      <CuboidCollider args={[W / 2 + T, 15, T / 2]} position={[0, 15, -hd]} />
      <CuboidCollider args={[W / 2 + T, 15, T / 2]} position={[0, 15, hd]} />
      <CuboidCollider args={[W / 2 + T, 0.5, D / 2 + T]} position={[0, 30, 0]} />
      <mesh position={[0, -0.25, 0]} onDoubleClick={onShake}>
        <boxGeometry args={[ww, 0.5, D + T * 2]} />
        <meshPhysicalMaterial {...PLASTIC} color="#f4f4f4" />
      </mesh>
      {wall([-hw, WALL / 2, 0], [T, WALL, D + T * 2], "#00C3E3")}
      {wall([hw, WALL / 2, 0], [T, WALL, D + T * 2], "#00C3E3")}
      {wall([0, WALL / 2, -hd], [ww, WALL, T], "#E60012")}
      {wall([0, WALL / 2 - 0.2, hd], [ww, WALL - 0.4, T], "#E60012")}
    </RigidBody>
  );
}

function Ready({ onReady }) {
  useEffect(onReady, [onReady]);
  return null;
}

// Frame the tray: back off until both its width and (foreshortened) depth fit the view.
function Rig({ tray: [W, D] }) {
  const { camera, size } = useThree();
  useEffect(() => {
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const d = Math.max((W / 2 + 1.5) / (t * (size.width / size.height)), (D * 0.5 + 1) / t);
    camera.position.set(0, d * 0.78, d * 0.63);
    camera.lookAt(0, -0.3, 0);
  }, [camera, size, W, D]);
  return null;
}

export default function SkillToyBox({ onPickSkill, height = 420 }) {
  const { palette } = useGfx();
  const [ready, setReady] = useState(false);
  const [portrait, setPortrait] = useState(false);
  const box = useRef();
  const drag = useRef(null);
  const bodies = useRef([]);
  const chips = useMemo(() => {
    const [paper, , , ink] = paletteColors();
    return SKILLS.flatMap((g) => g.items.map((skill) => ({ skill, color: SKILL_GROUP_COLORS[g.group], sticker: [paper, ink] })));
  }, [palette]);
  // tray area scales with the chip count; narrow screens get a tall tray
  const area = chips.length * 1.5;
  const tray = portrait ? [6.4, area / 6.4] : [Math.sqrt(area * 2), Math.sqrt(area / 2)];
  useEffect(() => () => void (document.body.style.cursor = ""), []);
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setPortrait(e.contentRect.width < e.contentRect.height * 1.1));
    ro.observe(box.current);
    return () => ro.disconnect();
  }, []);

  const shake = () =>
    bodies.current.forEach((b) => {
      if (!b) return;
      const m = b.mass();
      b.applyImpulse({ x: (Math.random() - 0.5) * 3 * m, y: (5 + Math.random() * 3) * m, z: (Math.random() - 0.5) * 3 * m }, true);
      b.applyTorqueImpulse({ x: (Math.random() - 0.5) * 0.3 * m, y: (Math.random() - 0.5) * 0.3 * m, z: (Math.random() - 0.5) * 0.3 * m }, true);
    });

  return (
    <div ref={box} style={{ height, position: "relative", touchAction: "none" }}>
      <Stage camera={{ position: [0, 10, 9], fov: 40 }}>
        <Rig tray={tray} />
        <Suspense fallback={null}>
          <Physics key={portrait} gravity={[0, -12, 0]}>
            <Ready onReady={() => setReady(true)} />
            <ambientLight intensity={0.5} />
            <Tray tray={tray} onShake={shake} />
            {chips.map((c, i) => (
              <Chip key={c.skill} {...c} index={i} tray={tray} drag={drag} bodies={bodies} onPickSkill={onPickSkill} />
            ))}
            <Dragger drag={drag} tray={tray} />
          </Physics>
        </Suspense>
      </Stage>
      {ready ? (
        <button onClick={shake} className="pixel-btn absolute bottom-3 right-3 px-3 py-2 font-display text-[10px]">
          SHAKE
        </button>
      ) : (
        <div className="absolute inset-0 grid place-items-center font-display text-[10px] text-gb-2">LOADING…</div>
      )}
    </div>
  );
}
