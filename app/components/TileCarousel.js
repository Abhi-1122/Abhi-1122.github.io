"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useAnimation } from "framer-motion";
import Tile from "./Tile";
import SectionDivider, { DIVIDER_LABELS } from "./SectionDivider";
import { useElementWidth } from "../hooks/useElementWidth";
import { useGfx } from "../lib/gfx";

const CarouselScene = dynamic(() => import("./three/CarouselScene"), { ssr: false });

const ANGLE_STEP = 0.4; // radians between adjacent items along the arc
const DRAG_THRESHOLD = 8; // px before a press becomes a drag

function buildDisplayItems(tiles) {
  const items = [];
  let prevCategory = null;
  tiles.forEach((tile, tileIndex) => {
    if (tile.category && tile.category !== prevCategory) {
      items.push({ kind: "divider", key: `divider-${tile.category}`, category: tile.category, label: DIVIDER_LABELS[tile.category] || tile.category });
    }
    if (tile.category) prevCategory = tile.category;
    items.push({ kind: "tile", key: tile.id, tile, tileIndex });
  });
  return items;
}

// Shown under the carousel once focus has rested on a tile for a moment.
function PreviewCard({ tile }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.15, ease: (t) => Math.round(t * 4) / 4 }}
      className="overflow-hidden"
    >
      <div className="flex flex-wrap items-center gap-1.5 pt-2 font-display text-[7px] sm:text-[8px]">
        <span className="bg-gb-3 px-1.5 py-1 text-gb-0">{tile.period.toUpperCase()}</span>
        {tile.stack.slice(0, 4).map((s, i) => (
          <motion.span
            key={s}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.06 * i, duration: 0 }}
            className="border-2 border-gb-3 px-1.5 py-0.5"
          >
            {s.toUpperCase()}
          </motion.span>
        ))}
      </div>
    </motion.div>
  );
}

