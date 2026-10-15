import { describe, it, expect } from "vitest";
import {
  parseFormula,
  freeVariables,
  collectSymbols,
  formatFormula,
  describeAst,
  LogicSyntaxError,
} from "./folParser";
import { tokenize } from "./folLexer";

const C = (name) => ({ type: "Constant", name });
const V = (name, bound = false) => ({ type: "Variable", name, bound });
const Pred = (name, ...args) => ({ type: "Predicate", name, args, arity: args.length });
const Fn = (name, ...args) => ({ type: "FunctionApplication", name, args, arity: args.length });

describe("exemplos obrigatórios", () => {
  it("P(a) -> predicado com constante", () => {
    const ast = parseFormula("P(a)");
    expect(ast).toEqual(Pred("P", C("a")));
    expect(describeAst(ast)).toBe("Predicado(P, [Constante(a)])");
  });

  it("P(x) -> predicado com variável livre", () => {
    const ast = parseFormula("P(x)");
    expect(ast).toEqual(Pred("P", V("x", false)));
    expect(describeAst(ast)).toBe("Predicado(P, [Variavel(x)])");
    expect([...freeVariables(ast)]).toEqual(["x"]);
  });

  it("∀x P(x) -> variável ligada", () => {
    const ast = parseFormula("∀x P(x)");
    expect(ast).toEqual({
      type: "Quantifier",
      quantifier: "forall",
      variable: "x",
      body: Pred("P", V("x", true)),
    });
    expect(freeVariables(ast).size).toBe(0);
  });

  it("∀x (P(x) → Q(f(x))) -> função dentro do predicado", () => {
    const ast = parseFormula("∀x (P(x) → Q(f(x)))");
    expect(ast).toEqual({
      type: "Quantifier",
      quantifier: "forall",
      variable: "x",
      body: {
        type: "Implies",
        left: Pred("P", V("x", true)),
        right: Pred("Q", Fn("f", V("x", true))),
      },
    });
  });

  it("P(a, b) ∧ Q(c) -> múltiplos predicados e constantes", () => {
    expect(parseFormula("P(a, b) ∧ Q(c)")).toEqual({
      type: "And",
      left: Pred("P", C("a"), C("b")),
      right: Pred("Q", C("c")),
    });
  });

  it("∃y R(y, a) -> mistura de variável e constante", () => {
    expect(parseFormula("∃y R(y, a)")).toEqual({
      type: "Quantifier",
      quantifier: "exists",
      variable: "y",
      body: Pred("R", V("y", true), C("a")),
    });
  });
});

describe("compatibilidade com a lógica proposicional", () => {
  it("P sem parênteses é predicado de aridade 0", () => {
    expect(parseFormula("P")).toEqual(Pred("P"));
  });

  it("¬P ∧ Q, ⊥ e ↔", () => {
    expect(parseFormula("¬P ∧ Q")).toEqual({
      type: "And",
      left: { type: "Not", operand: Pred("P") },
      right: Pred("Q"),
    });
    expect(parseFormula("⊥")).toEqual({ type: "Bottom" });
    expect(parseFormula("P ↔ Q").type).toBe("Iff");
  });

  it("espaços extras são ignorados", () => {
    expect(parseFormula("  P (  a ,b )  ")).toEqual(parseFormula("P(a,b)"));
  });
});

describe("precedência e associatividade", () => {
  it("∧ liga mais forte que ∨", () => {
    const ast = parseFormula("P ∨ Q ∧ R");
    expect(ast.type).toBe("Or");
    expect(ast.right.type).toBe("And");
  });

  it("→ é associativa à direita", () => {
    const ast = parseFormula("P → Q → R");
    expect(ast.type).toBe("Implies");
    expect(ast.right.type).toBe("Implies");
  });

  it("quantificador liga forte: ∀x P(x) → Q(a) == (∀x P(x)) → Q(a)", () => {
    const ast = parseFormula("∀x P(x) → Q(a)");
    expect(ast.type).toBe("Implies");
    expect(ast.left.type).toBe("Quantifier");
  });

  it("variável fora do escopo do quantificador continua livre", () => {
    const ast = parseFormula("∀x P(x) ∧ Q(x)");
    expect(ast.left.body.args[0].bound).toBe(true);
    expect(ast.right.args[0].bound).toBe(false);
    expect([...freeVariables(ast)]).toEqual(["x"]);
  });
});

