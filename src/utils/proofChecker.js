/* ==========================================================================
 * proofChecker.js — Verificador de provas de dedução natural (LP e LPO)
 *
 * checkProof(lines) -> { [lineId]: { formula?: string, rule?: string } }
 *   formula: erro de sintaxe na fórmula da linha
 *   rule:    a regra está mal aplicada (referências erradas, escopo, forma)
 * Linhas sem erro não aparecem no resultado.
 *
 * REGRAS (φ, ψ, χ = fórmulas; φ[c/x] = φ com x trocado por c):
 *   ∧i   φ , ψ ⊢ φ ∧ ψ                 (ordem das referências livre)
 *   ∧e   φ ∧ ψ ⊢ φ   ou   φ ∧ ψ ⊢ ψ
 *   ∨i   φ ⊢ φ ∨ ψ   ou   φ ⊢ ψ ∨ φ
 *   ∨e   φ ∨ ψ , caixa[φ … χ] , caixa[ψ … χ] ⊢ χ
 *   →i   caixa[φ … ψ] ⊢ φ → ψ
 *   →e   φ , φ → ψ ⊢ ψ                 (ordem livre)
 *   ¬i   caixa[φ … ⊥] ⊢ ¬φ
 *   ¬e   φ , ¬φ ⊢ ⊥                    (ordem livre)
 *   ¬¬i  φ ⊢ ¬¬φ          ¬¬e  ¬¬φ ⊢ φ
 *   ⊥e   ⊥ ⊢ φ (qualquer)
 *   RAA  caixa[¬φ … ⊥] ⊢ φ
 *   LTE  ⊢ φ ∨ ¬φ         (também aceita como LTM; referências ignoradas)
 *   copie φ ⊢ φ
 *   ∀e   ∀x φ ⊢ φ[t/x]                 (t = qualquer termo livre para x)
 *   ∃i   φ[t/x] ⊢ ∃x φ
 *   ∀i   caixa[c … φ[c/x]] ⊢ ∀x φ      (c = constante NOVA, caixa SEM hipótese)
 *   ∃e   ∃x φ , caixa[c φ[c/x] … χ] ⊢ χ   (c = constante NOVA)
 *
 * CAIXAS COM NOME NOVO (∀i e ∃e). A linha que abre a caixa é CONSTANTE
 * (botão "Const.", rótulo em branco) ou HIPÓTESE, no formato  nome: fórmula
 *   "a:"          só declara o nome novo a (usado em ∀i)
 *   "a: ¬P(a)"    declara a e já dá a hipótese (como nos livros)
 *   "x0: P(x0)"   o nome pode ser qualquer um: x0, s, socrates...
 * Tudo que vem ANTES dos dois pontos é um termo (constante) novo e vale para a
 * caixa inteira: dentro dela, o nome é lido como constante, qualquer que seja o
 * formato (x0 não vira variável; socrates não vira s·o·c·r·a·t·e·s).
 * Ainda aceitos: "a" / "a φ" (sem dois pontos) e só "φ" (em ∃e o nome é deduzido).
 * "Novo" = não aparece em nenhuma linha visível antes da caixa, nem na
 * fórmula ∃x φ, nem na conclusão da regra.
 *
 * ESCOPO: uma linha só pode citar linhas anteriores que não estejam dentro
 * de uma caixa já fechada. Uma caixa "a-b" só pode ser citada depois de
 * fechada; "a" deve ser uma hipótese e "b" a última linha da caixa.
 * ========================================================================== */

import { parseFormula, formatFormula } from "./folParser";
import { tokenize, TOKEN } from "./folLexer";
import { parseHeader } from "./boxNames";

class RuleError extends Error {}
class Skip extends Error {} // depende de uma linha com erro de sintaxe: não marca

const fmt = formatFormula;
const same = (a, b) => fmt(a) === fmt(b);
const neg = (a) => ({ type: "Not", operand: a });
const isBottom = (a) => a.type === "Bottom";
const normRule = (r) => String(r || "").trim().toLowerCase();

/* ---------- termos e substituição ---------- */

const isTerm = (n) => ["Constant", "Variable", "FunctionApplication"].includes(n.type);

function fmtTerm(t) {
  return t.type === "FunctionApplication"
    ? `${t.name}(${t.args.map(fmtTerm).join(", ")})`
    : t.name;
}

function termVars(t, out = new Set()) {
  if (t.type === "Variable") out.add(t.name);
  else if (t.type === "FunctionApplication") t.args.forEach((a) => termVars(a, out));
  return out;
}

