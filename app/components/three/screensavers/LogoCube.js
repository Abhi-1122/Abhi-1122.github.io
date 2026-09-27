"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import Stage from "../Stage";
import { PLASTIC } from "../textures";

// BoxGeometry face groups: +x −x +y −y +z −z — same palette as the CSS cube.
const FACES = ["#E60012", "#E60012", "#14181c", "#14181c", "#00C3E3", "#00C3E3"];

function Cube({ flash }) {
  const ref = useRef();
  const geo = useMemo(() => new RoundedBoxGeometry(1.25, 1.25, 1.25, 5, 0.2), []);
  useEffect(() => () => geo.dispose(), [geo]);

  useFrame((s, dt) => {
    const t = s.clock.elapsedTime;
    const r = Math.pow(1 - Math.min(t / 1.1, 1), 3); // intro tumble, eases out
    ref.current.rotation.set(0.5 + r * Math.PI * 4, 0.6 + t * 0.9 + r * 2, -r * 1.4);
    const glow = flash ? 1.4 : 0.3;
    for (const m of ref.current.material) m.emissiveIntensity += (glow - m.emissiveIntensity) * Math.min(dt * 10, 1);
  });

  return (
    <mesh ref={ref} geometry={geo}>
      {FACES.map((c, i) => (
        <meshPhysicalMaterial key={i} attach={`material-${i}`} {...PLASTIC} color={c} emissive={c} emissiveIntensity={0.3} />
      ))}
    </mesh>
  );
}

// Small transparent canvas that rides inside the DOM-bounced group; padded so bloom isn't clipped.
export default function LogoCube({ size, flash }) {
  const pad = size * 0.6;
  return (
    <div style={{ position: "absolute", left: -pad, top: -pad, width: size + pad * 2, height: size + pad * 2 }}>
      <Stage camera={{ position: [0, 0, 5.8], fov: 30 }} bloom={0.9}>
        <Cube flash={flash} />
      </Stage>
    </div>
  );
}
