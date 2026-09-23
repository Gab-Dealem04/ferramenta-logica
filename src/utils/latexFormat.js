import { availableRules } from "./proofLogic";

export function formatToLatex(text) {
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
}

export function getRuleLatex(code) {
  const found = availableRules.find((r) => r.code === code);
  return found ? found.latex : formatToLatex(code);
}