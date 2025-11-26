import React from "react";
import { HOME_STRETCH_LEN, PLAYER_COLOR_HEX, PlayerColor, TokenState, RING_PATH, START_INDEX } from "@/lib/ludo";
import { cn } from "@/lib/utils";

export interface CellCoord { r: number; c: number }

type TokenRender = {
  color: PlayerColor;
  tokenIndex: number;
  state: TokenState;
};

export interface LudoBoardProps {
  tokens: Record<PlayerColor, TokenState[]>;
  clickable?: { color: PlayerColor; token: number }[];
  onClickToken?: (color: PlayerColor, token: number) => void;
}

// 15x15 grid constants
const N = 15; // rows/cols
const CENTER = 7; // 0-based center line

// Home stretch coordinates (6 steps, last = center)
const HOME_STRETCH_COORDS: Record<PlayerColor, CellCoord[]> = {
  yellow: [ {r:1,c:7},{r:2,c:7},{r:3,c:7},{r:4,c:7},{r:5,c:7},{r:7,c:7} ],
  blue:[ {r:7,c:13},{r:7,c:12},{r:7,c:11},{r:7,c:10},{r:7,c:9},{r:7,c:7} ],
  red:  [ {r:13,c:7},{r:12,c:7},{r:11,c:7},{r:10,c:7},{r:9,c:7},{r:7,c:7} ],
  green:   [ {r:7,c:1},{r:7,c:2},{r:7,c:3},{r:7,c:4},{r:7,c:5},{r:7,c:7} ],
};

// 6x6 home token spots per quadrant
const HOME_SPOTS: Record<PlayerColor, CellCoord[]> = {
  green: [ { r: 1, c: 1 }, { r: 1, c: 4 }, { r: 4, c: 1 }, { r: 4, c: 4 } ],
  yellow:[ { r: 1, c: 10 }, { r: 1, c: 13 }, { r: 4, c: 10 }, { r: 4, c: 13 } ],
  blue:  [ { r: 10, c: 10 }, { r: 10, c: 13 }, { r: 13, c: 10 }, { r: 13, c: 13 } ],
  red:   [ { r: 10, c: 1 }, { r: 10, c: 4 }, { r: 13, c: 1 }, { r: 13, c: 4 } ],
};

// Star (safe) squares (1-based given -> converted to 0-based here)
const STAR_CELLS: { color: PlayerColor; pos: CellCoord }[] = [
  { color: "red", pos: { r: 8, c: 2 } },
  { color: "green", pos: { r: 2, c: 6 } },
  { color: "yellow", pos: { r: 6, c: 12 } },
  { color: "blue", pos: { r: 12, c: 8 } },
  // Start positions are also safe stars
  { color: "green", pos: RING_PATH[START_INDEX.green] },
  { color: "yellow", pos: RING_PATH[START_INDEX.yellow] },
  { color: "blue", pos: RING_PATH[START_INDEX.blue] },
  { color: "red", pos: RING_PATH[START_INDEX.red] },
];

const cellStyle = (r: number, c: number): React.CSSProperties => ({
  gridRowStart: r + 1,
  gridColumnStart: c + 1,
});

const Token: React.FC<{ x: number; y: number; color: PlayerColor; clickable?: boolean; onClick?: () => void; stackedOffset?: number; }>
  = ({ x, y, color, clickable, onClick, stackedOffset = 0 }) => {
  return (
    <div
      className={cn(
        "absolute transition-transform",
        clickable ? "cursor-pointer hover:scale-105" : "pointer-events-none",
      )}
      style={{
        left: `calc(${y} * var(--cell) + var(--cell) * 0.15 + ${stackedOffset}px)`,
        top: `calc(${x} * var(--cell) + var(--cell) * 0.15 - ${stackedOffset}px)`,
        width: "calc(var(--cell) * 0.7)",
        height: "calc(var(--cell) * 0.7)",
        borderRadius: "9999px",
        boxShadow: `0 4px 12px rgba(0,0,0,0.25)` ,
        background: PLAYER_COLOR_HEX[color],
        border: "2px solid rgba(255,255,255,0.75)",
        zIndex: 3,
      }}
      onClick={onClick}
    />
  );
};

