/**
 * The brain, as structure rather than as an animated object.
 *
 * The particle field behind the whole page is already the motion layer. Two
 * things moving in the same viewport compete, and the louder one wins -- so the
 * division here is deliberate: **the particles provide motion, the brain
 * provides meaning.**
 *
 * That makes this a graphic, not an animation. It is a contour and a dozen
 * nodes drawn at hairline weight in the same sage the rules and the globe use,
 * so it belongs to the page's architecture rather than sitting on top of it as
 * an illustration. What moves is close to nothing: three pixels of drift over
 * nineteen seconds, two nodes changing opacity, and one signal crossing one
 * connection roughly every thirteen.
 *
 * Sparse on purpose. An earlier version had thirty-two nodes auto-linked by
 * distance, which is the dense neural-network cliche -- at that density it stops
 * reading as a brain and starts reading as stock AI imagery. Twelve nodes and
 * nine connections read as considered.
 *
 * No rotation, no float, no glow, and this is a server component: there is no
 * state, no effect and no JavaScript, because none of it needs any.
 */

/** A simplified profile. One closed contour and two fold lines. */
const CONTOUR =
  "M 46 118 C 46 68 92 38 152 43 C 206 47 244 70 254 106 C 262 137 252 168 226 185 C 206 199 180 203 160 198 C 150 212 129 218 114 210 C 94 200 84 184 88 168 C 62 162 46 146 46 118 Z";

const FOLDS = [
  "M 96 96 C 128 84 168 88 190 108",
  "M 108 148 C 140 138 176 146 198 166",
];

/** Placed on the contour and along the folds, not scattered. */
const NODES: readonly { x: number; y: number; breathe?: number }[] = [
  { x: 96, y: 96 },
  { x: 152, y: 43, breathe: 0 },
  { x: 190, y: 108 },
  { x: 254, y: 106 },
  { x: 226, y: 185 },
  { x: 198, y: 166 },
  { x: 160, y: 198 },
  { x: 108, y: 148, breathe: 4 },
  { x: 88, y: 168 },
  { x: 46, y: 118 },
  { x: 140, y: 92 },
  { x: 150, y: 152 },
];

/** Nine connections. Enough to read as a network, few enough to read as drawn. */
const LINKS: readonly [number, number][] = [
  [0, 10],
  [10, 2],
  [2, 3],
  [3, 5],
  [5, 4],
  [7, 11],
  [11, 5],
  [8, 7],
  [9, 0],
];

/** The one connection a signal ever crosses. */
const SIGNAL: [number, number] = [0, 10];

export function Brain({ className = "" }: { className?: string }) {
  const from = NODES[SIGNAL[0]] as { x: number; y: number };
  const to = NODES[SIGNAL[1]] as { x: number; y: number };
  const signalLength = Math.hypot(to.x - from.x, to.y - from.y);

  return (
    <div className={`pointer-events-none select-none ${className}`} aria-hidden>
      <svg viewBox="0 0 300 240" fill="none" className="h-full w-full">
        <g className="animate-brain-drift">
          {/* The contour carries the meaning. Everything else supports it. */}
          <path
            d={CONTOUR}
            stroke="var(--color-sage-light)"
            strokeWidth="1"
            strokeLinejoin="round"
          />

          {FOLDS.map((d) => (
            <path
              key={d}
              d={d}
              stroke="var(--color-sage-light)"
              strokeWidth="0.85"
              opacity="0.7"
            />
          ))}

          <g stroke="var(--color-sage-light)" strokeWidth="0.7" opacity="0.55">
            {LINKS.map(([a, b]) => {
              const p = NODES[a] as { x: number; y: number };
              const q = NODES[b] as { x: number; y: number };
              return <line key={`${a}-${b}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} />;
            })}
          </g>

          {/* One signal, one connection, a long wait between runs. */}
          <line
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke="var(--color-sage)"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="animate-brain-signal"
            style={
              {
                strokeDasharray: `${signalLength * 0.3} ${signalLength}`,
                "--len": signalLength,
              } as React.CSSProperties
            }
          />

          <g fill="var(--color-sage)">
            {NODES.map((node, i) => (
              <circle
                key={i}
                cx={node.x}
                cy={node.y}
                r={node.breathe !== undefined ? 2.6 : 2}
                opacity={node.breathe !== undefined ? undefined : 0.55}
                className={node.breathe !== undefined ? "animate-node-breathe" : undefined}
                style={
                  node.breathe !== undefined
                    ? { animationDelay: `${node.breathe}s` }
                    : undefined
                }
              />
            ))}
          </g>
        </g>
      </svg>
    </div>
  );
}
