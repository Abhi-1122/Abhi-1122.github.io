"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import Stage from "../Stage";
import { useGfx } from "../../../lib/gfx";

const FAR = -110;
const m = new THREE.Matrix4();
const col = new THREE.Color();

function Stars({ count }) {
  const ref = useRef();
  const stars = useMemo(() => {
    const place = (s, anyZ) => {
      const a = Math.random() * Math.PI * 2;
      const r = 1.4 + Math.random() * Math.random() * 26;
      s.x = Math.cos(a) * r;
      s.y = Math.sin(a) * r;
      s.z = anyZ ? FAR + Math.random() * (5 - FAR) : FAR - Math.random() * 10;
      return s;
    };
    const list = Array.from({ length: count }, () => place({}, true));
    list.place = place;
    return list;
  }, [count]);

  useEffect(() => {
    // mostly icy white, some brand cyan, a few red; >1 so bloom picks them up
    stars.forEach((_, i) => {
      const p = Math.random();
      col.set(p < 0.72 ? "#d8ecff" : p < 0.92 ? "#00C3E3" : "#ff4d5e").multiplyScalar(1.6);
      ref.current.setColorAt(i, col);
    });
    ref.current.instanceColor.needsUpdate = true;
  }, [stars]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const speed = 6 + Math.min(state.clock.elapsedTime / 30, 1) * 34; // gentle ramp to warp
    const len = 0.3 + speed * 0.07;
    stars.forEach((s, i) => {
      s.z += speed * dt;
      if (s.z > 6) stars.place(s, false);
      m.makeScale(1, 1, len).setPosition(s.x, s.y, s.z - len / 2);
      ref.current.setMatrixAt(i, m);
    });
    ref.current.instanceMatrix.needsUpdate = true;
    // pointer nudges the vanishing point
    const cam = state.camera;
    cam.rotation.y += (-state.pointer.x * 0.14 - cam.rotation.y) * dt * 2;
    cam.rotation.x += (state.pointer.y * 0.09 - cam.rotation.x) * dt * 2;
  });

  return (
    <instancedMesh ref={ref} args={[null, null, count]} frustumCulled={false}>
      <boxGeometry args={[0.045, 0.045, 1]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

export default function Starfield() {
  const { lite } = useGfx();
  return (
    <div className="absolute inset-0">
      <Stage camera={{ position: [0, 0, 5], fov: 60 }} lights={false} bloom={0.8}>
        <fog attach="fog" args={["#000", 30, 110]} />
        <Stars count={lite ? 500 : 1400} />
      </Stage>
    </div>
  );
}
