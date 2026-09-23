import React from "react";
import { InlineMath } from "react-katex";
import { getRuleRefType, getRequiredRefsCount } from "../../../utils/proofLogic";
import { getRuleLatex } from "../../../utils/latexFormat";

export default function RuleWithBox({
  rule,
  references = [],
  isFocused = false,
  isSelecting = false,
  onClick,
}) {
  const isSimpleType = rule === "PREMISSA" || rule === "HIPÓTESE";
  const refType = getRuleRefType(rule);

  const renderSlots = () => {
    if (refType === "OR_ELIM") {
      return references.length > 0 ? references.join(", ") : "disj, c1, c2";
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
      onClick={onClick}
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
              : "text-blue-500 lowercase flex items-center"
          }
        >
          {isSimpleType ? rule.toLowerCase() : <InlineMath math={getRuleLatex(rule)} />}
          {isFocused && (
            <span className="animate-pulse border-r-2 border-blue-600 h-4 inline-block ml-1"></span>
          )}
        </span>
      )}

      {!isSimpleType &&
        rule &&
        (isSelecting ? (
          <div className="min-w-[24px] h-[20px] px-1.5 border border-dashed border-blue-400 rounded flex items-center justify-center bg-blue-50/50 font-bold text-blue-700 text-[11px] ml-0.5">
            {renderSlots()}
          </div>
        ) : (
          references.length > 0 && (
            <span className="text-blue-700 font-extrabold text-[11px] ml-0.5">
              {references.join(", ")}
            </span>
          )
        ))}
    </div>
  );
}