/* ==========================================================================
 * folParser.js — Parser de LPO (descida recursiva) que gera uma AST tipada
 *
 * GRAMÁTICA (EBNF) — precedência da mais fraca para a mais forte:
 *
 *   formula    = iff ;
 *   iff        = implies [ "↔" iff ] ;                 (* assoc. à direita *)
 *   implies    = or [ "→" implies ] ;                  (* assoc. à direita *)
 *   or         = and { "∨" and } ;                     (* assoc. à esquerda *)
 *   and        = unary { "∧" unary } ;                 (* assoc. à esquerda *)
 *   unary      = "¬" unary
 *              | ( "∀" | "∃" ) VARIAVEL unary          (* quantificador liga forte *)
 *              | primary ;
 *   primary    = "(" formula ")" | "⊥" | atom ;
 *   atom       = PREDICADO [ "(" termlist ")" ] ;      (* sem "(" => aridade 0 *)
 *   termlist   = term { "," term } ;
 *   term       = CONSTANTE | VARIAVEL | FUNCAO "(" termlist ")" ;
 *
 * Consequência: "∀x P(x) → Q" é "(∀x P(x)) → Q". Para o escopo maior,
 * escreva "∀x (P(x) → Q)".
 *
 * AST (objetos simples, comparáveis com toEqual):
 *   Termos:    Constant{name} | Variable{name,bound} | FunctionApplication{name,args,arity}
 *   Fórmulas:  Predicate{name,args,arity} | Bottom | Not{operand}
 *              | And/Or/Implies/Iff{left,right}
 *              | Quantifier{quantifier:"forall"|"exists", variable, body}
 * ========================================================================== */

import {
  tokenize,
  resolveConventions,
  describeToken,
  TOKEN,
  LogicSyntaxError,
} from "./folLexer";

export { LogicSyntaxError };

class Parser {
  constructor(tokens, conv, options) {
    this.tokens = tokens;
    this.conv = conv;
    this.i = 0;
    this.scope = []; // variáveis ligadas no ponto atual da leitura

    const sig = options.signature || {};
    this.predArity = new Map(Object.entries(sig.predicates || {}));
    this.funcArity = new Map(Object.entries(sig.functions || {}));
  }

  /* ---------- utilitários ---------- */

  peek() {
    return this.tokens[this.i];
  }

  next() {
    const tok = this.tokens[this.i];
    if (tok.type !== TOKEN.EOF) this.i++;
    return tok;
  }

  err(reason, tok) {
    return new LogicSyntaxError(reason, tok.pos);
  }

  closeParen(open, expectComma = false) {
    const t = this.peek();
    if (t.type === TOKEN.RPAREN) {
      this.next();
      return;
    }
    if (t.type === TOKEN.EOF) {
      throw this.err(`O parêntese '(' da posição ${open.pos + 1} não foi fechado`, t);
    }
    throw this.err(
      `Esperava ${expectComma ? "',' ou " : ""}')' para fechar o '(' da posição ` +
        `${open.pos + 1}, mas encontrou ${describeToken(t)}`,
      t
    );
  }

  formulaExpected(tok, after) {
    const ctx = after ? ` após ${after}` : "";
    if (tok.type === TOKEN.EOF) {
      return this.err(`A fórmula terminou inesperadamente: esperava uma fórmula${ctx}`, tok);
    }
    if ([TOKEN.CONST, TOKEN.VAR, TOKEN.FUNC].includes(tok.type)) {
      return this.err(
        `Esperava uma fórmula${ctx}, mas encontrou ${describeToken(tok)}. ` +
          `Termos só podem aparecer como argumentos de um predicado, ex.: P(${tok.value})`,
        tok
      );
    }
    return this.err(`Esperava uma fórmula${ctx}, mas encontrou ${describeToken(tok)}`, tok);
  }

  checkArity(kind, tok, count) {
    const map = kind === "predicate" ? this.predArity : this.funcArity;
    const known = map.get(tok.value);
    if (known === undefined) {
      map.set(tok.value, count);
    } else if (known !== count) {
      const label = kind === "predicate" ? "O predicado" : "A função";
      throw this.err(
        `Aridade inválida: ${label} '${tok.value}' espera ${known} argumento(s), ` +
          `mas recebeu ${count}`,
        tok
      );
    }
  }

  /* ---------- fórmulas ---------- */

  parseIff(after) {
    const left = this.parseImplies(after);
    if (this.peek().type === TOKEN.IFF) {
      const op = this.next();
      return { type: "Iff", left, right: this.parseIff(op.value) };
    }
    return left;
  }

  parseImplies(after) {
    const left = this.parseOr(after);
    if (this.peek().type === TOKEN.IMPLIES) {
      const op = this.next();
      return { type: "Implies", left, right: this.parseImplies(op.value) };
    }
    return left;
  }

