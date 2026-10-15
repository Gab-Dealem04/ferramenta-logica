import React from "react";
import FormulaDisplay from "./FormulaDisplay";
import RuleWithBox from "./RuleWithBox";
import NestedBoxes from "./NestedBoxes";
import { getCursorIndexFromClick } from "../../../utils/cursorFromClick";

const SQUIGGLE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='6' height='4' viewBox='0 0 6 4'%3E%3Cpath d='M0 2 Q1.5 0 3 2 T6 2' fill='none' stroke='%23ef4444' stroke-width='1.2'/%3E%3C/svg%3E\")";

function Squiggle({ active, title, children }) {
  return (
    <span className="relative inline-flex items-center shrink-0" title={active ? title : undefined}>
      {children}
      {active && (
        <span
          aria-hidden="true"
          className="absolute left-0 right-0 pointer-events-none"
          style={{
            bottom: -2,
            height: 4,
            backgroundImage: SQUIGGLE,
            backgroundRepeat: "repeat-x",
            backgroundSize: "6px 4px",
          }}
        />
      )}
    </span>
  );
}

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
  refDraft,
  refCursor,
  error, // { formula?: string, rule?: string } vindo do checkProof
}) {
  const scopes = line.boxScopes || [];

  // Não marca a linha que está sendo editada (evita piscar enquanto digita).
  const formulaError = !isActive ? error?.formula : null;
  const ruleError = !isActive ? error?.rule : null;
  const message = [formulaError, ruleError].filter(Boolean).join(" · ");

  const content = (
    <>
      <div
        onClick={(e) => {
          const idx = isSelectingReferences
            ? undefined
            : getCursorIndexFromClick(
                e,
                isActive ? currentFormula : line.formula || ""
              );
          onLineClick(line, "formula", idx);
        }}
        className="flex-1 flex items-center font-bold text-slate-700 text-base cursor-pointer overflow-x-auto"
      >
        <Squiggle active={!!formulaError} title={formulaError}>
          <FormulaDisplay
            text={isActive ? currentFormula : line.formula}
            editing={isActive}
            cursorPosition={cursorPosition}
            isFocused={isActive && focusedField === "formula"}
          />
        </Squiggle>
      </div>

      <Squiggle active={!!ruleError} title={ruleError}>
        <RuleWithBox
          rule={line.rule}
          references={line.references}
          isFocused={isActive && focusedField === "rule"}
          isSelecting={isActive && isSelectingReferences}
          draft={isActive ? refDraft : undefined}
          draftCursor={refCursor}
          onClick={(e) => {
            e.stopPropagation();
            onLineClick(line, "rule");
          }}
        />
      </Squiggle>
    </>
  );

  return (
    <div>
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

      {message && (
        <div className="ml-8 px-2 py-0.5 text-[10px] leading-snug text-red-600 border-b border-red-100 bg-red-50/40">
          {message}
        </div>
      )}
    </div>
  );
}