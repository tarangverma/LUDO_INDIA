export const COLORS = ["red", "green", "yellow", "blue"] as const;
export type PlayerColor = typeof COLORS[number];

export const TOKENS_PER_PLAYER = 4;
export const MAIN_TRACK = 52;
export const HOME_STRETCH = 6;
export const FINISH_STEP = MAIN_TRACK + HOME_STRETCH - 1;

export const START_INDEX: Record<PlayerColor, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

export const SAFE_GLOBAL = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

export interface GamePlayer {
  id: string;
  name: string;
  color: PlayerColor;
}

export interface GameState {
  players: GamePlayer[];
  tokens: Record<string, number[]>;
  turnIndex: number;
  dice: number | null;
  status: "playing" | "finished";
  history: GameHistoryEntry[];
  consecutiveSixes: number;
  currentPlayerRolls: number;
  winner?: string;
}

export interface GameHistoryEntry {
  type: "dice" | "move" | "capture" | "win";
  by: string;
  value?: number;
  tokenIndex?: number;
  to?: number;
  victim?: string;
  at: number;
}

export interface MoveMeta {
  captured: Array<{ playerId: string; tokenIndex: number }>;
  extraTurn: boolean;
  ended: boolean;
  winner: string | null;
}

export function createInitialGame(players: GamePlayer[]): GameState {
  const tokens: Record<string, number[]> = {};
  for (const p of players) {
    tokens[p.id] = Array(TOKENS_PER_PLAYER).fill(-1);
  }

  return {
    players,
    tokens,
    turnIndex: 0,
    dice: null,
    status: "playing",
    history: [],
    consecutiveSixes: 0,
    currentPlayerRolls: 0,
  };
}

export function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1;
}

export function stepsToGlobal(playerColor: PlayerColor, steps: number): number | null {
  if (steps < 0 || steps >= MAIN_TRACK) return null;
  const start = START_INDEX[playerColor];
  return (start + steps) % MAIN_TRACK;
}

export function isSafeGlobalIndex(globalIdx: number): boolean {
  return SAFE_GLOBAL.has(globalIdx);
}

export function getHomeColumnStart(playerColor: PlayerColor): number {
  return START_INDEX[playerColor];
}

export function isInHomeColumn(playerColor: PlayerColor, position: number): boolean {
  const homeStart = getHomeColumnStart(playerColor);
  return position >= homeStart && position < homeStart + HOME_STRETCH;
}

export interface ValidMove {
  tokenIndex: number;
  to: number;
}

export function getAllValidMoves(game: GameState, playerId: string, dice: number): ValidMove[] {
  const player = game.players.find((p) => p.id === playerId);
  if (!player) return [];

  const tokens = game.tokens[playerId];
  const moves: ValidMove[] = [];

  for (let i = 0; i < TOKENS_PER_PLAYER; i++) {
    const cur = tokens[i];

    if (cur === -1) {
      if (dice === 6) {
        moves.push({ tokenIndex: i, to: 0 });
      }
    } else if (cur === 0) {
      const newSteps = cur + dice;
      if (newSteps <= FINISH_STEP) {
        moves.push({ tokenIndex: i, to: newSteps });
      }
    } else if (cur < MAIN_TRACK) {
      const newSteps = cur + dice;
      if (newSteps <= FINISH_STEP) {
        moves.push({ tokenIndex: i, to: newSteps });
      }
    } else {
      const homePosition = cur - MAIN_TRACK;
      const exactRoll = HOME_STRETCH - homePosition;
      if (dice === exactRoll) {
        moves.push({ tokenIndex: i, to: FINISH_STEP });
      }
    }
  }

  return moves;
}

export interface Move {
  tokenIndex: number;
  to: number;
}

export function applyMove(game: GameState, playerId: string, move: Move): MoveMeta {
  const player = game.players.find((p) => p.id === playerId);
  if (!player) throw new Error("player not found");

  const tokens = game.tokens[playerId];
  if (!tokens) throw new Error("player tokens not found");

  tokens[move.tokenIndex] = move.to;

  const meta: MoveMeta = { captured: [], extraTurn: false, ended: false, winner: null };

  if (move.to >= 0 && move.to < MAIN_TRACK) {
    const destGlobal = stepsToGlobal(player.color, move.to);
    if (destGlobal !== null && !isSafeGlobalIndex(destGlobal)) {
      for (const other of game.players) {
        if (other.id === playerId) continue;
        const otherTokens = game.tokens[other.id];
        for (let t = 0; t < otherTokens.length; t++) {
          const s = otherTokens[t];
          if (s >= 0 && s < MAIN_TRACK) {
            const g = stepsToGlobal(other.color, s);
            if (g === destGlobal) {
              otherTokens[t] = -1;
              meta.captured.push({ playerId: other.id, tokenIndex: t });
              game.history.push({
                type: "capture",
                by: playerId,
                victim: other.id,
                tokenIndex: t,
                at: Date.now(),
              });
            }
          }
        }
      }
    }
  }

  game.history.push({
    type: "move",
    by: playerId,
    tokenIndex: move.tokenIndex,
    to: move.to,
    at: Date.now(),
  });

  const dice = game.dice;
  if (dice === 6 || meta.captured.length > 0) {
    meta.extraTurn = true;
    game.consecutiveSixes = dice === 6 ? game.consecutiveSixes + 1 : 0;
  } else {
    game.consecutiveSixes = 0;
  }

  if (game.consecutiveSixes >= 3) {
    meta.extraTurn = false;
    game.consecutiveSixes = 0;
  }

  const finished = tokens.every((s) => s === FINISH_STEP);
  if (finished) {
    game.status = "finished";
    game.winner = playerId;
    game.history.push({ type: "win", by: playerId, at: Date.now() });
    meta.ended = true;
    meta.winner = playerId;
  }

  return meta;
}

export function advanceTurn(game: GameState): void {
  game.turnIndex = (game.turnIndex + 1) % game.players.length;
  game.consecutiveSixes = 0;
  game.currentPlayerRolls = 0;
}
