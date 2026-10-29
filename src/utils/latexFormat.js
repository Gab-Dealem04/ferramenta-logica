import { availableRules } from "./proofLogic";
import { parseHeader, gutterEm } from "./boxNames";

const SUBSCRIPTS = "₀₁₂₃₄₅₆₇₈₉";

// Nome -> LaTeX (itálico; subscritos unicode viram subscrito de verdade)
export function nameToLatex(name) {
  const m = name.match(/^(.*?)([₀-₉]*)$/su);
  const base = m[1].replace(/_/g, "\\_");
  const sub = [...m[2]].map((c) => SUBSCRIPTS.indexOf(c)).join("");
  return `\\textit{${base}}${sub ? `_{${sub}}` : ""}`;
}

/**
 * Texto da fórmula -> LaTeX.
 * Cabeçalho de caixa "nome: fórmula": o nome aparece com os dois pontos ("a:")
 * numa coluna à esquerda e a fórmula começa depois dela, com o espaço.
 * header=false: o texto não é o começo da linha (ex.: parte depois do cursor).
 */
export function formatToLatex(text, { header = true } = {}) {
  if (!text) return "";

  if (header) {
    const h = parseHeader(text);
    if (h) {
      const rest = h.rest.replace(/^\s+/, "");
      return (
        `\\mathrlap{${nameToLatex(h.name)}\\text{:}}\\hspace{${gutterEm(h.name)}em}` +
        formatToLatex(rest, { header: false })
      );
    }
  }

  return text
    .replace(/ /g, "\\ ")
    .replace(/→/g, " \\rightarrow ")
    .replace(/↔/g, " \\leftrightarrow ")
    .replace(/¬/g, " \\neg ")
    .replace(/∧/g, " \\land ")
    .replace(/∨/g, " \\lor ")
    .replace(/⊥/g, " \\bot ")
    .replace(/∀/g, " \\forall  ")
    .replace(/∃/g, " \\exists  ");
}

// Ignora maiúsculas/minúsculas: "∧I" (recarregado do storage) == "∧i"
export function getRuleLatex(code) {
  const wanted = String(code || "").toLowerCase();
  const found = availableRules.find((r) => r.code.toLowerCase() === wanted);
  return found ? found.latex : formatToLatex(code);
}