// Nomes "soltos" de uma fórmula: constantes e variáveis livres.
function namesOf(node, out = new Set()) {
  switch (node.type) {
    case "Constant":
      out.add(node.name);
      break;
    case "Variable":
      if (!node.bound) out.add(node.name);
      break;
    case "Predicate":
    case "FunctionApplication":
      node.args.forEach((a) => namesOf(a, out));
      break;
    case "Not":
      namesOf(node.operand, out);
      break;
    case "Quantifier":
      namesOf(node.body, out);
      break;
    case "And":
    case "Or":
    case "Implies":
    case "Iff":
      namesOf(node.left, out);
      namesOf(node.right, out);
      break;
    default:
      break;
  }
  return out;
}

/**
 * Verifica se `target` é `pattern` com as ocorrências LIVRES da variável `v`
 * trocadas por um mesmo termo. O termo encontrado fica em st.term
 * (null se v não ocorre livre em pattern).
 */
function match(p, t, v, st, shadow) {
  const bind = (term) => {
    if (st.term === null) {
      st.term = term;
      return true;
    }
    return fmtTerm(st.term) === fmtTerm(term);
  };

  if (p.type !== t.type) {
    return p.type === "Variable" && p.name === v && !shadow && isTerm(t) ? bind(t) : false;
  }

  switch (p.type) {
    case "Variable":
      return p.name === v && !shadow ? bind(t) : p.name === t.name;
    case "Constant":
      return p.name === t.name;
    case "FunctionApplication":
    case "Predicate":
      return (
        p.name === t.name &&
        p.args.length === t.args.length &&
        p.args.every((a, i) => match(a, t.args[i], v, st, shadow))
      );
    case "Bottom":
      return true;
    case "Not":
      return match(p.operand, t.operand, v, st, shadow);
    case "And":
    case "Or":
    case "Implies":
    case "Iff":
      return match(p.left, t.left, v, st, shadow) && match(p.right, t.right, v, st, shadow);
    case "Quantifier":
      return (
        p.quantifier === t.quantifier &&
        p.variable === t.variable &&
        match(p.body, t.body, v, st, shadow || p.variable === v)
      );
    default:
      return false;
  }
}

// O termo ficaria "preso" por algum quantificador ao ser colocado no lugar de v?
function captures(node, v, tvars, binders = [], shadow = false) {
  switch (node.type) {
    case "Variable":
      return !shadow && node.name === v && binders.some((b) => tvars.has(b));
    case "Predicate":
    case "FunctionApplication":
      return node.args.some((a) => captures(a, v, tvars, binders, shadow));
    case "Not":
      return captures(node.operand, v, tvars, binders, shadow);
    case "And":
    case "Or":
    case "Implies":
    case "Iff":
      return (
        captures(node.left, v, tvars, binders, shadow) ||
        captures(node.right, v, tvars, binders, shadow)
      );
    case "Quantifier":
      return captures(node.body, v, tvars, [...binders, node.variable], shadow || node.variable === v);
    default:
      return false;
  }
}

function checkNoCapture(body, v, term, quantFormula) {
  if (term && captures(body, v, termVars(term))) {
    throw new RuleError(
      `o termo ${fmtTerm(term)} ficaria preso por um quantificador em ${fmt(quantFormula)}`
    );
  }
}

/* ---------- leitura das linhas ---------- */

// Formato antigo, sem dois pontos: "a" declara o nome; "a φ" declara e dá a hipótese.
// Devolve { ast, fresh } | { error } | null (se a linha não tem esse formato)
function parseDeclaration(text, names) {
  let tokens;
  try {
    tokens = tokenize(text, { constants: names });
  } catch {
    return null;
  }
  if (tokens[0].type !== TOKEN.CONST && tokens[0].type !== TOKEN.VAR) return null;

  const rest = text.slice(tokens[1].pos).trim();
  if (!rest) return { ast: null, fresh: tokens[0].value };
  try {
    return { ast: parseFormula(rest, { constants: names }), fresh: tokens[0].value };
  } catch (e) {
    return { error: e.message };
  }
}

