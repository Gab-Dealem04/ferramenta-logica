import { useState, useRef, useEffect } from "react";
import { getRuleRefType, getRequiredRefsCount } from "../utils/proofLogic";
import { getActivity, saveProofData } from "../utils/proofStorage";

/* ---------- helpers puros ---------- */

// Regras cuja linha ABRE uma caixa: hipótese e constante nova (∀i / ∃e)
const opensBox = (rule) => rule === "HIPÓTESE" || rule === "CONSTANTE";

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

// "1,3-5" -> [1, "3-5"]  (traço incompleto, ex. "3-", conta só o 3)
function parseRefDraft(draft) {
  const refs = [];
  for (const raw of draft.split(",")) {
    const m = raw.trim().match(/^(\d+)(?:-(\d*))?$/);
    if (!m) continue;
    const a = Number(m[1]);
    if (!m[2]) refs.push(a);
    else {
      const b = Number(m[2]);
      refs.push(`${Math.min(a, b)}-${Math.max(a, b)}`);
    }
  }
  return refs;
}

// impede "1,,2", ",1", "1--3", "1-2-3"
function canInsertRefChar(draft, pos, ch) {
  if (/\d/.test(ch)) return true;
  const before = draft.slice(0, pos);
  const after = draft.slice(pos);
  if (!/\d$/.test(before)) return false;
  if (/^[,-]/.test(after)) return false;
  if (ch === "-") {
    const tokenBefore = before.split(",").pop();
    const tokenAfter = after.split(",")[0];
    if (tokenBefore.includes("-") || tokenAfter.includes("-")) return false;
  }
  return true;
}

