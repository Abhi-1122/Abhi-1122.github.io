"use client";
import { Suspense, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { PresentationControls, RoundedBox } from "@react-three/drei";
import { easing } from "maath";
import Stage from "./Stage";
import Diorama from "./Dioramas";
import { themeColors, textTexture, PLASTIC } from "./textures";
import { useGfx } from "../../lib/gfx";
import { PALETTES, byLuminance } from "../../lib/palettes";

// A tech-stack "move" as a mini cartridge orbiting the diorama, always facing the camera.
function MoveCart({ label, index, count, radius, paperIsLight }) {
  const ref = useRef();
  const { texture, aspect } = useMemo(
    () => textTexture(label.toUpperCase(), { font: "400 34px Press Start 2P", color: "#111111", bg: "#f4f4f0", padding: 14, height: 64 }),
    [label]
  );
  const w = Math.min(1.5, 0.2 * aspect);
  const phase = (index / count) * Math.PI * 2;

  useFrame((state) => {
    const t = state.clock.elapsedTime * 0.35 + phase;
    const g = ref.current;
    g.position.set(Math.cos(t) * radius, 0.75 + Math.sin(t * 2 + index) * 0.2, Math.sin(t) * radius * 0.5);
    g.lookAt(state.camera.position);
  });

  return (
    <group ref={ref}>
      <RoundedBox args={[w + 0.14, 0.36, 0.08]} radius={0.04} smoothness={2}>
        <meshPhysicalMaterial {...PLASTIC} color={paperIsLight ? "#8d8b86" : "#bdbab4"} />
      </RoundedBox>
      <mesh position={[0, 0, 0.045]}>
        <planeGeometry args={[w, 0.2]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  );
}

// Slow handheld-camera drift so the scene never sits still.
function CameraDrift() {
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    // pull back on narrow (phone) frames so the whole scene, orbiting carts included, fits
    const back = 1 / Math.min(1, Math.max(0.5, state.size.width / state.size.height / 1.7));
    easing.damp3(state.camera.position, [Math.sin(t * 0.25) * 0.6 + state.pointer.x * 0.4, 1.1 * back, 6.4 * back], 0.8, dt);
    if (state.scene.fog) {
      state.scene.fog.near = 7 * back; // keep the fog relative to the camera distance
      state.scene.fog.far = 16 * back;
    }
    state.camera.lookAt(0, 0.1, 0);
  });
  return null;
}

// Detail-view hero, staged like a battle screen: diorama on a platform over a receding grid,
// the tech stack orbiting as cartridges. Drag to spin.
export default function HeroScene({ id, tile }) {
  const { palette } = useGfx();
  const shades = (PALETTES[palette] || PALETTES.dmg).shades;
  const paperIsLight = byLuminance(palette)[3] === shades[0];
  const moves = tile.stack.slice(0, 6);
  const line = paperIsLight ? "#5a5a5a" : "#a0a0a0";

  return (
    <Stage camera={{ position: [0, 1.1, 6.4], fov: 34 }} style={{ position: "absolute", inset: 0 }}>
      <color attach="background" args={[paperIsLight ? "#ffffff" : "#000000"]} />
      <fog attach="fog" args={[paperIsLight ? "#ffffff" : "#000000", 7, 16]} />
      <CameraDrift />
      <gridHelper args={[40, 40, line, line]} position={[0, -1.02, 0]} />

      <PresentationControls global={false} cursor snap speed={1.4} polar={[-0.2, 0.3]} azimuth={[-Infinity, Infinity]}>
        <group>
          <Suspense fallback={null}>
            <group scale={2.05} position={[0, 0.45, 0]}>
              <Diorama id={id} active colors={themeColors(tile)} />
            </group>
          </Suspense>
          {/* battle platform */}
          <mesh position={[0, -0.9, 0]} scale={[1, 0.26, 0.62]}>
            <cylinderGeometry args={[1.7, 1.8, 0.5, 48]} />
            <meshPhysicalMaterial {...PLASTIC} color={paperIsLight ? "#9a9a9a" : "#6a6a6a"} />
          </mesh>
          <mesh position={[0, -0.83, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.62, 1]}>
            <ringGeometry args={[1.25, 1.45, 48]} />
            <meshBasicMaterial color={paperIsLight ? "#303030" : "#cfcfcf"} />
          </mesh>
          {moves.map((m, i) => (
            <MoveCart key={m} label={m} index={i} count={moves.length} radius={2.7} paperIsLight={paperIsLight} />
          ))}
        </group>
      </PresentationControls>
    </Stage>
  );
}
