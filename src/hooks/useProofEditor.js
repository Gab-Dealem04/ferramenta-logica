import { useState, useRef, useEffect } from "react";
import { getRuleRefType, getRequiredRefsCount } from "../utils/proofLogic";
import { getActivity, saveProofData } from "../utils/proofStorage";

/* ---------- helpers puros ---------- */

const mapId = (id, removed) => (id > removed ? id - 1 : id);

function mapRef(ref, removed) {
  if (typeof ref === "number") return ref === removed ? null : mapId(ref, removed);
  if (typeof ref === "string" && ref.includes("-")) {
    const [a, b] = ref.split("-").map(Number);
    if (a === removed || b === removed) return null;
    return `${mapId(a, removed)}-${mapId(b, removed)}`;
  }
  return ref;
}

// Remove uma linha e remapeia ids em linhas, referências e caixas
function deleteLineFromProof(lines, openBoxes, closedBoxes, removedId) {
  const newLines = lines
    .filter((l) => l.id !== removedId)
    .map((l) => ({
      ...l,
      id: mapId(l.id, removedId),
      boxScopes: (l.boxScopes || [])
        .filter((s) => s !== removedId)
        .map((s) => mapId(s, removedId)),
      references: (l.references || [])
        .map((r) => mapRef(r, removedId))
        .filter((r) => r !== null),
    }));

  const newOpen = openBoxes
    .filter((s) => s !== removedId)
    .map((s) => mapId(s, removedId));

  const newClosed = closedBoxes
    .filter((b) => b.start !== removedId)
    .map((b) => ({
      start: mapId(b.start, removedId),
      end: b.end === removedId ? b.end - 1 : mapId(b.end, removedId),
    }))
    .filter((b) => b.end >= b.start);

  return { lines: newLines, openBoxes: newOpen, closedBoxes: newClosed };
}

// Insere uma linha vazia logo depois de `afterId`, remapeando ids
function insertLineIntoProof(lines, openBoxes, closedBoxes, afterId) {
  const shift = (id) => (id > afterId ? id + 1 : id);

  const shiftRef = (ref) => {
    if (typeof ref === "number") return shift(ref);
    if (typeof ref === "string" && ref.includes("-")) {
      const [a, b] = ref.split("-").map(Number);
      return `${shift(a)}-${shift(b)}`;
    }
    return ref;
  };

  const active = lines.find((l) => l.id === afterId);

  // a linha nova herda as caixas da linha ativa, exceto as que terminam nela
  const scopes = ((active && active.boxScopes) || []).filter(
    (s) => !closedBoxes.some((b) => b.start === s && b.end === afterId)
  );

  const newLine = {
    id: afterId + 1,
    formula: "",
    rule: "",
    references: [],
    boxScopes: scopes,
  };

  const mapped = lines.map((l) => ({
    ...l,
    id: shift(l.id),
    boxScopes: (l.boxScopes || []).map(shift),
    references: (l.references || []).map(shiftRef),
  }));

  const pos = mapped.findIndex((l) => l.id === afterId);
  const newLines = [...mapped.slice(0, pos + 1), newLine, ...mapped.slice(pos + 1)];

  return {
    lines: newLines,
    openBoxes: openBoxes.map(shift),
    closedBoxes: closedBoxes.map((b) => ({
      start: shift(b.start),
      end: b.end > afterId ? b.end + 1 : b.end,
    })),
    newId: afterId + 1,
  };
}

