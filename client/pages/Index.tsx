import { useEffect, useMemo, useState } from "react";
import LudoBoard from "@/components/game/LudoBoard";
import Dice from "@/components/game/Dice";
import { Button } from "@/components/ui/button";
import { PLAYER_ORDER, PlayerColor, START_INDEX, TokenState, useLudoGame } from "@/lib/ludo";
import { cn } from "@/lib/utils";

export default function Index() {
  const [numPlayers, setNumPlayers] = useState<2|3|4>(2);
  const game = useLudoGame(numPlayers);

  const tokensByColor = useMemo(() => {
    const map: Record<PlayerColor, TokenState[]> = {
      green: [], yellow: [], blue: [], red: [],
    };
    for (const p of game.state.players) map[p.color] = p.tokens;
    return map;
  }, [game.state.players]);

  const clickable = useMemo(() => {
    return game.legalMoves.map((m) => ({ color: game.state.players[game.state.current].color, token: m.token }));
  }, [game.legalMoves, game.state.players, game.state.current]);

  useEffect(() => {
    // If user rolled and has no legal moves, pass turn after brief delay
    if (game.state.rolled != null && game.legalMoves.length === 0) {
      const t = setTimeout(() => game.passTurnIfNoMoves(), 600);
      return () => clearTimeout(t);
    }
  }, [game.state.rolled, game.legalMoves.length]);

  useEffect(() => {
    // Auto move if only one move
    if (game.state.rolled != null && game.legalMoves.length === 1) {
      const mv = game.legalMoves[0];
      const t = setTimeout(() => game.performMove(mv), 450);
      return () => clearTimeout(t);
    }
  }, [game.state.rolled, game.legalMoves]);

  const onClickToken = (color: PlayerColor, token: number) => {
    const mv = game.legalMoves.find((m) => color === game.state.players[game.state.current].color && m.token === token);
    if (mv) game.performMove(mv);
  };

  const currentPlayer = game.state.players[game.state.current]?.color;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-emerald-50 to-amber-100">
      <header className="sticky top-0 z-10 backdrop-blur bg-white/60 border-b border-slate-200">
        <div className="container mx-auto py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-gradient-to-br from-emerald-500 to-sky-500" />
            <h1 className="text-lg font-semibold tracking-tight">Ludo</h1>
            <span className="text-slate-500 text-sm hidden sm:inline">Play with 2–4 players</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 rounded-md border border-slate-200 bg-white/70 p-1">
              {[2,3,4].map((n) => (
                <button key={n}
                  onClick={() => { setNumPlayers(n as 2|3|4); game.reset(n as 2|3|4); }}
                  className={cn("px-2 py-1 text-sm rounded", n===numPlayers ? "bg-slate-900 text-white" : "hover:bg-slate-100")}
                >{n}P</button>
              ))}
            </div>
            <Button onClick={() => game.reset(numPlayers)} variant="secondary">New Game</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto grid lg:grid-cols-[1fr_320px] gap-6 py-6 items-start">
        <section className="w-full">
          <LudoBoard tokens={tokensByColor} clickable={clickable} onClickToken={onClickToken} />
        </section>

        <aside className="w-full max-w-xl mx-auto lg:mx-0">
          <div className="rounded-xl border border-slate-200 bg-white/70 backdrop-blur p-4 sticky top-20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: currentPlayer ? {green:'#10b981',yellow:'#f59e0b',blue:'#3b82f6',red:'#ef4444'}[currentPlayer] : '#64748b' }} />
                <div className="text-sm text-slate-600">Current</div>
              </div>
              <div className="text-sm font-medium capitalize">{currentPlayer}</div>
            </div>

            <div className="flex items-end justify-between mt-6">
              <Dice value={game.state.rolled} onRoll={() => game.doRoll()} disabled={!!game.state.rolled || !!game.state.winner} />
              <div className="text-right">
                <div className="text-xs text-slate-500">Start squares</div>
                <div className="flex gap-2 mt-2">
                  {PLAYER_ORDER.map((c) => (
                    <div key={c} className="flex items-center gap-1 text-xs">
                      <span className="inline-block w-2 h-2 rounded-sm" style={{ background: {green:'#10b981',yellow:'#f59e0b',blue:'#3b82f6',red:'#ef4444'}[c] }} />
                      <span>{START_INDEX[c]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6">
              {game.state.winner ? (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-emerald-800 font-medium">
                  Winner: <span className="capitalize">{game.state.winner}</span>
                </div>
              ) : game.state.rolled == null ? (
                <div className="text-slate-600 text-sm">Roll the dice to begin. You need a 6 to move a token out of home.</div>
              ) : game.legalMoves.length === 0 ? (
                <div className="text-slate-600 text-sm">No moves available. Passing turn…</div>
              ) : (
                <div className="text-slate-600 text-sm">Select a highlighted token to move {game.state.rolled} step(s).</div>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600">
              {game.state.players.map((p, i) => (
                <div key={p.color} className={cn("rounded-md border p-2", i===game.state.current ? "border-slate-400" : "border-slate-200")}> 
                  <div className="flex items-center justify-between">
                    <div className="capitalize font-medium">{p.color}</div>
                    <div className="flex gap-1 items-center">
                      <span className="w-2 h-2 rounded-sm" style={{ background: {green:'#10b981',yellow:'#f59e0b',blue:'#3b82f6',red:'#ef4444'}[p.color] }} />
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-1">
                    {p.tokens.map((t, ti) => (
                      <div key={ti} className={cn("h-2 rounded", t.kind === 'finished' ? 'bg-emerald-500' : t.kind === 'home' ? 'bg-slate-200' : 'bg-slate-400')} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>

      <footer className="py-8 text-center text-xs text-slate-500">Pass-and-play Ludo · Built for the web</footer>
    </div>
  );
}
