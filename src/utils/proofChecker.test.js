import { describe, it, expect } from "vitest";
import { checkProof } from "./proofChecker";

// L(id, fórmula, regra, referências, caixas em que a linha está)
const L = (id, formula, rule, references = [], boxScopes = []) => ({
  id, formula, rule, references, boxScopes,
});

describe("provas corretas não geram erro", () => {
  it("∧i e ∧e (ordem livre)", () => {
    const r = checkProof([
      L(1, "P ∧ Q", "PREMISSA"),
      L(2, "P", "∧e", [1]),
      L(3, "Q", "∧e", [1]),
      L(4, "Q ∧ P", "∧i", [2, 3]),
    ]);
    expect(r).toEqual({});
  });

  it("→i com caixa e →e", () => {
    const r = checkProof([
      L(1, "P → Q", "PREMISSA"),
      L(2, "Q → R", "PREMISSA"),
      L(3, "P", "HIPÓTESE", [], [3]),
      L(4, "Q", "→e", [1, 3], [3]),
      L(5, "R", "→e", [2, 4], [3]),
      L(6, "P → R", "→i", ["3-5"]),
    ]);
    expect(r).toEqual({});
  });

  it("∨i e ∨e", () => {
    const r = checkProof([
      L(1, "P ∨ Q", "PREMISSA"),
      L(2, "P", "HIPÓTESE", [], [2]),
      L(3, "Q ∨ P", "∨i", [2], [2]),
      L(4, "Q", "HIPÓTESE", [], [4]),
      L(5, "Q ∨ P", "∨i", [4], [4]),
      L(6, "Q ∨ P", "∨e", [1, "2-3", "4-5"]),
    ]);
    expect(r).toEqual({});
  });

  it("¬e, ¬i", () => {
    const r = checkProof([
      L(1, "P → Q", "PREMISSA"),
      L(2, "¬Q", "PREMISSA"),
      L(3, "P", "HIPÓTESE", [], [3]),
      L(4, "Q", "→e", [1, 3], [3]),
      L(5, "⊥", "¬e", [2, 4], [3]),
      L(6, "¬P", "¬i", ["3-5"]),
    ]);
    expect(r).toEqual({});
  });

  it("RAA, ¬¬e, ¬¬i, ⊥e, LTM, copie", () => {
    const r = checkProof([
      L(1, "¬¬P", "PREMISSA"),
      L(2, "¬P", "HIPÓTESE", [], [2]),
      L(3, "⊥", "¬e", [1, 2], [2]),
      L(4, "P", "RAA", ["2-3"]),
      L(5, "P", "¬¬e", [1]),
      L(6, "¬¬P", "¬¬i", [5]),
      L(7, "P", "copie", [5]),
      L(8, "P ∨ ¬P", "LTM"),
    ]);
    expect(r).toEqual({});
  });

  it("⊥e (do absurdo qualquer coisa)", () => {
    const r = checkProof([
      L(1, "⊥", "PREMISSA"),
      L(2, "Q ∧ R", "⊥e", [1]),
    ]);
    expect(r).toEqual({});
  });

  it("regras recarregadas em maiúsculas (∧I, RAA, COPIE) funcionam", () => {
    const r = checkProof([
      L(1, "P ∧ Q", "PREMISSA"),
      L(2, "P", "∧E", [1]),
      L(3, "P", "COPIE", [2]),
    ]);
    expect(r).toEqual({});
  });
});