describe("ASCII equivale a Unicode", () => {
  it("forall / -> / & / ~ / exists / | / <->", () => {
    expect(parseFormula("forall x (P(x) -> Q(f(x)))")).toEqual(
      parseFormula("∀x (P(x) → Q(f(x)))")
    );
    expect(parseFormula("~P & Q | R <-> S")).toEqual(parseFormula("¬P ∧ Q ∨ R ↔ S"));
    expect(parseFormula("exists y R(y, a)")).toEqual(parseFormula("∃y R(y, a)"));
  });
});

describe("constantes livres", () => {
  it("qualquer minúscula fora de variáveis/funções é constante (H(s), P(k), P(m))", () => {
    expect(parseFormula("H(s)")).toEqual(Pred("H", C("s")));
    expect(parseFormula("P(k)")).toEqual(Pred("P", C("k")));
    expect(parseFormula("R(m, p)")).toEqual(Pred("R", C("m"), C("p")));
  });

  it("exemplo clássico: ∀x(H(x) → M(x)), H(s)", () => {
    const ast = parseFormula("∀x(H(x) → M(x))");
    expect(ast.body.left).toEqual(Pred("H", V("x", true)));
    expect(parseFormula("H(s)").args[0].type).toBe("Constant");
  });

  it("nomes com dígito: constantes c1, k2 e x0/x₀ (letra de variável + dígito)", () => {
    expect(parseFormula("P(c1, k2)")).toEqual(Pred("P", C("c1"), C("k2")));
    expect(parseFormula("P(x0)")).toEqual(Pred("P", V("x0")));
    expect(parseFormula("P(x₀)")).toEqual(Pred("P", V("x₀")));
  });

  it("u–z continuam sendo variáveis e f,g,h funções", () => {
    expect(parseFormula("P(x)").args[0].type).toBe("Variable");
    expect(parseFormula("P(f(s))").args[0].type).toBe("FunctionApplication");
  });

  it("quantificar uma constante continua sendo erro", () => {
    expect(() => parseFormula("∀s H(s)")).toThrow(/Esperava uma variável.*constante 's'/);
  });
});

describe("lexer", () => {
  it("classifica cada símbolo pela convenção", () => {
    const types = tokenize("P(a, x, f(b))").map((t) => t.type);
    expect(types).toEqual([
      "PRED", "LPAREN", "CONST", "COMMA", "VAR", "COMMA",
      "FUNC", "LPAREN", "CONST", "RPAREN", "RPAREN", "EOF",
    ]);
  });

  it("aceita sufixo numérico (x1, a2, P3)", () => {
    expect(parseFormula("P3(x1, a2)")).toEqual(Pred("P3", V("x1"), C("a2")));
  });
});

describe("aridade", () => {
  it("predicado com aridades diferentes na mesma fórmula", () => {
    expect(() => parseFormula("P(a, b) ∧ P(c)")).toThrow(/Aridade inválida.*'P'.*2.*1/);
  });

  it("função com aridades diferentes", () => {
    expect(() => parseFormula("Q(f(a), f(a, b))")).toThrow(/Aridade inválida.*'f'/);
  });

  it("assinatura pré-declarada é respeitada", () => {
    expect(() => parseFormula("P(a)", { signature: { predicates: { P: 2 } } })).toThrow(
      /espera 2/
    );
    expect(parseFormula("P(a, b)", { signature: { predicates: { P: 2 } } })).toBeTruthy();
  });

  it("collectSymbols devolve o inventário", () => {
    const s = collectSymbols(parseFormula("∀x (P(x, a) → Q(f(x)))"));
    expect(s.predicates).toEqual({ P: 2, Q: 1 });
    expect(s.functions).toEqual({ f: 1 });
    expect([...s.constants]).toEqual(["a"]);
    expect([...s.variables]).toEqual(["x"]);
  });
});