const isTrackCell = (r: number, c: number) => {
  const inHBand = r >= 6 && r <= 8; // rows 6..8
  const inVBand = c >= 6 && c <= 8; // cols 6..8
  const inCenter = r >= 6 && r <= 8 && c >= 6 && c <= 8; // 3x3 center
  return (inHBand || inVBand) && !inCenter;
};

// const CenterCell: React.FC = () => (
//   <div className="absolute inset-0 grid place-items-center pointer-events-none">
//     <div className="w-28 h-28 rotate-45 rounded-lg overflow-hidden shadow-sm">
//       <div className="w-full h-full" style={{ background: `conic-gradient(${PLAYER_COLOR_HEX.green} 0 90deg, ${PLAYER_COLOR_HEX.yellow} 90deg 180deg, ${PLAYER_COLOR_HEX.blue} 180deg 270deg, ${PLAYER_COLOR_HEX.red} 270deg 360deg)` }} />
//     </div>
//   </div>
// );

export const LudoBoard: React.FC<LudoBoardProps> = ({ tokens, clickable = [], onClickToken }) => {
  const clickMap = new Map<string, true>();
  for (const c of clickable) clickMap.set(`${c.color}:${c.token}`, true);

  const allTokens: TokenRender[] = [];
  (Object.keys(tokens) as PlayerColor[]).forEach((color) => {
    tokens[color].forEach((state, idx) => allTokens.push({ color, tokenIndex: idx, state }));
  });

  // Group by path coordinate to offset stacks
  const trackGroups = new Map<string, TokenRender[]>();
  for (const t of allTokens) {
    if (t.state.kind !== "track") continue;
    const coord = RING_PATH[t.state.index];
    if (!coord) continue; // skip invalid indices
    const key = `${coord.r},${coord.c}`;
    const arr = trackGroups.get(key) || [];
    arr.push(t);
    trackGroups.set(key, arr);
  }

  return (
    <div className="relative w-full max-w-3xl aspect-square">
      <div
        className="absolute inset-0 rounded-2xl p-4"
        style={{
          background: "linear-gradient(135deg, #0ea5e9 0%, #10b981 50%, #f59e0b 100%)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        }}
      >
        <div className="relative w-full h-full rounded-xl bg-white/90 backdrop-blur-md overflow-hidden">
          <div
            className="absolute inset-6 grid"
            style={{ gridTemplateColumns: `repeat(${N}, minmax(0,1fr))`, gridTemplateRows: `repeat(${N}, minmax(0,1fr))`, ['--cell' as any]: `calc((100%)/${N})` }}
          >
            {/* Subtle base grid */}
            {Array.from({ length: N * N }).map((_, i) => {
              const r = Math.floor(i / N), c = i % N;
              return (
                <div key={`base-${i}`} style={{ ...cellStyle(r, c) }} className="border border-slate-200/60" />
              );
            })}


            {/* Home stretches */}
            {(Object.keys(HOME_STRETCH_COORDS) as PlayerColor[]).map((color) => (
              <React.Fragment key={`hs-${color}`}>
                {HOME_STRETCH_COORDS[color].map((c, j) => (
                  <div key={`hs-${color}-${j}`} className="border border-slate-200/70" style={{ ...cellStyle(c.r, c.c), background: j === HOME_STRETCH_LEN - 1 ? `${PLAYER_COLOR_HEX[color]}22` : "#fafafa" }} />
                ))}
              </React.Fragment>
            ))}

            {/* Home quadrants 6x6 */}
            {/* Green TL */}
            <div className="rounded-lg" style={{ ...cellStyle(0,0), gridRowEnd: 7, gridColumnEnd: 7, background: `${PLAYER_COLOR_HEX.green}15`, border: "1px solid rgba(15,23,42,0.1)" }} />
            {/* Yellow TR */}
            <div className="rounded-lg" style={{ ...cellStyle(0,9), gridRowEnd: 7, gridColumnEnd: 16, background: `${PLAYER_COLOR_HEX.yellow}15`, border: "1px solid rgba(15,23,42,0.1)" }} />
            {/* Red BL */}
            <div className="rounded-lg" style={{ ...cellStyle(9,0), gridRowEnd: 16, gridColumnEnd: 7, background: `${PLAYER_COLOR_HEX.red}15`, border: "1px solid rgba(15,23,42,0.1)" }} />
            {/* Blue BR */}
            <div className="rounded-lg" style={{ ...cellStyle(9,9), gridRowEnd: 16, gridColumnEnd: 16, background: `${PLAYER_COLOR_HEX.blue}15`, border: "1px solid rgba(15,23,42,0.1)" }} />

            {/* Central 3x3 finish with colored conic */}
            <div style={{ ...cellStyle(6,6), gridRowEnd: 10, gridColumnEnd: 10 }} className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/40 via-green-500/40 to-yellow-500/40 to-bule-500/40 border border-slate-200 rounded" />
              {/* <CenterCell /> */}
            </div>

            {/* Draw path cells for clarity */}
            {RING_PATH.map((c, i) => (
              <div
                key={`ring-${i}`}
                className="border border-slate-200/70"
                style={{ ...cellStyle(c.r, c.c) }}
              />
            ))}

            {/* Star (safe) squares */}
            {STAR_CELLS.map(({ color, pos }, idx) => (
              <div key={`star-${idx}`} style={{ ...cellStyle(pos.r, pos.c) }} className="relative">
                <div className="absolute inset-1 rounded-md grid place-items-center" style={{ background: `${PLAYER_COLOR_HEX[color]}22`, border: `1px dashed ${PLAYER_COLOR_HEX[color]}66` }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={PLAYER_COLOR_HEX[color]} className="opacity-80">
                    <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                </div>
              </div>
            ))}

            {/* Tokens */}
            <div className="absolute inset-0">
              {allTokens.map((t) => {
                if (t.state.kind === "home") {
                  const spot = HOME_SPOTS[t.color][t.tokenIndex];
                  return (
                    <Token
                      key={`${t.color}-${t.tokenIndex}`}
                      x={spot.r}
                      y={spot.c}
                      color={t.color}
                      clickable={clickMap.has(`${t.color}:${t.tokenIndex}`)}
                      onClick={() => onClickToken?.(t.color, t.tokenIndex)}
                    />
                  );
                }
                if (t.state.kind === "homeStretch") {
                  const coord = HOME_STRETCH_COORDS[t.color][t.state.index];
                  return (
                    <Token
                      key={`${t.color}-${t.tokenIndex}`}
                      x={coord.r}
                      y={coord.c}
                      color={t.color}
                      clickable={clickMap.has(`${t.color}:${t.tokenIndex}`)}
                      onClick={() => onClickToken?.(t.color, t.tokenIndex)}
                    />
                  );
                }
                // Track or finished -> place by path or center
                if (t.state.kind === "finished") {
                  return (
                    <Token key={`${t.color}-${t.tokenIndex}`} x={7} y={7} color={t.color} />
                  );
                }
                if (t.state.kind === "track") {
                  const coord = RING_PATH[t.state.index];
                  if (!coord) {
                     // Should not happen for valid track indices
                     return null;
                  }
                  return (
                    <Token key={`${t.color}-${t.tokenIndex}`} x={coord.r} y={coord.c} color={t.color} clickable={clickMap.has(`${t.color}:${t.tokenIndex}`)} onClick={() => onClickToken?.(t.color, t.tokenIndex)} />
                  );
                }
                // Handle initial state (-1) which might be passed as "track" with invalid index or handled separately
                // In our GameEngine, -1 means "home base" (not on track yet).
                // The LudoBoard component seems to expect "home" kind for this.
                // We need to map the engine state to the board state correctly.
                // Let's check how `tokens` prop is constructed in Game.tsx.
                return null;
              })}

              {/* Offset same-index track tokens (visual only) */}
              {[...trackGroups.entries()].map(([key, group]) => {
                if (group.length <= 1) return null;
                const [r, c] = key.split(",").map(Number);
                return group.map((t, i) => (
                  <Token
                    key={`stack-${t.color}-${t.tokenIndex}`}
                    x={r}
                    y={c}
                    color={t.color}
                    clickable={clickMap.has(`${t.color}:${t.tokenIndex}`)}
                    onClick={() => onClickToken?.(t.color, t.tokenIndex)}
                    stackedOffset={(i - (group.length - 1) / 2) * 6}
                  />
                ));
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LudoBoard;
