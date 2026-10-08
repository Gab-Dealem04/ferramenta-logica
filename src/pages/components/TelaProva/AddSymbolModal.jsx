import React, { useEffect, useRef, useState } from "react";
import { InlineMath } from "react-katex";

export default function AddSymbolModal({
  isOpen,
  onClose,
  onConfirm,
  library = [],
  onRemoveFromLibrary,
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setValue("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
    setValue("");
    onClose();
  };

  const handleCancel = () => {
    setValue("");
    onClose();
  };

  const handlePick = (symbol) => {
    onConfirm(symbol);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  return (
    <div
      className="absolute inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={handleCancel}
    >
      <div
        className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 p-4 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-center font-black text-slate-800 text-base mb-3 tracking-tight">
          Adicionar um novo símbolo
        </h2>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite aqui..."
          autoCapitalize="none"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          name="no-autofill-field"
          data-form-type="other"
          data-lpignore="true"
          className="w-full border-2 border-slate-300 focus:border-blue-500 outline-none rounded-xl px-3 py-3 text-center text-lg font-bold text-slate-800 mb-3 transition-colors"
        />

        {library.length > 0 && (
          <div className="mb-3">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Salvos
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {library.map((symbol) => (
                <div
                  key={symbol}
                  className="flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => handlePick(symbol)}
                    className="px-2.5 py-1.5 text-sm font-bold text-slate-700 active:bg-slate-200"
                  >
                    <InlineMath math={symbol} />
                  </button>
                  <button
                    onClick={() => onRemoveFromLibrary?.(symbol)}
                    title="Remover dos salvos"
                    className="px-1.5 py-1.5 text-[10px] text-slate-400 hover:text-red-500 border-l border-slate-200"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleCancel}
            className="py-3 rounded-xl border-2 border-red-300 bg-red-50 text-red-600 font-black text-sm active:scale-95 transition-transform"
          >
            CANC.
          </button>
          <button
            onClick={handleConfirm}
            className="py-3 rounded-xl border-2 border-green-400 bg-green-50 text-green-700 font-black text-sm active:scale-95 transition-transform"
          >
            CONFIR.
          </button>
        </div>
      </div>
    </div>
  );
}