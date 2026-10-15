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
  { label: "LTE", code: "LTE", latex: "\\text{LTE}" },
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

// Tipos de referência:
//   OR_ELIM     ∨e : linha, caixa, caixa        -> [3, "4-5", "6-7"]
//   EXISTS_ELIM ∃e : linha, caixa               -> [2, "3-5"]
//   RANGE       →i ¬i RAA ∀i : uma caixa        -> ["3-5"]
//   MULTI_LINE  duas linhas
//   SINGLE_LINE uma linha
//   NONE        LTE (φ ∨ ¬φ): não usa referências
// A comparação ignora maiúsculas/minúsculas: provas recarregadas do storage
// guardam as regras em maiúsculas ("∧I").
export function getRuleRefType(rule) {
  switch (String(rule || "").toLowerCase()) {
    case "∨e":
      return "OR_ELIM";
    case "∃e":
      return "EXISTS_ELIM";
    case "lte":
    case "ltm":
      return "NONE";
    case "→i":
    case "¬i":
    case "raa":
    case "∀i":
      return "RANGE";
    case "∧i":
    case "→e":
    case "¬e":
      return "MULTI_LINE";
    default:
      return "SINGLE_LINE";
  }
}

export function getRequiredRefsCount(rule) {
  const type = getRuleRefType(rule);
  if (type === "OR_ELIM") return 3;
  if (type === "RANGE" || type === "MULTI_LINE" || type === "EXISTS_ELIM") return 2;
  if (type === "SINGLE_LINE") return 1;
  return 0;
}