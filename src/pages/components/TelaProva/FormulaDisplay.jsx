import React from "react";
import { InlineMath } from "react-katex";
import { formatToLatex } from "../../../utils/latexFormat";

export default function FormulaDisplay({
  text,
  editing = false,
  cursorPosition = 0,
  isFocused = false,
}) {
  if (!editing) {
    return <InlineMath math={formatToLatex(text)} />;
  }

  const before = text.slice(0, cursorPosition);
  const after = text.slice(cursorPosition);

  return (
    <span className="flex items-center font-bold text-blue-700 text-base">
      {before && <InlineMath math={formatToLatex(before)} />}
      {isFocused && (
        <span className="animate-pulse border-r-2 border-blue-600 h-5 inline-block mx-[1px]"></span>
      )}
      {after && <InlineMath math={formatToLatex(after)} />}
    </span>
  );
}