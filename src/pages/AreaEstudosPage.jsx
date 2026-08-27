import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import AddProofModal from "./components/AddProofModal";
import ProofDetailView from "./components/ProofDetailView";
import SimulatorConfigMenu from "./components/SimulatorConfigMenu";
import FiltersModal from "./components/FiltersModal";

export default function AreaEstudosPage() {
  const [activeTab, setActiveTab] = useState("historico");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedProof, setSelectedProof] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [filterType, setFilterType] = useState("Todos");
  const [sortType, setSortType] = useState("data_criacao");
  const [isAsc, setIsAsc] = useState(true);

  const [lines, setLines] = useState([]);
  const [currentFormula, setCurrentFormula] = useState("");
  const [currentRule, setCurrentRule] = useState("PREMISSA");
  const [activeMenu, setActiveMenu] = useState(null);
  const timerRef = useRef(null);

  const [historicoAtividades, setHistoricoAtividades] = useState([
    {
      id: 1,
      title: "Atividade Disjunção Exclusão",
      status: "Concluído",
      tipoDeducao: "Lógica Proposicional",
      dataCriacao: 1648771200000,
      ultimaModificacao: 1680307200000,
      premissasIniciais: [
        { id: 1, formula: "A → C", rule: "premissa" },
        { id: 2, formula: "B → C", rule: "premissa" },
        { id: 3, formula: "A ∨ B", rule: "premissa" },
      ],
      temSubprovas: true,
    },
    {
      id: 2,
      title: "Atividade Implicação Exclusão",
      status: "Concluído",
      tipoDeducao: "Lógica Proposicional",
      dataCriacao: 1651363200000,
      ultimaModificacao: 1651363200000,
      premissasIniciais: [
        { id: 1, formula: "P → Q", rule: "premissa" },
        { id: 2, formula: "P", rule: "premissa" },
        { id: 3, formula: "Q", rule: "→e 1,2" },
      ],
      temSubprovas: false,
    },
    {
      id: 3,
      title: "Atividade Implicação Introdução",
      status: "Pendente",
      tipoDeducao: "Lógica de Predicados",
      dataCriacao: 1711929600000,
      ultimaModificacao: 1711929600000,
      premissasIniciais: [{ id: 1, formula: "R → S", rule: "premissa" }],
      temSubprovas: false,
    },
  ]);

  const materiais = [
    { id: 1, title: "Manual de Sobrevivência em Dedução Natural", type: "PDF", size: "2.4 MB", downloaded: true },
    { id: 2, title: "Lista de Exercícios 01 - Tabelas Verdade", type: "PDF", size: "1.1 MB", downloaded: false },
  ];

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleOpenProof = (prova) => {
    setSelectedProof(prova);
    setLines(prova.premissasIniciais);
    setCurrentFormula("");
    setCurrentRule("PREMISSA");
  };

  const handleCreateNewProof = (name, variant) => {
    const formattedVariant = variant === "proposicional" ? "Lógica Proposicional" : "Lógica de Predicados";
    const newProof = {
      id: Date.now(),
      title: name,
      status: "Pendente",
      tipoDeducao: formattedVariant,
      dataCriacao: Date.now(),
      ultimaModificacao: Date.now(),
      premissasIniciais: [],
      temSubprovas: false,
    };

    setIsAddModalOpen(false);
    setSelectedProof(newProof);
    setLines([]);
    setCurrentFormula("");
    setCurrentRule("PREMISSA");
  };

  const handleSaveAndBack = () => {
    if (selectedProof) {
      setHistoricoAtividades((prev) => {
        const exists = prev.some((p) => p.id === selectedProof.id);
        if (exists) {
          return prev.map((p) =>
            p.id === selectedProof.id ? { ...p, premissasIniciais: lines, ultimaModificacao: Date.now() } : p
          );
        } else {
          return [{ ...selectedProof, premissasIniciais: lines }, ...prev];
        }
      });
    }
    setSelectedProof(null);
  };

  const handleCompile = () => {
    alert("Compilando prova atual...");
  };

  const handleMenuAction = (id, action, updatedValue) => {
    setOpenMenuId(null);
    if (action === "rename") {
      setHistoricoAtividades((prev) =>
        prev.map((p) => (p.id === id ? { ...p, title: updatedValue, ultimaModificacao: Date.now() } : p))
      );
    } else if (action === "delete") {
      setHistoricoAtividades((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const handlePressStart = (symbol) => {
    timerRef.current = setTimeout(() => {
      setActiveMenu(symbol);
    }, 500);
  };

  const handlePressEnd = (symbol) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      if (!activeMenu) addSymbol(symbol);
    }
  };

  const addSymbol = (s) => {
    if (s === "⌫") {
      if (currentFormula.length > 0) {
        setCurrentFormula((prev) => prev.slice(0, -1));
      } else if (lines.length > 0) {
        const updatedLines = [...lines];
        const lastLine = updatedLines.pop();
        setLines(updatedLines);
        setCurrentFormula(lastLine.formula);
        setCurrentRule(lastLine.rule ? lastLine.rule.toUpperCase() : "PREMISSA");
      }
    } else if (s === "SPACE") {
      setCurrentFormula((prev) => prev + " ");
    } else {
      setCurrentFormula((prev) => prev + s);
    }
    setActiveMenu(null);
  };

  const confirmLine = () => {
    const nextId = lines.length > 0 ? Math.max(...lines.map((l) => l.id)) + 1 : 1;
    const newLine = {
      id: nextId,
      formula: currentFormula || "",
      rule: currentFormula ? currentRule.charAt(0) + currentRule.slice(1).toLowerCase() : "",
    };
    setLines([...lines, newLine]);
    setCurrentFormula("");
  };

  const itensFiltrados = historicoAtividades
    .filter((item) => filterType === "Todos" || item.status === filterType)
    .sort((a, b) => {
      const campo = sortType === "data_criacao" ? "dataCriacao" : "ultimaModificacao";
      return isAsc ? a[campo] - b[campo] : b[campo] - a[campo];
    });

  return (
    <div className="flex flex-col h-screen bg-slate-50 max-w-md mx-auto border-x shadow-2xl font-sans overflow-hidden relative">
      {isSidebarOpen && (
        <div className="absolute inset-0 bg-slate-900/40 z-40 animate-in fade-in" onClick={() => setIsSidebarOpen(false)} />
      )}

      <div className={`absolute top-0 left-0 h-full w-64 bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-in-out p-5 flex flex-col justify-between ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div>
          <div className="flex justify-between items-center mb-8 pb-4 border-b">
            <h2 className="font-black text-slate-800">LOGIC_LAB</h2>
            <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 font-bold">✕</button>
          </div>
          {mounted && (
            <nav className="space-y-2">
              <Link to="/" className="flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl text-slate-600 hover:bg-slate-50">
                <span>📝</span> Histórico
              </Link>
              <Link to="/tela-prova" className="flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl bg-blue-50 text-blue-700">
                <span>📜</span> Laboratório Principal
              </Link>
            </nav>
          )}
        </div>
      </div>

      <header className="p-4 bg-white border-b flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsSidebarOpen(true)} className="p-1.5 rounded-lg text-slate-700 font-bold text-lg">☰</button>
          <h1 className="font-black text-slate-800 tracking-tight text-base">LOGIC_LAB</h1>
        </div>

        {selectedProof ? (
          <button onClick={handleCompile} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold tracking-wider text-blue-700 bg-blue-50/50 hover:bg-blue-50 border border-blue-200/60 rounded-xl active:scale-95 transition-all uppercase">
            <span className="text-blue-500 text-[10px]">▶</span> Compilar
          </button>
        ) : (
          activeTab === "historico" && (
            <button onClick={() => setIsAddModalOpen(true)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl active:scale-95 transition-all text-xs tracking-wide shadow-sm">
              Adicionar
            </button>
          )
        )}
      </header>

      {!selectedProof && (
        <div className="flex bg-white border-b sticky top-0 z-10">
          <button onClick={() => setActiveTab("historico")} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeTab === "historico" ? "border-blue-600 text-blue-600 bg-blue-50/30" : "border-transparent text-slate-400"}`}>
            🎓 Histórico de Atividades
          </button>
          <button onClick={() => setActiveTab("materiais")} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeTab === "materiais" ? "border-blue-600 text-blue-600 bg-blue-50/30" : "border-transparent text-slate-400"}`}>
            📄 PDFs e Materiais
          </button>
        </div>
      )}

      <div className="flex-1 bg-white relative overflow-hidden flex flex-col">
        {selectedProof ? (
          <ProofDetailView
            proof={selectedProof}
            lines={lines}
            currentFormula={currentFormula}
            currentRule={currentRule}
            setCurrentRule={setCurrentRule}
            activeMenu={activeMenu}
            handlePressStart={handlePressStart}
            handlePressEnd={handlePressEnd}
            addSymbol={addSymbol}
            confirmLine={confirmLine}
            handleSaveAndBack={handleSaveAndBack}
          />
        ) : (
          <div className="h-full overflow-y-auto p-4 relative">
            <div className="pl-2 space-y-4">
              {activeTab === "historico" && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="flex justify-between items-center relative">
                    <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Minhas Atividades Realizadas</h2>
                    <button onClick={() => setIsFiltersOpen(!isFiltersOpen)} className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors text-xs font-bold flex items-center gap-1">⚙️ Filtros</button>
                    {isFiltersOpen && (
                      <FiltersModal
                        currentFilter={filterType}
                        setFilter={setFilterType}
                        currentSort={sortType}
                        setSort={setSortType}
                        isAsc={isAsc}
                        setIsAsc={setIsAsc}
                        onClose={() => setIsFiltersOpen(false)}
                      />
                    )}
                  </div>

                  {itensFiltrados.map((prova) => (
                    <div key={prova.id} className="relative border border-slate-100 rounded-xl p-3.5 hover:border-blue-300 transition-all flex items-center justify-between gap-3 bg-white shadow-sm group">
                      <div onClick={() => handleOpenProof(prova)} className="space-y-0.5 min-w-0 flex-1 cursor-pointer">
                        <h3 className="font-bold text-xs text-slate-700 group-hover:text-blue-600 transition-colors leading-tight truncate">{prova.title}</h3>
                        <div className="flex gap-2 items-center">
                          <span className={`text-[10px] font-bold ${prova.status === "Concluído" ? "text-emerald-600" : "text-amber-600"}`}>{prova.status}</span>
                          <span className="text-[10px] text-slate-400">•</span>
                          <span className="text-[10px] text-slate-400 font-medium">{prova.tipoDeducao}</span>
                        </div>
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
        )}
      </div>

      {isAddModalOpen && <AddProofModal onClose={() => setIsAddModalOpen(false)} onCreate={handleCreateNewProof} />}
    </div>
  );
}