// Devolve { empty } | { error } | { ast, fresh }
//   fresh = nome novo declarado no início de uma caixa (ou null)
//   ast   = null quando a linha só declara o nome ("a:")
// `names` = nomes declarados nas caixas que contêm a linha (valem como constante).
function parseLine(line, names) {
  const text = (line.formula || "").trim();
  if (!text) return { empty: true };

  const rule = normRule(line.rule);
  const opts = { constants: names };

  // Cabeçalho de caixa:  nome: fórmula
  if (rule === "hipótese" || rule === "constante") {
    const h = parseHeader(text);
    if (h) {
      const rest = h.rest.trim();
      if (!rest) return { ast: null, fresh: h.name };
      try {
        return { ast: parseFormula(rest, opts), fresh: h.name };
      } catch (e) {
        return { error: e.message };
      }
    }
  }

  // Linha "constante" sem dois pontos: só o nome (ex.: a, x0)
  if (rule === "constante") {
    return (
      parseDeclaration(text, names) || {
        error: "Uma linha de constante nova deve ter o formato nome: (ex.: a: ou x0:)",
      }
    );
  }

  try {
    return { ast: parseFormula(text, opts), fresh: null };
  } catch (err) {
    if (rule === "hipótese") {
      const decl = parseDeclaration(text, names);
      if (decl) return decl;
    }
    return { error: err.message };
  }
}

/* ---------- acesso a referências ---------- */

function getLine(ctx, ref) {
  if (typeof ref !== "number") {
    throw new RuleError(`esperava uma linha, mas "${ref}" é um intervalo`);
  }
  const target = ctx.byId.get(ref);
  if (!target) throw new RuleError(`a linha ${ref} não existe`);
  if (ref >= ctx.cur.id) {
    throw new RuleError(`a linha ${ref} não vem antes desta; só dá para usar linhas anteriores`);
  }
  if (!target.boxScopes.every((s) => ctx.cur.boxScopes.includes(s))) {
    throw new RuleError(`a linha ${ref} está dentro de uma caixa já fechada`);
  }
  const inf = ctx.info.get(ref);
  if (!inf || inf.error || inf.empty) throw new Skip();
  if (!inf.ast) {
    throw new RuleError(`a linha ${ref} só declara o nome ${inf.fresh}; não é uma fórmula`);
  }
  return inf.ast;
}

function getBox(ctx, ref) {
  if (typeof ref !== "string" || !ref.includes("-")) {
    throw new RuleError(`esperava uma caixa (ex.: 2-4), mas recebeu "${ref}"`);
  }
  const [a, b] = ref.split("-").map(Number);
  const hyp = ctx.byId.get(a);
  const end = ctx.byId.get(b);

  if (!hyp || !end) throw new RuleError(`a caixa ${ref} usa uma linha que não existe`);
  if (a > b) throw new RuleError(`a caixa ${ref} está ao contrário`);
  if (b >= ctx.cur.id) throw new RuleError(`a caixa ${ref} precisa terminar antes desta linha`);
  if (!["hipótese", "constante"].includes(normRule(hyp.rule))) {
    throw new RuleError(`a linha ${a} não é uma hipótese nem uma constante nova, então não abre uma caixa`);
  }
  if (ctx.cur.boxScopes.includes(a)) {
    throw new RuleError(`a caixa ${ref} ainda está aberta nesta linha`);
  }

  const outer = hyp.boxScopes.filter((s) => s !== a);
  if (!outer.every((s) => ctx.cur.boxScopes.includes(s))) {
    throw new RuleError(`a caixa ${ref} está dentro de outra caixa já fechada`);
  }

  const members = ctx.lines.filter((l) => l.boxScopes.includes(a)).map((l) => l.id);
  if (members.length === 0) throw new RuleError(`a linha ${a} não abre uma caixa`);
  const realEnd = Math.max(...members);
  if (realEnd !== b) {
    throw new RuleError(`a caixa que começa na linha ${a} termina na linha ${realEnd}, e não na ${b}`);
  }

  const hi = ctx.info.get(a);
  const ci = ctx.info.get(b);
  if (!hi || hi.error || hi.empty || !ci || ci.error || ci.empty) throw new Skip();
  if (!ci.ast) {
    throw new RuleError(`a caixa ${ref} termina numa linha que só declara um nome`);
  }
  return { hyp: hi.ast, fresh: hi.fresh, concl: ci.ast, start: a, ref };
}

// Regras com hipótese comum não aceitam caixa que começa só com uma constante.
function needHyp(box) {
  if (!box.hyp) {
    throw new RuleError(
      `a caixa ${box.ref} começa só com o nome novo ${box.fresh}, sem hipótese`
    );
  }
}

