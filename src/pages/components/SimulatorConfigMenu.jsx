import React, { useState } from "react";
import { 
  Check, 
  Pencil, 
  Download, 
  Image, 
  FileCode, 
  Copy, 
  Trash2 
} from "lucide-react";

export default function SimulatorConfigMenu({ initialName, onAction, onClose }) {
  const [name, setName] = useState(initialName);
  const [isEditing, setIsEditing] = useState(false);

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div className="absolute right-2 top-11 w-56 bg-white text-slate-700 rounded-xl shadow-xl border border-slate-200 p-3 z-40 animate-in fade-in zoom-in duration-150 font-sans text-left">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Informações do simulador</div>
        <div className="text-[11px] text-slate-500 mb-1">Renomear simulador</div>
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 mb-2.5">
          <input
            type="text"
            value={name}
            disabled={!isEditing}
            onChange={(e) => setName(e.target.value)}
            className="bg-transparent text-xs w-full focus:outline-none font-bold text-slate-700 disabled:text-slate-500"
          />
          <button 
            onClick={() => { if (isEditing) onAction("rename", name); setIsEditing(!isEditing); }} 
            className="text-xs text-blue-600 font-bold p-1 hover:bg-slate-200/50 rounded transition-colors"
          >
            {isEditing ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
          </button>
        </div>
        <div className="border-t border-slate-100 my-1.5"></div>
        <div className="space-y-0.5 text-xs font-semibold text-slate-600">
          <button onClick={() => onAction("import_json")} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 text-left transition-colors">
            <Download className="w-4 h-4 text-slate-400" /> Importar (JSON)
          </button>
          <button onClick={() => onAction("export_png")} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 text-left transition-colors">
            <Image className="w-4 h-4 text-slate-400" /> Exportar (PNG)
          </button>
          <button onClick={() => onAction("export_json")} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 text-left transition-colors">
            <FileCode className="w-4 h-4 text-slate-400" /> Exportar (JSON)
          </button>
          <button onClick={() => onAction("duplicate")} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 text-left transition-colors">
            <Copy className="w-4 h-4 text-slate-400" /> Duplicar simulador
          </button>
          <div className="border-t border-slate-100 my-1.5"></div>
          <button onClick={() => onAction("delete")} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-red-50 text-red-600 text-left transition-colors font-bold">
            <Trash2 className="w-4 h-4 text-red-500" /> Deletar simulador
          </button>
        </div>
      </div>
    </>
  );
}