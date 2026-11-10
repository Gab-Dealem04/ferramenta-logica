import React from "react";
import { InlineMath } from "react-katex";
import { getRuleRefType, getRequiredRefsCount } from "../../../utils/proofLogic";
import { getRuleLatex } from "../../../utils/latexFormat";

export default function RuleWithBox({
  rule,
  references = [],
  isFocused = false,
  isSelecting = false,
  onClick, // toque na regra (mantido por compatibilidade)
  onRuleClick, // toque no nome da regra: abre o teclado de regras
  onRefsClick, // toque nos números: abre o teclado numérico para editá-los
  draft,
  draftCursor = 0,
}) {
  const isConstant = rule === "CONSTANTE"; // linha de constante nova: rótulo em branco
  const isSimpleType = rule === "PREMISSA" || rule === "HIPÓTESE" || isConstant;
  const refType = getRuleRefType(rule);
  const canHaveRefs = !!rule && !isSimpleType && refType !== "NONE";

  const handleRuleClick = onRuleClick || onClick;

  // Os números têm o próprio toque; sem onRefsClick, o toque sobe para a regra.
  const handleRefsClick = onRefsClick
    ? (e) => {
        e.stopPropagation();
        onRefsClick(e);
      }
    : undefined;

  const renderSlots = () => {
    if (refType === "OR_ELIM") {
      const slots = [
        references[0] !== undefined ? references[0] : "_",
        references[1] !== undefined ? references[1] : "_-_",
        references[2] !== undefined ? references[2] : "_-_",
      ];
      return slots.join(", ");
    }
    if (refType === "EXISTS_ELIM") {
      const slots = [
        references[0] !== undefined ? references[0] : "_",
        references[1] !== undefined ? references[1] : "_-_",
      ];
      return slots.join(", ");
    }
    if (refType === "RANGE") {
      return references.length > 0 ? references[0] : "_–_";
    }
    const requiredCount = getRequiredRefsCount(rule);
    const slots = [];
    for (let i = 0; i < requiredCount; i++) {
      slots.push(references[i] !== undefined ? references[i] : "_");
    }
    return slots.join(",");
  };

  return (
    <div
      onClick={handleRuleClick}
      className="flex items-center gap-1.5 font-mono text-xs font-bold pr-1 cursor-pointer shrink-0"
    >
      {isFocused && !rule && (
        <span className="animate-pulse border-r-2 border-blue-600 h-4 inline-block my-auto text-transparent">
          _
        </span>
      )}

      {rule && (
        <span
          className={
            isSimpleType
              ? "text-blue-600 font-bold lowercase flex items-center"
              : "text-blue-500 flex items-center"
          }
        >
          {isConstant ? "" : isSimpleType ? rule.toLowerCase() : <InlineMath math={getRuleLatex(rule)} />}
          {isFocused && (
            <span className="animate-pulse border-r-2 border-blue-600 h-4 inline-block ml-1"></span>
          )}
        </span>
      )}

      {canHaveRefs &&
        (isSelecting ? (
          <div
            onClick={handleRefsClick}
            className="min-w-[24px] h-[20px] px-1.5 border border-dashed border-blue-400 rounded flex items-center justify-center bg-blue-50/50 font-bold text-blue-700 text-[11px] ml-0.5"
          >
            {draft ? (
              <span className="flex items-center">
                {draft.slice(0, draftCursor)}
                <span className="animate-pulse border-r-2 border-blue-600 h-3 inline-block" />
                {draft.slice(draftCursor)}
              </span>
            ) : (
              renderSlots()
            )}
          </div>
        ) : references.length > 0 ? (
          <span
            onClick={handleRefsClick}
            title="Tocar para editar as referências"
            className="text-blue-700 font-extrabold text-[11px] ml-0.5 px-1 py-1 rounded hover:bg-blue-100 active:bg-blue-200"
          >
            {references.join(", ")}
          </span>
        ) : (
          <span
            onClick={handleRefsClick}
            title="Tocar para informar as referências"
            className="text-blue-300 font-bold text-[11px] ml-0.5 px-1.5 py-0.5 border border-dashed border-blue-200 rounded"
          >
            {renderSlots()}
          </span>
        ))}
    </div>
  );
}