// A constante `c` é nova? (não aparece em linhas visíveis antes da caixa
// nem nas fórmulas extras)
function freshnessError(ctx, box, c, extras) {
  const hypLine = ctx.byId.get(box.start);
  const outer = hypLine.boxScopes.filter((s) => s !== box.start);

  for (const l of ctx.lines) {
    if (l.id >= box.start) continue;
    if (!l.boxScopes.every((s) => outer.includes(s))) continue;
    const inf = ctx.info.get(l.id);
    if (inf && inf.ast && namesOf(inf.ast).has(c)) {
      return `o nome ${c} deveria ser novo, mas já aparece na linha ${l.id}`;
    }
  }
  for (const [label, ast] of extras) {
    if (namesOf(ast).has(c)) {
      return `o nome ${c} deveria ser novo, mas aparece em ${label}`;
    }
  }
  return null;
}

/* ---------- regras ---------- */

const RULES = {
  "∧i": (c, [r1, r2], f) => {
    const a = getLine(c, r1);
    const b = getLine(c, r2);
    const ok =
      f.type === "And" &&
      ((same(f.left, a) && same(f.right, b)) || (same(f.left, b) && same(f.right, a)));
    if (!ok) throw new RuleError(`de ${fmt(a)} e ${fmt(b)} conclui-se ${fmt(a)} ∧ ${fmt(b)}`);
  },

  "∧e": (c, [r], f) => {
    const a = getLine(c, r);
    if (a.type !== "And") throw new RuleError(`a linha ${r} (${fmt(a)}) não é uma conjunção`);
    if (!same(f, a.left) && !same(f, a.right)) {
      throw new RuleError(`${fmt(f)} não é um dos lados de ${fmt(a)}`);
    }
  },

  "∨i": (c, [r], f) => {
    const a = getLine(c, r);
    if (f.type !== "Or") throw new RuleError(`a conclusão deve ser uma disjunção`);
    if (!same(f.left, a) && !same(f.right, a)) {
      throw new RuleError(`${fmt(a)} (linha ${r}) deveria ser um dos lados de ${fmt(f)}`);
    }
  },

  "∨e": (c, refs, f) => {
    const nums = refs.filter((r) => typeof r === "number");
    const boxes = refs.filter((r) => typeof r === "string");
    if (nums.length !== 1 || boxes.length !== 2) {
      throw new RuleError(`precisa de uma disjunção e duas caixas (ex.: 1, 2-3, 4-5)`);
    }
    const d = getLine(c, nums[0]);
    if (d.type !== "Or") throw new RuleError(`a linha ${nums[0]} (${fmt(d)}) não é uma disjunção`);
    const x = getBox(c, boxes[0]);
    const y = getBox(c, boxes[1]);
    needHyp(x);
    needHyp(y);

    const okHyps =
      (same(x.hyp, d.left) && same(y.hyp, d.right)) ||
      (same(x.hyp, d.right) && same(y.hyp, d.left));
    if (!okHyps) {
      throw new RuleError(`as hipóteses das caixas deveriam ser ${fmt(d.left)} e ${fmt(d.right)}`);
    }
    if (!same(x.concl, f) || !same(y.concl, f)) {
      throw new RuleError(`as duas caixas deveriam terminar em ${fmt(f)}`);
    }
  },

  "→i": (c, [r], f) => {
    const b = getBox(c, r);
    needHyp(b);
    if (f.type !== "Implies") throw new RuleError(`a conclusão deve ser uma implicação`);
    if (!same(f.left, b.hyp) || !same(f.right, b.concl)) {
      throw new RuleError(
        `a caixa ${r} leva a ${fmt(b.hyp)} → ${fmt(b.concl)}, mas a linha tem ${fmt(f)}`
      );
    }
  },

  "→e": (c, [r1, r2], f) => {
    const a = getLine(c, r1);
    const b = getLine(c, r2);
    const works = (p, imp) => imp.type === "Implies" && same(imp.left, p) && same(imp.right, f);
    if (!works(a, b) && !works(b, a)) {
      if (a.type !== "Implies" && b.type !== "Implies") {
        throw new RuleError(`nenhuma das linhas ${r1} e ${r2} é uma implicação`);
      }
      throw new RuleError(`de ${fmt(a)} e ${fmt(b)} não se conclui ${fmt(f)}`);
    }
  },

  "¬i": (c, [r], f) => {
    const b = getBox(c, r);
    needHyp(b);
    if (!isBottom(b.concl)) {
      throw new RuleError(`a caixa ${r} deve terminar em ⊥ (termina em ${fmt(b.concl)})`);
    }
    if (!same(f, neg(b.hyp))) throw new RuleError(`a conclusão deveria ser ${fmt(neg(b.hyp))}`);
  },

  "¬e": (c, [r1, r2], f) => {
    const a = getLine(c, r1);
    const b = getLine(c, r2);
    if (!isBottom(f)) throw new RuleError(`a conclusão deve ser ⊥`);
    if (!same(b, neg(a)) && !same(a, neg(b))) {
      throw new RuleError(`as linhas ${r1} e ${r2} deveriam ser φ e ¬φ (são ${fmt(a)} e ${fmt(b)})`);
    }
  },

  "¬¬i": (c, [r], f) => {
    const a = getLine(c, r);
    if (!same(f, neg(neg(a)))) throw new RuleError(`a conclusão deveria ser ${fmt(neg(neg(a)))}`);
  },

  "¬¬e": (c, [r], f) => {
    const a = getLine(c, r);
    if (a.type !== "Not" || a.operand.type !== "Not") {
      throw new RuleError(`a linha ${r} (${fmt(a)}) não é uma dupla negação`);
    }
    if (!same(f, a.operand.operand)) {
      throw new RuleError(`a conclusão deveria ser ${fmt(a.operand.operand)}`);
    }
  },

  "⊥e": (c, [r]) => {
    const a = getLine(c, r);
    if (!isBottom(a)) throw new RuleError(`a linha ${r} (${fmt(a)}) deve ser ⊥`);
  },

  raa: (c, [r], f) => {
    const b = getBox(c, r);
    needHyp(b);
    if (!isBottom(b.concl)) {
      throw new RuleError(`a caixa ${r} deve terminar em ⊥ (termina em ${fmt(b.concl)})`);
    }
    if (b.hyp.type !== "Not") {
      throw new RuleError(`a hipótese da caixa (${fmt(b.hyp)}) deve ser da forma ¬φ`);
    }
    if (!same(f, b.hyp.operand)) throw new RuleError(`a conclusão deveria ser ${fmt(b.hyp.operand)}`);
  },

  ltm: (c, refs, f) => {
    const ok = f.type === "Or" && (same(f.right, neg(f.left)) || same(f.left, neg(f.right)));
    if (!ok) throw new RuleError(`a fórmula deve ter a forma φ ∨ ¬φ`);
  },

  copie: (c, [r], f) => {
    const a = getLine(c, r);
    if (!same(f, a)) throw new RuleError(`${fmt(f)} é diferente de ${fmt(a)} (linha ${r})`);
  },

  /* ----- predicados ----- */

  "∀e": (c, [r], f) => {
    const a = getLine(c, r);
    if (a.type !== "Quantifier" || a.quantifier !== "forall") {
      throw new RuleError(`a linha ${r} (${fmt(a)}) não começa com ∀`);
    }
    const st = { term: null };
    if (!match(a.body, f, a.variable, st, false)) {
      throw new RuleError(
        `${fmt(f)} não é ${fmt(a.body)} com ${a.variable} trocado por um termo`
      );
    }
    checkNoCapture(a.body, a.variable, st.term, a);
  },

  "∃i": (c, [r], f) => {
    const a = getLine(c, r);
    if (f.type !== "Quantifier" || f.quantifier !== "exists") {
      throw new RuleError(`a conclusão deve começar com ∃`);
    }
    const st = { term: null };
    if (!match(f.body, a, f.variable, st, false)) {
      throw new RuleError(
        `${fmt(a)} (linha ${r}) não é ${fmt(f.body)} com ${f.variable} trocado por um termo`
      );
    }
    checkNoCapture(f.body, f.variable, st.term, f);
  },

  "∀i": (c, [r], f) => {
    const b = getBox(c, r);
    if (b.hyp) {
      throw new RuleError(
        `a caixa ${r} deve começar só com um nome novo (ex.: a ou x0), sem hipótese`
      );
    }
    if (f.type !== "Quantifier" || f.quantifier !== "forall") {
      throw new RuleError(`a conclusão deve começar com ∀`);
    }
    const st = { term: null };
    if (!match(f.body, b.concl, f.variable, st, false)) {
      throw new RuleError(
        `a caixa termina em ${fmt(b.concl)}, que não é ${fmt(f.body)} com ${f.variable} trocado por ${b.fresh}`
      );
    }
    if (
      st.term &&
      !((st.term.type === "Constant" || st.term.type === "Variable") && st.term.name === b.fresh)
    ) {
      throw new RuleError(`${f.variable} deveria ser trocado pelo nome novo ${b.fresh}`);
    }
    const bad = freshnessError(c, b, b.fresh, [["a conclusão", f]]);
    if (bad) throw new RuleError(bad);
  },

  "∃e": (c, refs, f) => {
    const nums = refs.filter((r) => typeof r === "number");
    const boxes = refs.filter((r) => typeof r === "string");
    if (nums.length !== 1 || boxes.length !== 1) {
      throw new RuleError(`precisa de uma fórmula ∃ e uma caixa (ex.: 2, 3-5)`);
    }
    const d = getLine(c, nums[0]);
    if (d.type !== "Quantifier" || d.quantifier !== "exists") {
      throw new RuleError(`a linha ${nums[0]} (${fmt(d)}) não começa com ∃`);
    }
    const b = getBox(c, boxes[0]);
    needHyp(b);

    const st = { term: null };
    if (!match(d.body, b.hyp, d.variable, st, false)) {
      throw new RuleError(
        `a hipótese da caixa (${fmt(b.hyp)}) deveria ser ${fmt(d.body)} com ${d.variable} trocado por um nome novo`
      );
    }
    if (st.term && st.term.type === "FunctionApplication") {
      throw new RuleError(
        `${d.variable} deve ser trocado por um nome novo (ex.: a ou x0), não por ${fmtTerm(st.term)}`
      );
    }
    if (st.term && b.fresh && st.term.name !== b.fresh) {
      throw new RuleError(`a caixa declara ${b.fresh}, mas a hipótese usa ${st.term.name}`);
    }
    if (!same(b.concl, f)) {
      throw new RuleError(`a caixa deveria terminar em ${fmt(f)}, mas termina em ${fmt(b.concl)}`);
    }

    const name = st.term ? st.term.name : b.fresh;
    if (name) {
      const bad = freshnessError(c, b, name, [
        [`${fmt(d)} (linha ${nums[0]})`, d],
        ["a conclusão", f],
      ]);
      if (bad) throw new RuleError(bad);
    }
  },
};

