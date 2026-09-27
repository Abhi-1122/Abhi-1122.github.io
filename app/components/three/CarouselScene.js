"use client";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { easing } from "maath";
import Stage from "./Stage";
import Diorama from "./Dioramas";
import { gradientTexture, textTexture, themeColors, PLASTIC } from "./textures";
import { useGfx } from "../../lib/gfx";
import { PALETTES, byLuminance } from "../../lib/palettes";

const TILE = 2; // divider height
const CART_W = 1.9;
const CART_H = 2.2;
const CART_D = 0.46;
const FRONT = CART_D / 2 + 0.05; // front face z (extrude depth/2 + bevel)
const SPACING = 2.6;
const RING_R = 7.5; // carousel cylinder radius (world units)
const MAX_THETA = 1.75; // items further round the ring than this are hidden
const CAM_Z = 8.4;
const FOV = 30;

// Rounded-rect shape geometry with 0..1 UVs (ShapeGeometry's default UVs are in shape units).
function roundedRectGeometry(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ShapeGeometry(s, 10);
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) - x) / w, (pos.getY(i) - y) / h);
  return g;
}

// Game cartridge body: rounded bottom corners, chamfered top-right corner, bevelled extrusion.
function cartridgeGeometry() {
  const w = CART_W, h = CART_H, rb = 0.14, rt = 0.06, ch = 0.26;
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + rb, -h / 2);
  s.lineTo(w / 2 - rb, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + rb);
  s.lineTo(w / 2, h / 2 - ch);
  s.lineTo(w / 2 - ch, h / 2);
  s.lineTo(-w / 2 + rt, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - rt);
  s.lineTo(-w / 2, -h / 2 + rb);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + rb, -h / 2);
  const g = new THREE.ExtrudeGeometry(s, { depth: CART_D, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 3, curveSegments: 6 });
  g.translate(0, 0, -CART_D / 2);
  return g;
}
function arrowGeometry() {
  const s = new THREE.Shape();
  s.moveTo(-0.11, 0.06);
  s.lineTo(0.11, 0.06);
  s.lineTo(0, -0.08);
  return new THREE.ShapeGeometry(s);
}

const isClient = typeof window !== "undefined";
const CART_GEO = isClient ? cartridgeGeometry() : null;
const RECESS_GEO = isClient ? roundedRectGeometry(1.62, 1.5, 0.06) : null;
const LABEL_GEO = isClient ? roundedRectGeometry(1.5, 1.38, 0.05) : null;
const ARROW_GEO = isClient ? arrowGeometry() : null;
const RING_GEO = isClient ? roundedRectGeometry(CART_W + 0.3, CART_H + 0.3, 0.22) : null;
const RIDGE_YS = [0.99, 0.93, 0.87, 0.81];
const SHADOW_GEO = isClient ? new THREE.PlaneGeometry(2.4, 1.1) : null;
let _shadowTex = null;
// soft elliptical contact shadow, shared by every cartridge
function shadowTexture() {
  if (_shadowTex) return _shadowTex;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  _shadowTex = new THREE.CanvasTexture(c);
  return _shadowTex;
}

// Camera sits a little above the ring looking down (shows the carts' tops and the ring's curve),
// with a touch of mouse parallax.
function CameraRig() {
  useFrame((state, dt) => {
    // move in on narrow (portrait) screens so the focused cart fills the view
    const z = CAM_Z * Math.min(1, Math.max(0.7, state.size.width / state.size.height / 1.4));
    easing.damp3(state.camera.position, [state.pointer.x * 0.5, 1.35 + state.pointer.y * 0.2, z], 0.5, dt);
    state.camera.lookAt(0, -0.2, -1);
  });
  return null;
}

// Place a group on the ring: `off` = arc distance from the front, `lift` 0..1 pops the focused item forward.
const _pos = new THREE.Vector3();
function placeOnRing(g, off, lift, reach = Infinity) {
  const theta = off / RING_R;
  // skip items round the back of the ring or outside the view (cheap culling for phones)
  g.visible = Math.abs(theta) < MAX_THETA && Math.abs(RING_R * Math.sin(theta)) < reach;
  _pos.set(RING_R * Math.sin(theta), lift * 0.12, RING_R * (Math.cos(theta) - 1) + lift * 0.8);
  g.position.copy(_pos);
  g.rotation.set(0, theta, 0);
}

function slotPositions(items) {
  const xs = [0];
  for (let i = 1; i < items.length; i++) {
    let gap = SPACING;
    if (items[i].kind === "divider") gap = SPACING * 0.78;
    else if (items[i - 1].kind === "divider") gap = SPACING * 0.62;
    xs.push(xs[i - 1] + gap);
  }
  return xs;
}