const refIds = (r) =>
  typeof r === "number" ? [r] : String(r).split("-").map(Number);

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

  // rascunho de texto do teclado numérico de referências (ex.: "1,3-5")
  const [refDraft, setRefDraft] = useState("");
  const [refCursor, setRefCursor] = useState(0);

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
        // linha sem regra continua sem regra (antes virava PREMISSA ao recarregar)
        rule: line.rule ? line.rule.toUpperCase() : "",
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

  // Mantém o rascunho do teclado numérico em sincronia com a seleção por toque
  useEffect(() => {
    if (!isSelectingReferences) {
      setRefDraft("");
      setRefCursor(0);
      return;
    }
    if (JSON.stringify(parseRefDraft(refDraft)) !== JSON.stringify(selectedReferences)) {
      const d = selectedReferences.join(",");
      setRefDraft(d);
      setRefCursor(d.length);
    }
  }, [selectedReferences, isSelectingReferences]);

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

  // Cria a caixa de uma hipótese/constante numa linha que já existe
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

    const hadBox = opensBox(line.rule);
    const wantsBox = opensBox(newRule);

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

  // ⌫ do teclado de regras: 1º toque limpa a regra; com a regra já vazia,
  // volta para a fórmula e troca para o teclado principal
  const handleRuleBackspace = () => {
    if (currentRule) {
      handleClearRule();
      return;
    }

    setIsSelectingReferences(false);
    setCursorPosition(currentFormula.length);
    setFocusedField("formula");
    setActiveKeyboard("main");
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

          if (opensBox(lastLine.rule)) {
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

  /* ---------- teclado numérico de referências ---------- */

  const applyRefDraft = (draft, cursor) => {
    const refs = parseRefDraft(draft);
    setRefDraft(draft);
    setRefCursor(cursor);
    setSelectedReferences(refs);
    updateCurrentLine(currentFormula, currentRule, refs);
  };

  const addRefChar = (ch) => {
    if (ch === "⌫") {
      if (refCursor === 0) return;
      applyRefDraft(
        refDraft.slice(0, refCursor - 1) + refDraft.slice(refCursor),
        refCursor - 1
      );
      return;
    }
    if (!canInsertRefChar(refDraft, refCursor, ch)) return;
    applyRefDraft(
      refDraft.slice(0, refCursor) + ch + refDraft.slice(refCursor),
      refCursor + 1
    );
  };

  const moveRefCursor = (direction) => {
    if (direction === "LEFT") setRefCursor((p) => Math.max(0, p - 1));
    else setRefCursor((p) => Math.min(refDraft.length, p + 1));
  };

  // descarta referências a linhas inexistentes (quem digita pode errar o número)
  const getValidRefs = () => {
    const existing = new Set(lines.map((l) => l.id));
    return selectedReferences.filter((r) =>
      refIds(r).every((id) => existing.has(id) && id !== activeLineId)
    );
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

      if (opensBox(activeRule)) {
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
  const insertLineBelowActive = (refsOverride) => {
    const result = insertLineIntoProof(lines, openBoxes, closedBoxes, activeLineId);
    const refsToSave = refsOverride !== undefined ? refsOverride : selectedReferences;

    // garante que a fórmula/regra digitadas na linha ativa ficam salvas
    const withCurrent = result.lines.map((l) =>
      l.id === activeLineId
        ? {
            ...l,
            formula: currentFormula,
            rule: currentRule,
            references: refsToSave,
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

    // PREMISSA, HIPÓTESE, CONSTANTE e LTE não pedem referências: confirma na hora
    if (ruleCode === "PREMISSA" || opensBox(ruleCode) || getRuleRefType(ruleCode) === "NONE") {
      setSelectedReferences([]);
      setIsSelectingReferences(false);
      confirmLineWithRule(ruleCode, []);
    } else {
      setIsSelectingReferences(true);
      setFocusedField("formula");
    }
  };

  // Botão de caixa (teclado principal): abre uma caixa na linha atual.
  //  - a linha fica com a regra CONSTANTE (rótulo em branco) e continua ativa;
  //  - se depois você escolher Hipótese, só troca o rótulo: a caixa já existe e
  //    NÃO é criada de novo (syncBoxWithRule vê que CONSTANTE e HIPÓTESE abrem caixa);
  //  - escolher Hipótese direto, sem apertar este botão, continua criando a caixa.
  const handleOpenBox = () => {
    if (activeLineId !== null) {
      const line = lines.find((l) => l.id === activeLineId);
      if (!line || opensBox(line.rule)) return; // já abre uma caixa

      syncBoxWithRule("CONSTANTE");
      setCurrentRule("CONSTANTE");
      setSelectedReferences([]);
      setIsSelectingReferences(false);
      updateCurrentLine(currentFormula, "CONSTANTE", []);
      return;
    }

    // Linha nova no fim: cria a linha com a caixa e continua nela
    const nextId = lines.length > 0 ? Math.max(...lines.map((l) => l.id)) + 1 : 1;

    setLines((prev) => [
      ...prev,
      {
        id: nextId,
        formula: currentFormula || "",
        rule: "CONSTANTE",
        references: [],
        boxScopes: [...openBoxes, nextId],
      },
    ]);
    setOpenBoxes((prev) => (prev.includes(nextId) ? prev : [...prev, nextId]));

    setActiveLineId(nextId);
    setCurrentRule("CONSTANTE");
    setSelectedReferences([]);
    setIsSelectingReferences(false);
    setFocusedField("formula");
    setActiveKeyboard("main");
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
      } else if (refType === "EXISTS_ELIM") {
        setSelectedReferences((prev) => {
          let updated;
          if (prev.length === 0 || prev.length > 2 || typeof prev[1] === "string") {
            updated = [line.id]; // 1º toque: a fórmula ∃x φ (ou recomeça)
          } else if (prev.length === 1) {
            updated = [prev[0], line.id]; // 2º toque: início da caixa
          } else {
            const start = Math.min(prev[1], line.id); // 3º toque: fim da caixa
            const end = Math.max(prev[1], line.id);
            updated = [prev[0], `${start}-${end}`];
          }
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

  // Botão OK do teclado numérico: só confirma a regra (com referências válidas)
  const finishSelection = () => {
    confirmLineWithRule(undefined, getValidRefs());
  };

  // Botão ↵ do teclado numérico: confirma as referências e pula de linha
  const confirmReferencesAndBreak = () => {
    const valid = getValidRefs();
    if (activeLineId !== null) {
      insertLineBelowActive(valid);
    } else {
      confirmLineWithRule(undefined, valid);
    }
  };

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
    refDraft,
    refCursor,
    handleClearRule,
    handleRuleBackspace,
    handleDeleteActiveLine,
    handleTabPress,
    addSymbol,
    openAddSymbolModal,
    handleNewSymbolChange,
    handleNewSymbolKeyDown,
    confirmNewSymbol,
    cancelNewSymbol,
    moveCursor,
    addRefChar,
    moveRefCursor,
    handleSelectRuleOrMode,
    handleOpenBox,
    handleCloseCurrentBox,
    handleLineClick,
    confirmLine,
    finishSelection,
    confirmReferencesAndBreak,
  };
}