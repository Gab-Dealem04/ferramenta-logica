import React, { useState } from "react";
import { InlineMath } from "react-katex";
import { availableRules } from "../../../utils/proofLogic";

// Teclado 1: regras com símbolo (15 + botão de troca = 4x4)
const SYMBOL_RULES = [
  "∧i", "∧e", "∨i", "∨e",
  "→i", "→e", "¬i", "¬e",
  "¬¬i", "¬¬e", "⊥e",
  "∀i", "∀e", "∃i", "∃e",
];

// Teclado 2: regras escritas
const WRITTEN_RULES = ["RAA", "LTM", "copie"];

const ruleByCode = Object.fromEntries(availableRules.map((r) => [r.code, r]));

export default function RulesKeyboard({
  activeLineId,
  onDeleteActiveLine,
  onSelectRule,
  onClearRule,
  onBack,
}) {
  const [page, setPage] = useState("symbols"); // "symbols" | "written"

  const ruleBtn =
    "py-3 bg-slate-800 text-white rounded-xl text-sm font-black shadow-md active:scale-95 transition-transform flex items-center justify-center";
  const lightBtn =
    "py-3 bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold active:bg-slate-200 flex items-center justify-center";
  const pageBtn =
    "py-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-xs font-black active:bg-blue-100 flex items-center justify-center";

  const renderRule = (code) => (
    <button key={code} onClick={() => onSelectRule(code)} className={ruleBtn}>
      <InlineMath math={ruleByCode[code].latex} />
    </button>
  );

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

      <div className="flex gap-1.5">
        <button onClick={() => onSelectRule("PREMISSA")} className={`flex-1 ${lightBtn}`}>
          Premissa
        </button>
        <button onClick={() => onSelectRule("HIPÓTESE")} className={`flex-1 ${lightBtn}`}>
          Hipótese
        </button>
        <button onClick={onClearRule} className={`w-12 ${lightBtn}`} title="Limpar regra">
          ⌫
        </button>
        {activeLineId !== null && (
          <button
            onClick={onDeleteActiveLine}
            className="flex-1 py-3 bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold active:bg-red-100 flex items-center justify-center"
          >
            Remover {activeLineId}
          </button>
        )}
      </div>

      {page === "symbols" ? (
        <div className="grid grid-cols-4 gap-1.5">
          {SYMBOL_RULES.map(renderRule)}
          <button onClick={() => setPage("written")} className={pageBtn}>
            + ›
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-1.5">
          {WRITTEN_RULES.map(renderRule)}
          <button onClick={() => setPage("symbols")} className={pageBtn}>
            ‹  ←.
          </button>
        </div>
      )}
    </div>
  );
}