/* ==========================================================================
 * folLexer.js — Tokenizador de Lógica de Primeira Ordem (LPO)
 *
 * CONVENÇÕES (todas configuráveis via options.conventions):
 *   Predicados ........ letra MAIÚSCULA + dígitos opcionais   P, Q, R, P1
 *   Variáveis ......... u v w x y z (+ dígitos opcionais)     x, y2
 *   Funções ........... f g h       (+ dígitos opcionais)     f, g1
 *   Constantes ........ QUALQUER outra letra minúscula        a, s, k, c1
 *   Dígitos podem ser normais ou subscritos (x0, x₀).
 *   Para restringir as constantes: conventions: { constants: "abcde" } e
 *   qualquer outra letra passa a dar erro.
 *
 * CONECTIVOS / QUANTIFICADORES (Unicode ou ASCII):
 *   ¬ ~   ∧ &   ∨ |   → ->   ↔ <->   ∀ forall   ∃ exists   ⊥
 * ========================================================================== */

export const DEFAULT_CONVENTIONS = Object.freeze({
  constants: null, // null = toda minúscula que não seja variável nem função
  functions: "fgh",
  variables: "uvwxyz",
});

export const TOKEN = Object.freeze({
  PRED: "PRED",
  CONST: "CONST",
  VAR: "VAR",
  FUNC: "FUNC",
  LPAREN: "LPAREN",
  RPAREN: "RPAREN",
  COMMA: "COMMA",
  NOT: "NOT",
  AND: "AND",
  OR: "OR",
  IMPLIES: "IMPLIES",
  IFF: "IFF",
  FORALL: "FORALL",
  EXISTS: "EXISTS",
  BOTTOM: "BOTTOM",
  EOF: "EOF",
});

export class LogicSyntaxError extends Error {
  /** @param {string} reason mensagem sem posição; @param {number} position índice 0-based */
  constructor(reason, position = 0) {
    super(`${reason} (posição ${position + 1})`);
    this.name = "LogicSyntaxError";
    this.reason = reason;
    this.position = position;
  }
}

// Ordem importa: os símbolos mais longos vêm primeiro.
const SYMBOLS = [
  ["<->", TOKEN.IFF],
  ["->", TOKEN.IMPLIES],
  ["↔", TOKEN.IFF],
  ["→", TOKEN.IMPLIES],
  ["¬", TOKEN.NOT],
  ["~", TOKEN.NOT],
  ["∧", TOKEN.AND],
  ["&", TOKEN.AND],
  ["∨", TOKEN.OR],
  ["|", TOKEN.OR],
  ["∀", TOKEN.FORALL],
  ["∃", TOKEN.EXISTS],
  ["⊥", TOKEN.BOTTOM],
  ["(", TOKEN.LPAREN],
  [")", TOKEN.RPAREN],
  [",", TOKEN.COMMA],
];

// Verificadas ANTES das letras, para "forall" não virar f + o + r...
const KEYWORDS = [
  ["forall", TOKEN.FORALL],
  ["exists", TOKEN.EXISTS],
];

export function resolveConventions(custom = {}) {
  const conv = { ...DEFAULT_CONVENTIONS, ...custom };
  const seen = new Map();
  for (const group of ["constants", "functions", "variables"]) {
    if (conv[group] === null || conv[group] === undefined) continue;
    for (const ch of conv[group]) {
      if (seen.has(ch)) {
        throw new Error(
          `Convenção inválida: '${ch}' aparece em '${seen.get(ch)}' e em '${group}'.`
        );
      }
      seen.set(ch, group);
    }
  }
  return conv;
}

export function describeToken(tok) {
  switch (tok.type) {
    case TOKEN.EOF:
      return "o fim da fórmula";
    case TOKEN.PRED:
      return `o predicado '${tok.value}'`;
    case TOKEN.CONST:
      return `a constante '${tok.value}'`;
    case TOKEN.VAR:
      return `a variável '${tok.value}'`;
    case TOKEN.FUNC:
      return `a função '${tok.value}'`;
    default:
      return `'${tok.value}'`;
  }
}

function classifyLowercase(ch, conv) {
  if (conv.variables.includes(ch)) return TOKEN.VAR;
  if (conv.functions.includes(ch)) return TOKEN.FUNC;
  if (conv.constants === null || conv.constants.includes(ch)) return TOKEN.CONST;
  return null;
}

/** @returns {{type:string, value:string, pos:number}[]} sempre termina com EOF */
export function tokenize(input, options = {}) {
  const conv = resolveConventions(options.conventions);
  const text = String(input ?? "");
  const tokens = [];
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    const keyword = KEYWORDS.find(([word]) => text.startsWith(word, i));
    if (keyword) {
      tokens.push({ type: keyword[1], value: keyword[0], pos: i });
      i += keyword[0].length;
      continue;
    }

    const symbol = SYMBOLS.find(([s]) => text.startsWith(s, i));
    if (symbol) {
      tokens.push({ type: symbol[1], value: symbol[0], pos: i });
      i += symbol[0].length;
      continue;
    }

    if (/[A-Za-z]/.test(ch)) {
      let j = i + 1;
      while (j < text.length && /[0-9₀-₉]/.test(text[j])) j++; // sufixo numérico: x1, a2, x₀
      const value = text.slice(i, j);

      let type;
      if (/[A-Z]/.test(ch)) {
        type = TOKEN.PRED;
      } else {
        type = classifyLowercase(ch, conv);
        if (!type) {
          throw new LogicSyntaxError(
            `O símbolo '${ch}' não pertence a nenhuma categoria ` +
              `(constantes: ${[...(conv.constants || "")].join(", ")}; ` +
              `funções: ${[...conv.functions].join(", ")}; ` +
              `variáveis: ${[...conv.variables].join(", ")})`,
            i
          );
        }
      }

      tokens.push({ type, value, pos: i });
      i = j;
      continue;
    }

    throw new LogicSyntaxError(`Caractere inválido '${ch}'`, i);
  }

  tokens.push({ type: TOKEN.EOF, value: "", pos: text.length });
  return tokens;
}