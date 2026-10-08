import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AddProofModal from "./components/AddProofModal";
import SimulatorConfigMenu from "./components/SimulatorConfigMenu";
import FiltersModal from "./components/FiltersModal";
import Sidebar from "./components/TelaProva/Sidebar";
import {
  loadActivities,
  getActivity,
  addActivity,
  updateActivity,
  deleteActivity,
  duplicateActivity,
} from "../utils/proofStorage";
import {
  exportActivityToJson,
  exportActivityToPng,
  parseImportedActivity,
} from "../utils/proofExport";

export default function AreaEstudosPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState("historico");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [sortType, setSortType] = useState("data_criacao");
  const [isAsc, setIsAsc] = useState(true);

  // A fonte da verdade é o localStorage (via proofStorage).
  const [historicoAtividades, setHistoricoAtividades] = useState(() => loadActivities());
  const refreshList = () => setHistoricoAtividades(loadActivities());

  const materiais = [
    { id: 1, title: "Manual de Sobrevivência em Dedução Natural", type: "PDF", size: "2.4 MB", downloaded: true },
    { id: 2, title: "Lista de Exercícios 01 - Tabelas Verdade", type: "PDF", size: "1.1 MB", downloaded: false },
  ];

  const handleOpenProof = (prova) => {
    navigate("/tela-prova", { state: { provaData: prova, mode: "edit" } });
  };

  const handleCreateNewProof = (name, variant) => {
    const formattedVariant = variant === "proposicional" ? "Lógica Proposicional" : "Lógica de Predicados";
    const newProof = {
      id: Date.now(),
      title: name,
      tipoDeducao: formattedVariant,
      dataCriacao: Date.now(),
      ultimaModificacao: Date.now(),
      premissasIniciais: [],
      openBoxes: [],
      closedBoxes: [],
      temSubprovas: false,
    };

    addActivity(newProof);
    navigate("/tela-prova", { state: { provaData: newProof, mode: "new" } });
  };

  const handleMenuAction = (id, action, value) => {
    setOpenMenuId(null);

    if (action === "import_json") {
      fileInputRef.current?.click();
      return;
    }

    const prova = getActivity(id);
    if (!prova) return;

    if (action === "rename") {
      const newName = (value || "").trim();
      if (!newName) {
        alert("O nome não pode ficar vazio.");
        return;
      }
      updateActivity(id, { title: newName });
      refreshList();
    } else if (action === "duplicate") {
      duplicateActivity(id);
      refreshList();
    } else if (action === "delete") {
      if (window.confirm(`Deletar "${prova.title}"? Essa ação não pode ser desfeita.`)) {
        deleteActivity(id);
        refreshList();
      }
    } else if (action === "export_json") {
      exportActivityToJson(prova);
    } else if (action === "export_png") {
      exportActivityToPng(prova).catch((e) => {
        console.error("Erro ao exportar imagem:", e);
        alert("Não foi possível gerar a imagem.");
      });
    }
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const activity = parseImportedActivity(await file.text());
      addActivity(activity);
      refreshList();
    } catch (e) {
      alert(e.message || "Não foi possível importar o arquivo.");
    }
  };

  const itensOrdenados = [...historicoAtividades].sort((a, b) => {
    const campo = sortType === "data_criacao" ? "dataCriacao" : "ultimaModificacao";
    return isAsc ? a[campo] - b[campo] : b[campo] - a[campo];
  });

  return (
    <div className="flex flex-col h-screen bg-slate-50 max-w-md mx-auto border-x shadow-2xl font-sans overflow-hidden relative">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <header className="p-4 bg-white border-b flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsSidebarOpen(true)} className="p-1.5 rounded-lg text-slate-700 font-bold text-lg">☰</button>
          <h1 className="font-black text-slate-800 tracking-tight text-base">LOGIC_LAB</h1>
        </div>

        {activeTab === "historico" && (
          <button onClick={() => setIsAddModalOpen(true)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl active:scale-95 transition-all text-xs tracking-wide shadow-sm">
            Adicionar
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleImportFile}
          className="hidden"
        />
      </header>

      <div className="flex bg-white border-b sticky top-0 z-10">
        <button onClick={() => setActiveTab("historico")} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeTab === "historico" ? "border-blue-600 text-blue-600 bg-blue-50/30" : "border-transparent text-slate-400"}`}>
          🎓 Histórico de Atividades
        </button>
        <button onClick={() => setActiveTab("materiais")} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeTab === "materiais" ? "border-blue-600 text-blue-600 bg-blue-50/30" : "border-transparent text-slate-400"}`}>
          📄 PDFs e Materiais
        </button>
      </div>

      <div className="flex-1 bg-white relative overflow-hidden flex flex-col">
        <div className="h-full overflow-y-auto p-4 relative">
          <div className="pl-2 space-y-4">
            {activeTab === "historico" && (
              <div className="space-y-3 animate-in fade-in duration-200">
                <div className="flex justify-between items-center relative">
                  <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Minhas Atividades Realizadas</h2>
                  <button onClick={() => setIsFiltersOpen(!isFiltersOpen)} className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors text-xs font-bold flex items-center gap-1">⚙️ Filtros</button>
                  {isFiltersOpen && (
                    <FiltersModal
                      currentSort={sortType}
                      setSort={setSortType}
                      isAsc={isAsc}
                      setIsAsc={setIsAsc}
                      onClose={() => setIsFiltersOpen(false)}
                    />
                  )}
                </div>

                {itensOrdenados.map((prova) => (
                  <div key={prova.id} className="relative border border-slate-100 rounded-xl p-3.5 hover:border-blue-300 transition-all flex items-center justify-between gap-3 bg-white shadow-sm group">
                    <div onClick={() => handleOpenProof(prova)} className="space-y-0.5 min-w-0 flex-1 cursor-pointer">
                      <h3 className="font-bold text-xs text-slate-700 group-hover:text-blue-600 transition-colors leading-tight truncate">{prova.title}</h3>
                      <span className="text-[10px] text-slate-400 font-medium">{prova.tipoDeducao}</span>
                    </div>

                    <div className="relative flex items-center">
                      <button onClick={() => setOpenMenuId(openMenuId === prova.id ? null : prova.id)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all text-sm font-bold">•••</button>
                      {openMenuId === prova.id && (
                        <SimulatorConfigMenu
                          initialName={prova.title}
                          onClose={() => setOpenMenuId(null)}
                          onAction={(action, val) => handleMenuAction(prova.id, action, val)}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "materiais" && (
              <div className="space-y-3 animate-in fade-in duration-200">
                <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Arquivos Complementares</h2>
                {materiais.map((material) => (
                  <div key={material.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-white shadow-sm">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center text-red-500 font-black text-[10px] border border-red-100 shrink-0 uppercase">{material.type}</div>
                      <div>
                        <h3 className="font-bold text-xs text-slate-700 leading-tight">{material.title}</h3>
                        <span className="text-[9px] font-mono font-bold text-slate-400">{material.size}</span>
                      </div>
                    </div>
                    <button className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold ${material.downloaded ? "bg-green-50 text-green-600 border border-green-100" : "bg-blue-600 text-white shadow-sm"}`}>
                      {material.downloaded ? "✓ Baixado" : "⬇️ Baixar"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {isAddModalOpen && <AddProofModal onClose={() => setIsAddModalOpen(false)} onCreate={handleCreateNewProof} />}
    </div>
  );
}