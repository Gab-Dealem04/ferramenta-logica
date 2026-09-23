import React from "react";
import FormulaDisplay from "./FormulaDisplay";
import RuleWithBox from "./RuleWithBox";
import NestedBoxes from "./NestedBoxes";

export default function ProofLineRow({
  line,
  isActive,
  isSelectedRef,
  focusedField,
  isSelectingReferences,
  currentFormula,
  cursorPosition,
  closedBoxes,
  onLineClick,
}) {
  const scopes = line.boxScopes || [];

  const content = (
    <>
      <div
        onClick={() => onLineClick(line, "formula")}
        className="flex-1 flex items-center font-bold text-slate-700 text-base cursor-pointer overflow-x-auto"
      >
        <FormulaDisplay
          text={isActive ? currentFormula : line.formula}
          editing={isActive}
          cursorPosition={cursorPosition}
          isFocused={isActive && focusedField === "formula"}
        />
      </div>

      <RuleWithBox
        rule={line.rule}
        references={line.references}
        isFocused={isActive && focusedField === "rule"}
        isSelecting={isActive && isSelectingReferences}
        onClick={(e) => {
          e.stopPropagation();
          onLineClick(line, "rule");
        }}
      />
    </>
  );

  return (
    <div
      className={`relative flex items-center h-10 border-b transition-all select-none ${
        isActive
          ? "bg-blue-50/80 border-blue-300"
          : isSelectedRef
          ? "bg-blue-100/70 border-blue-300"
          : "border-blue-100 hover:bg-slate-50"
      }`}
    >
      <span className="w-8 text-[10px] text-slate-400 font-mono flex items-center justify-between z-10 pl-1 shrink-0">
        {line.id}
        {isSelectedRef && <span className="text-blue-600 font-bold ml-0.5">✓</span>}
      </span>

      <NestedBoxes scopes={scopes} lineId={line.id} closedBoxes={closedBoxes}>
        {content}
      </NestedBoxes>
    </div>
  );
}