import React from "react";
import { cn } from "@/lib/utils";

export interface DiceProps {
  value: number | null;
  onRoll: () => void;
  disabled?: boolean;
}

const pip = (filled: boolean) => (
  <span className={cn("w-2 h-2 rounded-full", filled ? "bg-slate-800" : "bg-transparent border border-slate-300")} />
);

export const Dice: React.FC<DiceProps> = ({ value, onRoll, disabled }) => {
  const patterns: Record<number, boolean[][]> = {
    1: [[false,false,false],[false,true,false],[false,false,false]],
    2: [[true,false,false],[false,false,false],[false,false,true]],
    3: [[true,false,false],[false,true,false],[false,false,true]],
    4: [[true,false,true],[false,false,false],[true,false,true]],
    5: [[true,false,true],[false,true,false],[true,false,true]],
    6: [[true,false,true],[true,false,true],[true,false,true]],
  } as const;

  const grid = value ? patterns[value] : [[false,false,false],[false,false,false],[false,false,false]];

  return (
    <button
      onClick={onRoll}
      disabled={disabled}
      className={cn(
        "group relative w-16 h-16 rounded-xl border border-slate-200 bg-white shadow-md grid place-items-center transition-transform",
        disabled ? "opacity-60 cursor-not-allowed" : "hover:scale-105 active:scale-95",
      )}
      aria-label="Roll dice"
    >
      <div className="grid grid-cols-3 grid-rows-3 gap-1">
        {grid.flat().map((f, i) => (
          <div key={i} className="flex items-center justify-center">{pip(!!f)}</div>
        ))}
      </div>
      <div className="absolute -bottom-6 text-xs text-slate-600">Roll</div>
    </button>
  );
};

export default Dice;
