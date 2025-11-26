import { useMemo, useState } from "react";

export type PlayerColor = "green" | "yellow" | "blue" | "red";
export const PLAYER_ORDER: PlayerColor[] = ["green", "yellow", "blue", "red"];

export const PLAYER_COLOR_HEX: Record<PlayerColor, string> = {
  green: "#10b981",
  yellow: "#f59e0b",
  blue: "#3b82f6",
  red: "#ef4444",
};

export type TokenState =
  | { kind: "home" }
  | { kind: "track"; index: number }
  | { kind: "homeStretch"; index: number }
  | { kind: "finished" };

export interface PlayerState {
  color: PlayerColor;
  tokens: TokenState[]; // 4 tokens
}

export interface GameState {
  players: PlayerState[];
  current: number; // index of current player in players
  rolled: number | null;
  consecutiveSixes: number;
  winner: PlayerColor | null;
}

// Matrix-based main path (15x15), 52 cells around the cross (rows/cols 6..8 zero-based) excluding center 3x3
export interface CellCoord { r: number; c: number }
export const RING_CELLS = 52;

const buildMatrixPath15 = (): CellCoord[] => {
  const N = 15;
  const inBand = (r: number, c: number) => {
    const inH = r >= 6 && r <= 8;
    const inV = c >= 6 && c <= 8;
    const inCenter = inH && inV;
    return (inH || inV) && !inCenter;
  };
  // Start at green start (2,7) => 0-based (1,6)
  let cur: CellCoord = { r: 1, c: 6 };
  // Directions: up, right, down, left
  const dirs: CellCoord[] = [ {r:-1,c:0},{r:0,c:1},{r:1,c:0},{r:0,c:-1} ];
  let dirIdx = 1; // start heading right
  const path: CellCoord[] = [ { ...cur } ];
  const same = (a: CellCoord, b: CellCoord) => a.r === b.r && a.c === b.c;
  const inside = (r: number, c: number) => r >= 0 && r < N && c >= 0 && c < N;

  const rotateRight = (i: number) => (i + 1) % 4;
  const rotateLeft = (i: number) => (i + 3) % 4;

  // Right-hand rule to trace the boundary clockwise
  for (let guard = 0; guard < 1000; guard++) {
    // Prefer turning right, else straight, else left, else back
    const tryDirs = [rotateRight(dirIdx), dirIdx, rotateLeft(dirIdx), rotateRight(rotateRight(dirIdx))];
    let moved = false;
    for (const nd of tryDirs) {
      const nr = cur.r + dirs[nd].r;
      const nc = cur.c + dirs[nd].c;
      if (!inside(nr, nc)) continue;
      if (!inBand(nr, nc)) continue;
      // Do not immediately go back-and-forth unless necessary
      const prev = path[path.length - 2];
      if (prev && prev.r === nr && prev.c === nc) continue;
      cur = { r: nr, c: nc };
      dirIdx = nd;
      path.push({ ...cur });
      moved = true;
      break;
    }
    if (!moved) break;
    if (path.length > 1 && same(cur, { r: 1, c: 6 })) break;
    if (path.length >= RING_CELLS) break;
  }

  // Ensure proper length; if short/long, pad/trim conservatively by continuing straight
  while (path.length < RING_CELLS) {
    const d = dirs[dirIdx];
    const nr = cur.r + d.r, nc = cur.c + d.c;
    if (inside(nr, nc) && inBand(nr, nc)) {
      cur = { r: nr, c: nc };
      path.push({ ...cur });
    } else break;
  }
  if (path.length > RING_CELLS) path.length = RING_CELLS;

  // Rotate so index 0 is (1,6)
  const startIdx = path.findIndex((p) => p.r === 1 && p.c === 6);
  if (startIdx > 0) {
    const rotated = path.slice(startIdx).concat(path.slice(0, startIdx));
    return rotated;
  }
  return path;
};

