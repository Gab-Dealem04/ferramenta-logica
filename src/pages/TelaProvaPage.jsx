import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import "katex/dist/katex.min.css";
import { InlineMath } from "react-katex";

export default function TelaProvaPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [lines, setLines] = useState([]);
  const [currentFormula, setCurrentFormula] = useState("");
  const [currentRule, setCurrentRule] = useState("PREMISSA");
  const [selectedReferences, setSelectedReferences] = useState([]);
  const [activeMenu, setActiveMenu] = useState(null);
  const [isSelectingReferences, setIsSelectingReferences] = useState(false);

  const timerRef = useRef(null);
  const isTouchDevice = useRef(false);

  const logicalOperators = [
    { latex: "\\land", symbol: "∧" },
    { latex: "\\lor", symbol: "∨" },
    { latex: "\\rightarrow", symbol: "→" },
    { latex: "\\neg", symbol: "¬" },
    { latex: "\\bot", symbol: "⊥" },
    { latex: "\\forall x", symbol: "∀x" },
    { latex: "\\exists x", symbol: "∃x" },
  ];

  const handlePressStart = (symbol) => {
    if (isTouchDevice.current) return;
    timerRef.current = setTimeout(() => {
      setActiveMenu(symbol);
    }, 500);
  };

  const handlePressEnd = (symbol) => {
    if (isTouchDevice.current) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      if (!activeMenu) addSymbol(symbol);
    }
  };

  const handleTouchStart = (symbol) => {
    isTouchDevice.current = true;
    timerRef.current = setTimeout(() => {
      setActiveMenu(symbol);
    }, 500);
  };

  const handleTouchEnd = (symbol) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      if (!activeMenu) {
        addSymbol(symbol);
      }
    }
    setTimeout(() => {
      isTouchDevice.current = false;
    }, 100);
  };

  const addSymbol = (s) => {
    if (s === "⌫") {
      if (currentFormula.length > 0) {
        setCurrentFormula((prev) => prev.slice(0, -1));
      } else if (lines.length > 0) {
        const updatedLines = [...lines];
        const lastLine = updatedLines.pop();
        setLines(updatedLines);
        setCurrentFormula(lastLine.formula);
        setCurrentRule(lastLine.rule ? lastLine.rule.toUpperCase() : "PREMISSA");
      }
    } else if (s === "SPACE") {
      setCurrentFormula((prev) => prev + " ");
    } else {
      setCurrentFormula((prev) => prev + s);
    }
    setActiveMenu(null);
  };

  // Define a regra vinda do popup (Intro/Elim) e ativa o modo de seleção de linhas
  const selectRuleType = (type) => {
    const selectedRuleName = `${activeMenu}${type}`;
    setCurrentRule(selectedRuleName);
    setIsSelectingReferences(true);
    setActiveMenu(null);
  };

  // Alterna a seleção de uma linha quando tocada
  const handleLineClick = (lineId) => {
    if (currentRule === "PREMISSA") return;

    setSelectedReferences((prev) =>
      prev.includes(lineId)
        ? prev.filter((id) => id !== lineId)
        : [...prev, lineId].sort((a, b) => a - b)
    );
  };

  // Finaliza a seleção de referências mantendo a regra ativa
  const finishSelection = () => {
    setIsSelectingReferences(false);
  };

  const confirmLine = () => {
    const nextId = lines.length > 0 ? Math.max(...lines.map((l) => l.id)) + 1 : 1;

    let ruleText = currentRule.toLowerCase();
    if (selectedReferences.length > 0) {
      ruleText += ` ${selectedReferences.join(", ")}`;
    }

    const newLine = {
      id: nextId,
      formula: currentFormula || "",
      rule: currentFormula ? ruleText : "",
    };

    setLines([...lines, newLine]);
    setCurrentFormula("");
    setSelectedReferences([]);
    setCurrentRule("PREMISSA");
    setIsSelectingReferences(false);
  };

  const formatToLatex = (text) => {
    if (!text) return "";
    return text
      .replace(/ /g, "\\ ")
      .replace(/→/g, " \\rightarrow ")
      .replace(/¬/g, " \\neg ")
      .replace(/∧/g, " \\land ")
      .replace(/∨/g, " \\lor ")
      .replace(/⊥/g, " \\bot ")
      .replace(/∀x/g, " \\forall x ")
      .replace(/∃x/g, " \\exists x ");
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 max-w-md mx-auto border-x shadow-2xl font-sans overflow-hidden relative select-none">
      {isSidebarOpen && (
        <div
          className="absolute inset-0 bg-slate-900/40 z-40 animate-in fade-in"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR NAVEGACIONAL */}
      <div
        className={`absolute top-0 left-0 h-full w-64 bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-in-out p-5 flex flex-col justify-between ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          <div className="flex justify-between items-center mb-8 pb-4 border-b">
            <h2 className="font-black text-slate-800">LOGIC_LAB</h2>
            <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 font-bold">
              ✕
            </button>
          </div>
          <nav className="space-y-2">
            <Link
              to="/"
              className="flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl text-slate-600 hover:bg-slate-50"
            >
              <span>📝</span> Histórico
            </Link>
            <Link
              to="/tela-prova"
              className="flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl bg-blue-50 text-blue-700"
            >
              <span>📜</span> Laboratório Principal
            </Link>
          </nav>
        </div>
      </div>

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
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold tracking-wider text-blue-700 bg-blue-50/50 hover:bg-blue-50 border border-blue-200/60 rounded-xl active:scale-95 transition-all uppercase"
        >
          <span className="text-blue-500 text-[10px]">▶</span> Compilar
        </button>
      </header>

      {/* CORPO DA TELA DE PROVA */}
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

          {/* AVISO DO MODO DE REGRAS ATIVO COM BOTÃO DE CONFIRMAÇÃO DE LINHAS */}
          {isSelectingReferences && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium px-3 py-1.5 rounded-lg mb-2 flex justify-between items-center animate-in fade-in gap-2">
              <div className="flex items-center gap-1.5 overflow-hidden">
                <span>👇 Selecione as linhas para <strong>{currentRule}</strong>:</span>
                {selectedReferences.length > 0 && (
                  <span className="font-bold bg-amber-200 px-1.5 py-0.5 rounded text-[10px] shrink-0">
                    {selectedReferences.join(", ")}
                  </span>
                )}
              </div>
              <button
                onClick={finishSelection}
                className="bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-[10px] px-2.5 py-1 rounded-md shadow-sm transition-all shrink-0 flex items-center gap-1"
              >
                ✓ OK
              </button>
            </div>
          )}

          {/* LINHAS GRAVADAS */}
          <div className="space-y-0">
            {lines.map((line) => {
              const isSelected = selectedReferences.includes(line.id);
              return (
                <div
                  key={line.id}
                  onClick={() => handleLineClick(line.id)}
                  className={`flex items-center h-10 border-b transition-colors cursor-pointer select-none ${
                    isSelected
                      ? "bg-blue-100/70 border-blue-300"
                      : "border-blue-100 hover:bg-slate-50"
                  }`}
                >
                  <span className="w-6 text-[10px] text-slate-400 font-mono flex items-center justify-between">
                    {line.id}
                    {isSelected && <span className="text-blue-600 font-bold ml-1">✓</span>}
                  </span>
                  <span className="flex-1 pl-8 font-bold text-slate-700 flex items-center gap-2 text-base">
                    <InlineMath math={formatToLatex(line.formula)} />
                  </span>
                  {line.rule && (
                    <span className="text-[10px] font-bold text-blue-500 font-mono pr-2 lowercase">
                      {line.rule}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* LINHA ATIVA DINÂMICA */}
          <div className="flex items-center h-10 border-b border-blue-300 bg-blue-50/50 mt-0">
            <span className="w-6 text-[10px] text-blue-400 font-mono ml-0">
              {lines.length > 0 ? Math.max(...lines.map((l) => l.id)) + 1 : 1}
            </span>

            <div className="flex-1 pl-8 flex items-center gap-2">
              <span className="font-bold text-blue-700 text-base">
                {currentFormula ? (
                  <InlineMath math={formatToLatex(currentFormula)} />
                ) : null}
              </span>
              <span className="animate-pulse border-r-2 border-blue-600 h-5"></span>
            </div>

            <span className="text-[9px] font-extrabold text-blue-500 font-mono pr-2 uppercase tracking-wider">
              {currentRule}
              {selectedReferences.length > 0 && ` (${selectedReferences.join(",")})`}
            </span>
          </div>
        </div>

        {/* TECLADO E CONTROLES INTEGRADOS */}
        <div className="bg-white p-3 space-y-2 border-t z-10">
          <div className="flex gap-1.5 pb-1 border-b border-slate-100">
            {["PREMISSA", "HIPÓTESE", "REGRA"].map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  setCurrentRule(mode);
                  if (mode === "PREMISSA") {
                    setSelectedReferences([]);
                    setIsSelectingReferences(false);
                  } else if (mode === "REGRA") {
                    setIsSelectingReferences(true);
                  }
                }}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-black tracking-wider transition-colors uppercase ${
                  currentRule === mode
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {mode === "HIPÓTESE" ? "Hipótese" : mode.toLowerCase()}
              </button>
            ))}
          </div>

          {/* POPUP DE INTRODUÇÃO E ELIMINAÇÃO DA REGRA */}
          {activeMenu && (
            <div className="flex justify-center gap-2 mb-1 animate-in fade-in zoom-in duration-200">
              <button
                onClick={() => selectRuleType("i")}
                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-md active:scale-95 transition-transform"
              >
                Intro ({activeMenu}i)
              </button>
              <button
                onClick={() => selectRuleType("e")}
                className="bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-md active:scale-95 transition-transform"
              >
                Elim ({activeMenu}e)
              </button>
            </div>
          )}

          {/* TECLADO DE VARIÁVEIS */}
          <div className="grid grid-cols-8 gap-1.5">
            {["P", "Q", "R", "S", "T", "U", "V", "⌫"].map((s) => (
              <button
                key={s}
                onClick={() => addSymbol(s)}
                className="bg-slate-50 border border-slate-200 py-3 rounded-xl font-bold text-slate-700 shadow-sm active:bg-slate-200 text-sm"
              >
                {s === "⌫" ? s : <InlineMath math={s} />}
              </button>
            ))}
          </div>

          {/* TECLADO DE SÍMBOLOS LÓGICOS COM LATEX */}
          <div className="grid grid-cols-7 gap-1">
            {logicalOperators.map((item) => (
              <button
                key={item.symbol}
                onMouseDown={() => handlePressStart(item.symbol)}
                onMouseUp={() => handlePressEnd(item.symbol)}
                onTouchStart={() => handleTouchStart(item.symbol)}
                onTouchEnd={() => handleTouchEnd(item.symbol)}
                className="bg-slate-800 text-white py-3 rounded-xl font-bold shadow-md active:scale-95 transition-transform flex items-center justify-center text-lg"
              >
                <InlineMath math={item.latex} />
              </button>
            ))}
          </div>

          {/* TECLADO DE AÇÕES E PARÊNTESES */}
          <div className="flex gap-1.5 h-12">
            <button
              onClick={() => addSymbol("(")}
              className="flex-1 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-600 active:bg-slate-200"
            >
              (
            </button>
            <button
              onClick={() => addSymbol(")")}
              className="flex-1 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-600 active:bg-slate-200"
            >
              )
            </button>
            <button
              onClick={() => addSymbol("SPACE")}
              className="flex-[3] bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center active:bg-slate-200"
            >
              <div className="w-12 h-0.5 bg-slate-400 rounded-full"></div>
            </button>
            <button
              onClick={confirmLine}
              className="flex-1 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center active:bg-slate-200 text-slate-600 font-bold text-lg"
            >
              ↵
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}