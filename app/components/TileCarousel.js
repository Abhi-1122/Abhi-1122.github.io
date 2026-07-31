"use client";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { AnimatePresence, motion, useAnimation } from "framer-motion";
import Tile from "./Tile";
import SectionDivider from "./SectionDivider";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";
import { useElementWidth } from "../hooks/useElementWidth";

const ANGLE_STEP = 0.4; // radians between adjacent items along the arc
const SWIPE_THRESHOLD = 40; // px

function buildDisplayItems(tiles) {
  const items = [];
  let prevCategory = null;
  tiles.forEach((tile, tileIndex) => {
    if (tile.category && tile.category !== prevCategory) {
      items.push({ kind: "divider", key: `divider-${tile.category}`, category: tile.category });
    }
    if (tile.category) prevCategory = tile.category;
    items.push({ kind: "tile", key: tile.id, tile, tileIndex });
  });
  return items;
}

const TileCarousel = forwardRef(function TileCarousel(
  { tiles, activeIndex, onFocus, onLaunch, onHoverSound, bump, hiddenTileIndex },
  ref
) {
  const [containerRef, containerWidth] = useElementWidth();
  // Every tile gets its own permanent ref slot, keyed by tileIndex — looked up
  // by whichever index is active at query time, rather than moving one shared
  // ref between different motion.div instances (which framer-motion doesn't
  // reliably support across renders).
  const tileElRefs = useRef({});
  const shakeControls = useAnimation();
  const touchRef = useRef(null);
  const active = tiles[activeIndex];

  useImperativeHandle(ref, () => ({
    getActiveRect: () => tileElRefs.current[activeIndex]?.getBoundingClientRect() ?? null,
  }));

  useEffect(() => {
    if (!bump?.dir) return;
    const dx = bump.dir === "left" ? -1 : 1;
    shakeControls.start({
      x: [0, dx * -14, dx * 10, dx * -6, 0],
      transition: { duration: 0.4, ease: "easeOut" },
    });
  }, [bump?.nonce, bump?.dir, shakeControls]);

  const isDesktop = containerWidth >= 640;
  const tileSize = isDesktop ? 180 : 116;
  const spacing = isDesktop ? 208 : 125;
  const radiusY = isDesktop ? 53 : 29;
  const topPad = isDesktop ? 62 : 41;
  const containerHeight = isDesktop ? 330 : 225;

  const displayItems = useMemo(() => buildDisplayItems(tiles), [tiles]);
  const activeDisplayIndex = displayItems.findIndex((it) => it.kind === "tile" && it.tileIndex === activeIndex);

  // Cumulative x positions per slot: extra breathing room before a divider
  // (separating it from the previous section), tight right after it (so the
  // label hugs the first tile of the section it's introducing).
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

  function onTouchStart(e) {
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  function onTouchEnd(e) {
    const start = touchRef.current;
    touchRef.current = null;
    if (!start) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) onFocus(activeIndex + 1);
    else onFocus(activeIndex - 1);
  }

  return (
    <div className="relative flex flex-col items-center py-1.5">
      <button
        type="button"
        onClick={() => onFocus(activeIndex - 1)}
        aria-label="Previous tile"
        className="absolute left-0 top-[99px] z-[250] hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-black/5 bg-white/90 text-[#4b5563] shadow-md transition hover:bg-white hover:text-[#14181c] sm:flex sm:top-[152px]"
      >
        <ChevronLeftIcon className="h-[18px] w-[18px]" />
      </button>

      <motion.div
        ref={containerRef}
        animate={shakeControls}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="relative w-full touch-pan-y overflow-hidden"
        style={{ height: containerHeight }}
      >
        {containerWidth > 0 &&
          (() => {
            // Pan the whole row so the active item is centered when there's room
            // on both sides; clamp near the ends so nothing spills past the edges.
            const totalSpan = slotX[slotX.length - 1];
            const idealPan = containerWidth / 2 - slotX[activeDisplayIndex];
            const minPan = tileSize / 2;
            const maxPan = containerWidth - totalSpan - tileSize / 2;
            const pan = minPan <= maxPan ? Math.min(maxPan, Math.max(minPan, idealPan)) : idealPan;

            return displayItems.map((item, di) => {
              const offset = di - activeDisplayIndex;
              const angle = offset * ANGLE_STEP;
              const cosA = Math.cos(angle);
              const y = (1 - cosA) * radiusY;
              const scale = 0.8 + 0.38 * ((cosA + 1) / 2);
              const isHidden = item.kind === "tile" && item.tileIndex === hiddenTileIndex;
              const opacity = isHidden ? 0 : Math.max(0.18, 1 - Math.abs(offset) * 0.24);
              const zIndex = Math.round(cosA * 100) + 100;
              const isActive = offset === 0;

              return (
                <motion.div
                  key={item.key}
                  ref={
                    item.kind === "tile"
                      ? (el) => {
                          tileElRefs.current[item.tileIndex] = el;
                        }
                      : undefined
                  }
                  className="absolute"
                  initial={false}
                  animate={{
                    left: pan + slotX[di] - tileSize / 2,
                    top: topPad + y,
                    scale,
                    opacity,
                  }}
                  transition={{ type: "spring", stiffness: 260, damping: 26 }}
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
                      onSelect={(e) => {
                        onFocus(item.tileIndex);
                        if (isActive) {
                          // already centered — launch straight from its current, settled position
                          onLaunch(item.tileIndex, e?.currentTarget?.getBoundingClientRect?.() ?? null);
                        } else {
                          // let it finish springing to center first, then launch from the
                          // settled position — otherwise the re-center and the warp-pipe
                          // fall animation fight each other and it looks glitchy
                          window.setTimeout(() => onLaunch(item.tileIndex, null), 420);
                        }
                      }}
                    />
                  )}
                </motion.div>
              );
            });
          })()}
      </motion.div>

      <button
        type="button"
        onClick={() => onFocus(activeIndex + 1)}
        aria-label="Next tile"
        className="absolute right-0 top-[99px] z-[250] hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-black/5 bg-white/90 text-[#4b5563] shadow-md transition hover:bg-white hover:text-[#14181c] sm:flex sm:top-[152px]"
      >
        <ChevronRightIcon className="h-[18px] w-[18px]" />
      </button>

      <div className="mt-2 min-h-[26px] text-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={active.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="text-[15px] font-bold text-cyan-switch sm:text-lg"
          >
            {active.title} — {active.label}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
});

export default TileCarousel;
