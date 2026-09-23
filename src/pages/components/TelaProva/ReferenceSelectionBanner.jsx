import React from "react";
import { InlineMath } from "react-katex";
import { getRuleRefType } from "../../../utils/proofLogic";
import { getRuleLatex } from "../../../utils/latexFormat";

export default function ReferenceSelectionBanner({ currentRule, selectedReferences, onFinish }) {
  const refType = getRuleRefType(currentRule);

  const helperText =
    refType === "OR_ELIM"
      ? "Selecione a disjunção e as duas caixas para "
      : refType === "RANGE"
      ? "Clique na hipótese e no fim do intervalo para "
      : "Selecione as linhas para ";

  return (
    <div className="bg-blue-50 border border-blue-200 text-blue-900 text-[11px] font-medium px-3 py-1.5 rounded-lg flex justify-between items-center animate-in fade-in gap-2 shadow-sm">
      <div className="flex items-center gap-1.5 overflow-hidden">
        <span className="flex items-center gap-1">
          {helperText}
          <strong>
            <InlineMath math={getRuleLatex(currentRule)} />
          </strong>
          :
        </span>
        {selectedReferences.length > 0 && (
          <span className="font-bold bg-blue-200 text-blue-900 px-1.5 py-0.5 rounded text-[10px] shrink-0">
            {selectedReferences.join(", ")}
          </span>
        )}
      </div>
      <button
        onClick={onFinish}
        className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-[10px] px-2.5 py-1 rounded-md shadow-sm transition-all shrink-0"
      >
        OK
      </button>
    </div>
  );
}