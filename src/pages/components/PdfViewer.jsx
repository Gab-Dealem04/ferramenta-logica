import React, { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.js?url";
import { X, Minus, Plus, Download } from "lucide-react";
import { downloadPdf } from "../../utils/materialsStorage";

// O Chrome do celular não mostra PDF dentro de <iframe>, então o PDF é desenhado
// página por página com o pdf.js, em canvas.
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const ZOOM_STEPS = [1, 1.25, 1.5, 2, 3];

// Uma página: só é desenhada quando está perto da tela (economiza memória)
function PdfPage({ page, cssWidth, scrollerRef, wrapperRef }) {
  const holderRef = useRef(null);
  const canvasRef = useRef(null);
  const lastTask = useRef(null);
  const [visible, setVisible] = useState(false);

  const base = page.getViewport({ scale: 1 });
  const cssHeight = cssWidth * (base.height / base.width);

  useEffect(() => {
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { root: scrollerRef.current, rootMargin: "800px 0px" }
    );
    io.observe(holderRef.current);
    return () => io.disconnect();
  }, [scrollerRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    // Longe da tela: solta a memória do canvas (o tamanho na tela não muda)
    if (!visible || cssWidth <= 0) {
      canvas.width = 0;
      canvas.height = 0;
      return undefined;
    }

    let cancelled = false;
    let task = null;

    (async () => {
      // espera o desenho anterior terminar de cancelar antes de reusar o canvas
      if (lastTask.current) {
        try {
          await lastTask.current.promise;
        } catch {
          /* cancelado */
        }
      }
      if (cancelled) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: (cssWidth / base.width) * dpr });
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      task = page.render({ canvasContext: canvas.getContext("2d"), viewport });
      lastTask.current = task;
      try {
        await task.promise;
      } catch {
        /* cancelado */
      }
    })();

    return () => {
      cancelled = true;
      if (task) task.cancel();
    };
  }, [visible, cssWidth, page, base.width]);

  return (
    <div
      ref={(el) => {
        holderRef.current = el;
        wrapperRef(el);
      }}
      className="bg-white shadow-lg mx-auto"
      style={{ width: cssWidth, height: cssHeight }}
    >
      <canvas ref={canvasRef} style={{ width: cssWidth, height: cssHeight, display: "block" }} />
    </div>
  );
}

/**
 * Visualizador de PDF em tela cheia.
 * Passe `url` (arquivo do projeto) OU `data` (ArrayBuffer, ex.: PDF enviado).
 */
export default function PdfViewer({ title, url, data, onClose }) {
  const scrollerRef = useRef(null);
  const wrappers = useRef([]);

  const [pages, setPages] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [errorMsg, setErrorMsg] = useState("");
  const [zoomIdx, setZoomIdx] = useState(0);
  const [boxWidth, setBoxWidth] = useState(0);
  const [current, setCurrent] = useState(1);

  // carrega o documento
  useEffect(() => {
    let cancelled = false;
    let doc = null;

    (async () => {
      try {
        let buffer;
        if (data) {
          buffer = data.slice(0); // o pdf.js "consome" o buffer, então usa uma cópia
        } else {
          const res = await fetch(url);
          if (!res.ok) throw new Error("not-found");
          buffer = await res.arrayBuffer();
        }

        // o servidor de desenvolvimento devolve uma página HTML quando o arquivo não existe
        const head = new TextDecoder().decode(new Uint8Array(buffer, 0, 5));
        if (head !== "%PDF-") throw new Error("not-found");

        doc = await pdfjsLib.getDocument({
          data: new Uint8Array(buffer),
          isEvalSupported: false, // não deixa o pdf.js executar código vindo do PDF
        }).promise;

        const list = [];
        for (let i = 1; i <= doc.numPages; i++) {
          list.push(await doc.getPage(i));
          if (cancelled) return;
        }
        setPages(list);
        setStatus("ready");
      } catch (e) {
        if (cancelled) return;
        setErrorMsg(
          e && e.message === "not-found"
            ? "Arquivo não encontrado. Confira se o PDF está na pasta public/materiais."
            : "Não foi possível abrir este PDF."
        );
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      if (doc) doc.destroy();
    };
  }, [url, data]);

  // largura disponível (acompanha giro de tela e redimensionamento)
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return undefined;
    const update = () => setBoxWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Esc fecha
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const zoom = ZOOM_STEPS[zoomIdx];
  const cssWidth = Math.max(0, (boxWidth - 16) * zoom);

  const handleScroll = () => {
    const sc = scrollerRef.current;
    if (!sc) return;
    const top = sc.getBoundingClientRect().top;
    for (let i = 0; i < wrappers.current.length; i++) {
      const el = wrappers.current[i];
      if (el && el.getBoundingClientRect().bottom - top > 80) {
        setCurrent(i + 1);
        return;
      }
    }
  };

  const handleDownload = () => downloadPdf({ url, data, fileName: title });

  const iconBtn =
    "w-9 h-9 flex items-center justify-center rounded-lg text-white/90 hover:bg-white/10 active:bg-white/20 disabled:opacity-30 transition-colors";

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-slate-700">
      <div className="flex items-center gap-1 px-2 py-1.5 bg-slate-900 text-white shrink-0">
        <button onClick={onClose} className={iconBtn} title="Fechar">
          <X className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0 px-1">
          <div className="text-xs font-bold truncate">{title}</div>
          {status === "ready" && (
            <div className="text-[10px] text-white/60 font-medium">
              Página {current} de {pages.length}
            </div>
          )}
        </div>

        <button
          onClick={() => setZoomIdx((i) => Math.max(0, i - 1))}
          disabled={zoomIdx === 0}
          className={iconBtn}
          title="Diminuir"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoomIdx((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))}
          disabled={zoomIdx === ZOOM_STEPS.length - 1}
          className={iconBtn}
          title="Aumentar"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button onClick={handleDownload} className={iconBtn} title="Baixar">
          <Download className="w-4 h-4" />
        </button>
      </div>

      <div ref={scrollerRef} onScroll={handleScroll} className="flex-1 min-h-0 overflow-auto py-2">
        {status === "loading" && (
          <div className="text-center text-sm text-white/70 font-medium pt-16">Carregando PDF…</div>
        )}

        {status === "error" && (
          <div className="text-center text-sm text-white/80 font-medium pt-16 px-6">{errorMsg}</div>
        )}

        {status === "ready" && (
          <div className="space-y-2 px-2" style={{ width: cssWidth + 16, margin: "0 auto" }}>
            {pages.map((page, i) => (
              <PdfPage
                key={i}
                page={page}
                cssWidth={cssWidth}
                scrollerRef={scrollerRef}
                wrapperRef={(el) => {
                  wrappers.current[i] = el;
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}