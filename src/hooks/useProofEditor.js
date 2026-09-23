import { useState, useRef, useEffect } from "react";
import { getRuleRefType, getRequiredRefsCount } from "../utils/proofLogic";

export function useProofEditor(incomingProof) {
  const [lines, setLines] = useState([]);

  useEffect(() => {
    if (incomingProof && incomingProof.premissasIniciais) {
      const adaptedLines = incomingProof.premissasIniciais.map((line) => ({
        ...line,
        boxScopes: line.boxScopes || [],
        references: line.references || [],
        rule: line.rule ? line.rule.toUpperCase() : "PREMISSA",
      }));
      setLines(adaptedLines);
    }
  }, [incomingProof]);

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
  const [isNativeKeyboardActive, setIsNativeKeyboardActive] = useState(false);

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
      } else if (baseText.length === 0 && lines.length > 0) {
        const lastLine = lines[lines.length - 1];

        setLines((prev) => prev.slice(0, -1));

        setCurrentFormula(lastLine.formula);
        setCurrentRule(lastLine.rule);
        setSelectedReferences(lastLine.references);
        setCursorPosition(lastLine.formula.length);
        setActiveLineId(null);
      }
    } else {
      const newFormula =
        baseText.slice(0, cursorPosition) + s + baseText.slice(cursorPosition);

      setCurrentFormula(newFormula);
      setCursorPosition((prev) => prev + s.length);
      updateCurrentLine(newFormula, currentRule, selectedReferences);
    }
  };

  const handleOpenNativeKeyboard = () => {
    setIsNativeKeyboardActive(true);
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
    const value = e.target.value;
    if (!value) return;

    const charToAdd = value.slice(-1);

    if (/[A-Za-z]/.test(charToAdd)) {
      setDynamicVariables((prev) => {
        if (prev.includes(charToAdd)) return prev;

        const updated = [...prev, charToAdd];
        if (updated.length > 5) {
          updated.shift();
        }
        return updated;
      });
    }

    addSymbol(charToAdd);

    e.target.value = "";
  };

  const handleNativeInputKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      finishNativeInput();
    } else if (e.key === "Backspace") {
      e.preventDefault();
      addSymbol("⌫");
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

  const confirmLine = () => confirmLineWithRule();
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
  };
}