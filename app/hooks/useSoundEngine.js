"use client";
import { useCallback, useRef } from "react";

function makeNoiseBuffer(ctx, duration) {
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

// All UI sounds are synthesized on the fly with the Web Audio API —
// no external audio files to source, license, or ship.
export function useSoundEngine(muted) {
  const ctxRef = useRef(null);

  const getCtx = useCallback(() => {
    if (typeof window === "undefined") return null;
    try {
      if (!ctxRef.current) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctxRef.current = new AC();
      }
      if (ctxRef.current.state === "suspended") ctxRef.current.resume().catch(() => {});
      return ctxRef.current;
    } catch {
      return null;
    }
  }, []);

  const tone = useCallback((ctx, { freq = 880, freqEnd = null, duration = 0.08, type = "sine", gain = 0.12, delay = 0 }) => {
    try {
      const t0 = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), t0 + duration);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.connect(g).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + duration + 0.02);
    } catch {
      // ignore — never let a sound glitch break the UI
    }
  }, []);

  const noiseBurst = useCallback((ctx, { duration = 0.25, filterStart = 400, filterEnd = 2200, gain = 0.1 }) => {
    try {
      const t0 = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = makeNoiseBuffer(ctx, duration);
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(filterStart, t0);
      filter.frequency.exponentialRampToValueAtTime(filterEnd, t0 + duration);
      filter.Q.value = 0.9;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(gain, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      src.connect(filter).connect(g).connect(ctx.destination);
      src.start(t0);
    } catch {
      // ignore
    }
  }, []);

  const playHover = useCallback(() => {
    if (muted) return;
    const ctx = getCtx();
    if (!ctx) return;
    tone(ctx, { freq: 1300, duration: 0.045, type: "sine", gain: 0.045 });
  }, [muted, getCtx, tone]);

  const playClick = useCallback(() => {
    if (muted) return;
    const ctx = getCtx();
    if (!ctx) return;
    tone(ctx, { freq: 750, duration: 0.04, type: "sine", gain: 0.06 });
  }, [muted, getCtx, tone]);

  const playLaunch = useCallback(() => {
    if (muted) return;
    const ctx = getCtx();
    if (!ctx) return;
    noiseBurst(ctx, { duration: 0.4, filterStart: 300, filterEnd: 2600, gain: 0.09 });
    tone(ctx, { freq: 300, freqEnd: 1100, duration: 0.35, type: "triangle", gain: 0.05 });
  }, [muted, getCtx, tone, noiseBurst]);

  const playChime = useCallback(() => {
    if (muted) return;
    const ctx = getCtx();
    if (!ctx) return;
    tone(ctx, { freq: 659.25, duration: 0.14, type: "sine", gain: 0.08 });
    tone(ctx, { freq: 987.77, duration: 0.22, type: "sine", gain: 0.08, delay: 0.07 });
  }, [muted, getCtx, tone]);

  const playBonk = useCallback(() => {
    if (muted) return;
    const ctx = getCtx();
    if (!ctx) return;
    tone(ctx, { freq: 140, freqEnd: 65, duration: 0.12, type: "square", gain: 0.11 });
  }, [muted, getCtx, tone]);

  return { playHover, playClick, playLaunch, playChime, playBonk };
}