// The cartridge itself: grey shell, grip ridges, recessed label (tile art + title strip), arrow.
function Cartridge({ tile, map, dim }) {
  const title = useMemo(
    () => textTexture(tile.title.toUpperCase(), { font: "400 30px Press Start 2P", color: "#ffffff", bg: "#141414", padding: 14, height: 56 }),
    [tile.title]
  );
  const band = useMemo(() => textTexture("GAME DECK", { font: "400 22px Press Start 2P", color: "#d8d8d8", bg: "#141414", padding: 10, height: 36 }), []);
  const titleW = Math.min(1.4, 0.2 * title.aspect);
  const body = dim ? "#5d5c59" : "#b9b7b2";
  return (
    <group>
      <mesh geometry={CART_GEO}>
        <meshPhysicalMaterial {...PLASTIC} roughness={0.55} clearcoat={0.4} color={body} />
      </mesh>
      {RIDGE_YS.map((y) => (
        <mesh key={y} position={[-0.2, y, FRONT + 0.008]}>
          <boxGeometry args={[1.3, 0.028, 0.016]} />
          <meshStandardMaterial color="#8f8d88" roughness={0.7} />
        </mesh>
      ))}
      <mesh geometry={RECESS_GEO} position={[0, -0.04, FRONT + 0.002]}>
        <meshStandardMaterial color="#8f8d88" roughness={0.8} />
      </mesh>
      <mesh geometry={LABEL_GEO} position={[0, -0.04, FRONT + 0.005]}>
        <meshPhysicalMaterial map={map} roughness={0.35} clearcoat={0.6} color={dim ? "#6b6b6b" : "#ffffff"} />
      </mesh>
      <mesh position={[0, 0.56, FRONT + 0.007]}>
        <planeGeometry args={[1.5, 0.16]} />
        <meshBasicMaterial map={band.texture} toneMapped={false} />
      </mesh>
      <mesh position={[0, -0.6, FRONT + 0.007]}>
        <planeGeometry args={[1.5, 0.26]} />
        <meshBasicMaterial color="#141414" />
      </mesh>
      <mesh position={[0, -0.6, FRONT + 0.008]}>
        <planeGeometry args={[titleW, titleW / title.aspect]} />
        <meshBasicMaterial map={title.texture} toneMapped={false} />
      </mesh>
      <mesh geometry={ARROW_GEO} position={[0, -0.93, FRONT + 0.003]}>
        <meshStandardMaterial color="#7d7b76" roughness={0.8} />
      </mesh>
    </group>
  );
}

