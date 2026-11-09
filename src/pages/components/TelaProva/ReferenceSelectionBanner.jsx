import React from "react";
import { InlineMath } from "react-katex";
import { getRuleLatex } from "../../../utils/latexFormat";

// Como escrever as referências de cada regra (chave: código da regra em minúsculas).
// Número = uma linha (ex.: 3). Dois números com traço = uma caixa (ex.: 2-5).
const RULE_HINTS = {
  "∧i": "Informe as duas linhas que serão unidas, em qualquer ordem (ex.: 1, 2)",
  "∧e": "Informe a linha da conjunção A ∧ B (ex.: 3)",
  "∨i": "Informe a linha que vira um dos lados da disjunção (ex.: 2)",
  "∨e": "Informe a disjunção e as duas caixas (ex.: 1, 2-3, 4-5)",
  "→i": "Informe a caixa que começa na hipótese e termina na conclusão (ex.: 2-5)",
  "→e": "Informe a implicação e a linha do antecedente, em qualquer ordem (ex.: 1, 2)",
  "¬i": "Informe a caixa que começa na hipótese e termina em ⊥ (ex.: 3-5)",
  "¬e": "Informe as duas linhas contraditórias, A e ¬A, em qualquer ordem (ex.: 1, 2)",
  "¬¬i": "Informe a linha que será negada duas vezes (ex.: 2)",
  "¬¬e": "Informe a linha da dupla negação ¬¬A (ex.: 2)",
  "⊥e": "Informe a linha onde aparece ⊥ (ex.: 4)",
  raa: "Informe a caixa que começa em ¬A e termina em ⊥ (ex.: 2-4)",
  copie: "Informe a linha que será copiada (ex.: 1)",
  "∀e": "Informe a linha da fórmula ∀x (ex.: 1)",
  "∃i": "Informe a linha com a fórmula já escrita para um termo (ex.: 2)",
  "∀i": "Informe a caixa que começa só com um nome novo, sem hipótese (ex.: 2-4)",
  "∃e": "Informe a fórmula ∃x e a caixa com o nome novo (ex.: 2, 3-5)",
};

export default function ReferenceSelectionBanner({ currentRule, selectedReferences }) {
  const hint = RULE_HINTS[String(currentRule || "").toLowerCase()] || null;

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