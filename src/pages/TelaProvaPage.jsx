import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "katex/dist/katex.min.css";

import { useProofEditor } from "../hooks/useProofEditor";

import Sidebar from "./components/TelaProva/Sidebar";
import NativeKeyboardInput from "./components/TelaProva/NativeKeyboardInput";
import ProofLineRow from "./components/TelaProva/ProofLineRow";
import FormulaDisplay from "./components/TelaProva/FormulaDisplay";
import RuleWithBox from "./components/TelaProva/RuleWithBox";
import NestedBoxes from "./components/TelaProva/NestedBoxes";
import ReferenceSelectionBanner from "./components/TelaProva/ReferenceSelectionBanner";
import MainKeyboard from "./components/TelaProva/MainKeyboard";
import RulesKeyboard from "./components/TelaProva/RulesKeyboard";

export default function TelaProvaPage() {
  const location = useLocation();
  const incomingProof = location.state?.provaData || null;

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const {
    lines,
    currentFormula,
    currentRule,
    selectedReferences,
    openBoxes,
    closedBoxes,
    dynamicVariables,
    inputNativeRef,
    activeLineId,
    cursorPosition,
    focusedField,
    setFocusedField,
    activeKeyboard,
    setActiveKeyboard,
    isSelectingReferences,
    isNativeKeyboardActive,
    handleClearRule,
    handleDeleteActiveLine,
    handleTabPress,
    addSymbol,
    handleOpenNativeKeyboard,
    finishNativeInput,
    handleNativeInputChange,
    handleNativeInputKeyDown,
    handleNativeInputBlur,
    moveCursor,
    handleSelectRuleOrMode,
    handleCloseCurrentBox,
    handleLineClick,
    confirmLine,
    finishSelection,
  } = useProofEditor(incomingProof);

  const isRefSelected = (lineId) =>
    selectedReferences.includes(lineId) ||
    selectedReferences.some(
      (ref) => typeof ref === "string" && ref.split("-").map(Number).includes(lineId)
    );

  return (
    <div className="flex flex-col h-screen bg-slate-50 max-w-md mx-auto border-x shadow-2xl font-sans overflow-hidden relative select-none">
      <NativeKeyboardInput
        inputRef={inputNativeRef}
        isActive={isNativeKeyboardActive}
        onChange={handleNativeInputChange}
        onKeyDown={handleNativeInputKeyDown}
        onBlur={handleNativeInputBlur}
        onFinish={finishNativeInput}
      />

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* HEADER */}
      <header className="p-4 bg-white border-b flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-1.5 rounded-lg text-slate-700 font-bold text-lg"
          >
            ☰
          </button>
          <h1 className="font-black text-slate-800 tracking-tight text-base">LOGIC_LAB</h1>
        </div>

        <button
          onClick={() => alert("Compilando prova atual...")}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold tracking-wider text-blue-600 bg-blue-50/50 hover:bg-blue-100/60 border border-blue-500 rounded-xl active:scale-95 transition-all uppercase"
        >
          <span className="w-0 h-0 border-y-[4px] border-y-transparent border-l-[7px] border-l-blue-600 inline-block"></span>
          Compilar
        </button>
      </header>

      <div className="flex flex-col h-full overflow-hidden">
        <div className="bg-slate-100 border-b px-3 py-2 flex items-center justify-between shadow-sm z-10">
          <Link
            to="/"
            className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
          >
            ← Voltar ao Histórico
          </Link>
        </div>

        {/* ÁREA DO CADERNO */}
        <div className="flex-1 bg-white relative overflow-y-auto p-4 shadow-inner">
          <div className="absolute left-10 top-0 bottom-0 w-[1px] bg-red-200"></div>

          <div className="space-y-0">
            {lines.map((line) => (
              <ProofLineRow
                key={line.id}
                line={line}
                isActive={activeLineId === line.id}
                isSelectedRef={isRefSelected(line.id)}
                focusedField={focusedField}
                isSelectingReferences={isSelectingReferences}
                currentFormula={currentFormula}
                cursorPosition={cursorPosition}
                closedBoxes={closedBoxes}
                onLineClick={handleLineClick}
              />
            ))}
          </div>

          {/* LINHA NOVA EM EDIÇÃO */}
          {activeLineId === null && (
            <div className="flex items-center h-10 border-b border-blue-300 bg-blue-50/50 mt-0">
              <span className="w-8 text-[10px] text-blue-400 font-mono z-10 pl-1 shrink-0">
                {lines.length > 0 ? Math.max(...lines.map((l) => l.id)) + 1 : 1}
              </span>

              <NestedBoxes scopes={openBoxes} lineId={lines.length + 1} closedBoxes={closedBoxes}>
                <div
                  onClick={() => setFocusedField("formula")}
                  className="flex-1 flex items-center cursor-pointer"
                >
                  <FormulaDisplay
                    text={currentFormula}
                    editing
                    cursorPosition={cursorPosition}
                    isFocused={focusedField === "formula"}
                  />
                </div>

                <RuleWithBox
                  rule={currentRule}
                  references={selectedReferences}
                  isFocused={focusedField === "rule"}
                  isSelecting={isSelectingReferences}
                  onClick={() => {
                    setFocusedField("rule");
                    setActiveKeyboard("rules");
                  }}
                />
              </NestedBoxes>
            </div>
          )}
        </div>

        {/* CONTROLES INFERIORES */}
        <div className="bg-white p-3 space-y-2 border-t z-10">
          {openBoxes.length > 0 && (
            <div className="flex justify-end">
              <button
                onClick={handleCloseCurrentBox}
                className="py-1.5 px-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-[10px] rounded-lg shadow transition-all flex items-center gap-1 active:scale-95"
              >
                <span>↵</span> Encerrar Caixa ({openBoxes.length})
              </button>
            </div>
          )}

          {isSelectingReferences && (
            <ReferenceSelectionBanner
              currentRule={currentRule}
              selectedReferences={selectedReferences}
              onFinish={finishSelection}
            />
          )}

          {activeKeyboard === "main" && !isNativeKeyboardActive && (
            <MainKeyboard
              dynamicVariables={dynamicVariables}
              onTabPress={handleTabPress}
              onAddSymbol={addSymbol}
              onOpenNativeKeyboard={handleOpenNativeKeyboard}
              onMoveCursor={moveCursor}
              onConfirmLine={confirmLine}
            />
          )}

          {activeKeyboard === "rules" && (
            <RulesKeyboard
              activeLineId={activeLineId}
              onDeleteActiveLine={handleDeleteActiveLine}
              onSelectRule={handleSelectRuleOrMode}
              onClearRule={handleClearRule}
              onBack={() => {
                setActiveKeyboard("main");
                setFocusedField("formula");
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}