describe("erros de regra", () => {
  it("∧e com conclusão que não é um lado", () => {
    const r = checkProof([L(1, "P ∧ Q", "PREMISSA"), L(2, "R", "∧e", [1])]);
    expect(r[2].rule).toMatch(/^∧e: R não é um dos lados de P ∧ Q/);
    expect(r[1]).toBeUndefined();
  });

  it("quantidade de referências errada", () => {
    const r = checkProof([L(1, "P", "PREMISSA"), L(2, "P ∧ P", "∧i", [1])]);
    expect(r[2].rule).toMatch(/precisa de 2 referência/);
  });

  it("referência para linha futura ou inexistente", () => {
    const r = checkProof([L(1, "P", "copie", [2]), L(2, "P", "PREMISSA"), L(3, "P", "copie", [9])]);
    expect(r[1].rule).toMatch(/só dá para usar linhas anteriores/);
    expect(r[3].rule).toMatch(/não existe/);
  });

  it("linha dentro de caixa fechada não pode ser usada fora dela", () => {
    const r = checkProof([
      L(1, "P", "HIPÓTESE", [], [1]),
      L(2, "P", "copie", [1], [1]),
      L(3, "P → P", "→i", ["1-2"]),
      L(4, "P", "copie", [2]), // 2 está dentro da caixa 1-2
    ]);
    expect(r[3]).toBeUndefined();
    expect(r[4].rule).toMatch(/caixa já fechada/);
  });

  it("caixa ainda aberta, hipótese falsa e fim errado", () => {
    const r = checkProof([
      L(1, "P", "PREMISSA"),
      L(2, "Q", "HIPÓTESE", [], [2]),
      L(3, "R", "PREMISSA", [], [2]),
      L(4, "Q → R", "→i", ["2-3"], [2]), // ainda dentro da caixa 2
      L(5, "Q → R", "→i", ["1-3"]), // 1 não é hipótese
      L(6, "Q → Q", "→i", ["2-2"]), // a caixa 2 termina na 4
    ]);
    expect(r[4].rule).toMatch(/ainda está aberta/);
    expect(r[5].rule).toMatch(/não é uma hipótese/);
    expect(r[6].rule).toMatch(/termina na linha 4/);
  });

  it("→e com linhas que não combinam", () => {
    const r = checkProof([
      L(1, "P", "PREMISSA"),
      L(2, "Q", "PREMISSA"),
      L(3, "R", "→e", [1, 2]),
    ]);
    expect(r[3].rule).toMatch(/nenhuma das linhas 1 e 2 é uma implicação/);
  });

  it("→i com conclusão diferente da caixa", () => {
    const r = checkProof([
      L(1, "P", "HIPÓTESE", [], [1]),
      L(2, "P", "copie", [1], [1]),
      L(3, "P → Q", "→i", ["1-2"]),
    ]);
    expect(r[3].rule).toMatch(/leva a P → P, mas a linha tem P → Q/);
  });

  it("¬i com caixa que não termina em ⊥", () => {
    const r = checkProof([
      L(1, "P", "HIPÓTESE", [], [1]),
      L(2, "¬P", "¬i", ["1-1"]),
    ]);
    expect(r[2].rule).toMatch(/deve terminar em ⊥/);
  });

  it("LTE é aceita como a mesma regra do LTM", () => {
    expect(checkProof([L(1, "P ∨ ¬P", "LTE")])).toEqual({});
    expect(checkProof([L(1, "P ∨ Q", "LTE")])[1].rule).toMatch(/^LTE: /);
  });

  it("LTM com fórmula errada", () => {
    const r = checkProof([L(1, "P ∨ Q", "LTM")]);
    expect(r[1].rule).toMatch(/φ ∨ ¬φ/);
  });

  it("copie com fórmula diferente", () => {
    const r = checkProof([L(1, "P", "PREMISSA"), L(2, "Q", "copie", [1])]);
    expect(r[2].rule).toMatch(/Q é diferente de P/);
  });

  it("∨e mal formado", () => {
    const r = checkProof([
      L(1, "P ∨ Q", "PREMISSA"),
      L(2, "P", "HIPÓTESE", [], [2]),
      L(3, "R", "PREMISSA", [], [2]),
      L(4, "P", "HIPÓTESE", [], [4]),
      L(5, "R", "PREMISSA", [], [4]),
      L(6, "R", "∨e", [1, "2-3", "4-5"]),
    ]);
    expect(r[6].rule).toMatch(/hipóteses das caixas deveriam ser P e Q/);
  });
});

