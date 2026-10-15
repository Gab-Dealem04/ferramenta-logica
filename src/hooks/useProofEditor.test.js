// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useProofEditor } from "./useProofEditor";
import { checkProof } from "../utils/proofChecker";

const mount = () => renderHook(() => useProofEditor({ id: 1, premissasIniciais: [], openBoxes: [], closedBoxes: [] }));
const type = (h, text) => { for (const ch of text) act(() => h.result.current.addSymbol(ch)); };
const rule = (h, r) => act(() => h.result.current.handleSelectRuleOrMode(r));
const click = (h, id) => act(() => { const l = h.result.current.lines.find((x) => x.id === id); h.result.current.handleLineClick(l, "formula"); });
const line = (h, formula, r) => { type(h, formula); rule(h, r); };

beforeEach(() => localStorage.clear());

describe("botão Const. abre a caixa", () => {
  it("digitar 'a' + Const. cria a linha, abre a caixa e NÃO abre o teclado numérico", () => {
    const h = mount();
    type(h, "a");
    rule(h, "CONSTANTE");
    const s = h.result.current;
    expect(s.isSelectingReferences).toBe(false);
    expect(s.activeKeyboard).toBe("main");
    expect(s.lines).toHaveLength(1);
    expect(s.lines[0]).toMatchObject({ id: 1, formula: "a", rule: "CONSTANTE", references: [], boxScopes: [1] });
    expect(s.openBoxes).toEqual([1]);
  });

  it("prova da foto 1 inteira (∀i com Const.) sem erros", () => {
    const h = mount();
    line(h, "∀x(H(x)→M(x))", "PREMISSA");
    line(h, "∀xH(x)", "PREMISSA");
    line(h, "a", "CONSTANTE");
    expect(h.result.current.openBoxes).toEqual([3]);

    // 4: H(a)→M(a)  ∀e 1
    type(h, "H(a)→M(a)"); rule(h, "∀e"); click(h, 1);
    expect(h.result.current.isSelectingReferences).toBe(true);
    act(() => h.result.current.finishSelection());
    // 5: H(a) ∀e 2
    type(h, "H(a)"); rule(h, "∀e"); click(h, 2); act(() => h.result.current.finishSelection());
    // 6: M(a) →e 4,5
    type(h, "M(a)"); rule(h, "→e"); click(h, 4); click(h, 5); act(() => h.result.current.finishSelection());

    act(() => h.result.current.handleCloseCurrentBox());
    // 7: ∀xM(x)  ∀i 3-6  (toque em 3 e depois 6)
    type(h, "∀xM(x)"); rule(h, "∀i"); click(h, 3); click(h, 6); act(() => h.result.current.finishSelection());

    const s = h.result.current;
    expect(s.lines.map((l) => [l.id, l.rule, l.references, l.boxScopes])).toEqual([
      [1, "PREMISSA", [], []],
      [2, "PREMISSA", [], []],
      [3, "CONSTANTE", [], [3]],
      [4, "∀e", [1], [3]],
      [5, "∀e", [2], [3]],
      [6, "→e", [4, 5], [3]],
      [7, "∀i", ["3-6"], []],
    ]);
    expect(checkProof(s.lines)).toEqual({});
  });

  it("∃e por toque: fórmula ∃, início e fim da caixa", () => {
    const h = mount();
    line(h, "∃xH(x)", "PREMISSA");
    line(h, "H(a)", "HIPÓTESE");
    type(h, "∃xH(x)"); rule(h, "∃i"); click(h, 2); act(() => h.result.current.finishSelection());
    act(() => h.result.current.handleCloseCurrentBox());
    type(h, "∃xH(x)"); rule(h, "∃e"); click(h, 1); click(h, 2); click(h, 3);
    expect(h.result.current.selectedReferences).toEqual([1, "2-3"]);
    act(() => h.result.current.finishSelection());
    expect(checkProof(h.result.current.lines)).toEqual({});
  });

  it("trocar a regra de uma linha existente para Const. cria a caixa; limpar remove", () => {
    const h = mount();
    line(h, "P", "PREMISSA");
    line(h, "a", "PREMISSA");
    click(h, 2);
    rule(h, "CONSTANTE");
    expect(h.result.current.lines[1].boxScopes).toEqual([2]);
    act(() => h.result.current.handleLineClick(h.result.current.lines[1], "rule"));
    act(() => h.result.current.handleClearRule());
    expect(h.result.current.lines[1].boxScopes).toEqual([]);
  });
});