  parseOr(after) {
    let left = this.parseAnd(after);
    while (this.peek().type === TOKEN.OR) {
      const op = this.next();
      left = { type: "Or", left, right: this.parseAnd(op.value) };
    }
    return left;
  }

  parseAnd(after) {
    let left = this.parseUnary(after);
    while (this.peek().type === TOKEN.AND) {
      const op = this.next();
      left = { type: "And", left, right: this.parseUnary(op.value) };
    }
    return left;
  }

  parseUnary(after) {
    const tok = this.peek();

    if (tok.type === TOKEN.NOT) {
      this.next();
      return { type: "Not", operand: this.parseUnary(tok.value) };
    }

    if (tok.type === TOKEN.FORALL || tok.type === TOKEN.EXISTS) {
      this.next();
      const v = this.peek();
      if (v.type !== TOKEN.VAR) {
        const vars = [...this.conv.variables].join(", ");
        throw this.err(
          v.type === TOKEN.EOF
            ? `Esperava uma variável (${vars}) após ${tok.value}, mas a fórmula terminou`
            : `Esperava uma variável (${vars}) após ${tok.value}, mas encontrou ${describeToken(v)}`,
          v
        );
      }
      this.next();

      this.scope.push(v.value);
      const body = this.parseUnary(`${tok.value}${v.value}`);
      this.scope.pop();

      return {
        type: "Quantifier",
        quantifier: tok.type === TOKEN.FORALL ? "forall" : "exists",
        variable: v.value,
        body,
      };
    }

    return this.parsePrimary(after);
  }

  parsePrimary(after) {
    const tok = this.peek();
    switch (tok.type) {
      case TOKEN.LPAREN: {
        this.next();
        const inner = this.parseIff();
        this.closeParen(tok);
        return inner;
      }
      case TOKEN.BOTTOM:
        this.next();
        return { type: "Bottom" };
      case TOKEN.PRED:
        return this.parseAtom();
      default:
        throw this.formulaExpected(tok, after);
    }
  }

  parseAtom() {
    const nameTok = this.next();
    let args = [];

    if (this.peek().type === TOKEN.LPAREN) {
      const open = this.next();
      if (this.peek().type === TOKEN.RPAREN) {
        throw this.err(
          `O predicado '${nameTok.value}' foi escrito com parênteses vazios; ` +
            `omita-os se a aridade for 0`,
          open
        );
      }
      args = this.parseTermList();
      this.closeParen(open, true);
    }

    this.checkArity("predicate", nameTok, args.length);
    return { type: "Predicate", name: nameTok.value, args, arity: args.length };
  }

  /* ---------- termos ---------- */

  parseTermList() {
    const terms = [this.parseTerm()];
    while (this.peek().type === TOKEN.COMMA) {
      this.next();
      const n = this.peek();
      if ([TOKEN.EOF, TOKEN.RPAREN, TOKEN.COMMA].includes(n.type)) {
        throw this.err(`Esperava um termo após ',', mas encontrou ${describeToken(n)}`, n);
      }
      terms.push(this.parseTerm());
    }
    return terms;
  }

  parseTerm() {
    const tok = this.peek();

    switch (tok.type) {
      case TOKEN.CONST:
      case TOKEN.VAR: {
        this.next();
        const nxt = this.peek();
        if (nxt.type === TOKEN.LPAREN) {
          const kind = tok.type === TOKEN.CONST ? "uma constante" : "uma variável";
          const funcs = [...this.conv.functions].join(", ");
          throw this.err(
            `'${tok.value}' é ${kind} e não aceita argumentos ` +
              `(símbolos de função: ${funcs})`,
            nxt
          );
        }
        return tok.type === TOKEN.CONST
          ? { type: "Constant", name: tok.value }
          : { type: "Variable", name: tok.value, bound: this.scope.includes(tok.value) };
      }

      case TOKEN.FUNC: {
        this.next();
        const open = this.peek();
        if (open.type !== TOKEN.LPAREN) {
          throw this.err(
            `A função '${tok.value}' precisa de argumentos entre parênteses, ex.: ${tok.value}(x)`,
            open
          );
        }
        this.next();
        const args = this.parseTermList();
        this.closeParen(open, true);
        this.checkArity("function", tok, args.length);
        return { type: "FunctionApplication", name: tok.value, args, arity: args.length };
      }

      case TOKEN.PRED:
        throw this.err(
          `O predicado '${tok.value}' não pode ser usado como termo ` +
            `(predicados só aparecem no nível das fórmulas)`,
          tok
        );

      default:
        throw this.err(
          `Esperava um termo (constante, variável ou função), mas encontrou ${describeToken(tok)}`,
          tok
        );
    }
  }
}

/* ==========================================================================
 * API pública
 * ========================================================================== */

