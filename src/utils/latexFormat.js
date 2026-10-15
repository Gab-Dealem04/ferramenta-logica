import { availableRules } from "./proofLogic";

export function formatToLatex(text) {
  if (!text) return "";
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