import React from "react";
import { InlineMath } from "react-katex";
import { logicalOperators } from "../../../utils/proofLogic";

// Ícone de caixa (quadrado)
function BoxIcon({ className = "w-5 h-5" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="1.5" />
    </svg>
  );
}

// Ícone de "enter" (seta para a esquerda com a haste subindo à direita)
function EnterIcon({ className = "w-6 h-6" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M19 7v4H5.83l3.58-3.59L8 6l-6 6 6 6 1.41-1.41L5.83 13H21V7z" />
    </svg>
  );
}

export default function MainKeyboard({
  dynamicVariables,
  onTabPress,
  onAddSymbol,
  onOpenAddSymbolModal,
  onMoveCursor,
  onConfirmLine,
  onOpenBox,
}) {
  return (
    <div className="space-y-2 animate-in fade-in duration-150">
      <div className="grid grid-cols-8 gap-1">
        <button
          onClick={onTabPress}
          className="bg-blue-50 border border-blue-200 text-blue-700 py-3 rounded-xl font-black text-xl active:bg-blue-100 shadow-sm flex items-center justify-center"
        >
          ↹
        </button>

        {dynamicVariables.map((s) => (
          <button
            key={s}
            onClick={() => onAddSymbol(s)}
            className="bg-slate-50 border border-slate-200 py-3 rounded-xl font-bold text-slate-700 shadow-sm active:bg-slate-200 text-sm flex items-center justify-center"
          >
            <InlineMath math={s} />
          </button>
        ))}

        <button
          onClick={onOpenAddSymbolModal}
          title="Adicionar novo símbolo"
          className="bg-slate-200 border border-slate-300 text-slate-700 py-3 rounded-xl font-black text-xs active:bg-slate-300 shadow-sm flex items-center justify-center"
        >
          ...
        </button>

        <button
          onClick={() => onAddSymbol("⌫")}
          className="bg-slate-50 border border-slate-200 py-3 rounded-xl font-bold text-slate-700 shadow-sm active:bg-slate-200 text-sm flex items-center justify-center"
        >
          ⌫
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {logicalOperators.map((item) => (
          <button
            key={item.symbol}
            onClick={() => onAddSymbol(item.symbol)}
            className="bg-slate-800 text-white py-3 rounded-xl font-bold shadow-md active:scale-95 transition-transform flex items-center justify-center text-lg"
          >
            <InlineMath math={item.latex} />
          </button>
        ))}
      </div>

      <div className="flex gap-1.5 h-12">
        <button
          onClick={() => onAddSymbol(":")}
          title="Dois pontos: o nome antes deles é um termo novo da caixa (ex.: a: P(a))"
          className="flex-1 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-600 active:bg-slate-200 text-lg"
        >
          :
        </button>
        <button
          onClick={onOpenBox}
          title="Abrir caixa"
          className="flex-1 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 active:bg-slate-200 flex items-center justify-center"
        >
          <BoxIcon />
        </button>
        <button
          onClick={() => onAddSymbol("(")}
          className="flex-1 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-600 active:bg-slate-200"
        >
          (
        </button>
        <button
          onClick={() => onAddSymbol(")")}
          className="flex-1 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-600 active:bg-slate-200"
        >
          )
        </button>
        <button
          onClick={() => onMoveCursor("LEFT")}
          className="flex-1 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-700 active:bg-slate-200 text-base flex items-center justify-center"
        >
          ◀
        </button>
        <button
          onClick={() => onMoveCursor("RIGHT")}
          className="flex-1 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-700 active:bg-slate-200 text-base flex items-center justify-center"
        >
          ▶
        </button>
        <button
          onClick={onConfirmLine}
          title="Pular linha"
          className="flex-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-xl flex items-center justify-center active:bg-slate-200 shadow-sm"
        >
          <EnterIcon />
        </button>
      </div>
    </div>
  );
}