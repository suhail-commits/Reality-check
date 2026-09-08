"use client";

import { useMemo } from "react";
import { Reveal } from "./primitives";

/**
 * Where an idea ends up.
 *
 * A wireframe, not a map. Real coastlines would date the drawing, invite
 * arguments about which places got a dot, and pull the eye into geography that
 * has nothing to do with the point -- which is only that a good idea travels.
 *
 * The globe is drawn as a sphere of latitude and longitude lines. Latitudes are
 * ellipses whose vertical radius shrinks toward the poles; longitudes are arcs
 * from pole to pole with a varying horizontal bulge. Both are pure geometry, so
 * the whole thing is a few dozen static paths that never re-render.
 */

const R = 150;
const CX = 200;
const CY = 200;

/** Where the arriving ideas land. Placed for balance, not for cartography. */
const LANDINGS = [
  { x: 128, y: 132, delay: 0 },
  { x: 246, y: 118, delay: 1.4 },
  { x: 292, y: 208, delay: 2.6 },
  { x: 158, y: 246, delay: 3.8 },
  { x: 214, y: 274, delay: 5.1 },
  { x: 92, y: 196, delay: 6.2 },
];

function useGeometry() {
  return useMemo(() => {
    // Latitudes: ellipses flattening toward the poles.
    const latitudes = [-60, -40, -20, 0, 20, 40, 60].map((deg) => {
      const rad = (deg * Math.PI) / 180;
      return { cy: CY - R * Math.sin(rad), rx: R * Math.cos(rad), ry: R * Math.cos(rad) * 0.22 };
    });

    // Longitudes: pole-to-pole arcs, bulging by how far round the sphere they sit.
    const longitudes = Array.from({ length: 7 }, (_, i) => {
      const bulge = R * Math.cos(((i / 7) * Math.PI * 2) / 2 - Math.PI / 2);
      return `M ${CX} ${CY - R} A ${Math.abs(bulge)} ${R} 0 0 ${bulge > 0 ? 1 : 0} ${CX} ${CY + R}`;
    });

    // Incoming paths, curving in from beyond the frame.
    const arrivals = LANDINGS.map((l, i) => {
      const fromX = i % 2 === 0 ? -60 : 460;
      const fromY = 40 + i * 46;
      const curve = i % 2 === 0 ? 60 : -60;
      const d = `M ${fromX} ${fromY} Q ${(fromX + l.x) / 2} ${(fromY + l.y) / 2 + curve} ${l.x} ${l.y}`;
      // Rough arc length, good enough to seed the dash animation.
      const length = Math.hypot(l.x - fromX, l.y - fromY) * 1.25;
      return { d, length, delay: l.delay };
    });

    return { latitudes, longitudes, arrivals };
  }, []);
}

export function WorldImpact() {
  const { latitudes, longitudes, arrivals } = useGeometry();

  return (
    <section className="mx-auto w-full max-w-[76rem] px-6 py-32 lg:px-10 lg:py-44">
      <div className="grid items-center gap-16 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-24">
        <Reveal>
          <div>
            <p className="text-marker">Reach</p>
            <h2 className="text-display-2 mt-6 max-w-[13ch] text-balance">
              An idea does not stay where it started.
            </h2>
            <p className="mt-8 max-w-[46ch] text-body-lg text-[var(--color-ink-soft)]">
              The evidence comes from people writing in public, anywhere. What one person complains
              about in a review is what another builds a company on.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="relative aspect-square w-full" aria-hidden>
            <svg viewBox="0 0 400 400" fill="none" className="h-full w-full overflow-visible">
              <defs>
                <radialGradient id="globe-wash" cx="42%" cy="36%" r="64%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                  <stop offset="70%" stopColor="var(--color-sage-mist)" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="var(--color-sage-mist)" stopOpacity="0" />
                </radialGradient>
              </defs>

              <circle cx={CX} cy={CY} r={R} fill="url(#globe-wash)" />
              <circle
                cx={CX}
                cy={CY}
                r={R}
                stroke="var(--color-sage-light)"
                strokeWidth="0.9"
                opacity="0.8"
              />

              <g stroke="var(--color-sage-light)" strokeWidth="0.7" opacity="0.7">
                {latitudes.map((lat, i) => (
                  <ellipse key={`lat-${i}`} cx={CX} cy={lat.cy} rx={lat.rx} ry={lat.ry} />
                ))}
                {longitudes.map((d, i) => (
                  <path key={`lon-${i}`} d={d} />
                ))}
              </g>

              {/* Ideas arriving from off-frame. */}
              <g
                stroke="var(--color-sage)"
                strokeWidth="1.3"
                strokeLinecap="round"
                fill="none"
              >
                {arrivals.map((a, i) => (
                  <path
                    key={`arr-${i}`}
                    d={a.d}
                    className="animate-trace-path"
                    style={
                      {
                        strokeDasharray: a.length,
                        "--len": a.length,
                        animationDelay: `${a.delay}s`,
                      } as React.CSSProperties
                    }
                  />
                ))}
              </g>

              {/* Somewhere the idea landed. */}
              <g fill="var(--color-sage)">
                {LANDINGS.map((l, i) => (
                  <g key={`land-${i}`} style={{ transformOrigin: `${l.x}px ${l.y}px` }}>
                    <circle
                      cx={l.x}
                      cy={l.y}
                      r="9"
                      fill="var(--color-sage-wash)"
                      className="animate-landfall"
                      style={{ animationDelay: `${l.delay}s`, transformOrigin: `${l.x}px ${l.y}px` }}
                    />
                    <circle
                      cx={l.x}
                      cy={l.y}
                      r="2.6"
                      className="animate-landfall"
                      style={{ animationDelay: `${l.delay}s`, transformOrigin: `${l.x}px ${l.y}px` }}
                    />
                  </g>
                ))}
              </g>
            </svg>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
