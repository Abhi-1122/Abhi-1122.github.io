"use client";
import { forwardRef, useEffect, useMemo } from "react";
import { Uniform, Color } from "three";
import { Effect } from "postprocessing";
import { byLuminance, PALETTES } from "../../lib/palettes";

// Game Boy LCD: snap to a coarse pixel grid, ordered (Bayer) dither, then map brightness onto
// the palette's 4 shades — or, for full-colour palettes, posterise each channel.
const fragment = /* glsl */ `
uniform vec3 uPal0, uPal1, uPal2, uPal3;
uniform float uPixel, uFull;

float bayer4(vec2 p) {
  p = mod(p, 4.0);
  int i = int(p.x) + int(p.y) * 4;
  int m[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
  return float(m[i]) / 16.0;
}

void mainUv(inout vec2 uv) {
  vec2 px = uPixel / resolution;
  uv = (floor(uv / px) + 0.5) * px;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  // transparent canvases: keep empty pixels empty (hard edge, no partial alpha — it's an LCD)
  if (inputColor.a < 0.5) { outputColor = vec4(0.0); return; }
  float d = bayer4(floor(uv * resolution / uPixel)) - 0.47;
  vec3 c = pow(clamp(inputColor.rgb, 0.0, 1.0), vec3(1.0 / 2.2)); // judge brightness perceptually
  if (uFull > 0.5) {
    outputColor = vec4(pow(floor(clamp(c + d * 0.14, 0.0, 1.0) * 5.0 + 0.5) / 5.0, vec3(2.2)), 1.0);
    return;
  }
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  float q = floor(clamp(l + d * 0.3, 0.0, 0.999) * 4.0);
  vec3 col = q < 0.5 ? uPal0 : q < 1.5 ? uPal1 : q < 2.5 ? uPal2 : uPal3;
  outputColor = vec4(col, 1.0);
}
`;

class LcdEffectImpl extends Effect {
  constructor() {
    super("LcdEffect", fragment, {
      uniforms: new Map([
        ["uPal0", new Uniform(new Color())],
        ["uPal1", new Uniform(new Color())],
        ["uPal2", new Uniform(new Color())],
        ["uPal3", new Uniform(new Color())],
        ["uPixel", new Uniform(3)],
        ["uFull", new Uniform(0)],
      ]),
    });
  }
}

export const LcdEffect = forwardRef(function LcdEffect({ palette = "dmg", pixel = 3 }, ref) {
  const effect = useMemo(() => new LcdEffectImpl(), []);
  useEffect(() => {
    // dark → light, so higher luminance picks a lighter shade (works for the inverted backlit palette too)
    byLuminance(palette).forEach((hex, i) => effect.uniforms.get(`uPal${i}`).value.set(hex));
    effect.uniforms.get("uFull").value = PALETTES[palette]?.full ? 1 : 0;
    effect.uniforms.get("uPixel").value = pixel;
  }, [effect, palette, pixel]);
  return <primitive ref={ref} object={effect} dispose={null} />;
});
