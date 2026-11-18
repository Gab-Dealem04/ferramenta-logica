import React, { useState } from "react";

export default function AddProofModal({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [variant, setVariant] = useState("proposicional");

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/40 z-50 animate-in fade-in duration-200" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xs bg-white text-slate-700 rounded-2xl shadow-xl border border-slate-200 p-5 z-50 animate-in zoom-in-95 duration-150 font-sans text-left">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-sm text-slate-800 tracking-tight">Criar nova prova</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors text-sm">✕</button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nome da Atividade</label>
            <input
              type="text"
              placeholder="Ex: Atividade Modus Tollens"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 placeholder-slate-400 transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Variante Lógica</label>
            <div className="relative">
              <select
                value={variant}
                onChange={(e) => setVariant(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 appearance-none cursor-pointer pr-8"
              >
                <option value="proposicional">Lógica Proposicional</option>
                <option value="predicados">Lógica de Predicados</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 text-xs font-bold">↓</div>
            </div>
          </div>

          <button
            onClick={() => onCreate(name, variant)}
            disabled={!name.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-sm transition-all mt-2 active:scale-[0.98]"
          >
            Criar
          </button>
        </div>
      </div>
    </>
  );
}