import katex from "katex";
import "katex/dist/katex.min.css";
import { formatToLatex, getRuleLatex } from "./latexFormat";

const FORMAT_ID = "logic-lab/atividade";
const FORMAT_VERSION = 1;

/* ------------------------------------------------------------------ */
/* Utilitários                                                         */
/* ------------------------------------------------------------------ */

export function safeFileName(name, fallback = "atividade") {
  const cleaned = String(name || fallback)
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "_")
    .slice(0, 80);
  return cleaned || fallback;
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ------------------------------------------------------------------ */
/* JSON                                                                */
/* ------------------------------------------------------------------ */

export function exportActivityToJson(activity) {
  const payload = {
    formato: FORMAT_ID,
    versao: FORMAT_VERSION,
    exportadoEm: new Date().toISOString(),
    atividade: {
      title: activity.title,
      tipoDeducao: activity.tipoDeducao,
      temSubprovas: !!activity.temSubprovas,
      dataCriacao: activity.dataCriacao,
      ultimaModificacao: activity.ultimaModificacao,
      premissasIniciais: activity.premissasIniciais || [],
      openBoxes: activity.openBoxes || [],
      closedBoxes: activity.closedBoxes || [],
    },
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  downloadBlob(blob, `${safeFileName(activity.title)}.json`);
}

// Lê o texto de um arquivo JSON e devolve uma atividade nova, pronta para salvar.
export function parseImportedActivity(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("O arquivo não é um JSON válido.");
  }

  const src = data && data.atividade ? data.atividade : data;
  if (!src || !Array.isArray(src.premissasIniciais)) {
    throw new Error("Arquivo não reconhecido como uma atividade do Logic Lab.");
  }

  const lines = src.premissasIniciais.map((l, index) => ({
    id: Number.isFinite(l?.id) ? l.id : index + 1,
    formula: String(l?.formula ?? ""),
    rule: String(l?.rule ?? ""),
    references: Array.isArray(l?.references) ? l.references : [],
    boxScopes: Array.isArray(l?.boxScopes) ? l.boxScopes : [],
  }));

  const now = Date.now();
  return {
    id: now,
    title: String(src.title || "Atividade importada").slice(0, 120),
    tipoDeducao: src.tipoDeducao || "Lógica Proposicional",
    dataCriacao: now,
    ultimaModificacao: now,
    premissasIniciais: lines,
    openBoxes: Array.isArray(src.openBoxes) ? src.openBoxes : [],
    closedBoxes: Array.isArray(src.closedBoxes) ? src.closedBoxes : [],
    temSubprovas: !!src.temSubprovas,
  };
}

/* ------------------------------------------------------------------ */
/* Imagem (PNG) - folha A4 pautada                                     */
/* ------------------------------------------------------------------ */

const PAGE_W = 794; // A4 a 96 dpi
const PAGE_H = 1123;
const ROW_H = 48; // altura de cada linha da pauta
const HEADER_H = ROW_H * 3;
const MARGIN_X = 84; // posição da margem vermelha

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

// output: "html" evita o MathML escondido do KaTeX, que o html2canvas
// desenhava duplicado por cima da fórmula.
const tex = (latex) =>
  katex.renderToString(latex, { throwOnError: false, output: "html" });

function renderFormula(formula) {
  return formula ? tex(formatToLatex(formula)) : "";
}

function renderRule(line) {
  if (!line.rule) return "";
  const isSimple = line.rule === "PREMISSA" || line.rule === "HIPÓTESE";
  const name = isSimple ? esc(line.rule.toLowerCase()) : tex(getRuleLatex(line.rule));
  const refs =
    !isSimple && line.references && line.references.length > 0
      ? ` ${esc(line.references.join(", "))}`
      : "";
  return `<span style="color:#2563eb;font-size:18px;font-weight:600;white-space:nowrap">${name}${refs}</span>`;
}

// Caixas (hipóteses) aninhadas, como na tela
function wrapInBoxes(scopes, lineId, closedBoxes, inner, index = 0) {
  if (index >= scopes.length) return inner;

  const boxStartId = scopes[index];
  const isStart = lineId === boxStartId;
  const isClosedEnd = closedBoxes.some((b) => b.start === boxStartId && b.end === lineId);

  const style = [
    "display:flex",
    "align-items:center",
    "height:100%",
    "flex:1",
    "box-sizing:border-box",
    "padding:0 12px",
    "margin-left:6px",
    "background:rgba(219,234,254,.35)",
    "border-left:2px solid #3b82f6",
    "border-right:2px solid #3b82f6",
    isStart ? "border-top:2px solid #3b82f6" : "",
    isClosedEnd ? "border-bottom:2px solid #3b82f6" : "",
  ]
    .filter(Boolean)
    .join(";");

  return `<div style="${style}">${wrapInBoxes(scopes, lineId, closedBoxes, inner, index + 1)}</div>`;
}

