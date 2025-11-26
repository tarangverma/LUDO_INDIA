import { useAuth } from "@/context/AuthContext";
import { PlayerColor, START_INDEX, RING_CELLS } from "@/lib/ludo";
import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useGame } from "@/context/GameContext";

import { LogOut, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import LudoBoard from "@/components/game/LudoBoard";
import Dice from "@/components/game/Dice";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function Game() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { room, playerId, game, joinRoom, startGame, rollDice, moveToken, leaveRoom } = useGame();
  const [isStarting, setIsStarting] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [legalMoves, setLegalMoves] = useState<any[]>([]);
  const [lastDice, setLastDice] = useState<number | null>(null);
  const ignoreTurnChangeRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!roomId || !user) {
      navigate("/rooms");
      return;
    }

    const joinGameRoom = async () => {
      try {
        await joinRoom(roomId, user.username);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to join room");
        navigate("/rooms");
      }
    };

    if (!room) {
      joinGameRoom();
    }
  }, [roomId, user, room, joinRoom, navigate]);

  // Clear local state when turn changes
  useEffect(() => {
    if (game) {
      const currentPlayer = game.players[game.turnIndex];
      // If it's not our turn, ensure local dice/moves are cleared
      // Unless we are specifically waiting to show the result of a "no moves" roll
      if (currentPlayer?.id !== playerId && !ignoreTurnChangeRef.current) {
        setLastDice(null);
        setLegalMoves([]);
      }
    }
  }, [game?.turnIndex, game?.players, playerId]);

  const handleRollDice = async () => {
    if (!roomId || !playerId) return;
    setIsRolling(true);
    try {
      const result = await rollDice(roomId);
      setLastDice(result.dice);
      setLegalMoves(result.moves || []);
      
      // If no moves available, clear state after a delay to show the result briefly
      if (!result.moves || result.moves.length === 0) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        ignoreTurnChangeRef.current = true;
        
        timeoutRef.current = setTimeout(() => {
          setLastDice(null);
          setLegalMoves([]);
          ignoreTurnChangeRef.current = false;
          timeoutRef.current = null;
        }, 2000);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to roll dice");
    } finally {
      setIsRolling(false);
    }
  };

  const handleMoveToken = async (color: string, tokenIndex: number) => {
    if (!roomId) return;

    const move = legalMoves.find((m) => m.tokenIndex === tokenIndex);
    if (!move) return;

    try {
      await moveToken(roomId, {
        tokenIndex: move.tokenIndex,
        to: move.to,
      });
      setLastDice(null);
      setLegalMoves([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid move");
    }
  };

  const handleStartGame = async () => {
    if (!roomId) return;
    setIsStarting(true);
    try {
      await startGame(roomId);
      toast.success("Game started!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start game");
    } finally {
      setIsStarting(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (!roomId) return;
    try {
      await leaveRoom(roomId);
      navigate("/rooms");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to leave room");
    }
  };

  const handleCopyRoomId = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      toast.success("Room ID copied!");
    }
  };

  const currentPlayer = game?.players[game?.turnIndex]?.color;
  const isHost = playerId === room?.players[0]?.id;
  const canStart = isHost && room && room.players.length >= 2 && !game;

  const tokensByColor = useMemo(() => {
    if (!game) return { green: [], yellow: [], blue: [], red: [] };
    const map: Record<string, any[]> = { green: [], yellow: [], blue: [], red: [] };
    
    for (const playerId in game.tokens) {
      const player = game.players.find((p) => p.id === playerId);
      if (player) {
        map[player.color] = game.tokens[playerId].map((pos) => {
          if (pos === -1) return { kind: "home", index: 0 }; // 0 is placeholder, index matches token index implicitly in loop
          if (pos === 57) return { kind: "finished", index: 0 };
          if (pos >= 52) return { kind: "homeStretch", index: pos - 52 };
          
          const globalIndex = (pos + START_INDEX[player.color as PlayerColor]) % RING_CELLS;
          return { kind: "track", index: globalIndex };
        });
      }
    }
    return map;
  }, [game]);

  const clickable = useMemo(() => {
    if (!game) return [];
    return legalMoves.map((m) => ({
      color: game.players[game.turnIndex].color as PlayerColor,
      token: m.tokenIndex,
    }));
  }, [game, legalMoves]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-emerald-50 to-amber-100">
      <header className="sticky top-0 z-10 backdrop-blur bg-white/60 border-b border-slate-200">
        <div className="container mx-auto py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-gradient-to-br from-emerald-500 to-sky-500" />
            <h1 className="text-lg font-semibold tracking-tight">Ludo</h1>
            <span className="text-slate-500 text-sm hidden sm:inline">
              Room: <span className="font-mono font-semibold text-slate-700">{roomId}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            {roomId && (
              <Button onClick={handleCopyRoomId} variant="secondary" size="sm">
                <Copy className="w-4 h-4 mr-1" />
                Copy ID
              </Button>
            )}
            <Button onClick={handleLeaveRoom} variant="secondary">
              <LogOut className="w-4 h-4 mr-1" />
              Leave
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto grid lg:grid-cols-[1fr_320px] gap-6 py-6 items-start relative">
        <section className="w-full flex flex-col items-center pb-32 lg:pb-0">
          {game ? (
            <LudoBoard
              tokens={tokensByColor}
              clickable={clickable}
              onClickToken={(color, token) => handleMoveToken(color, token)}
            />
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white/70 backdrop-blur p-6 md:p-12 text-center">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Waiting for players...</h2>
              <p className="text-slate-600">
                Players in room: {room?.players.length || 0}/{room?.maxPlayers || 4}
              </p>
              <div className="mt-4 space-y-2">
                {room?.players.map((p) => (
                  <div key={p.id} className="text-sm text-slate-600">
                    {p.name} {p.id === playerId && "(You)"}
                  </div>
                ))}
              </div>
              {canStart && (
                <Button onClick={handleStartGame} disabled={isStarting} className="mt-6">
                  {isStarting ? "Starting..." : "Start Game"}
                </Button>
              )}
            </div>
          )}
        </section>

        <aside className="hidden lg:block w-full max-w-xl mx-auto lg:mx-0">
          <div className="rounded-xl border border-slate-200 bg-white/70 backdrop-blur p-4 sticky top-20">
            {game ? (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        background: currentPlayer
                          ? { green: "#10b981", yellow: "#f59e0b", blue: "#3b82f6", red: "#ef4444" }[
                              currentPlayer
                            ]
                          : "#64748b",
                      }}
                    />
                    <div className="text-sm text-slate-600">Current</div>
                  </div>
                  <div className="text-sm font-medium capitalize">{currentPlayer}</div>
                </div>

                <div className="flex items-end justify-between">
                  <Dice
                    value={lastDice ?? game.dice}
                    onRoll={handleRollDice}
                    disabled={!!(lastDice ?? game.dice) || game.status !== "playing" || game.players[game.turnIndex]?.id !== playerId}
                  />
                </div>

                {game.status === "finished" && game.winner && (
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-emerald-800 font-medium mt-6">
                    Winner: <span className="capitalize">{game.players.find((p) => p.id === game.winner)?.name}</span>
                  </div>
                )}

                <div className="mt-6">
                  {lastDice == null ? (
                    <div className="text-slate-600 text-sm">Roll the dice to begin. You need a 6 to move a token out of home.</div>
                  ) : legalMoves.length === 0 ? (
                    <div className="text-slate-600 text-sm">No moves available. Passing turn…</div>
                  ) : (
                    <div className="text-slate-600 text-sm">Select a highlighted token to move {lastDice} step(s).</div>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-900">Players</h3>
                {room?.players.map((p, i) => (
                  <div key={p.id} className={cn("rounded-md border p-3", p.id === playerId ? "border-slate-400 bg-slate-50" : "border-slate-200")}>
                    <div className="flex items-center justify-between">
                      <div className="capitalize font-medium text-sm">{p.name}</div>
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{
                          background: { green: "#10b981", yellow: "#f59e0b", blue: "#3b82f6", red: "#ef4444" }[p.color] || "#64748b",
                        }}
                      />
                    </div>
                    {p.id === playerId && <span className="text-xs text-slate-500 mt-1">You</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </main>

      {/* Mobile Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200 p-3 lg:hidden z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {game ? (
          <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
            <div className="flex items-center gap-3 bg-slate-50/50 px-3 py-2 rounded-lg border border-slate-100">
              <div
                className="w-10 h-10 rounded-full border-2 border-white shadow-sm ring-1 ring-slate-100"
                style={{
                  background: currentPlayer
                    ? { green: "#10b981", yellow: "#f59e0b", blue: "#3b82f6", red: "#ef4444" }[
                        currentPlayer
                      ]
                    : "#64748b",
                }}
              />
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none mb-1">Turn</span>
                <span className="text-sm font-bold capitalize text-slate-900 leading-none">{currentPlayer}</span>
              </div>
            </div>

            <div className="flex-1 text-center px-2">
                 <div className="text-xs font-medium">
                    {lastDice == null ? (
                      <span className="text-slate-500 animate-pulse">Roll Dice</span>
                    ) : legalMoves.length === 0 ? (
                      <span className="text-amber-600">No moves</span>
                    ) : (
                      <span className="text-emerald-600">Move Token</span>
                    )}
                 </div>
            </div>

            <div className="scale-90 origin-right">
              <Dice
                value={lastDice ?? game.dice}
                onRoll={handleRollDice}
                disabled={!!(lastDice ?? game.dice) || game.status !== "playing" || game.players[game.turnIndex]?.id !== playerId}
              />
            </div>
          </div>
        ) : (
           <div className="text-center py-2">
              <p className="text-sm font-medium text-slate-900">Waiting for players...</p>
              <p className="text-xs text-slate-500">{room?.players.length || 0}/{room?.maxPlayers || 4} joined</p>
              <p className="text-xs font-mono text-slate-400 mt-1">Room: {roomId}</p>
           </div>
        )}
      </div>
    </div>
  );
}