// Quantas referências cada regra exige (caixa conta como uma). LTM: livre.
const EXPECTED_REFS = {
  "∧i": 2, "∧e": 1, "∨i": 1, "∨e": 3, "→i": 1, "→e": 2,
  "¬i": 1, "¬e": 2, "¬¬i": 1, "¬¬e": 1, "⊥e": 1, raa: 1, copie: 1,
  "∀e": 1, "∃i": 1, "∀i": 1, "∃e": 2,
};

// LTE (Lei do Terceiro Excluído) e LTM são a mesma regra.
RULES.lte = RULES.ltm;

const LABEL = { raa: "RAA", ltm: "LTM", lte: "LTE" };

/* ---------- API ---------- */

export function checkProof(rawLines) {
  const lines = (rawLines || []).map((l) => ({
    ...l,
    boxScopes: l.boxScopes || [],
    references: l.references || [],
  }));

  const byId = new Map(lines.map((l) => [l.id, l]));
  const info = new Map();
  const result = {};

  // 1ª fase: nomes declarados nos cabeçalhos de caixa ("nome: ...")
  const declName = new Map();
  for (const l of lines) {
    const r = normRule(l.rule);
    if (r !== "hipótese" && r !== "constante") continue;
    const h = parseHeader((l.formula || "").trim());
    if (h) declName.set(l.id, h.name);
  }

  // 2ª fase: lê cada linha sabendo quais nomes valem como constante nela
  for (const l of lines) {
    const names = l.boxScopes.map((s) => declName.get(s)).filter(Boolean);
    const parsed = parseLine(l, names);
    info.set(l.id, parsed);
    if (parsed.error) result[l.id] = { formula: parsed.error };
  }

  for (const cur of lines) {
    const f = info.get(cur.id)?.ast;
    if (!f) continue;

    // Normaliza: linhas recarregadas do storage vêm em maiúsculas ("∧I").
    const key = normRule(cur.rule);
    const rule = RULES[key];
    if (!rule) continue; // premissa, hipótese, sem regra

    try {
      const expected = EXPECTED_REFS[key];
      if (expected !== undefined && cur.references.length !== expected) {
        throw new RuleError(`precisa de ${expected} referência(s), mas há ${cur.references.length}`);
      }
      rule({ cur, byId, info, lines }, cur.references, f);
    } catch (e) {
      if (e instanceof RuleError) {
        result[cur.id] = { ...result[cur.id], rule: `${LABEL[key] || key}: ${e.message}` };
      } else if (!(e instanceof Skip)) {
        console.error("Erro inesperado no verificador:", e);
      }
    }
  }

  return result;
}