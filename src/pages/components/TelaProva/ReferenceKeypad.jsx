import React from "react";

const KEYS = [
  ["1", "1", "num"], ["2", "2", "num"], ["3", "3", "num"], ["⌫", "⌫", "ctrl"],
  ["4", "4", "num"], ["5", "5", "num"], ["6", "6", "num"], ["-", "–", "sep"],
  ["7", "7", "num"], ["8", "8", "num"], ["9", "9", "num"], [",", ",", "sep"],
  ["◀", "◀", "ctrl"], ["0", "0", "num"], ["▶", "▶", "ctrl"], ["OK", "OK", "ok"],
];

const STYLE = {
  num: "bg-slate-800 text-white shadow-md",
  sep: "bg-blue-50 border border-blue-200 text-blue-700",
  ctrl: "bg-slate-100 border border-slate-200 text-slate-700",
  ok: "bg-green-50 border-2 border-green-400 text-green-700",
};

export default function ReferenceKeypad({ onChar, onMoveCursor, onConfirm }) {
  const press = (value) => {
    if (value === "◀") onMoveCursor("LEFT");
    else if (value === "▶") onMoveCursor("RIGHT");
    else if (value === "OK") onConfirm();
    else onChar(value);
  };

  return (
    <div className="grid grid-cols-4 gap-1.5 animate-in fade-in duration-150">
      {KEYS.map(([value, label, kind]) => (
        <button
          key={value}
          onClick={() => press(value)}
          className={`py-3.5 rounded-xl text-lg font-black active:scale-95 transition-transform flex items-center justify-center ${STYLE[kind]}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}