// In ludo.ts
export const RING_PATH: CellCoord[] = [
  // Red Lane (Bottom-Left going Up)
  { r: 13, c: 6 }, { r: 12, c: 6 }, { r: 11, c: 6 }, { r: 10, c: 6 }, { r: 9, c: 6 }, 
  
  // Green Lane (Left Horizontal)
  { r: 8, c: 5 }, { r: 8, c: 4 }, { r: 8, c: 3 }, { r: 8, c: 2 }, { r: 8, c: 1 }, { r: 8, c: 0 },
  { r: 7, c: 0 }, // Gateway
  { r: 6, c: 0 }, { r: 6, c: 1 }, { r: 6, c: 2 }, { r: 6, c: 3 }, { r: 6, c: 4 }, { r: 6, c: 5 },

  // Yellow Lane (Top Vertical)
  { r: 5, c: 6 }, { r: 4, c: 6 }, { r: 3, c: 6 }, { r: 2, c: 6 }, { r: 1, c: 6 }, { r: 0, c: 6 },
  { r: 0, c: 7 }, // Gateway
  { r: 0, c: 8 }, { r: 1, c: 8 }, { r: 2, c: 8 }, { r: 3, c: 8 }, { r: 4, c: 8 }, { r: 5, c: 8 },

  // Blue Lane (Right Horizontal)
  { r: 6, c: 9 }, { r: 6, c: 10 }, { r: 6, c: 11 }, { r: 6, c: 12 }, { r: 6, c: 13 }, { r: 6, c: 14 },
  { r: 7, c: 14 }, // Gateway
  { r: 8, c: 14 }, { r: 8, c: 13 }, { r: 8, c: 12 }, { r: 8, c: 11 }, { r: 8, c: 10 }, { r: 8, c: 9 },

  // Red Lane (Bottom Vertical coming Down)
  { r: 9, c: 8 }, { r: 10, c: 8 }, { r: 11, c: 8 }, { r: 12, c: 8 }, { r: 13, c: 8 }, { r: 14, c: 8 },
  { r: 14, c: 7 }, // Gateway
  { r: 14, c: 6 }, 
];

const idxOf = (r: number, c: number) => {
  const idx = RING_PATH.findIndex((p) => p.r === r && p.c === c);
  if (idx !== -1) return idx;
  // fallback: find nearest path cell by Manhattan distance
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < RING_PATH.length; i++) {
    const p = RING_PATH[i];
    const d = Math.abs(p.r - r) + Math.abs(p.c - c);
    if (d < bestDist) { bestDist = d; best = i; }
  }
  return best;
};
export const START_INDEX: Record<PlayerColor, number> = {
  green: idxOf(6, 1),
  yellow: idxOf(1, 8),
  blue: idxOf(8, 13),
  red: idxOf(13, 6),
};


export const STAR_INDICES = [
  idxOf(8, 2), // red side star
  idxOf(2, 6), // green side star
  idxOf(6, 12), // yellow side star
  idxOf(12, 8), // blue side star
];
export const SAFE_INDICES = new Set<number>([...Object.values(START_INDEX), ...STAR_INDICES]);

export const TOKENS_PER_PLAYER = 4;
export const HOME_STRETCH_LEN = 6; // 0..5 where 5 is final home

export const createInitialPlayers = (numPlayers: 2 | 3 | 4): PlayerState[] => {
  const selected = PLAYER_ORDER.slice(0, numPlayers);
  return selected.map((color) => ({
    color,
    tokens: new Array(TOKENS_PER_PLAYER).fill(0).map(() => ({ kind: "home" as const })),
  }));
};

export const rollDice = () => 1 + Math.floor(Math.random() * 6);

export const nextPlayerIndex = (state: GameState): number => {
  return (state.current + 1) % state.players.length;
};

