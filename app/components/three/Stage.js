"use client";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer, PerformanceMonitor } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { LcdEffect } from "./LcdEffect";
import { useGfx } from "../../lib/gfx";

// Soft studio lighting built from local lightformers (no HDR download) — gives the
// glossy "Nintendo toy plastic" reflections.
export function StudioLights({ intensity = 1 }) {
  return (
    <>
      <ambientLight intensity={0.55 * intensity} />
      <directionalLight position={[3, 5, 4]} intensity={1.5 * intensity} />
      <Environment resolution={256} frames={1}>
        <Lightformer intensity={2} position={[0, 5, -2]} scale={[10, 5, 1]} rotation-x={Math.PI / 2} />
        <Lightformer intensity={1.4} position={[-5, 1, 1]} scale={[3, 6, 1]} rotation-y={Math.PI / 2} />
        <Lightformer intensity={1.4} position={[5, 1, 1]} scale={[3, 6, 1]} rotation-y={-Math.PI / 2} />
        <Lightformer form="ring" intensity={3} position={[2, 2, 4]} scale={1.5} />
      </Environment>
    </>
  );
}

// Every <Canvas> in the app goes through this: lights, FPS watchdog and the Game Boy LCD
// filter (dither + palette). `pixel` = LCD cell size in CSS px (0 disables).
// Perf: with the LCD on, the scene renders straight at cell resolution (dpr = 1/pixel) and the
// browser upscales it with nearest-neighbour — same look as rendering full-res then snapping,
// for a fraction of the fill cost (the big win on high-DPR phones). `paused` stops the render loop.
export default function Stage({
  children,
  camera = { position: [0, 0, 5], fov: 40 },
  bloom = 0,
  pixel: pixelProp,
  vignette = false,
  lights = true,
  paused = false,
  className,
  style,
  ...rest
}) {
  const gfx = useGfx();
  const pixel = pixelProp ?? gfx.pixel ?? 2;
  const post = [];
  if (gfx.effects && bloom) post.push(<Bloom key="b" mipmapBlur intensity={bloom} luminanceThreshold={0.8} luminanceSmoothing={0.2} />);
  if (gfx.effects && vignette) post.push(<Vignette key="v" offset={0.3} darkness={0.6} />);
  if (pixel) post.push(<LcdEffect key="lcd" palette={gfx.palette} pixel={1} />);

  return (
    <Canvas
      dpr={pixel ? 1 / pixel : gfx.lite ? [1, 1.5] : [1, 2]}
      frameloop={paused ? "never" : "always"}
      // measure layout size, not the transformed box: the console zooms/scales around canvases,
      // and a size measured mid-zoom would stick (oversized, off-centre carousel after closing a page)
      resize={{ offsetSize: true }}
      camera={camera}
      gl={{ alpha: true, antialias: !pixel, powerPreference: "high-performance" }}
      className={className}
      style={pixel ? { imageRendering: "pixelated", ...style } : style}
      {...rest}
    >
      <PerformanceMonitor onDecline={gfx.reportLowFps} />
      {lights && <StudioLights />}
      {children}
      {post.length > 0 && <EffectComposer multisampling={0} frameBufferType={THREE.UnsignedByteType}>{post}</EffectComposer>}
    </Canvas>
  );
}