export function useProofEditor(incomingProof) {
  const [lines, setLines] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const [currentFormula, setCurrentFormula] = useState("");
  const [currentRule, setCurrentRule] = useState("");
  const [selectedReferences, setSelectedReferences] = useState([]);

  const [openBoxes, setOpenBoxes] = useState([]);
  const [closedBoxes, setClosedBoxes] = useState([]);

  const [dynamicVariables, setDynamicVariables] = useState(["P", "Q", "R", "S", "T"]);
  const inputNativeRef = useRef(null);

  const [activeLineId, setActiveLineId] = useState(null);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [focusedField, setFocusedField] = useState("formula");
  const [activeKeyboard, setActiveKeyboard] = useState("main");
  const [isSelectingReferences, setIsSelectingReferences] = useState(false);

  const [isAddSymbolModalOpen, setIsAddSymbolModalOpen] = useState(false);
  const [newSymbolDraft, setNewSymbolDraft] = useState("");

  // CARREGAR
  useEffect(() => {
    if (!incomingProof) return;

    const stored = getActivity(incomingProof.id) || incomingProof;

    const seen = new Set();
    const loaded = (stored.premissasIniciais || [])
      .filter((line) => {
        if (seen.has(line.id)) return false; // evita ids duplicados
        seen.add(line.id);
        return true;
      })
      .map((line) => ({
        ...line,
        boxScopes: line.boxScopes || [],
        references: line.references || [],
        rule: line.rule ? line.rule.toUpperCase() : "PREMISSA",
      }));

    setLines(loaded);
    setOpenBoxes(stored.openBoxes || []);
    setClosedBoxes(stored.closedBoxes || []);
    setIsLoaded(true);
  }, [incomingProof?.id]);

  // SALVAR
  useEffect(() => {
    if (!isLoaded || !incomingProof) return;

    saveProofData(incomingProof.id, {
      premissasIniciais: lines,
      openBoxes,
      closedBoxes,
    });
  }, [lines, openBoxes, closedBoxes, isLoaded]);

  /* ---------- caixas ---------- */

  // Remove completamente a caixa iniciada pela hipótese `boxId`
  const removeBox = (boxId) => {
    setLines((prev) =>
      prev.map((l) => ({
        ...l,
        boxScopes: (l.boxScopes || []).filter((s) => s !== boxId),
      }))
    );
    setOpenBoxes((prev) => prev.filter((s) => s !== boxId));
    setClosedBoxes((prev) => prev.filter((b) => b.start !== boxId));
  };

  // Cria a caixa de uma hipótese numa linha que já existe
  const addBoxToExistingLine = (lineId) => {
    const isLast = lines.length > 0 && lines[lines.length - 1].id === lineId;

    setLines((prev) =>
      prev.map((l) =>
        l.id === lineId && !(l.boxScopes || []).includes(lineId)
          ? { ...l, boxScopes: [...(l.boxScopes || []), lineId] }
          : l
      )
    );

    if (isLast) {
      setOpenBoxes((prev) => (prev.includes(lineId) ? prev : [...prev, lineId]));
    } else {
      setClosedBoxes((prev) =>
        prev.some((b) => b.start === lineId)
          ? prev
          : [...prev, { start: lineId, end: lineId }]
      );
    }
  };

  // Sincroniza a caixa com a regra escolhida para a linha ativa (existente)
  const syncBoxWithRule = (newRule) => {
    if (activeLineId === null) return;
    const line = lines.find((l) => l.id === activeLineId);
    if (!line) return;

    const hadBox = line.rule === "HIPÓTESE";
    const wantsBox = newRule === "HIPÓTESE";

    if (hadBox && !wantsBox) removeBox(activeLineId);
    else if (!hadBox && wantsBox) addBoxToExistingLine(activeLineId);
  };

  /* ---------- edição ---------- */

  const resetEditor = () => {
    setActiveLineId(null);
    setCurrentFormula("");
    setCursorPosition(0);
    setSelectedReferences([]);
    setCurrentRule("");
    setIsSelectingReferences(false);
    setFocusedField("formula");
    setActiveKeyboard("main");
  };

  // Coloca uma linha existente no editor
  const loadLineIntoEditor = (line, cursor) => {
    setActiveLineId(line.id);
    setCurrentFormula(line.formula || "");
    setCursorPosition(
      cursor === undefined ? (line.formula || "").length : cursor
    );
    setCurrentRule(line.rule || "");
    setSelectedReferences(line.references || []);
    setIsSelectingReferences(false);
    setFocusedField("formula");
    setActiveKeyboard("main");
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
    syncBoxWithRule("");
    setCurrentRule("");
    setSelectedReferences([]);
    setIsSelectingReferences(false);
    updateCurrentLine(currentFormula, "", []);
  };

  const handleDeleteActiveLine = () => {
    if (activeLineId !== null) {
      const result = deleteLineFromProof(lines, openBoxes, closedBoxes, activeLineId);
      setLines(result.lines);
      setOpenBoxes(result.openBoxes);
      setClosedBoxes(result.closedBoxes);
    }

    resetEditor();
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
      } else if (baseText.length === 0) {
        if (activeLineId !== null) {
          // Linha existente e vazia: apaga e volta para a linha anterior
          const result = deleteLineFromProof(
            lines,
            openBoxes,
            closedBoxes,
            activeLineId
          );

          setLines(result.lines);
          setOpenBoxes(result.openBoxes);
          setClosedBoxes(result.closedBoxes);

          const prevLine = result.lines.find((l) => l.id === activeLineId - 1);
          const target = prevLine || result.lines.find((l) => l.id === 1);

          if (target) {
            loadLineIntoEditor(target, prevLine ? undefined : 0);
          } else {
            resetEditor();
          }
        } else if (lines.length > 0) {
          // Linha nova (no fim): puxa a última linha de volta
          const lastLine = lines[lines.length - 1];

          if (lastLine.rule === "HIPÓTESE") {
            removeBox(lastLine.id); // a caixa será recriada ao confirmar
          } else {
            // se a linha encerrava caixas, reabre elas
            const reopened = closedBoxes
              .filter((b) => b.end === lastLine.id && b.start !== lastLine.id)
              .map((b) => b.start)
              .sort((a, b) => a - b);

            if (reopened.length > 0) {
              setClosedBoxes((prev) =>
                prev.filter((b) => !(b.end === lastLine.id && b.start !== lastLine.id))
              );
              setOpenBoxes((prev) => [
                ...prev,
                ...reopened.filter((id) => !prev.includes(id)),
              ]);
            }
          }

          setLines((prev) => prev.slice(0, -1));

          setCurrentFormula(lastLine.formula);
          setCurrentRule(lastLine.rule);
          setSelectedReferences(lastLine.references);
          setCursorPosition(lastLine.formula.length);
          setActiveLineId(null);
        }
      }
    } else {
      const newFormula =
        baseText.slice(0, cursorPosition) + s + baseText.slice(cursorPosition);

      setCurrentFormula(newFormula);
      setCursorPosition((prev) => prev + s.length);
      updateCurrentLine(newFormula, currentRule, selectedReferences);
    }
  };

  const openAddSymbolModal = () => {
    setNewSymbolDraft("");
    setIsAddSymbolModalOpen(true);
    setTimeout(() => {
      if (inputNativeRef.current) {
        inputNativeRef.current.focus();
      }
    }, 50);
  };

  const handleNewSymbolChange = (e) => {
    setNewSymbolDraft(e.target.value);
  };

  const confirmNewSymbol = () => {
    const symbol = newSymbolDraft.trim();

    if (symbol) {
      addSymbol(symbol);

      setDynamicVariables((prev) => {
        const withoutDuplicate = prev.filter((v) => v !== symbol);
        const updated = [symbol, ...withoutDuplicate];
        if (updated.length > 5) {
          updated.pop();
        }
        return updated;
      });
    }

    setNewSymbolDraft("");
    setIsAddSymbolModalOpen(false);
  };

  const cancelNewSymbol = () => {
    setNewSymbolDraft("");
    setIsAddSymbolModalOpen(false);
  };

  const handleNewSymbolKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      confirmNewSymbol();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelNewSymbol();
    }
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
        if (!newLine.boxScopes.includes(nextId)) newLine.boxScopes.push(nextId);
        setOpenBoxes((prev) => (prev.includes(nextId) ? prev : [...prev, nextId]));
      }

      setLines((prev) => [...prev, newLine]);
    } else {
      updateCurrentLine(currentFormula, activeRule, activeRefs);
    }

    resetEditor();
  };

  // ENTER numa linha existente: insere uma linha nova logo abaixo
  const insertLineBelowActive = () => {
    const result = insertLineIntoProof(lines, openBoxes, closedBoxes, activeLineId);

    // garante que a fórmula/regra digitadas na linha ativa ficam salvas
    const withCurrent = result.lines.map((l) =>
      l.id === activeLineId
        ? {
            ...l,
            formula: currentFormula,
            rule: currentRule,
            references: selectedReferences,
          }
        : l
    );

    setLines(withCurrent);
    setOpenBoxes(result.openBoxes);
    setClosedBoxes(result.closedBoxes);

    setActiveLineId(result.newId);
    setCurrentFormula("");
    setCursorPosition(0);
    setCurrentRule("");
    setSelectedReferences([]);
    setIsSelectingReferences(false);
    setFocusedField("formula");
    setActiveKeyboard("main");
  };

  const handleSelectRuleOrMode = (ruleCode) => {
    // linha existente: cria/remove a caixa na hora
    syncBoxWithRule(ruleCode);

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

      setClosedBoxes((prev) =>
        prev.some((b) => b.start === closedBoxStart)
          ? prev
          : [...prev, { start: closedBoxStart, end: lastLineId }]
      );
      setOpenBoxes((prev) => prev.slice(0, -1));
    }
  };

  const handleLineClick = (line, targetField = "formula", cursorIdx) => {
    if (isSelectingReferences) {
      const refType = getRuleRefType(currentRule);

      if (refType === "OR_ELIM") {
        setSelectedReferences((prev) => {
          if (prev.length === 0) {
            const updated = [line.id];
            updateCurrentLine(currentFormula, currentRule, updated);
            return updated;
          }

          const built = [...prev];
          const lastIndex = built.length - 1;
          const last = built[lastIndex];

          if (typeof last === "number" && lastIndex > 0) {
            const start = Math.min(last, line.id);
            const end = Math.max(last, line.id);
            built[lastIndex] = `${start}-${end}`;
            updateCurrentLine(currentFormula, currentRule, built);
            return built;
          }

          if (built.length >= 3) return prev;

          built.push(line.id);
          updateCurrentLine(currentFormula, currentRule, built);
          return built;
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
      const alreadyActive = activeLineId === line.id;
      const formula = alreadyActive ? currentFormula : line.formula || "";
      const idx = cursorIdx !== undefined ? cursorIdx : formula.length;

      setActiveLineId(line.id);
      setCurrentFormula(formula);
      setCursorPosition(Math.max(0, Math.min(idx, formula.length)));

      if (!alreadyActive) {
        setCurrentRule(line.rule || "");
        setSelectedReferences(line.references || []);
      }

      setFocusedField(targetField);
      setActiveKeyboard(targetField === "rule" ? "rules" : "main");
    }
  };

  // Botão ↵ do teclado: numa linha existente, cria uma linha nova abaixo
  const confirmLine = () => {
    if (activeLineId !== null && !isSelectingReferences) {
      insertLineBelowActive();
    } else {
      confirmLineWithRule();
    }
  };

  // Botão OK da seleção de referências: só confirma a regra
  const finishSelection = () => confirmLineWithRule();

  return {
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
    setCursorPosition,
    focusedField,
    setFocusedField,
    activeKeyboard,
    setActiveKeyboard,
    isSelectingReferences,
    isAddSymbolModalOpen,
    newSymbolDraft,
    handleClearRule,
    handleDeleteActiveLine,
    handleTabPress,
    addSymbol,
    openAddSymbolModal,
    handleNewSymbolChange,
    handleNewSymbolKeyDown,
    confirmNewSymbol,
    cancelNewSymbol,
    moveCursor,
    handleSelectRuleOrMode,
    handleCloseCurrentBox,
    handleLineClick,
    confirmLine,
    finishSelection,
  };
}