/**
 * @param {string} input
 * @param {object} [options]
 * @param {object} [options.conventions]  { constants, functions, variables } (strings de letras)
 * @param {object} [options.signature]    { predicates:{P:1}, functions:{f:1} } aridades pré-declaradas
 * @param {string[]} [options.constants]  nomes que valem como constante (x0, socrates...)
 * @returns AST da fórmula
 * @throws {LogicSyntaxError} com .reason e .position (0-based)
 */
export function parseFormula(input, options = {}) {
  const conv = resolveConventions(options.conventions);
  const tokens = tokenize(input, { conventions: conv, constants: options.constants });

  if (tokens.length === 1) {
    throw new LogicSyntaxError("A fórmula está vazia", 0);
  }

  const parser = new Parser(tokens, conv, options);
  const ast = parser.parseIff();

  const rest = parser.peek();
  if (rest.type !== TOKEN.EOF) {
    if (rest.type === TOKEN.RPAREN) {
      throw new LogicSyntaxError("Parêntese ')' sem '(' correspondente", rest.pos);
    }
    throw new LogicSyntaxError(
      `Esperava um conectivo (∧, ∨, →, ↔) ou o fim da fórmula, mas encontrou ${describeToken(rest)}`,
      rest.pos
    );
  }
  return ast;
}

/* ---------- utilitários sobre a AST ---------- */

const BINARY_SYMBOL = { And: "∧", Or: "∨", Implies: "→", Iff: "↔" };

function walk(node, visit) {
  visit(node);
  switch (node.type) {
    case "Predicate":
    case "FunctionApplication":
      node.args.forEach((a) => walk(a, visit));
      break;
    case "Not":
      walk(node.operand, visit);
      break;
    case "Quantifier":
      walk(node.body, visit);
      break;
    case "And":
    case "Or":
    case "Implies":
    case "Iff":
      walk(node.left, visit);
      walk(node.right, visit);
      break;
    default:
      break;
  }
}

/** Variáveis livres (usa o campo `bound` preenchido pelo parser). */
export function freeVariables(ast) {
  const out = new Set();
  walk(ast, (n) => {
    if (n.type === "Variable" && !n.bound) out.add(n.name);
  });
  return out;
}

/** Inventário de símbolos: { predicates:{P:1}, functions:{f:1}, constants:Set, variables:Set } */
export function collectSymbols(ast) {
  const out = { predicates: {}, functions: {}, constants: new Set(), variables: new Set() };
  walk(ast, (n) => {
    if (n.type === "Predicate") out.predicates[n.name] = n.arity;
    else if (n.type === "FunctionApplication") out.functions[n.name] = n.arity;
    else if (n.type === "Constant") out.constants.add(n.name);
    else if (n.type === "Variable") out.variables.add(n.name);
    else if (n.type === "Quantifier") out.variables.add(n.variable);
  });
  return out;
}

/** AST -> texto Unicode (reparseável: parseFormula(formatFormula(x)) deep-equals x). */
export function formatFormula(node, top = true) {
  const term = (t) =>
    t.type === "FunctionApplication" ? `${t.name}(${t.args.map(term).join(", ")})` : t.name;

  switch (node.type) {
    case "Predicate":
      return node.args.length ? `${node.name}(${node.args.map(term).join(", ")})` : node.name;
    case "Bottom":
      return "⊥";
    case "Not":
      return `¬${formatFormula(node.operand, false)}`;
    case "Quantifier":
      return `${node.quantifier === "forall" ? "∀" : "∃"}${node.variable} ${formatFormula(node.body, false)}`;
    default: {
      const s = `${formatFormula(node.left, false)} ${BINARY_SYMBOL[node.type]} ${formatFormula(node.right, false)}`;
      return top ? s : `(${s})`;
    }
  }
}

/** AST -> descrição legível, ex.: Predicado(P, [Constante(a)]) */
export function describeAst(node) {
  const list = (args) => `[${args.map(describeAst).join(", ")}]`;
  switch (node.type) {
    case "Constant":
      return `Constante(${node.name})`;
    case "Variable":
      return `Variavel(${node.name})`;
    case "FunctionApplication":
      return `Funcao(${node.name}, ${list(node.args)})`;
    case "Predicate":
      return `Predicado(${node.name}, ${list(node.args)})`;
    case "Bottom":
      return "Absurdo";
    case "Not":
      return `Nao(${describeAst(node.operand)})`;
    case "And":
      return `E(${describeAst(node.left)}, ${describeAst(node.right)})`;
    case "Or":
      return `Ou(${describeAst(node.left)}, ${describeAst(node.right)})`;
    case "Implies":
      return `Implica(${describeAst(node.left)}, ${describeAst(node.right)})`;
    case "Iff":
      return `Bicondicional(${describeAst(node.left)}, ${describeAst(node.right)})`;
    case "Quantifier":
      return `${node.quantifier === "forall" ? "ParaTodo" : "Existe"}(${node.variable}, ${describeAst(node.body)})`;
    default:
      return String(node.type);
  }
}