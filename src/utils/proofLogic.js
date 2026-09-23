export const availableRules = [
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

export const logicalOperators = [
  { latex: "\\land", symbol: "∧" },
  { latex: "\\lor", symbol: "∨" },
  { latex: "\\rightarrow", symbol: "→" },
  { latex: "\\neg", symbol: "¬" },
  { latex: "\\bot", symbol: "⊥" },
  { latex: "\\forall ", symbol: "∀" },
  { latex: "\\exists ", symbol: "∃" },
];

export function getRuleRefType(rule) {
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
}

export function getRequiredRefsCount(rule) {
  const type = getRuleRefType(rule);
  if (type === "OR_ELIM") return 3;
  if (type === "RANGE" || type === "MULTI_LINE") return 2;
  if (type === "SINGLE_LINE") return 1;
  return 0;
}