describe("erros de sintaxe e casos que não devem ser marcados", () => {
  it("fórmula inválida vira erro de fórmula", () => {
    const r = checkProof([L(1, "P(a,", "PREMISSA")]);
    expect(r[1].formula).toMatch(/Esperava um termo/);
    expect(r[1].rule).toBeUndefined();
  });

  it("linha que depende de fórmula inválida não é marcada (só a inválida)", () => {
    const r = checkProof([L(1, "P ∧", "PREMISSA"), L(2, "P", "∧e", [1])]);
    expect(r[1].formula).toBeDefined();
    expect(r[2]).toBeUndefined();
  });

  it("linhas vazias e sem regra não são marcadas", () => {
    const r = checkProof([L(1, "", "PREMISSA"), L(2, "P(a)", "")]);
    expect(r).toEqual({});
  });
});

describe("predicados: ∀e, ∃i", () => {
  it("instanciação e generalização existencial corretas", () => {
    const r = checkProof([
      L(1, "∀x P(x)", "PREMISSA"),
      L(2, "P(a)", "∀e", [1]),
      L(3, "P(f(a))", "∀e", [1]),
      L(4, "∃x P(x)", "∃i", [2]),
    ]);
    expect(r).toEqual({});
  });

  it("∀e com conclusão que não é instância", () => {
    const r = checkProof([L(1, "∀x Q(x)", "PREMISSA"), L(2, "P(a)", "∀e", [1])]);
    expect(r[2].rule).toMatch(/não é Q\(x\) com x trocado/);
  });

  it("∀e que deixaria a variável presa", () => {
    const r = checkProof([
      L(1, "∀x ∃y R(x, y)", "PREMISSA"),
      L(2, "∃y R(y, y)", "∀e", [1]),
    ]);
    expect(r[2].rule).toMatch(/ficaria preso/);
  });

  it("∀e com linha que não é ∀", () => {
    const r = checkProof([L(1, "P(a)", "PREMISSA"), L(2, "P(a)", "∀e", [1])]);
    expect(r[2].rule).toMatch(/não começa com ∀/);
  });
});