describe("erros claros", () => {
  const bad = (input, pattern) => {
    expect(() => parseFormula(input)).toThrow(LogicSyntaxError);
    expect(() => parseFormula(input)).toThrow(pattern);
  };

  it('"P(a," -> esperava um termo', () => bad("P(a,", /Esperava um termo após ','.*fim da fórmula/));
  it('"P(a"  -> parêntese não fechado', () => bad("P(a", /não foi fechado/));
  it('"∀P"   -> falta variável', () => bad("∀P", /Esperava uma variável.*∀.*predicado 'P'/));
  it('"∀"    -> falta variável (fim)', () => bad("∀", /Esperava uma variável.*terminou/));
  it('"∀x"   -> falta corpo', () => bad("∀x", /esperava uma fórmula após ∀x/));
  it('"∀a P(a)" -> constante não liga', () => bad("∀a P(a)", /constante 'a'/));
  it('"P()"   -> parênteses vazios', () => bad("P()", /parênteses vazios/));
  it('"P(a))" -> ) sobrando', () => bad("P(a))", /sem '\(' correspondente/));
  it('"P(a) Q(b)" -> falta conectivo', () => bad("P(a) Q(b)", /Esperava um conectivo/));
  it('"P(a) ∧" -> falta operando', () => bad("P(a) ∧", /esperava uma fórmula após ∧/));
  it('"a"    -> termo solto', () => bad("a", /Termos só podem aparecer/));
  it('"P(f)"  -> função sem argumentos', () => bad("P(f)", /precisa de argumentos/));
  it('"P(a(x))" -> constante com argumentos', () => bad("P(a(x))", /constante e não aceita/));
  it('"P(Q(a))" -> predicado como termo', () => bad("P(Q(a))", /não pode ser usado como termo/));
  it('"P(k)"  -> letra fora das categorias (só com constantes restritas)', () => {
    expect(() => parseFormula("P(k)", { conventions: { constants: "abcde" } })).toThrow(
      /não pertence a nenhuma categoria/
    );
  });
  it('"P(@)"  -> caractere inválido', () => bad("P(@)", /Caractere inválido '@'/));
  it('""      -> vazia', () => bad("   ", /vazia/));

  it("o erro informa a posição (0-based em .position)", () => {
    try {
      parseFormula("P(a) Q(b)");
    } catch (e) {
      expect(e.position).toBe(5);
      expect(e.message).toMatch(/posição 6/);
    }
  });
});

describe("conventions customizadas", () => {
  it("permite mover letras entre categorias", () => {
    const ast = parseFormula("P(k)", { conventions: { constants: "abcdek" } });
    expect(ast).toEqual(Pred("P", C("k")));
  });

  it("rejeita convenções com letras repetidas", () => {
    expect(() =>
      parseFormula("P(a)", { conventions: { constants: "abcde", variables: "uvwxyza" } })
    ).toThrow(/Convenção inválida/);
    expect(() =>
      parseFormula("P(a)", { conventions: { variables: "uvwxyzf" } })
    ).toThrow(/Convenção inválida/);
  });
});

describe("formatFormula (ida e volta)", () => {
  it.each([
    "P(a)",
    "P(x)",
    "∀x P(x)",
    "∀x (P(x) → Q(f(x)))",
    "P(a, b) ∧ Q(c)",
    "∃y R(y, a)",
    "¬∀x P(x) ∨ ⊥",
    "∀x (P(x) ↔ ∃y R(x, g(y, a)))",
  ])("%s", (src) => {
    const ast = parseFormula(src);
    expect(parseFormula(formatFormula(ast))).toEqual(ast);
  });
});