function buildSheetHtml(activity) {
  const lines = activity.premissasIniciais || [];
  const closedBoxes = activity.closedBoxes || [];

  // altura total: sempre um número inteiro de folhas A4
  const contentH = HEADER_H + (lines.length + 1) * ROW_H;
  const pages = Math.max(1, Math.ceil(contentH / PAGE_H));
  const totalH = pages * PAGE_H;

  const rows = lines
    .map((line) => {
      const scopes = line.boxScopes || [];
      const inner = `
        <div style="flex:1;font-size:23px;font-weight:600;color:#1e293b;padding-left:6px">${renderFormula(line.formula)}</div>
        <div style="padding-left:16px">${renderRule(line)}</div>`;

      const content =
        scopes.length > 0
          ? wrapInBoxes(scopes, line.id, closedBoxes, inner)
          : `<div style="display:flex;align-items:center;flex:1;height:100%;padding-left:12px">${inner}</div>`;

      return `
        <div style="display:flex;align-items:stretch;height:${ROW_H}px">
          <div style="width:${MARGIN_X}px;box-sizing:border-box;padding-right:16px;display:flex;align-items:center;justify-content:flex-end;font-family:'Courier New',monospace;font-size:15px;color:#94a3b8">${line.id}</div>
          <div style="flex:1;display:flex;align-items:stretch;padding-right:40px">${content}</div>
        </div>`;
    })
    .join("");

  const date = new Date().toLocaleDateString("pt-BR");

  return `
    <div style="position:relative;width:${PAGE_W}px;height:${totalH}px;background:#ffffff;font-family:'Helvetica Neue',Arial,sans-serif;color:#1e293b;overflow:hidden">

      <!-- margem vermelha -->
      <div style="position:absolute;left:${MARGIN_X}px;top:0;bottom:0;width:2px;background:#fca5a5"></div>

      <!-- cabeçalho -->
      <div style="position:relative;height:${HEADER_H}px;box-sizing:border-box;padding:30px 48px 0 ${MARGIN_X + 28}px">
        <div style="font-size:12px;letter-spacing:.18em;font-weight:700;color:#2563eb">LOGIC_LAB &middot; DEDUÇÃO NATURAL</div>
        <div style="font-size:30px;font-weight:800;line-height:1.15;margin-top:6px;word-break:break-word">${esc(activity.title)}</div>
        <div style="font-size:14px;color:#64748b;margin-top:8px">${esc(activity.tipoDeducao || "")} &middot; ${date}</div>
      </div>

      <!-- pauta (linhas azuis) + prova -->
      <div style="position:absolute;left:0;right:0;top:${HEADER_H}px;bottom:0;background-image:repeating-linear-gradient(to bottom, transparent 0, transparent ${ROW_H - 1}px, #bfdbfe ${ROW_H - 1}px, #bfdbfe ${ROW_H}px)">
        ${rows}
      </div>

      <!-- linha que separa o cabeçalho -->
      <div style="position:absolute;left:0;right:0;top:${HEADER_H - 1}px;height:2px;background:#93c5fd"></div>

      <!-- rodapé -->
      <div style="position:absolute;right:48px;bottom:14px;font-size:11px;color:#94a3b8">Gerado no Logic Lab</div>
    </div>`;
}

export async function exportActivityToPng(activity) {
  const { default: html2canvas } = await import("html2canvas");

  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:0;top:0;z-index:-1;background:#fff";
  container.innerHTML = buildSheetHtml(activity);
  document.body.appendChild(container);

  try {
    // garante que as fontes do KaTeX carregaram antes de "fotografar"
    if (document.fonts && document.fonts.load) {
      await Promise.all(
        [
          "24px KaTeX_Main",
          "bold 24px KaTeX_Main",
          "italic 24px KaTeX_Math",
          "24px KaTeX_AMS",
          "24px KaTeX_Size1",
        ].map((font) => document.fonts.load(font).catch(() => null))
      );
      await document.fonts.ready;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));

    const canvas = await html2canvas(container.firstElementChild, {
      scale: 3,
      backgroundColor: "#ffffff",
      useCORS: true,
      scrollX: 0,
      scrollY: 0,
    });

    const blob = await new Promise((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Falha ao gerar a imagem."))),
        "image/png"
      )
    );

    downloadBlob(blob, `${safeFileName(activity.title)}.png`);
  } finally {
    document.body.removeChild(container);
  }
}