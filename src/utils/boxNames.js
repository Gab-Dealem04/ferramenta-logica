/* ==========================================================================
 * boxNames.js — Nome novo no cabeçalho de uma caixa:  "a: P(a)"
 *
 * Na linha que abre a caixa (botão de caixa ou Hipótese), tudo que vem ANTES dos
 * dois pontos é um termo (constante) novo, com qualquer nome (a, x0, socrates).
 * O que vem depois é a hipótese (pode ficar vazio, ex.: "a:" no ∀i).
 * O nome vale para a caixa inteira.
 * ========================================================================== */

// Caracteres permitidos num nome: letras (com acento), dígitos, subscritos, _ e '
export const NAME_CHARS = "\\p{L}\\p{N}_'";
const HEADER_RE = new RegExp(`^\\s*([${NAME_CHARS}]+)\\s*:(.*)$`, "su");

/** "a: P(a)" -> { name: "a", rest: " P(a)" } ; sem cabeçalho -> null */
export function parseHeader(text) {
  const m = HEADER_RE.exec(text || "");
  return m ? { name: m[1], rest: m[2] } : null;
}

// Largura (em "em" do KaTeX) da coluna do nome. A fórmula começa sempre
// exatamente depois dela, e as outras linhas da caixa recuam o mesmo tanto.
// Para deixar o espaço maior ou menor, mexa só nestas três constantes:
const MIN_GUTTER_EM = 1.4; // largura mínima da coluna (nomes de 1 letra)
const CHAR_EM = 0.55; // largura estimada de cada letra do nome
const SUBSCRIPT_EM = 0.35; // subscritos (x₀) são mais estreitos
const EXTRA_EM = 0.8; // dois pontos + um pequeno espaço antes da fórmula

export function gutterEm(name) {
  const width = [...name].reduce((sum, c) => sum + (/[₀-₉]/.test(c) ? SUBSCRIPT_EM : CHAR_EM), 0);
  return Math.round(Math.max(MIN_GUTTER_EM, width + EXTRA_EM) * 100) / 100;
}

// O KaTeX desenha o texto em 1.21em do tamanho da fonte do contêiner.
const KATEX_SCALE = 1.21;

// Largura da coluna do nome, em "em" do contêiner (mesma unidade do recuo das linhas)
export function headerColumnEm(name) {
  return Math.round(gutterEm(name) * KATEX_SCALE * 100) / 100;
}

const isOpenerRule = (rule) =>
  ["hipótese", "constante"].includes(String(rule || "").trim().toLowerCase());

/** Map id da linha que abre a caixa -> nome declarado no cabeçalho */
export function getDeclaredNames(lines) {
  const out = new Map();
  for (const l of lines || []) {
    if (!isOpenerRule(l.rule)) continue;
    const h = parseHeader((l.formula || "").trim());
    if (h) out.set(l.id, h.name);
  }
  return out;
}

/** Recuo (em "em" do contêiner) que uma linha recebe pelas caixas com nome em que está */
export function indentForScopes(scopes, declNames, exceptId = null) {
  let em = 0;
  for (const s of scopes || []) {
    if (s === exceptId) continue; // o próprio cabeçalho mostra o nome, não recua
    const name = declNames.get(s);
    if (name) em += headerColumnEm(name);
  }
  return Math.round(em * 100) / 100;
}