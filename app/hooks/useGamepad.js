"use client";
import { useEffect, useRef } from "react";

// Standard-mapping button index → key. Face-bottom confirms, face-right backs out
// (the common web convention; on a Switch Pro controller that's B/A).
const BUTTON_KEYS = { 0: "Enter", 1: "Escape", 12: "ArrowUp", 13: "ArrowDown", 14: "ArrowLeft", 15: "ArrowRight" };
const REPEAT_MS = 220;

// Gamepads drive the site by synthesizing the same key events the keyboard sends,
// so navigation, modals and the arcade games all work without extra wiring.
export function useGamepad(onConnect) {
  const cb = useRef(onConnect);
  cb.current = onConnect;

  useEffect(() => {
    let raf = null;
    const held = {};
    const send = (key, type) => window.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true }));

    function press(id, key, down, now) {
      if (down && (!held[id] || now - held[id] > REPEAT_MS * (held[id + "r"] ? 1 : 2))) {
        held[id + "r"] = !!held[id];
        held[id] = now;
        send(key, "keydown");
      } else if (!down && held[id]) {
        held[id] = 0;
        held[id + "r"] = false;
        send(key, "keyup");
      }
    }

    function poll() {
      const now = performance.now();
      const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
      for (const pad of pads) {
        for (const [i, key] of Object.entries(BUTTON_KEYS)) press(`b${i}`, key, !!pad.buttons[i]?.pressed, now);
        const [ax = 0, ay = 0] = pad.axes;
        press("lx-", "ArrowLeft", ax < -0.6, now);
        press("lx+", "ArrowRight", ax > 0.6, now);
        press("ly-", "ArrowUp", ay < -0.6, now);
        press("ly+", "ArrowDown", ay > 0.6, now);
      }
      raf = pads.length ? requestAnimationFrame(poll) : null;
    }

    function onConnected() {
      cb.current?.();
      if (!raf) raf = requestAnimationFrame(poll);
    }
    window.addEventListener("gamepadconnected", onConnected);
    return () => {
      window.removeEventListener("gamepadconnected", onConnected);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
}
