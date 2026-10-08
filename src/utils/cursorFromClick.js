import katex from "katex";
import { formatToLatex } from "./latexFormat";

// Descobre em qual posição do texto o usuário tocou, medindo a largura
// de cada prefixo da fórmula renderizada pelo KaTeX.
export function getCursorIndexFromClick(event, text) {
  if (!text) return 0;

  const container = event.currentTarget;
  const textEl = container.firstElementChild || container;
  const clientX = event.clientX ?? event.changedTouches?.[0]?.clientX ?? 0;

  const x = clientX - textEl.getBoundingClientRect().left;
  if (x <= 0) return 0;

  const probe = document.createElement("span");
  probe.style.cssText =
    "position:absolute;visibility:hidden;white-space:nowrap;pointer-events:none;left:0;top:0";
  container.appendChild(probe);

  const widths = [0];
  try {
    for (let i = 1; i <= text.length; i++) {
      probe.innerHTML = katex.renderToString(formatToLatex(text.slice(0, i)), {
        throwOnError: false,
        output: "html",
      });
      widths.push(probe.getBoundingClientRect().width);
    }
  } finally {
    container.removeChild(probe);
  }

  let best = 0;
  let bestDiff = Infinity;
  widths.forEach((w, i) => {
    const diff = Math.abs(w - x);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  });
  return best;
}