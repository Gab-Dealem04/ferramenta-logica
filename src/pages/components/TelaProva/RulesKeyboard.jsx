import React from "react";
import { InlineMath } from "react-katex";
import { availableRules } from "../../../utils/proofLogic";

export default function RulesKeyboard({
  activeLineId,
  onDeleteActiveLine,
  onSelectRule,
  onClearRule,
  onBack,
}) {
  return (
    <div className="space-y-2 animate-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-center justify-between pb-1 border-b">
        <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
          Escolha o Tipo ou Regra:
        </span>
        <button onClick={onBack} className="text-xs font-bold text-slate-400 hover:text-slate-600">
          ✕ Voltar
        </button>
      </div>

      {activeLineId !== null && (
        <button
          onClick={onDeleteActiveLine}
          className="w-full py-2 bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1 active:scale-98"
        >
          <span>🗑</span> Remover Linha {activeLineId}
        </button>
      )}

      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => onSelectRule("PREMISSA")}
          className="py-2.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold active:bg-slate-200"
        >
          Premissa
        </button>
        <button
          onClick={() => onSelectRule("HIPÓTESE")}
          className="py-2.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold active:bg-slate-200"
        >
          Hipótese
        </button>
        <button
          onClick={onClearRule}
          className="py-2.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold active:bg-slate-200 flex items-center justify-center gap-1"
        >
          <span>⌫</span>
        </button>
      </div>

      <div className="grid grid-cols-4 gap-1.5 pt-1">
        {availableRules.map((rule) => (
          <button
            key={rule.code}
            onClick={() => onSelectRule(rule.code)}
            className="py-2.5 bg-slate-800 text-white rounded-xl text-xs font-black shadow-md active:scale-95 transition-transform flex items-center justify-center"
          >
            <InlineMath math={rule.latex} />
          </button>
        ))}
      </div>
    </div>
  );
}