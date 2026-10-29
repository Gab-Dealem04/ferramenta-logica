import React from "react";
import { InlineMath } from "react-katex";
import { formatToLatex, nameToLatex } from "../../../utils/latexFormat";
import { parseHeader, headerColumnEm } from "../../../utils/boxNames";

// Cursor sem largura: não empurra o texto
function Caret() {
  return (
    <span className="relative inline-block w-0 h-5 shrink-0" aria-hidden="true">
      <span className="absolute -left-px top-0 h-5 border-r-2 border-blue-600 animate-pulse" />
    </span>
  );
}

// Cabeçalho de caixa "nome: fórmula": o nome fica numa coluna de largura fixa
// (a mesma do recuo das linhas de baixo), então a fórmula alinha exatamente.
function HeaderDisplay({ text, header, editing, cursorPosition, isFocused }) {
  const colonIdx = text.indexOf(":");
  const nameText = text.slice(0, colonIdx);

  const restFull = text.slice(colonIdx + 1);
  const lead = restFull.length - restFull.trimStart().length;
  const rest = restFull.slice(lead);
  const restStart = colonIdx + 1 + lead;

  const cursorInName = editing && cursorPosition <= colonIdx;
  const cursorInRest = editing && !cursorInName;
  const relCursor = Math.max(0, Math.min(rest.length, cursorPosition - restStart));

  const nameBefore = text.slice(0, cursorPosition);
  const nameAfter = text.slice(cursorPosition, colonIdx);

  return (
    <span
      className={`flex items-center ${editing ? "font-bold text-blue-700 text-base" : ""}`}
    >
      <span
        className="inline-flex items-center shrink-0"
        style={{ width: `${headerColumnEm(header.name)}em` }}
      >
        {cursorInName ? (
          <>
            {nameBefore.trim() && <InlineMath math={nameToLatex(nameBefore)} />}
            {isFocused && <Caret />}
            {nameAfter.trim() && <InlineMath math={nameToLatex(nameAfter)} />}
            <InlineMath math="\text{:}" />
          </>
        ) : (
          <InlineMath math={`${nameToLatex(nameText)}\\text{:}`} />
        )}
      </span>

      {cursorInRest ? (
        <>
          {rest.slice(0, relCursor) && (
            <InlineMath math={formatToLatex(rest.slice(0, relCursor), { header: false })} />
          )}
          {isFocused && <Caret />}
          {rest.slice(relCursor) && (
            <InlineMath math={formatToLatex(rest.slice(relCursor), { header: false })} />
          )}
        </>
      ) : (
        rest && <InlineMath math={formatToLatex(rest, { header: false })} />
      )}
    </span>
  );
}

export default function FormulaDisplay({
  text,
  editing = false,
  cursorPosition = 0,
  isFocused = false,
}) {
  const header = parseHeader(text);

  if (header) {
    return (
      <HeaderDisplay
        text={text}
        header={header}
        editing={editing}
        cursorPosition={cursorPosition}
        isFocused={isFocused}
      />
    );
  }

  if (!editing) {
    return <InlineMath math={formatToLatex(text)} />;
  }

  const before = text.slice(0, cursorPosition);
  const after = text.slice(cursorPosition);

  return (
    <span className="flex items-center font-bold text-blue-700 text-base">
      {before && <InlineMath math={formatToLatex(before, { header: false })} />}
      {isFocused && <Caret />}
      {after && <InlineMath math={formatToLatex(after, { header: false })} />}
    </span>
  );
}