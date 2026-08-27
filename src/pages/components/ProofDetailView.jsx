import React from "react";

export default function ProofDetailView({
  proof,
  lines,
  currentFormula,
  currentRule,
  setCurrentRule,
  activeMenu,
  handlePressStart,
  handlePressEnd,
  addSymbol,
  confirmLine,
  handleSaveAndBack,
}) {
  return (
    <div className="flex flex-col h-full overflow-hidden animate-in slide-in-from-right duration-200">
      <div className="bg-slate-100 border-b px-3 py-2 flex items-center justify-between shadow-sm z-10">
        <button onClick={handleSaveAndBack} className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1">
          ← Salvar e Voltar ao Histórico
        </button>
      </div>

      <div className="flex-1 bg-white relative overflow-y-auto p-4 shadow-inner">
        <div className="absolute left-10 top-0 bottom-0 w-[1px] bg-red-200"></div>
        <div className="space-y-0">
          {lines.map((line) => (
            <div key={line.id} className="flex items-center h-10 border-b border-blue-100">
              <span className="w-6 text-[10px] text-slate-400 font-mono">{line.id}</span>
              <span className="flex-1 pl-8 font-mono font-bold text-slate-700 flex items-center gap-2">{line.formula}</span>
              {line.rule && <span className="text-[10px] font-bold text-blue-400 font-mono pr-2 lowercase">{line.rule}</span>}
            </div>
          ))}

          {proof.temSubprovas && lines.length > 0 && (
            <>
              <div className="relative ml-10 mt-3 border border-slate-700 p-2 bg-white animate-in fade-in">
                <div className="absolute -left-6 top-0 bottom-0 w-[1px] bg-slate-300"></div>
                <div className="flex items-center h-9">
                  <span className="absolute -left-10 w-6 text-[10px] text-slate-400 font-mono">4</span>
                  <span className="flex-1 pl-6 font-mono font-bold text-slate-700">A</span>
                  <span className="text-[10px] font-bold text-blue-400 font-mono pr-2 lowercase">hipótese</span>
                </div>
                <div className="flex items-center h-9">
                  <span className="absolute -left-10 top-[44px] w-6 text-[10px] text-slate-400 font-mono">5</span>
                  <span className="flex-1 pl-6 font-mono font-bold text-slate-700">C</span>
                  <span className="text-[10px] font-bold text-blue-400 font-mono pr-2 lowercase">→e 1,4</span>
                </div>
              </div>

              <div className="relative ml-10 mt-3 border border-slate-700 p-2 bg-white animate-in fade-in">
                <div className="absolute -left-6 top-0 bottom-0 w-[1px] bg-slate-300"></div>
                <div className="flex items-center h-9">
                  <span className="absolute -left-10 w-6 text-[10px] text-slate-400 font-mono">6</span>
                  <span className="flex-1 pl-6 font-mono font-bold text-slate-700">B</span>
                  <span className="text-[10px] font-bold text-blue-400 font-mono pr-2 lowercase">hipótese</span>
                </div>
                <div className="flex items-center h-9">
                  <span className="absolute -left-10 top-[44px] w-6 text-[10px] text-slate-400 font-mono">7</span>
                  <span className="flex-1 pl-6 font-mono font-bold text-slate-700">C</span>
                  <span className="text-[10px] font-bold text-blue-400 font-mono pr-2 lowercase">→e 2,6</span>
                </div>
              </div>

              <div className="flex items-center h-10 border-b border-blue-100 mt-2">
                <span className="w-6 text-[10px] text-slate-400 font-mono">8</span>
                <span className="flex-1 pl-8 font-mono font-bold text-slate-700">C</span>
                <span className="text-[10px] font-bold text-blue-400 font-mono pr-2 lowercase">∨e 3, 4-5, 6-7</span>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center h-10 border-b border-blue-300 bg-blue-50/50 mt-0">
          <span className="w-6 text-[10px] text-blue-400 font-mono ml-0">
            {lines.length > 0 ? Math.max(...lines.map((l) => l.id)) + (proof.temSubprovas ? 6 : 1) : 1}
          </span>
          <div className="flex-1 pl-8 flex items-center gap-2">
            <span className="font-mono font-bold text-blue-700 text-lg">{currentFormula}</span>
            <span className="animate-pulse border-r-2 border-blue-600 h-5"></span>
          </div>
          <span className="text-[9px] font-extrabold text-blue-500 font-mono pr-2 uppercase tracking-wider">{currentRule}</span>
        </div>
      </div>

      <div className="bg-white p-3 space-y-2 border-t z-10 shrink-0">
        <div className="flex gap-1.5 pb-1 border-b border-slate-100">
          {["PREMISSA", "HIPÓTESE", "REGRA"].map((mode) => (
            <button
              key={mode}
              onClick={() => setCurrentRule(mode)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-black tracking-wider transition-colors uppercase ${
                currentRule === mode ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {mode === "HIPÓTESE" ? "Hipótese" : mode.toLowerCase()}
            </button>
          ))}
        </div>

        {activeMenu && (
          <div className="flex justify-center gap-2 mb-1 animate-in fade-in zoom-in duration-200">
            <button onClick={() => addSymbol(`${activeMenu}i`)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-md">Intro ({activeMenu}i)</button>
            <button onClick={() => addSymbol(`${activeMenu}e`)} className="bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-md">Elim ({activeMenu}e)</button>
          </div>
        )}

        <div className="grid grid-cols-8 gap-1.5">
          {["P", "Q", "R", "S", "T", "U", "V", "⌫"].map((s) => (
            <button key={s} onClick={() => addSymbol(s)} className="bg-slate-50 border border-slate-200 py-3 rounded-xl font-bold text-slate-700 shadow-sm active:bg-slate-200 text-sm">{s}</button>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {["∧", "∨", "→", "¬", "⊥", "∀x", "∃x"].map((s) => (
            <button
              key={s}
              onMouseDown={() => handlePressStart(s)}
              onMouseUp={() => handlePressEnd(s)}
              onTouchStart={() => handlePressStart(s)}
              onTouchEnd={() => handlePressEnd(s)}
              className="bg-slate-800 text-white py-3 rounded-xl font-bold shadow-md active:scale-95 transition-transform flex items-center justify-center text-base"
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5 h-12">
          <button onClick={() => addSymbol("(")} className="flex-1 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-600 active:bg-slate-200">(</button>
          <button onClick={() => addSymbol(")")} className="flex-1 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-600 active:bg-slate-200">)</button>
          <button onClick={() => addSymbol("SPACE")} className="flex-[3] bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center active:bg-slate-200">
            <div className="w-12 h-0.5 bg-slate-400 rounded-full"></div>
          </button>
          <button onClick={confirmLine} className="flex-1 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center active:bg-slate-200 text-slate-600 font-bold text-lg">↵</button>
        </div>

        <button onClick={confirmLine} className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold uppercase tracking-wider shadow-lg active:bg-blue-700 mt-1 text-xs">
          Inserir Linha ({currentRule.toLowerCase()})
        </button>
      </div>
    </div>
  );
}