export const isBlockedByDouble = (
  state: GameState,
  target: { kind: "track"; index: number },
  byColor: PlayerColor,
): boolean => {
  // If two or more opponent tokens occupy the target track cell, it's blocked
  let blocked = false;
  for (const p of state.players) {
    if (p.color === byColor) continue;
    const count = p.tokens.filter((t) => t.kind === "track" && t.index === target.index).length;
    if (count >= 2) {
      blocked = true;
      break;
    }
  }
  return blocked;
};

export const countTokensAt = (state: GameState, index: number, color?: PlayerColor) => {
  let count = 0;
  for (const p of state.players) {
    if (color && p.color !== color) continue;
    for (const t of p.tokens) {
      if (t.kind === "track" && t.index === index) count++;
    }
  }
  return count;
};

export interface MoveOption { token: number; to: TokenState }

export const getLegalMoves = (state: GameState, playerIdx: number, dice: number): MoveOption[] => {
  const player = state.players[playerIdx];
  const moves: MoveOption[] = [];
  for (let i = 0; i < player.tokens.length; i++) {
    const t = player.tokens[i];
    if (t.kind === "finished") continue;

    // Home -> enter on 6
    if (t.kind === "home") {
      if (dice === 6) {
        const startIndex = START_INDEX[player.color];
        const target: TokenState = { kind: "track", index: startIndex };
        if (!isBlockedByDouble(state, target as any, player.color)) {
          // Can't enter on a safe square occupied by opponent double; single opponent allowed (capture prevented by safe cell rule)
          // Also don't allow capture on safe cell: if opponent present, block entry
          const oppCount = state.players
            .filter((p) => p.color !== player.color)
            .flatMap((p) => p.tokens)
            .filter((tk) => tk.kind === "track" && tk.index === startIndex).length;
          if (oppCount === 0) moves.push({ token: i, to: target });
        }
      }
      continue;
    }

    // Track -> compute new position / home entry
    if (t.kind === "track") {
      const start = START_INDEX[player.color];
     const entryByColor: Record<PlayerColor, number> = {
        green: idxOf(7, 0),   // The single cell on the far left
        yellow: idxOf(0, 7),  // The single cell at the very top
        blue: idxOf(7, 14),   // The single cell on the far right
        red: idxOf(14, 7),    // The single cell at the very bottom
      };
      const entry = entryByColor[player.color];
      const posDist = ((t.index - start) % RING_CELLS + RING_CELLS) % RING_CELLS; // 0..51 distance from start
      const entryOffset = ((entry - start) % RING_CELLS + RING_CELLS) % RING_CELLS; // usually 1 for green
      const stepsToHomeEntry = (RING_CELLS - posDist + entryOffset) % RING_CELLS || RING_CELLS; // distance forward to reach entry, after full lap if needed

      if (dice < stepsToHomeEntry) {
        // Regular move on track
        const newIndex = (t.index + dice) % RING_CELLS;
        const target: TokenState = { kind: "track", index: newIndex };
        if (!isBlockedByDouble(state, target as any, player.color)) {
          // Safe cells cannot be captured; if opponent present on safe cell, block
          const isSafe = SAFE_INDICES.has(newIndex) || countTokensAt(state, newIndex, player.color) >= 2;
          const oppCount = countTokensAt(state, newIndex) - countTokensAt(state, newIndex, player.color);
          if (!(isSafe && oppCount > 0)) moves.push({ token: i, to: target });
        }
      } else if (dice === stepsToHomeEntry) {
        // Landing exactly on home entry star square (safe)
        const newIndex = entry;
        const target: TokenState = { kind: "track", index: newIndex };
        if (!isBlockedByDouble(state, target as any, player.color)) {
          const oppCount = countTokensAt(state, newIndex) - countTokensAt(state, newIndex, player.color);
          // Cannot land on opponent on safe square
          if (oppCount === 0) moves.push({ token: i, to: target });
        }
      } else {
        // Move into home stretch
        const stepsIntoHome = dice - stepsToHomeEntry;
        if (stepsIntoHome - 1 < HOME_STRETCH_LEN) {
          const targetIndex = stepsIntoHome - 1; // first home cell is 0
          if (targetIndex <= HOME_STRETCH_LEN - 1) moves.push({ token: i, to: { kind: "homeStretch", index: targetIndex } });
        }
      }
      continue;
    }

    // Home stretch
    if (t.kind === "homeStretch") {
      const newIdx = t.index + dice;
      if (newIdx === HOME_STRETCH_LEN - 1) {
        moves.push({ token: i, to: { kind: "finished" } });
      } else if (newIdx < HOME_STRETCH_LEN - 1) {
        moves.push({ token: i, to: { kind: "homeStretch", index: newIdx } });
      }
      continue;
    }
  }
  return moves;
};

