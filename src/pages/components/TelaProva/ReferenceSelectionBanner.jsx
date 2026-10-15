import React from "react";
import { InlineMath } from "react-katex";
import { getRuleRefType } from "../../../utils/proofLogic";
import { getRuleLatex } from "../../../utils/latexFormat";

export default function ReferenceSelectionBanner({ currentRule, selectedReferences }) {
  const refType = getRuleRefType(currentRule);

  const hint =
    refType === "OR_ELIM"
      ? "Informe a disjunção e as duas caixas (ex.: 1, 2-3, 4-5)"
      : refType === "EXISTS_ELIM"
      ? "Informe a fórmula ∃ e a caixa (ex.: 2, 3-5)"
      : refType === "RANGE"
      ? "Informe o início e o fim da caixa (ex.: 2-5)"
      : null;

  return (
    <div className="bg-blue-50 border border-blue-200 text-blue-900 px-3 py-2 rounded-lg flex flex-col gap-0.5 animate-in fade-in shadow-sm">
      <span className="flex items-center flex-wrap gap-x-1 text-sm font-semibold leading-tight">
        Digite ou clique nas linhas para referenciar a regra
        <strong>
          <InlineMath math={getRuleLatex(currentRule)} />
        </strong>
        {selectedReferences.length > 0 && (
          <span className="font-bold bg-blue-200 text-blue-900 px-1.5 py-0.5 rounded text-xs shrink-0">
            {selectedReferences.join(", ")}
          </span>
        )}
      </span>
      {hint && <span className="text-[11px] font-medium text-blue-700/80">{hint}</span>}
    </div>
  );
}