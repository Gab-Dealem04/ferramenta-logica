import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import "katex/dist/katex.min.css";
import { InlineMath } from "react-katex";

export default function TelaProvaPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Estados principais
  const [lines, setLines] = useState([]);
  const [currentFormula, setCurrentFormula] = useState("");
  const [currentRule, setCurrentRule] = useState("");
  const [selectedReferences, setSelectedReferences] = useState([]);

  // Controle de subprovas / Caixas de Hipótese
  const [openBoxes, setOpenBoxes] = useState([]);
  const [closedBoxes, setClosedBoxes] = useState([]);

  // Variáveis ativas no teclado dinâmico (Fila fixa de até 5 elementos)
  const [dynamicVariables, setDynamicVariables] = useState(["P", "Q", "R", "S", "T"]);
  const inputNativeRef = useRef(null);

  // Linha em foco pelo cursor
  const [activeLineId, setActiveLineId] = useState(null);

  // Posição do cursor dentro do texto da fórmula
  const [cursorPosition, setCursorPosition] = useState(0);

  // Foco do cursor: 'formula' ou 'rule'
  const [focusedField, setFocusedField] = useState("formula");

  // Teclado ativo: 'main' ou 'rules'
  const [activeKeyboard, setActiveKeyboard] = useState("main");
  const [isSelectingReferences, setIsSelectingReferences] = useState(false);

  // Controle do teclado nativo do celular
  const [isNativeKeyboardActive, setIsNativeKeyboardActive] = useState(false);

  const availableRules = [
    { label: "∧i", code: "∧i", latex: "\\land i" },
    { label: "∧e", code: "∧e", latex: "\\land e" },
    { label: "∨i", code: "∨i", latex: "\\lor i" },
    { label: "∨e", code: "∨e", latex: "\\lor e" },
    { label: "→i", code: "→i", latex: "\\rightarrow i" },
    { label: "→e", code: "→e", latex: "\\rightarrow e" },
    { label: "¬i", code: "¬i", latex: "\\neg i" },
    { label: "¬e", code: "¬e", latex: "\\neg e" },
    { label: "¬¬i", code: "¬¬i", latex: "\\neg\\neg i" },
    { label: "¬¬e", code: "¬¬e", latex: "\\neg\\neg e" },
    { label: "RAA", code: "RAA", latex: "\\text{RAA}" },
    { label: "LTM", code: "LTM", latex: "\\text{LTM}" },
    { label: "⊥e", code: "⊥e", latex: "\\bot e" },
    { label: "∀i", code: "∀i", latex: "\\forall i" },
    { label: "∀e", code: "∀e", latex: "\\forall e" },
    { label: "∃i", code: "∃i", latex: "\\exists i" },
    { label: "∃e", code: "∃e", latex: "\\exists e" },
    { label: "copie", code: "copie", latex: "\\text{copie}" },
  ];

  const logicalOperators = [
    { latex: "\\land", symbol: "∧" },
    { latex: "\\lor", symbol: "∨" },
    { latex: "\\rightarrow", symbol: "→" },
    { latex: "\\neg", symbol: "¬" },
    { latex: "\\bot", symbol: "⊥" },
    { latex: "\\forall ", symbol: "∀" },
    { latex: "\\exists ", symbol: "∃" },
  ];

  const getRuleRefType = (rule) => {
    switch (rule) {
      case "∨e":
        return "OR_ELIM";
      case "→i":
      case "¬i":
      case "RAA":
        return "RANGE";
      case "∧i":
      case "→e":
        return "MULTI_LINE";
      case "∧e":
      case "∨i":
      case "¬e":
      case "¬¬e":
      case "⊥e":
      case "copie":
        return "SINGLE_LINE";
      default:
        return "SINGLE_LINE";
    }
  };

  const getRequiredRefsCount = (rule) => {
    const type = getRuleRefType(rule);
    if (type === "OR_ELIM") return 3;
    if (type === "RANGE" || type === "MULTI_LINE") return 2;
    if (type === "SINGLE_LINE") return 1;
    return 0;
  };

  const updateCurrentLine = (newFormula, newRule, newRefs) => {
    if (activeLineId !== null) {
      setLines((prev) =>
        prev.map((line) =>
          line.id === activeLineId
            ? { ...line, formula: newFormula, rule: newRule, references: newRefs }
            : line
        )
      );
    }
  };

  const handleClearRule = () => {
    setCurrentRule("");
    setSelectedReferences([]);
    setIsSelectingReferences(false);
    updateCurrentLine(currentFormula, "", []);
  };

  const handleDeleteActiveLine = () => {
    if (activeLineId !== null) {
      setLines((prev) => {
        const filtered = prev.filter((l) => l.id !== activeLineId);
        return filtered.map((line, idx) => ({ ...line, id: idx + 1 }));
      });
      setOpenBoxes((prev) => prev.filter((boxStartId) => boxStartId !== activeLineId));
    }

    setActiveLineId(null);
    setCurrentFormula("");
    setCursorPosition(0);
    setSelectedReferences([]);
    setCurrentRule("");
    setIsSelectingReferences(false);
    setFocusedField("formula");
    setActiveKeyboard("main");
  };

  const handleTabPress = () => {
    setFocusedField("rule");
    setActiveKeyboard("rules");
  };

  const addSymbol = (s) => {
    if (focusedField === "rule") {
      setFocusedField("formula");
    }

    const baseText =
      activeLineId !== null
        ? lines.find((l) => l.id === activeLineId)?.formula || ""
        : currentFormula;

    if (s === "⌫") {
      if (cursorPosition > 0) {
        const newFormula =
          baseText.slice(0, cursorPosition - 1) + baseText.slice(cursorPosition);

        setCurrentFormula(newFormula);
        setCursorPosition((prev) => Math.max(0, prev - 1));
        updateCurrentLine(newFormula, currentRule, selectedReferences);
      }
    } else {
      const newFormula =
        baseText.slice(0, cursorPosition) +
        s +
        baseText.slice(cursorPosition);

      setCurrentFormula(newFormula);
      setCursorPosition((prev) => prev + s.length);
      updateCurrentLine(newFormula, currentRule, selectedReferences);
    }
  };

  const handleOpenNativeKeyboard = () => {
    setIsNativeKeyboardActive(true);
    // Pequeno delay para garantir que o input está pronto para receber foco
    setTimeout(() => {
      if (inputNativeRef.current) {
        inputNativeRef.current.focus();
      }
    }, 50);
  };

  const finishNativeInput = () => {
    setIsNativeKeyboardActive(false);
    if (inputNativeRef.current) {
      inputNativeRef.current.blur();
    }
  };

  const handleNativeInputChange = (e) => {
    const value = e.target.value.toUpperCase();
    if (!value) return;

    const charToAdd = value.slice(-1);

    if (/[A-Z]/.test(charToAdd)) {
      setDynamicVariables((prev) => {
        if (prev.includes(charToAdd)) return prev;

        const updated = [...prev, charToAdd];
        if (updated.length > 5) {
          updated.shift();
        }
        return updated;
      });

      addSymbol(charToAdd);
    }

    e.target.value = "";
  };

  const handleNativeInputKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      finishNativeInput();
    }
  };

  const handleNativeInputBlur = () => {
    setIsNativeKeyboardActive(false);
  };

  const moveCursor = (direction) => {
    if (direction === "LEFT" && cursorPosition > 0) {
      setCursorPosition((prev) => prev - 1);
    } else if (direction === "RIGHT" && cursorPosition < currentFormula.length) {
      setCursorPosition((prev) => prev + 1);
    }
  };

  const confirmLineWithRule = (ruleOverride, refsOverride) => {
    const activeRule = ruleOverride !== undefined ? ruleOverride : currentRule;
    const activeRefs = refsOverride !== undefined ? refsOverride : selectedReferences;

    if (activeLineId === null) {
      const nextId = lines.length > 0 ? Math.max(...lines.map((l) => l.id)) + 1 : 1;

      const newLine = {
        id: nextId,
        formula: currentFormula || "",
        rule: activeRule || "",
        references: activeRefs || [],
        boxScopes: [...openBoxes],
      };

      if (activeRule === "HIPÓTESE") {
        newLine.boxScopes.push(nextId);
        setOpenBoxes((prev) => [...prev, nextId]);
      }

      setLines((prev) => [...prev, newLine]);
    } else {
      updateCurrentLine(currentFormula, activeRule, activeRefs);
    }

    setActiveLineId(null);
    setCurrentFormula("");
    setCursorPosition(0);
    setSelectedReferences([]);
    setCurrentRule("");
    setIsSelectingReferences(false);
    setFocusedField("formula");
    setActiveKeyboard("main");
  };

  const handleSelectRuleOrMode = (ruleCode) => {
    setCurrentRule(ruleCode);
    updateCurrentLine(currentFormula, ruleCode, selectedReferences);

    setActiveKeyboard("main");

    if (ruleCode === "PREMISSA" || ruleCode === "HIPÓTESE") {
      setSelectedReferences([]);
      setIsSelectingReferences(false);
      confirmLineWithRule(ruleCode, []);
    } else {
      setIsSelectingReferences(true);
      setFocusedField("formula");
    }
  };

  const handleCloseCurrentBox = () => {
    if (openBoxes.length > 0) {
      const closedBoxStart = openBoxes[openBoxes.length - 1];
      const lastLineId = lines.length > 0 ? lines[lines.length - 1].id : closedBoxStart;

      setClosedBoxes((prev) => [...prev, { start: closedBoxStart, end: lastLineId }]);
      setOpenBoxes((prev) => prev.slice(0, -1));

      if (getRuleRefType(currentRule) !== "∨e") {
        setSelectedReferences([`${closedBoxStart}-${lastLineId}`]);
      }
    }
  };

  const handleLineClick = (line, targetField = "formula") => {
    if (isSelectingReferences) {
      const refType = getRuleRefType(currentRule);

      if (refType === "OR_ELIM") {
        setSelectedReferences((prev) => {
          const matchingBox = closedBoxes.find(
            (box) => line.id >= box.start && line.id <= box.end
          );

          let newRef;
          if (matchingBox) {
            newRef = `${matchingBox.start}-${matchingBox.end}`;
          } else {
            newRef = line.id;
          }

          if (prev.includes(newRef)) {
            const updated = prev.filter((r) => r !== newRef);
            updateCurrentLine(currentFormula, currentRule, updated);
            return updated;
          }

          if (prev.length >= 3) return prev;

          const updated = [...prev, newRef];
          updateCurrentLine(currentFormula, currentRule, updated);
          return updated;
        });
      } else if (refType === "RANGE") {
        setSelectedReferences((prev) => {
          let updated;
          if (prev.length === 0 || typeof prev[0] === "string") {
            updated = [line.id];
          } else if (prev.length === 1) {
            const start = Math.min(prev[0], line.id);
            const end = Math.max(prev[0], line.id);
            updated = [`${start}-${end}`];
          } else {
            updated = [line.id];
          }
          updateCurrentLine(currentFormula, currentRule, updated);
          return updated;
        });
      } else {
        const maxRefs = getRequiredRefsCount(currentRule);

        setSelectedReferences((prev) => {
          let updated;
          if (prev.includes(line.id)) {
            updated = prev.filter((id) => id !== line.id);
          } else {
            if (prev.length >= maxRefs) return prev;
            updated = [...prev, line.id].sort((a, b) => a - b);
          }
          updateCurrentLine(currentFormula, currentRule, updated);
          return updated;
        });
      }
    } else {
      setActiveLineId(line.id);
      setCurrentFormula(line.formula || "");
      setCursorPosition((line.formula || "").length);
      setCurrentRule(line.rule || "");
      setSelectedReferences(line.references || []);
      setFocusedField(targetField);

      if (targetField === "rule") {
        setActiveKeyboard("rules");
      } else {
        setActiveKeyboard("main");
      }
    }
  };

  const confirmLine = () => {
    confirmLineWithRule();
  };

  const finishSelection = () => {
    confirmLineWithRule();
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
      .replace(/∀/g, " \\forall  ")
      .replace(/∃/g, " \\exists  ");
  };

  const renderFormulaWithCursor = (isFocused) => {
    const before = currentFormula.slice(0, cursorPosition);
    const after = currentFormula.slice(cursorPosition);

    return (
      <span className="flex items-center font-bold text-blue-700 text-base">
        {before && <InlineMath math={formatToLatex(before)} />}
        {isFocused && (
          <span className="animate-pulse border-r-2 border-blue-600 h-5 inline-block mx-[1px]"></span>
        )}
        {after && <InlineMath math={formatToLatex(after)} />}
      </span>
    );
  };

  const getRuleLatex = (code) => {
    const found = availableRules.find((r) => r.code === code);
    return found ? found.latex : formatToLatex(code);
  };

  const renderNestedBoxes = (scopes, lineId, isEditing = false, content) => {
    if (!scopes || scopes.length === 0) {
      return <div className="flex-1 flex items-center h-full px-2 ml-1">{content}</div>;
    }

    const renderLevel = (index) => {
      if (index >= scopes.length) {
        return content;
      }

      const boxStartId = scopes[index];
      const isStart = lineId === boxStartId;

      const isClosedBoxEnd = closedBoxes.some(
        (box) => box.start === boxStartId && box.end === lineId
      );

      const borderClasses = `border-l-2 border-slate-700 bg-slate-50/20 ${
        isStart ? "border-t-2 border-r-2" : "border-r-2"
      } ${isClosedBoxEnd ? "border-b-2" : ""}`;

      return (
        <div className={`flex-1 flex items-center h-full px-1.5 ${borderClasses}`}>
          {renderLevel(index + 1)}
        </div>
      );
    };

    return <div className="flex-1 flex items-center h-full ml-1">{renderLevel(0)}</div>;
  };

  const RuleWithBox = ({ rule, references = [], isFocused = false, isSelecting = false, onClick }) => {
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
        if (references[i] !== undefined) {
          slots.push(references[i]);
        } else {
          slots.push("_");
        }
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
          <span className={isSimpleType ? "text-blue-600 font-bold lowercase flex items-center" : "text-blue-500 lowercase flex items-center"}>
            {isSimpleType ? (
              rule.toLowerCase()
            ) : (
              <InlineMath math={getRuleLatex(rule)} />
            )}
            {isFocused && (
              <span className="animate-pulse border-r-2 border-blue-600 h-4 inline-block ml-1"></span>
            )}
          </span>
        )}

        {!isSimpleType && rule && (
          isSelecting ? (
            <div className="min-w-[24px] h-[20px] px-1.5 border border-dashed border-blue-400 rounded flex items-center justify-center bg-blue-50/50 font-bold text-blue-700 text-[11px] ml-0.5">
              {renderSlots()}
            </div>
          ) : (
            references.length > 0 && (
              <span className="text-blue-700 font-extrabold text-[11px] ml-0.5">
                {references.join(", ")}
              </span>
            )
          )
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 max-w-md mx-auto border-x shadow-2xl font-sans overflow-hidden relative select-none">

      {/* INPUT INVISÍVEL PARA O TECLADO NATIVO */}
      <input
        ref={inputNativeRef}
        type="search"
        inputMode="search"
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        name="no-autofill-field"
        data-form-type="other"
        data-lpignore="true"
        aria-autocomplete="none"
        className="absolute opacity-0 top-0 left-0 h-px w-px -z-10"
        onChange={handleNativeInputChange}
        onKeyDown={handleNativeInputKeyDown}
        onBlur={handleNativeInputBlur}
      />

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
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold tracking-wider text-blue-600 bg-blue-50/50 hover:bg-blue-100/60 border border-blue-500 rounded-xl active:scale-95 transition-all uppercase"
        >
          <span className="w-0 h-0 border-y-[4px] border-y-transparent border-l-[7px] border-l-blue-600 inline-block"></span>
          Compilar
        </button>
      </header>

      {/* BANNER FIXO DO TECLADO NATIVO - SEMPRE VISÍVEL NO TOPO */}
      {isNativeKeyboardActive && (
        <div className="bg-blue-600 text-white text-[12px] font-bold px-4 py-2.5 flex justify-between items-center gap-2 shadow-md z-20 animate-in slide-in-from-top-2 duration-200">
          <span className="flex items-center gap-2">
            <span className="animate-pulse">⌨️</span>
            Digitando com o teclado do celular...
          </span>
          <button
            onClick={finishNativeInput}
            className="bg-white text-blue-700 hover:bg-blue-50 active:scale-95 font-black text-[11px] px-3 py-1.5 rounded-lg shadow-sm transition-all shrink-0 uppercase tracking-wide"
          >
            ✓ Pronto
          </button>
        </div>
      )}

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

          {/* LINHAS GRAVADAS */}
          <div className="space-y-0">
            {lines.map((line) => {
              const isActive = activeLineId === line.id;

              const isSelectedRef =
                selectedReferences.includes(line.id) ||
                selectedReferences.some(
                  (ref) =>
                    typeof ref === "string" &&
                    ref.split("-").map(Number).includes(line.id)
                );

              const scopes = line.boxScopes || [];

              const lineContent = (
                <>
                  <div
                    onClick={() => handleLineClick(line, "formula")}
                    className="flex-1 flex items-center font-bold text-slate-700 text-base cursor-pointer overflow-x-auto"
                  >
                    {isActive ? (
                      renderFormulaWithCursor(focusedField === "formula")
                    ) : (
                      <InlineMath math={formatToLatex(line.formula)} />
                    )}
                  </div>

                  <RuleWithBox
                    rule={line.rule}
                    references={line.references}
                    isFocused={isActive && focusedField === "rule"}
                    isSelecting={isActive && isSelectingReferences}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLineClick(line, "rule");
                    }}
                  />
                </>
              );

              return (
                <div
                  key={line.id}
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

                  {renderNestedBoxes(scopes, line.id, false, lineContent)}
                </div>
              );
            })}
          </div>

          {/* LINHA NOVA EM EDIÇÃO */}
          {activeLineId === null && (
            <div className="flex items-center h-10 border-b border-blue-300 bg-blue-50/50 mt-0">
              <span className="w-8 text-[10px] text-blue-400 font-mono z-10 pl-1 shrink-0">
                {lines.length > 0 ? Math.max(...lines.map((l) => l.id)) + 1 : 1}
              </span>

              {renderNestedBoxes(
                openBoxes,
                lines.length + 1,
                true,
                <>
                  <div
                    onClick={() => setFocusedField("formula")}
                    className="flex-1 flex items-center cursor-pointer"
                  >
                    {renderFormulaWithCursor(focusedField === "formula")}
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
                </>
              )}
            </div>
          )}
        </div>

        {/* CONTROLE DE TECLADOS DINÂMICOS & BOTÃO DE ENCERRAR CAIXA */}
        <div className="bg-white p-3 space-y-2 border-t z-10">

          {/* BOTÃO COMPACTO AZUL PARA ENCERRAR CAIXA NO LADO DIREITO */}
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
            <div className="bg-blue-50 border border-blue-200 text-blue-900 text-[11px] font-medium px-3 py-1.5 rounded-lg flex justify-between items-center animate-in fade-in gap-2 shadow-sm">
              <div className="flex items-center gap-1.5 overflow-hidden">
                <span className="flex items-center gap-1">
                  {getRuleRefType(currentRule) === "OR_ELIM"
                    ? "Selecione a disjunção e as duas caixas para "
                    : getRuleRefType(currentRule) === "RANGE"
                    ? "Clique na hipótese e no fim do intervalo para "
                    : "Selecione as linhas para "}
                  <strong>
                    <InlineMath math={getRuleLatex(currentRule)} />
                  </strong>
                  :
                </span>
                {selectedReferences.length > 0 && (
                  <span className="font-bold bg-blue-200 text-blue-900 px-1.5 py-0.5 rounded text-[10px] shrink-0">
                    {selectedReferences.join(", ")}
                  </span>
                )}
              </div>
              <button
                onClick={finishSelection}
                className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-[10px] px-2.5 py-1 rounded-md shadow-sm transition-all shrink-0"
              >
                OK
              </button>
            </div>
          )}

          {/* TECLADO 1: INICIAL / FÓRMULAS */}
          {activeKeyboard === "main" && !isNativeKeyboardActive && (
            <div className="space-y-2 animate-in fade-in duration-150">

              {/* GRADE FIXA DE 8 COLUNAS (TAB, 5 DYN VARS, '...', ⌫) */}
              <div className="grid grid-cols-8 gap-1">
                <button
                  onClick={handleTabPress}
                  className="bg-blue-50 border border-blue-200 text-blue-700 py-3 rounded-xl font-black text-xs active:bg-blue-100 shadow-sm flex items-center justify-center"
                >
                  ⇥
                </button>

                {/* EXATAMENTE 5 BOTÕES DE VARIÁVEIS */}
                {dynamicVariables.map((s) => (
                  <button
                    key={s}
                    onClick={() => addSymbol(s)}
                    className="bg-slate-50 border border-slate-200 py-3 rounded-xl font-bold text-slate-700 shadow-sm active:bg-slate-200 text-sm flex items-center justify-center"
                  >
                    <InlineMath math={s} />
                  </button>
                ))}

                {/* BOTÃO '...' */}
                <button
                  onClick={handleOpenNativeKeyboard}
                  title="Digitar nova letra"
                  className="bg-slate-200 border border-slate-300 text-slate-700 py-3 rounded-xl font-black text-xs active:bg-slate-300 shadow-sm flex items-center justify-center"
                >
                  ...
                </button>

                {/* BACKSPACE */}
                <button
                  onClick={() => addSymbol("⌫")}
                  className="bg-slate-50 border border-slate-200 py-3 rounded-xl font-bold text-slate-700 shadow-sm active:bg-slate-200 text-sm flex items-center justify-center"
                >
                  ⌫
                </button>
              </div>

              {/* SIMBOLOS LÓGICOS */}
              <div className="grid grid-cols-7 gap-1">
                {logicalOperators.map((item) => (
                  <button
                    key={item.symbol}
                    onClick={() => addSymbol(item.symbol)}
                    className="bg-slate-800 text-white py-3 rounded-xl font-bold shadow-md active:scale-95 transition-transform flex items-center justify-center text-lg"
                  >
                    <InlineMath math={item.latex} />
                  </button>
                ))}
              </div>

              {/* CONTROLES E CONFIRMAÇÃO */}
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
                  onClick={() => moveCursor("LEFT")}
                  className="flex-1 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-700 active:bg-slate-200 text-base flex items-center justify-center"
                >
                  ◀
                </button>
                <button
                  onClick={() => moveCursor("RIGHT")}
                  className="flex-1 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-700 active:bg-slate-200 text-base flex items-center justify-center"
                >
                  ▶
                </button>
                <button
                  onClick={confirmLine}
                  className="flex-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-xl flex items-center justify-center active:bg-slate-200 font-bold text-lg shadow-sm"
                >
                  ↵
                </button>
              </div>
            </div>
          )}

          {/* TECLADO 2: REGRAS / TIPOS */}
          {activeKeyboard === "rules" && (
            <div className="space-y-2 animate-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center justify-between pb-1 border-b">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  Escolha o Tipo ou Regra:
                </span>
                <button
                  onClick={() => {
                    setActiveKeyboard("main");
                    setFocusedField("formula");
                  }}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600"
                >
                  ✕ Voltar
                </button>
              </div>

              {activeLineId !== null && (
                <button
                  onClick={handleDeleteActiveLine}
                  className="w-full py-2 bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1 active:scale-98"
                >
                  <span>🗑</span> Remover Linha {activeLineId}
                </button>
              )}

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleSelectRuleOrMode("PREMISSA")}
                  className="py-2.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold active:bg-slate-200"
                >
                  Premissa
                </button>
                <button
                  onClick={() => handleSelectRuleOrMode("HIPÓTESE")}
                  className="py-2.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold active:bg-slate-200"
                >
                  Hipótese
                </button>
                <button
                  onClick={handleClearRule}
                  className="py-2.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold active:bg-slate-200 flex items-center justify-center gap-1"
                >
                  <span>⌫</span>
                </button>
              </div>

              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {availableRules.map((rule) => (
                  <button
                    key={rule.code}
                    onClick={() => handleSelectRuleOrMode(rule.code)}
                    className="py-2.5 bg-slate-800 text-white rounded-xl text-xs font-black shadow-md active:scale-95 transition-transform flex items-center justify-center"
                  >
                    <InlineMath math={rule.latex} />
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}