function TileMesh({ tile, tileIndex, isActive, dim, hidden, slot, ring, reach, onFocus, onLaunch, onHoverSound, focusedAt, ink }) {
  const lift = useRef(isActive ? 1 : 0);
  const group = useRef();
  const tilt = useRef();
  const ringMat = useRef();
  const hovered = useRef(false);
  const colors = useMemo(() => themeColors(tile), [tile]);
  const map = useMemo(() => gradientTexture(colors), [colors]);
  const { reducedMotion } = useGfx();


  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    easing.damp(lift, "current", isActive ? 1 : 0, 0.15, dt);
    placeOnRing(g, slot - ring.current, lift.current, reach);
    if (hidden) g.visible = false;
    // focus "pop": quick overshoot right after becoming active
    const since = state.clock.elapsedTime - (focusedAt.current ?? -10);
    const pop = isActive && since < 0.45 && !reducedMotion ? Math.sin((since / 0.45) * Math.PI) * 0.08 : 0;
    const s = (0.84 + 0.3 * lift.current) * (1 + pop) * (dim ? 0.86 : 1);
    easing.damp3(g.scale, [s, s, s], 0.12, dt);

    // active tile leans toward the pointer and bobs gently
    const t = tilt.current;
    const time = state.clock.elapsedTime;
    const sway = isActive && !reducedMotion ? Math.sin(time * 0.9) * 0.22 : 0; // idle turn shows the cart's thickness
    const tx = isActive ? (hovered.current ? -state.pointer.y * 0.35 : 0.06) : 0;
    const ty = isActive ? (hovered.current ? state.pointer.x * 0.5 : sway) : 0;
    easing.dampE(t.rotation, [tx, ty, 0], 0.15, dt);
    t.position.y = isActive && !reducedMotion ? Math.sin(state.clock.elapsedTime * 1.6) * 0.05 : 0;

    // selection frame blinks in hard steps, like a menu cursor
    if (ringMat.current) ringMat.current.opacity = isActive ? (Math.floor(state.clock.elapsedTime * 2.5) % 2 ? 1 : 0.55) : 0;
  });

  const pan = (e) => (e.clientX / window.innerWidth) * 2 - 1;

  return (
    <group ref={group}>
      <mesh geometry={SHADOW_GEO} position={[0, -CART_H / 2 - 0.32, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <meshBasicMaterial map={shadowTexture()} transparent depthWrite={false} opacity={0.55} color="#000000" />
      </mesh>
      <group
        ref={tilt}
        onPointerOver={(e) => {
          e.stopPropagation();
          hovered.current = true;
          onHoverSound?.(pan(e));
        }}
        onPointerOut={() => {
          hovered.current = false;
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (e.delta > 6) return; // was a drag, not a click
          if (isActive) onLaunch(tileIndex);
          else {
            onFocus(tileIndex);
            window.setTimeout(() => onLaunch(tileIndex), 420);
          }
        }}
      >
        {/* selection frame behind the active tile */}
        <mesh geometry={RING_GEO} position={[0, 0, -0.05]}>
          <meshBasicMaterial ref={ringMat} color={ink} toneMapped={false} transparent opacity={0} />
        </mesh>
        <Cartridge tile={tile} colors={colors} map={map} dim={dim} />
        <group position={[0, 0.06, FRONT + 0.5]} scale={0.98}>
          <Suspense fallback={null}>
            <Diorama id={tile.id} active={isActive} colors={colors} />
          </Suspense>
        </group>
      </group>
    </group>
  );
}

function DividerMesh({ label, slot, ring, reach, ink }) {
  const group = useRef();
  const { texture, aspect } = useMemo(() => textTexture(label, { font: "400 44px 'Press Start 2P'", color: ink, padding: 24, height: 80 }), [label, ink]);
  useFrame(() => placeOnRing(group.current, slot - ring.current, 0, reach));
  const h = 0.4;
  return (
    <group ref={group}>
      <RoundedBox args={[0.78, TILE, 0.3]} radius={0.14} smoothness={4}>
        <meshPhysicalMaterial transmission={1} roughness={0.12} thickness={0.6} ior={1.35} clearcoat={1} color="#ffffff" />
      </RoundedBox>
      <mesh position={[0, 0, 0.16]} rotation={[0, 0, Math.PI / 2]} scale={Math.min(1, (TILE * 0.92) / (h * aspect))}>
        <planeGeometry args={[h * aspect, h]} />
        <meshBasicMaterial map={texture} transparent depthWrite={false} />
      </mesh>
    </group>
  );
}

// Slot arc positions along the cylinder (see placeOnRing) + culling reach.
function useLayout({ items }) {
  const { size } = useThree();
  const xs = useMemo(() => slotPositions(items), [items]);
  const halfW = CAM_Z * Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * (size.width / size.height);
  const unitsPerPx = (2 * halfW) / size.width;


  return { xs, unitsPerPx, reach: halfW + CART_W };
}

// Damps the ring's rotation (as arc length) toward the focused slot, minus any live drag.
function RingDriver({ ring, target }) {
  useFrame((_, dt) => easing.damp(ring, "current", target, 0.2, dt));
  return null;
}

function Scene(props) {
  const { items, activeDisplayIndex, activeIndex, filter, onFocus, onLaunch, onHoverSound, ink } = props;
  const focusedAt = useRef(null);
  const clock = useThree((s) => s.clock);

  useEffect(() => {
    focusedAt.current = clock.elapsedTime;
  }, [activeIndex, clock]);

  const { xs, unitsPerPx, reach } = useLayout(props);
  const ring = useRef(null);
  if (ring.current === null) ring.current = xs[activeDisplayIndex] ?? 0;
  const ringTarget = (xs[activeDisplayIndex] ?? 0) - props.dragPx * unitsPerPx;

  return (
    <>
      <RingDriver ring={ring} target={ringTarget} />
      <CameraRig />
      {items.map((item, di) =>
        item.kind === "divider" ? (
          <DividerMesh key={item.key} label={item.label} slot={xs[di]} ring={ring} reach={reach} ink={ink} />
        ) : (
          <TileMesh
            key={item.key}
            tile={item.tile}
            tileIndex={item.tileIndex}
            isActive={di === activeDisplayIndex}
            hidden={item.tileIndex === props.hiddenTileIndex}
            dim={filter ? !filter.has(item.tile.id) : false}
            slot={xs[di]}
            ring={ring}
            reach={reach}
            onFocus={onFocus}
            onLaunch={onLaunch}
            onHoverSound={onHoverSound}
            focusedAt={focusedAt}
            ink={ink}
          />
        )
      )}
    </>
  );
}

export default function CarouselScene(props) {
  const { palette } = useGfx();
  const shades = (PALETTES[palette] || PALETTES.dmg).shades;
  return (
    <Stage camera={{ position: [0, 1.35, CAM_Z], fov: FOV }} paused={props.paused} style={{ position: "absolute", inset: 0 }}>
      {/* clear to a luminance extreme so the LCD filter maps it to a solid paper shade (no dither speckle) */}
      <color attach="background" args={[byLuminance(palette)[3] === shades[0] ? "#ffffff" : "#000000"]} />
      <Scene {...props} ink={shades[3]} />
    </Stage>
  );
}