describe("predicados: caixas de ∃e e ∀i", () => {
  // Prova do exemplo: ∀x P(x) ⊢ ¬∃x ¬P(x)
  const exemplo = (hip3) => [
    L(1, "∀x P(x)", "PREMISSA"),
    L(2, "∃x ¬P(x)", "HIPÓTESE", [], [2]),
    L(3, hip3, "HIPÓTESE", [], [2, 3]),
    L(4, "P(a)", "∀e", [1], [2, 3]),
    L(5, "⊥", "¬e", [3, 4], [2, 3]),
    L(6, "⊥", "∃e", [2, "3-5"], [2]),
    L(7, "¬∃x ¬P(x)", "¬i", ["2-6"]),
  ];

  it("exemplo válido (constante nova deduzida da hipótese)", () => {
    expect(checkProof(exemplo("¬P(a)"))).toEqual({});
  });

  it("exemplo válido (constante declarada: 'a ¬P(a)')", () => {
    expect(checkProof(exemplo("a ¬P(a)"))).toEqual({});
  });

  it("declaração diferente da hipótese", () => {
    const r = checkProof(exemplo("b ¬P(a)"));
    expect(r[6].rule).toMatch(/declara b, mas a hipótese usa a/);
  });

  it("∃e com a caixa terminando em outra fórmula", () => {
    const l = exemplo("¬P(a)");
    l[5] = L(6, "Q", "∃e", [2, "3-5"], [2]);
    l[6] = L(7, "¬∃x ¬P(x)", "¬i", ["2-6"]);
    const r = checkProof(l);
    expect(r[6].rule).toMatch(/deveria terminar em Q/);
  });

  it("∃e com constante que não é nova", () => {
    const r = checkProof([
      L(1, "∃x P(x)", "PREMISSA"),
      L(2, "P(a)", "HIPÓTESE", [], [2]),
      L(3, "P(a)", "copie", [2], [2]),
      L(4, "P(a)", "∃e", [1, "2-3"]), // a aparece na conclusão
    ]);
    expect(r[4].rule).toMatch(/o nome a deveria ser novo, mas aparece em a conclusão/);
  });

  it("∃e com constante já usada numa linha anterior", () => {
    const r = checkProof([
      L(1, "∃x P(x)", "PREMISSA"),
      L(2, "Q(a)", "PREMISSA"),
      L(3, "P(a)", "HIPÓTESE", [], [3]),
      L(4, "⊥", "PREMISSA", [], [3]),
      L(5, "⊥", "∃e", [1, "3-4"]),
    ]);
    expect(r[5].rule).toMatch(/já aparece na linha 2/);
  });

  it("∃e com referências faltando", () => {
    const r = checkProof([L(1, "∃x P(x)", "PREMISSA"), L(2, "⊥", "∃e", [1])]);
    expect(r[2].rule).toMatch(/precisa de 2 referência/);
  });

  // ∀x (P(x) → Q(x)), ∀x P(x) ⊢ ∀x Q(x)
  const provaForallI = (decl, conc = "∀x Q(x)") => [
    L(1, "∀x (P(x) → Q(x))", "PREMISSA"),
    L(2, "∀x P(x)", "PREMISSA"),
    L(3, decl, "HIPÓTESE", [], [3]),
    L(4, "P(a)", "∀e", [2], [3]),
    L(5, "P(a) → Q(a)", "∀e", [1], [3]),
    L(6, "Q(a)", "→e", [4, 5], [3]),
    L(7, conc, "∀i", ["3-6"]),
  ];

  it("∀i válido: caixa só com a constante nova", () => {
    expect(checkProof(provaForallI("a"))).toEqual({});
  });

  it("∀i com a conclusão errada", () => {
    const r = checkProof(provaForallI("a", "∀x P(x)"));
    expect(r[7].rule).toMatch(/∀i: a caixa termina em Q\(a\)/);
  });

  it("∀i com caixa que tem hipótese", () => {
    const r = checkProof(provaForallI("a P(a)"));
    expect(r[7].rule).toMatch(/sem hipótese/);
  });

  it("∀i com constante que já aparece fora da caixa", () => {
    const r = checkProof([
      L(1, "Q(a)", "PREMISSA"),
      L(2, "a", "HIPÓTESE", [], [2]),
      L(3, "Q(a)", "copie", [1], [2]),
      L(4, "∀x Q(x)", "∀i", ["2-3"]),
    ]);
    expect(r[4].rule).toMatch(/já aparece na linha 1/);
  });

  it("caixa só com constante usada em →i", () => {
    const r = checkProof([
      L(1, "a", "HIPÓTESE", [], [1]),
      L(2, "P(a)", "PREMISSA", [], [1]),
      L(3, "P(a) → P(a)", "→i", ["1-2"]),
    ]);
    expect(r[3].rule).toMatch(/começa só com o nome novo a/);
  });

  it("silogismo clássico com constante s (Sócrates), sem a–e", () => {
    const r = checkProof([
      L(1, "∀x(H(x) → M(x))", "PREMISSA"),
      L(2, "H(s)", "PREMISSA"),
      L(3, "H(s) → M(s)", "∀e", [1]),
      L(4, "M(s)", "→e", [2, 3]),
      L(5, "∃x M(x)", "∃i", [4]),
    ]);
    expect(r).toEqual({});
  });

  it("∀i com nome novo x0 (estilo de livro): declaração 'x0'", () => {
    const r = checkProof([
      L(1, "∀x (P(x) → Q(x))", "PREMISSA"),
      L(2, "∀x P(x)", "PREMISSA"),
      L(3, "x0", "HIPÓTESE", [], [3]),
      L(4, "P(x0)", "∀e", [2], [3]),
      L(5, "P(x0) → Q(x0)", "∀e", [1], [3]),
      L(6, "Q(x0)", "→e", [4, 5], [3]),
      L(7, "∀x Q(x)", "∀i", ["3-6"]),
    ]);
    expect(r).toEqual({});
  });

  it("∃e com x0 (declarado ou deduzido) e subscrito x₀", () => {
    const base = (hip) => [
      L(1, "∃x P(x)", "PREMISSA"),
      L(2, hip, "HIPÓTESE", [], [2]),
      L(3, "∃x P(x)", "∃i", [2], [2]),
      L(4, "∃x P(x)", "∃e", [1, "2-3"]),
    ];
    expect(checkProof(base("P(x0)"))).toEqual({});
    expect(checkProof(base("x0 P(x0)"))).toEqual({});
    expect(checkProof(base("x₀ P(x₀)"))).toEqual({});
  });

  it("nome novo x0 que já aparece fora da caixa é rejeitado", () => {
    const r = checkProof([
      L(1, "Q(x0)", "PREMISSA"),
      L(2, "x0", "HIPÓTESE", [], [2]),
      L(3, "Q(x0)", "copie", [1], [2]),
      L(4, "∀x Q(x)", "∀i", ["2-3"]),
    ]);
    expect(r[4].rule).toMatch(/o nome x0 deveria ser novo.*linha 1/);
  });

  it("linha CONSTANTE (botão Const.): ∀i da foto 1", () => {
    const r = checkProof([
      L(1, "∀x(H(x) → M(x))", "PREMISSA"),
      L(2, "∀x H(x)", "PREMISSA"),
      L(3, "a", "CONSTANTE", [], [3]),
      L(4, "H(a) → M(a)", "∀e", [1], [3]),
      L(5, "H(a)", "∀e", [2], [3]),
      L(6, "M(a)", "→e", [4, 5], [3]),
      L(7, "∀x M(x)", "∀i", ["3-6"]),
    ]);
    expect(r).toEqual({});
  });

  it("CONSTANTE com x0 e x₀", () => {
    for (const nome of ["x0", "x₀", "s"]) {
      const r = checkProof([
        L(1, "∀x P(x)", "PREMISSA"),
        L(2, nome, "CONSTANTE", [], [2]),
        L(3, `P(${nome})`, "∀e", [1], [2]),
        L(4, "∀y P(y)", "∀i", ["2-3"]),
      ]);
      expect(r).toEqual({});
    }
  });

  it("CONSTANTE com fórmula comum é erro de formato", () => {
    const r = checkProof([L(1, "P(a)", "CONSTANTE", [], [1])]);
    expect(r[1].formula).toMatch(/só o nome/);
  });

  it("CONSTANTE seguida de hipótese ('a H(a)') funciona no ∃e", () => {
    const r = checkProof([
      L(1, "∃x H(x)", "PREMISSA"),
      L(2, "a H(a)", "CONSTANTE", [], [2]),
      L(3, "∃x H(x)", "∃i", [2], [2]),
      L(4, "∃x H(x)", "∃e", [1, "2-3"]),
    ]);
    expect(r).toEqual({});
  });

  it("→i com caixa de CONSTANTE (sem hipótese) é rejeitado", () => {
    const r = checkProof([
      L(1, "a", "CONSTANTE", [], [1]),
      L(2, "P(a)", "PREMISSA", [], [1]),
      L(3, "P(a) → P(a)", "→i", ["1-2"]),
    ]);
    expect(r[3].rule).toMatch(/começa só com o nome novo a/);
  });

  it("formula inválida numa hipótese com constante declarada", () => {
    const r = checkProof([L(1, "a ∧", "HIPÓTESE", [], [1])]);
    expect(r[1].formula).toBeDefined();
  });
});