export default function TileCarousel({ tiles, activeIndex, onFocus, onLaunch, onHoverSound, bump, hiddenTileIndex, filter, dark, paused }) {
  const gfx = useGfx();
  const [containerRef, containerWidth, measuredHeight] = useElementWidth();
  const shakeControls = useAnimation();
  const dragRef = useRef(null);
  const [dragPx, setDragPx] = useState(0);
  const [resting, setResting] = useState(false);
  const active = tiles[activeIndex];

  useEffect(() => {
    if (!bump?.dir) return;
    const dx = bump.dir === "left" ? -1 : 1;
    shakeControls.start({
      x: [0, dx * -14, dx * 10, dx * -6, 0],
      transition: { duration: 0.4, ease: "easeOut" },
    });
  }, [bump?.nonce, bump?.dir, shakeControls]);

  useEffect(() => {
    setResting(false);
    const t = window.setTimeout(() => setResting(true), 600);
    return () => clearTimeout(t);
  }, [activeIndex]);

  const isDesktop = containerWidth >= 640;
  const tileSize = isDesktop ? 180 : 116;
  const spacing = isDesktop ? 208 : 125;
  const radiusY = isDesktop ? 53 : 29;
  const containerHeight = Math.max(isDesktop ? 300 : 225, measuredHeight);
  const topPad = Math.max(isDesktop ? 62 : 41, (containerHeight - tileSize * 1.3) / 2);

  const displayItems = useMemo(() => buildDisplayItems(tiles), [tiles]);
  const activeDisplayIndex = displayItems.findIndex((it) => it.kind === "tile" && it.tileIndex === activeIndex);

  // Pointer drag with momentum: the row follows the finger/mouse, then snaps
  // to the tile nearest to where the flick would land.
  function onPointerDown(e) {
    if (e.button !== 0) return;
    dragRef.current = { x: e.clientX, last: e.clientX, t: performance.now(), v: 0, dragging: false };
  }
  function onPointerMove(e) {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (!d.dragging && Math.abs(dx) < DRAG_THRESHOLD) return;
    if (!d.dragging) e.currentTarget.setPointerCapture?.(e.pointerId);
    d.dragging = true;
    const now = performance.now();
    d.v = (e.clientX - d.last) / Math.max(1, now - d.t);
    d.last = e.clientX;
    d.t = now;
    setDragPx(dx);
  }
  function onPointerUp(e) {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d?.dragging) return;
    // swallow the click that follows a drag in the 2D carousel
    const swallow = (ev) => ev.stopPropagation();
    window.addEventListener("click", swallow, { capture: true, once: true });
    window.setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 0);
    const px = e.clientX - d.x + d.v * 180;
    const steps = Math.round(-px / (isDesktop ? 208 : 125));
    setDragPx(0);
    if (steps) onFocus(activeIndex + steps);
  }

  // 2D fallback layout: cumulative x per slot — extra room before a divider,
  // tight right after it (so the label hugs the section it introduces).
  const slotX = useMemo(() => {
    const xs = [0];
    for (let i = 1; i < displayItems.length; i++) {
      const prev = displayItems[i - 1];
      const cur = displayItems[i];
      let gap = spacing;
      if (cur.kind === "divider") gap = spacing * 1.4;
      else if (prev.kind === "divider") gap = spacing * 0.58;
      xs.push(xs[i - 1] + gap);
    }
    return xs;
  }, [displayItems, spacing]);

  function render2D() {
    // Pan the whole row so the active item is centered when there's room
    // on both sides; clamp near the ends so nothing spills past the edges.
    const totalSpan = slotX[slotX.length - 1];
    const idealPan = containerWidth / 2 - slotX[activeDisplayIndex];
    const minPan = tileSize / 2;
    const maxPan = containerWidth - totalSpan - tileSize / 2;
    const pan = (minPan <= maxPan ? Math.min(maxPan, Math.max(minPan, idealPan)) : idealPan) + dragPx;

    return displayItems.map((item, di) => {
      const offset = di - activeDisplayIndex;
      const angle = offset * ANGLE_STEP;
      const cosA = Math.cos(angle);
      const y = (1 - cosA) * radiusY;
      const scale = 0.8 + 0.38 * ((cosA + 1) / 2);
      const isHidden = item.kind === "tile" && item.tileIndex === hiddenTileIndex;
      const dim = filter && item.kind === "tile" && !filter.has(item.tile.id);
      const opacity = isHidden ? 0 : Math.max(0.18, 1 - Math.abs(offset) * 0.24) * (dim ? 0.35 : 1);
      const zIndex = Math.round(cosA * 100) + 100;
      const isActive = offset === 0;

      return (
        <motion.div
          key={item.key}
          className="absolute"
          initial={false}
          animate={{
            left: pan + slotX[di] - tileSize / 2,
            top: topPad + y,
            scale: dim ? scale * 0.9 : scale,
            opacity,
          }}
          transition={dragPx ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 26 }}
          style={{ zIndex }}
        >
          {item.kind === "divider" ? (
            <SectionDivider category={item.category} size={tileSize} />
          ) : (
            <Tile
              tile={item.tile}
              isActive={isActive}
              size={tileSize}
              onHoverSound={onHoverSound}
              onSelect={() => {
                onFocus(item.tileIndex);
                if (isActive) {
                  // already centered — launch straight from its current, settled position
                  onLaunch(item.tileIndex);
                } else {
                  // let it finish springing to center first, then launch from the
                  // settled position — otherwise the re-center and the launch
                  // animation fight each other and it looks glitchy
                  window.setTimeout(() => onLaunch(item.tileIndex), 420);
                }
              }}
            />
          )}
        </motion.div>
      );
    });
  }

  const arrowTop = containerHeight / 2 + 6;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col items-center py-1.5">
      <button
        type="button"
        onClick={() => onFocus(activeIndex - 1)}
        aria-label="Previous tile"
        style={{ top: arrowTop }}
        className="pixel-btn absolute left-1 z-[250] hidden h-9 w-9 -translate-y-1/2 items-center justify-center font-display text-[12px] sm:flex"
      >
        ◀
      </button>

      <motion.div
        ref={containerRef}
        animate={shakeControls}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          dragRef.current = null;
          setDragPx(0);
        }}
        className={`relative min-h-[225px] w-full flex-1 touch-pan-y select-none overflow-hidden sm:min-h-[300px] ${dragPx ? "cursor-grabbing" : ""}`}
      >
        {containerWidth > 0 &&
          (gfx.use3D ? (
            <CarouselScene
              items={displayItems}
              activeIndex={activeIndex}
              activeDisplayIndex={activeDisplayIndex}
              dragPx={dragPx}
              hiddenTileIndex={hiddenTileIndex}
              filter={filter}
              onFocus={onFocus}
              onLaunch={onLaunch}
              onHoverSound={onHoverSound}
              dark={dark}
              paused={paused}
            />
          ) : (
            render2D()
          ))}
      </motion.div>

      {/* Keyboard / screen-reader access to the (canvas-rendered) 3D tiles */}
      {gfx.use3D && (
        <div className="sr-only">
          {tiles.map((t, i) => (
            <button key={t.id} type="button" onFocus={() => onFocus(i)} onClick={() => onLaunch(i)} aria-label={`${t.title}: ${t.label}`}>
              {t.title}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => onFocus(activeIndex + 1)}
        aria-label="Next tile"
        style={{ top: arrowTop }}
        className="pixel-btn absolute right-1 z-[250] hidden h-9 w-9 -translate-y-1/2 items-center justify-center font-display text-[12px] sm:flex"
      >
        ▶
      </button>

      <div className="pixel-box relative mt-2 min-h-[74px] w-full max-w-[720px] text-left">
        <AnimatePresence mode="wait">
          <motion.div
            key={active.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12, ease: (t) => Math.round(t * 3) / 3 }}
          >
            <p className="font-display text-[10px] leading-relaxed sm:text-[12px]">{active.title.toUpperCase()}</p>
            <p className="mt-1 font-sans text-[14px] leading-snug sm:text-[16px]">{active.label}</p>
          </motion.div>
        </AnimatePresence>
        <AnimatePresence>{resting && <PreviewCard key={active.id} tile={active} />}</AnimatePresence>
        <span className="caret-blink absolute bottom-1.5 right-3 font-display text-[10px]">▼</span>
      </div>
    </div>
  );
}
