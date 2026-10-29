import React, { useState } from "react";
import { InlineMath } from "react-katex";
import { availableRules } from "../../../utils/proofLogic";

// Teclado 1: regras com símbolo (15 + botão de pular linha = 4x4)
const SYMBOL_RULES = [
  "∧i", "∧e", "∨i", "∨e",
  "→i", "→e", "¬i", "¬e",
  "¬¬i", "¬¬e", "⊥e",
  "∀i", "∀e", "∃i", "∃e",
];

// Teclado 2: regras escritas
const WRITTEN_RULES = ["RAA", "LTE", "copie"];

const ruleByCode = Object.fromEntries(availableRules.map((r) => [r.code, r]));

// Ícone de "enter" (seta para a esquerda com a haste subindo à direita)
function EnterIcon({ className = "w-5 h-5" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M19 7v4H5.83l3.58-3.59L8 6l-6 6 6 6 1.41-1.41L5.83 13H21V7z" />
    </svg>
  );
}

export default function RulesKeyboard({
  onSelectRule,
  onClearRule,
  onConfirmLine,
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
      {ruleByCode[code] ? <InlineMath math={ruleByCode[code].latex} /> : code}
    </button>
  );

  const enterBtn = (
    <button
      key="enter"
      onClick={onConfirmLine}
      title="Pular linha"
      className={`${lightBtn} shadow-sm`}
    >
      <EnterIcon />
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
        {page === "symbols" ? (
          <button
            onClick={() => setPage("written")}
            className={`w-12 ${pageBtn}`}
            title="Regras escritas (RAA, LTE, copie)"
          >
            ...
          </button>
        ) : (
          <button
            onClick={() => setPage("symbols")}
            className={`w-12 ${pageBtn}`}
            title="Regras com símbolo"
          >
            ⟵
          </button>
        )}
        <button onClick={onClearRule} className={`w-12 ${lightBtn}`} title="Limpar regra">
          ⌫
        </button>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {(page === "symbols" ? SYMBOL_RULES : WRITTEN_RULES).map(renderRule)}
        {enterBtn}
      </div>
    </div>
  );
}