export const applyMove = (state: GameState, playerIdx: number, move: MoveOption): GameState => {
  const s: GameState = JSON.parse(JSON.stringify(state));
  const player = s.players[playerIdx];
  const token = player.tokens[move.token];

  // Handle capture if moving to track
  if (move.to.kind === "track") {
    const idx = move.to.index;
    // Safe cell capture disallowed handled earlier; here we can capture normally
    for (const p of s.players) {
      if (p.color === player.color) continue;
      for (let i = 0; i < p.tokens.length; i++) {
        const t = p.tokens[i];
        if (t.kind === "track" && t.index === idx) {
          p.tokens[i] = { kind: "home" };
        }
      }
    }
  }

  player.tokens[move.token] = move.to;

  // Check win
  if (player.tokens.every((t) => t.kind === "finished")) {
    s.winner = player.color;
  }

  return s;
};

export const useLudoGame = (initialPlayers: 2 | 3 | 4 = 2) => {
  const [players, setPlayers] = useState<PlayerState[]>(createInitialPlayers(initialPlayers));
  const [current, setCurrent] = useState(0);
  const [rolled, setRolled] = useState<number | null>(null);
  const [consecutiveSixes, setConsecutiveSixes] = useState(0);
  const [winner, setWinner] = useState<PlayerColor | null>(null);

  const state: GameState = useMemo(() => ({ players, current, rolled, consecutiveSixes, winner }), [players, current, rolled, consecutiveSixes, winner]);

  const reset = (num: 2 | 3 | 4 = initialPlayers) => {
    setPlayers(createInitialPlayers(num));
    setCurrent(0);
    setRolled(null);
    setConsecutiveSixes(0);
    setWinner(null);
  };

  const doRoll = () => {
    if (winner) return;
    const val = rollDice();
    setRolled(val);
    setConsecutiveSixes((c) => (val === 6 ? c + 1 : 0));
    return val;
  };

  const legalMoves = useMemo(() => (rolled ? getLegalMoves(state, current, rolled) : []), [state, current, rolled]);

  const performMove = (move: MoveOption) => {
    if (rolled == null) return;
    const next = applyMove(state, current, move);
    setPlayers(next.players);
    if (next.winner) setWinner(next.winner);

    const rolledVal = rolled;
    setRolled(null);

    // Turn logic: extra turn on 6 if there was at least one legal move and a move was made
    if (rolledVal === 6 && consecutiveSixes < 2 && !next.winner) {
      // stay on same player
      return;
    } else {
      setConsecutiveSixes(0);
      setCurrent((c) => (c + 1) % players.length);
    }
  };

  const passTurnIfNoMoves = () => {
    if (rolled != null && legalMoves.length === 0) {
      const six = rolled === 6;
      setRolled(null);
      if (!(six && consecutiveSixes < 2)) {
        setConsecutiveSixes(0);
        setCurrent((c) => (c + 1) % players.length);
      }
    }
  };

  return {
    state,
    reset,
    doRoll,
    legalMoves,
    performMove,
    passTurnIfNoMoves,
    setPlayers,
    setCurrent,
    setRolled,
    setConsecutiveSixes,
    setWinner,
  } as const;
};
