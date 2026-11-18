import React from "react";

const SORT_OPTIONS = [
  { value: "data_criacao", label: "Data de criação" },
  { value: "ultima_modificacao", label: "Última modificação" },
  { value: "proposicional", label: "Lógica Proposicional primeiro" },
  { value: "predicados", label: "Lógica de Predicados primeiro" },
];

// Nas opções de variante a ordem já é definida pela própria opção, então a seta some
const USES_DIRECTION = ["data_criacao", "ultima_modificacao"];

export default function FiltersModal({ currentSort, setSort, isAsc, setIsAsc, onClose }) {
  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div className="absolute right-4 top-14 w-64 bg-white text-slate-700 rounded-xl shadow-xl border border-slate-200 p-4 z-40 animate-in fade-in zoom-in duration-150 font-sans text-left">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-sm text-slate-800">Filtros</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
        </div>
        <div className="space-y-3 text-xs">
          <div className="space-y-1">
            <label className="text-slate-500 font-semibold">Ordenar por:</label>
            <div className="flex gap-1">
              <select
                value={currentSort}
                onChange={(e) => setSort(e.target.value)}
                className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-700 focus:outline-none focus:border-blue-500"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {USES_DIRECTION.includes(currentSort) && (
                <button
                  onClick={() => setIsAsc(!isAsc)}
                  className="px-2.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-600 font-bold text-sm transition-colors"
                >
                  {isAsc ? "↑" : "↓"}
                </button>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg text-center transition-colors mt-2"
          >
            Aplicar
          </button>
        </div>
      </div>
    </>
  );
}