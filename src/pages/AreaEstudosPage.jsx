import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SlidersHorizontal, FileText, Download } from "lucide-react";
import AddProofModal from "./components/AddProofModal";
import SimulatorConfigMenu from "./components/SimulatorConfigMenu";
import FiltersModal from "./components/FiltersModal";
import PdfViewer from "./components/PdfViewer";
import Sidebar from "./components/TelaProva/Sidebar";
import {
  loadActivities,
  getActivity,
  addActivity,
  updateActivity,
  deleteActivity,
  duplicateActivity,
} from "../utils/proofStorage";
import { downloadPdf } from "../utils/materialsStorage";
import {
  exportActivityToJson,
  exportActivityToPng,
  parseImportedActivity,
} from "../utils/proofExport";

// PDFs que já vêm com o sistema (ficam em public/materiais)
const BUILT_IN_MATERIALS = [
  {
    id: "builtin-deducao-natural",
    title: "Dedução Natural — Lógica para Computação",
    url: `${import.meta.env.BASE_URL}materiais/Deducao_Natural.pdf`,
    fileName: "Deducao_Natural.pdf",
    size: "0,7 MB",
  },
];

// Opções de "Ordenar por" que colocam uma variante lógica no topo da lista
const VARIANT_FIRST = {
  proposicional: "Lógica Proposicional",
  predicados: "Lógica de Predicados",
};

// Cartão de um material: toque no cartão abre o PDF; o ícone à direita baixa
function MaterialCard({ title, onOpen, onDownload }) {
  return (
    <div className="flex items-center rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <button
        onClick={onOpen}
        className="flex-1 min-w-0 flex items-center gap-3 p-3.5 text-left active:bg-slate-50 transition-colors"
      >
        <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 text-red-500 flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4" />
        </div>
        <h3
          className="font-bold text-sm text-slate-800 leading-snug min-w-0"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {title}
        </h3>
      </button>

      <div className="flex items-center pr-2 shrink-0">
        <button
          onClick={onDownload}
          title="Baixar"
          className="w-10 h-10 flex items-center justify-center rounded-full text-slate-500 hover:text-blue-600 active:bg-blue-50 transition-colors"
        >
          <Download className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default function AreaEstudosPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Trava a rolagem da página: só as áreas internas rolam, então o cabeçalho
  // fica sempre visível (no celular, 100vh é maior que a tela visível).
  useEffect(() => {
    const body = document.body.style.overflow;
    const html = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = body;
      document.documentElement.style.overflow = html;
    };
  }, []);

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

  // PDF aberto no visualizador
  const [viewer, setViewer] = useState(null); // { title, url }

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
    // Variante lógica escolhida no topo; dentro de cada grupo, as mais antigas primeiro
    const first = VARIANT_FIRST[sortType];
    if (first) {
      const aFirst = a.tipoDeducao === first;
      const bFirst = b.tipoDeducao === first;
      if (aFirst !== bFirst) return aFirst ? -1 : 1;
      return a.dataCriacao - b.dataCriacao;
    }

    const campo = sortType === "data_criacao" ? "dataCriacao" : "ultimaModificacao";
    return isAsc ? a[campo] - b[campo] : b[campo] - a[campo];
  });

  return (
    <div
      className="flex flex-col h-screen bg-slate-50 max-w-md mx-auto border-x shadow-2xl font-sans overflow-hidden relative"
      style={{ height: "100dvh" }}
    >
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <header className="p-4 bg-white border-b flex justify-between items-center z-10 shrink-0">
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

      <div className="flex bg-white border-b z-10 shrink-0">
        {/* Ajustado aqui com pl-4 e text-left para deslocar o texto para a esquerda */}
        <button onClick={() => setActiveTab("historico")} className={`flex-1 py-3 pl-4 text-left text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeTab === "historico" ? "border-blue-600 text-blue-600 bg-blue-50/30" : "border-transparent text-slate-400"}`}>
          Histórico de Atividades
        </button>
        <button onClick={() => setActiveTab("materiais")} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeTab === "materiais" ? "border-blue-600 text-blue-600 bg-blue-50/30" : "border-transparent text-slate-400"}`}>
          PDFs e Materiais
        </button>
      </div>

      <div className="flex-1 min-h-0 bg-white relative overflow-hidden flex flex-col">
        <div className="h-full overflow-y-auto p-4 relative">
          <div className="pl-2 space-y-4">
            {activeTab === "historico" && (
              <div className="space-y-3 animate-in fade-in duration-200">
                <div className="flex justify-between items-center relative">
                  <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Minhas Atividades Realizadas</h2>
                  <button onClick={() => setIsFiltersOpen(!isFiltersOpen)} className="relative p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors text-xs font-bold flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5" /> Filtros
                  </button>
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

                {itensOrdenados.length === 0 && (
                  <div className="text-center text-xs text-slate-400 font-medium py-8">
                    Nenhuma atividade ainda. Toque em Adicionar para criar.
                  </div>
                )}

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
              <div className="space-y-2.5 animate-in fade-in duration-200">
                <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Arquivos Complementares</h2>
                {BUILT_IN_MATERIALS.map((material) => (
                  <MaterialCard
                    key={material.id}
                    title={material.title}
                    onOpen={() => setViewer({ title: material.title, url: material.url })}
                    onDownload={() =>
                      downloadPdf({ url: material.url, fileName: material.fileName || material.title })
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {viewer && (
        <PdfViewer
          title={viewer.title}
          url={viewer.url}
          onClose={() => setViewer(null)}
        />
      )}

      {isAddModalOpen && <AddProofModal onClose={() => setIsAddModalOpen(false)} onCreate={handleCreateNewProof} />}
    </div>
  );
}