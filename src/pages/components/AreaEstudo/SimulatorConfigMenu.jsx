import React, { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  Download,
  Image,
  FileCode,
  Copy,
  Trash2,
} from "lucide-react";

const MENU_WIDTH = 224; // w-56
const GAP = 4; // espaço entre o botão e o menu
const EDGE = 8; // distância mínima da borda da tela

export default function SimulatorConfigMenu({ initialName, onAction, onClose }) {
  const [name, setName] = useState(initialName);

  const trimmed = name.trim();
  const canSave = trimmed !== "" && trimmed !== initialName;

  const save = () => {
    if (canSave) onAction("rename", trimmed);
  };

  const anchorRef = useRef(null); // marcador: o pai dele é o botão "•••"
  const menuRef = useRef(null);
  const [pos, setPos] = useState(null); // { left, top, maxHeight }

  useLayoutEffect(() => {
    const anchor = anchorRef.current?.parentElement;
    const menu = menuRef.current;
    if (!anchor || !menu) return;

    const a = anchor.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const height = menu.offsetHeight;

    const spaceBelow = vh - a.bottom - GAP - EDGE;
    const spaceAbove = a.top - GAP - EDGE;
    const openUp = height > spaceBelow && spaceAbove > spaceBelow;

    const available = Math.max(120, openUp ? spaceAbove : spaceBelow);
    const shown = Math.min(height, available);

    let top = openUp ? a.top - GAP - shown : a.bottom + GAP;
    top = Math.max(EDGE, Math.min(top, vh - shown - EDGE));

    let left = a.right - MENU_WIDTH; // alinha a borda direita com o botão
    left = Math.max(EDGE, Math.min(left, vw - MENU_WIDTH - EDGE));

    setPos({ left, top, maxHeight: available });
  }, []);

  return (
    <>
      {/* marcador invisível, só para achar o botão que abriu o menu */}
      <span ref={anchorRef} className="hidden" aria-hidden="true" />

      {createPortal(
        <>
          <div className="fixed inset-0 z-[60]" onClick={onClose} />
          <div
            ref={menuRef}
            className="fixed z-[61] bg-white text-slate-700 rounded-xl shadow-xl border border-slate-200 p-3 overflow-y-auto font-sans text-left"
            style={{
              width: MENU_WIDTH,
              left: pos ? pos.left : 0,
              top: pos ? pos.top : 0,
              maxHeight: pos ? pos.maxHeight : undefined,
              visibility: pos ? "visible" : "hidden", // some até ser posicionado
            }}
          >
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Informações do simulador
            </div>
            <div className="text-[11px] text-slate-500 mb-1">Renomear simulador</div>
            <div
              className={`flex items-center gap-1.5 bg-slate-50 border rounded-lg px-2 py-1 mb-1 transition-colors ${
                canSave ? "border-blue-400" : "border-slate-200 focus-within:border-blue-400"
              }`}
            >
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    save();
                  } else if (e.key === "Escape") {
                    setName(initialName);
                  }
                }}
                onFocus={(e) => e.target.select()}
                placeholder="Nome da atividade"
                maxLength={120}
                className="bg-transparent text-xs w-full focus:outline-none font-bold text-slate-700 placeholder-slate-400"
              />
              <button
                onClick={save}
                disabled={!canSave}
                title="Salvar nome"
                className={`p-1 rounded transition-colors ${
                  canSave
                    ? "bg-blue-600 text-white active:bg-blue-700"
                    : "text-slate-300 cursor-default"
                }`}
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="text-[10px] text-slate-400 mb-2.5 h-3">
              {canSave ? "Toque no ✓ ou aperte Enter para salvar" : ""}
            </div>
            <div className="border-t border-slate-100 my-1.5"></div>
            <div className="space-y-0.5 text-xs font-semibold text-slate-600">
              <button
                onClick={() => onAction("import_json")}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 text-left transition-colors"
              >
                <Download className="w-4 h-4 text-slate-400" /> Importar (JSON)
              </button>
              <button
                onClick={() => onAction("export_png")}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 text-left transition-colors"
              >
                <Image className="w-4 h-4 text-slate-400" /> Exportar (PNG)
              </button>
              <button
                onClick={() => onAction("export_json")}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 text-left transition-colors"
              >
                <FileCode className="w-4 h-4 text-slate-400" /> Exportar (JSON)
              </button>
              <button
                onClick={() => onAction("duplicate")}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 text-left transition-colors"
              >
                <Copy className="w-4 h-4 text-slate-400" /> Duplicar simulador
              </button>
              <div className="border-t border-slate-100 my-1.5"></div>
              <button
                onClick={() => onAction("delete")}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-red-50 text-red-600 text-left transition-colors font-bold"
              >
                <Trash2 className="w-4 h-4 text-red-500" /> Deletar simulador
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}