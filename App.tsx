
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import Layout from './components/Layout';
import { 
  ProjectData, 
  EquipmentType, 
  Refrigerant, 
  CompressorType, 
  OEMEquipment,
  CondensationType
} from './types';
import { 
  OEM_DATABASE, 
  DEFAULT_WEEKDAY_LOAD, 
  DEFAULT_WEEKEND_LOAD,
  STANDARD_PROFILES,
  BRANDS
} from './constants';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area, ReferenceLine,
  BarChart, Bar, Cell, Legend
} from 'recharts';
import { generateTechnicalReport } from './services/geminiService';
import { 
  Plus, Trash2, ChevronRight, Cpu, Wind, Thermometer, 
  TrendingUp, FileText, Printer, Sparkles, Download, 
  Layers, Search, Filter, RefreshCw, Upload, Calendar, 
  Activity, Info, Scale, CheckCircle2, AlertCircle,
  Database, ArrowUpRight, Gauge, Briefcase, Globe,
  Settings, Droplets, Sun, Snowflake, Zap, MapPin, Building2, User, Table, LayoutGrid, Clock, FileDown, FileUp, ListChecks, Copy, FileCode, FileType, Check, Wand2, Eye, X, Award, CheckCircle, Calculator, SlidersHorizontal, ChevronLeft,
  BarChart2, Star, ClipboardList, FileOutput, Share2, Lightbulb, ThermometerSnowflake, Flame
} from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [copySuccess, setCopySuccess] = useState(false);
  const [viewingEquipmentId, setViewingEquipmentId] = useState<string | null>(null);
  const [selectedReportUnitId, setSelectedReportUnitId] = useState<string | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonAnalysis, setComparisonAnalysis] = useState<string | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [intelligentFilterEnabled, setIntelligentFilterEnabled] = useState(true);
  
  const [isAnalyzingLoads, setIsAnalyzingLoads] = useState(false);
  const [loadAnalysisAI, setLoadAnalysisAI] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectFileInputRef = useRef<HTMLInputElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const selectionSheetRef = useRef<HTMLDivElement>(null);
  
  const [project, setProject] = useState<ProjectData>({
    projectName: 'Projecto K-CHBC',
    workReference: 'FO-00-00',
    clientName: 'Cliente Industrial',
    installationName: 'Instalação Norte',
    technicianName: 'José Coelho (PQ00851 | OET 2321)',
    companyName: 'Koelho2000 Engenharia',
    auditCompany: 'K2000 Auditoria',
    location: 'Lisboa, Portugal',
    equipmentType: EquipmentType.AIR_COOLED_CHILLER,
    refrigerant: Refrigerant.R134a,
    compressorType: CompressorType.SCREW,
    selectedEquipmentIds: [],
    hourlyLoads: Array(8760).fill(0),
    peakPower: 800,
    targetTemperature: 7,
    targetEfficiency: 'High',
    loadDefinitionMode: 'Profiles',
    dailyProfiles: {
      weekday: [...DEFAULT_WEEKDAY_LOAD],
      weekend: [...DEFAULT_WEEKEND_LOAD]
    },
    weeklyProfile: [1, 1, 1, 1, 1, 0.4, 0.2],
    monthlyProfile: [0.6, 0.5, 0.7, 0.8, 0.9, 1.0, 1.0, 0.9, 0.8, 0.7, 0.6, 0.5],
    budget: 0,
    instrumentation: ['Sonda Temp PT100', 'Fluxostato'],
    valves: ['Válvula de 3 vias', 'Válvula de equilíbrio'],
    controlType: 'BMS Integrado'
  });

  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);

  // Filters state
  const [brandFilter, setBrandFilter] = useState<string>('All');
  const [refrigerantFilter, setRefrigerantFilter] = useState<string>('All');
  const [compressorFilter, setCompressorFilter] = useState<string>('All');
  const [modeFilter, setModeFilter] = useState<string>('All'); // New: Cool / Heat / HeatPump
  const [minTempFilter, setMinTempFilter] = useState<string>(''); // New: Temp Min
  const [maxTempFilter, setMaxTempFilter] = useState<string>(''); // New: Temp Max
  const [searchTerm, setSearchTerm] = useState('');

  const stats = useMemo(() => {
    const loads = project.hourlyLoads;
    const max = Math.max(...loads) || 0;
    const sum = loads.reduce((a, b) => a + b, 0);
    const avg = sum / (loads.length || 1);
    const energy = sum / 1000;
    const fullLoadHours = max > 0 ? sum / max : 0;
    const loadFactor = max > 0 ? (avg / max) * 100 : 0;
    return { max, avg, energy, fullLoadHours, loadFactor };
  }, [project.hourlyLoads]);

  const filteredOEMDatabase = useMemo(() => {
    return OEM_DATABASE.filter(item => {
      // Basic Filters
      const matchesBrand = brandFilter === 'All' || item.brand === brandFilter;
      const matchesRefr = refrigerantFilter === 'All' || item.refrigerant === refrigerantFilter;
      const matchesComp = compressorFilter === 'All' || item.compressorType === compressorFilter;
      const matchesSearch = searchTerm === '' || 
        item.model.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.brand.toLowerCase().includes(searchTerm.toLowerCase());

      // New Mode Filter (Cooling Only / Heating Only / Heat Pump)
      let matchesMode = true;
      if (modeFilter === 'Cooling') {
        matchesMode = item.heatingCapacity === 0;
      } else if (modeFilter === 'Heating') {
        matchesMode = item.heatingCapacity > 0 && item.coolingCapacity < 50; // Simple logic for dedicated heat pumps
      } else if (modeFilter === 'HeatPump') {
        matchesMode = item.heatingCapacity > 0;
      }

      // New Temperature range Filter
      let matchesTemp = true;
      if (minTempFilter !== '') {
        matchesTemp = matchesTemp && item.minFluidTemp <= parseFloat(minTempFilter);
      }
      if (maxTempFilter !== '') {
        matchesTemp = matchesTemp && item.maxFluidTemp >= parseFloat(maxTempFilter);
      }

      // Intelligent Filter Logic
      let matchesIntelligent = true;
      if (intelligentFilterEnabled) {
        const capacityRange = [project.peakPower * 0.7, project.peakPower * 1.5];
        const fluidRange = [item.minFluidTemp, item.maxFluidTemp];
        
        const isHeatingMode = project.targetTemperature > 25;
        const capacityToCompare = isHeatingMode ? item.heatingCapacity : item.coolingCapacity;
        
        matchesIntelligent = 
          capacityToCompare >= capacityRange[0] && 
          capacityToCompare <= capacityRange[1] &&
          project.targetTemperature >= fluidRange[0] &&
          project.targetTemperature <= fluidRange[1];
      }

      return matchesBrand && matchesRefr && matchesComp && matchesSearch && matchesIntelligent && matchesMode && matchesTemp;
    });
  }, [brandFilter, refrigerantFilter, compressorFilter, searchTerm, intelligentFilterEnabled, project.peakPower, project.targetTemperature, modeFilter, minTempFilter, maxTempFilter]);

  const selectedUnits = useMemo(() => OEM_DATABASE.filter(e => project.selectedEquipmentIds.includes(e.id)), [project.selectedEquipmentIds]);

  const toggleEquipmentSelection = (id: string) => {
    setProject(prev => {
      const isSelected = prev.selectedEquipmentIds.includes(id);
      const newIds = isSelected ? prev.selectedEquipmentIds.filter(itemId => itemId !== id) : [...prev.selectedEquipmentIds, id];
      return { ...prev, selectedEquipmentIds: newIds };
    });
  };

  const applyStandardProfile = useCallback((index: number) => {
    const profile = STANDARD_PROFILES[index];
    if (!profile) return;
    setProject(prev => ({
      ...prev,
      loadDefinitionMode: 'Profiles',
      dailyProfiles: { weekday: [...profile.weekday], weekend: [...profile.weekend] },
      weeklyProfile: [...profile.weekly],
      monthlyProfile: [...profile.monthly]
    }));
  }, []);

  const generateYearlyLoadFromProfiles = () => {
    const newLoads = new Array(8760).fill(0);
    for (let month = 0; month < 12; month++) {
      const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
      const monthStartHour = [0, 744, 1416, 2160, 2880, 3624, 4344, 5088, 5832, 6552, 7296, 8016][month];
      for (let day = 0; day < monthDays; day++) {
        const dayOfWeek = (day + (monthStartHour / 24)) % 7;
        const isWeekend = dayOfWeek >= 5;
        const profile = isWeekend ? project.dailyProfiles.weekend : project.dailyProfiles.weekday;
        const weekFactor = project.weeklyProfile[dayOfWeek];
        const monthFactor = project.monthlyProfile[month];
        for (let hour = 0; hour < 24; hour++) {
          const idx = monthStartHour + day * 24 + hour;
          if (idx < 8760) {
            newLoads[idx] = project.peakPower * profile[hour] * weekFactor * monthFactor;
          }
        }
      }
    }
    setProject(prev => ({ ...prev, hourlyLoads: newLoads }));
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").slice(1);
      const newLoads = lines.map(line => parseFloat(line.split(",")[1])).filter(load => !isNaN(load)).slice(0, 8760);
      if (newLoads.length > 0) {
        const fullLoads = [...newLoads, ...Array(Math.max(0, 8760 - newLoads.length)).fill(0)];
        setProject(prev => ({ ...prev, hourlyLoads: fullLoads, loadDefinitionMode: '8760h' }));
      }
    };
    reader.readAsText(file);
  };

  const handleExport8760CSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Hour,Load_kW\n" 
      + project.hourlyLoads.map((v, i) => `${i + 1},${v.toFixed(2)}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `8760h_load_profile_${project.projectName.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleSaveJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(project, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `project_hvac_${project.projectName.replace(/\s+/g, '_')}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleOpenProjectJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const loadedProject = JSON.parse(text) as ProjectData;
        if (loadedProject.projectName) {
          setProject(loadedProject);
          setActiveTab('config');
        } else {
          alert("Ficheiro de projeto inválido.");
        }
      } catch (error) {
        alert("Erro ao ler o ficheiro de projeto.");
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    setGeneratedReport(null);
    try {
      const reportUnits = selectedReportUnitId 
        ? [OEM_DATABASE.find(u => u.id === selectedReportUnitId)!] 
        : selectedUnits;
      const report = await generateTechnicalReport(project, reportUnits);
      setGeneratedReport(report);
    } catch (error) {
      setGeneratedReport("Erro na geração do relatório.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleAnalyzeLoads = async () => {
    if (stats.max === 0) return;
    setIsAnalyzingLoads(true);
    setLoadAnalysisAI(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Analise o perfil de carga térmica para o projeto "${project.projectName}".
      DADOS:
      - Pico: ${stats.max.toFixed(1)} kW
      - Consumo Anual: ${stats.energy.toFixed(1)} MWh
      - Load Factor: ${stats.loadFactor.toFixed(1)}%
      - Variabilidade Semanal: ${project.weeklyProfile.join(', ')} (Seg-Dom)
      - Variabilidade Mensal: ${project.monthlyProfile.join(', ')} (Jan-Dez)
      Com base nesta estatística 8760h, sugira em 3 frases técnicas o tipo de tecnologia de compressão (Screw, Scroll, Turbocor, Centrifugal) e condensação ideal para maximizar o ROI e eficiência sazonal. Português (PT-PT).`;
      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
      setLoadAnalysisAI(response.text || "Análise indisponível.");
    } catch (error) {
      setLoadAnalysisAI("Erro técnico ao processar análise.");
    } finally {
      setIsAnalyzingLoads(false);
    }
  };

  const handleGenerateComparisonAnalysis = async () => {
    if (selectedUnits.length < 2) {
      setComparisonAnalysis("Selecione pelo menos 2 equipamentos para análise comparativa.");
      return;
    }
    setIsComparing(true);
    setComparisonAnalysis(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Analise comparativamente os seguintes equipamentos HVAC para o projecto "${project.projectName}" em ${project.location}:
      ${selectedUnits.map(u => `- ${u.brand} ${u.model}: ESEER ${u.eseer.toFixed(2)}, EER ${u.eer.toFixed(2)}, Preço ${u.price.toLocaleString('pt-PT')}€, Fluido ${u.refrigerant}`).join('\n')}
      Forneça um parecer técnico em Português (PT-PT) sobre a melhor escolha baseada em eficiência e ROI. SEM Markdown.`;
      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
      setComparisonAnalysis(response.text || "Análise indisponível.");
    } catch (error) {
      setComparisonAnalysis("Erro técnico ao processar análise.");
    } finally {
      setIsComparing(false);
    }
  };

  const reportPages = useMemo(() => {
    if (!generatedReport) return [];
    return generatedReport.split('[QUEBRA_DE_PAGINA]').map(p => p.trim()).filter(p => p.length > 0);
  }, [generatedReport]);

  const renderReportPage = (content: string, index: number) => {
    const isCover = index === 0;
    return (
      <div key={index} className={`bg-white mx-auto shadow-2xl mb-12 relative p-[25mm] w-[210mm] min-h-[297mm] flex flex-col text-slate-800 font-serif leading-relaxed page-break ${isCover ? 'items-center justify-center text-center border-t-[12px] border-blue-600' : ''}`}>
        <div className="flex-1 w-full overflow-hidden">
          {content.split('\n').map((line, lIdx) => {
            const trimmedLine = line.trim();
            if (!trimmedLine) return <div key={lIdx} className="h-4" />;
            const isTitle = trimmedLine.toUpperCase() === trimmedLine && trimmedLine.length > 3;
            return (
              <p key={lIdx} className={`${isTitle ? 'text-2xl font-black text-slate-900 mt-8 mb-6 border-b pb-2 uppercase font-sans' : 'text-[13px] mb-4 text-justify font-normal text-slate-700'}`}>
                {trimmedLine}
              </p>
            );
          })}
        </div>
        {!isCover && <div className="absolute bottom-[10mm] left-0 right-0 px-[25mm] flex justify-between text-[9px] text-slate-400 font-sans border-t pt-4"><span>KOELHO2000 - José Coelho (OET 2321)</span><span>Página {index + 1}</span></div>}
      </div>
    );
  };

  const handleExportDOC = () => {
    if (!selectionSheetRef.current) return;
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'></head><body>`;
    const sourceHTML = header + selectionSheetRef.current.innerHTML + `</body></html>`;
    const blob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Folha_Selecao_${selectedReportUnitId || 'equip'}.doc`;
    a.click();
  };

  const handleExportHTML = () => {
    if (!selectionSheetRef.current) return;
    const content = selectionSheetRef.current.innerHTML;
    const blob = new Blob([`<html><head><style>body{font-family:sans-serif;padding:40px;} table{width:100%;border-collapse:collapse;} td{padding:8px;border:1px solid #eee;}</style></head><body>${content}</body></html>`], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Folha_Selecao_${selectedReportUnitId || 'equip'}.html`;
    a.click();
  };

  const handleCopyToClipboard = async () => {
    if (!selectionSheetRef.current) return;
    try {
      const html = selectionSheetRef.current.innerHTML;
      const data = [new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }) })];
      await navigator.clipboard.write(data);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) { console.error(err); }
  };

  const efficiencyChartData = useMemo(() => {
    const xPoints = [25, 50, 75, 100];
    return xPoints.map(x => {
      const point: any = { x: `${x}%` };
      selectedUnits.forEach(u => {
        const found = u.efficiencyCurve.find(p => p.x === x);
        if (found) point[u.model] = found.y;
      });
      return point;
    });
  }, [selectedUnits]);

  const mainEquipment = useMemo(() => OEM_DATABASE.find(u => u.id === selectedReportUnitId) || selectedUnits[0] || null, [selectedReportUnitId, selectedUnits]);

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      onNew={() => window.location.reload()} 
      onOpen={() => projectFileInputRef.current?.click()} 
      onSave={handleSaveJSON}
    >
      
      <input type="file" ref={projectFileInputRef} onChange={handleOpenProjectJSON} className="hidden" accept=".json" />
      <input type="file" ref={fileInputRef} onChange={handleImportCSV} className="hidden" accept=".csv" />

      {viewingEquipmentId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl p-10 relative">
            <button onClick={() => setViewingEquipmentId(null)} className="absolute top-8 right-8 p-3 hover:bg-slate-100 rounded-full transition text-slate-400">
              <X size={24} />
            </button>
            {(() => {
              const equip = OEM_DATABASE.find(e => e.id === viewingEquipmentId);
              if (!equip) return <p>Equipamento não encontrado.</p>;
              return (
                <div className="space-y-6">
                  <h3 className="text-3xl font-black text-slate-900">{equip.brand} {equip.model}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl"><span className="text-[10px] uppercase font-black text-slate-400 block">Capacidade Cooling</span><div className="text-xl font-black">{equip.coolingCapacity.toFixed(1)} kW</div></div>
                    <div className="bg-slate-50 p-4 rounded-2xl"><span className="text-[10px] uppercase font-black text-slate-400 block">ESEER</span><div className="text-xl font-black text-emerald-600">{equip.eseer.toFixed(2)}</div></div>
                    <div className="bg-slate-50 p-4 rounded-2xl"><span className="text-[10px] uppercase font-black text-slate-400 block">Fluido</span><div className="text-xl font-black">{equip.refrigerant}</div></div>
                    <div className="bg-slate-50 p-4 rounded-2xl"><span className="text-[10px] uppercase font-black text-slate-400 block">Compressor</span><div className="text-xl font-black">{equip.compressorType}</div></div>
                  </div>
                  <div className="border-t pt-4 text-slate-600 space-y-2">
                    <p><strong>Limites Ambiente:</strong> {equip.minAmbientTemp}ºC a {equip.maxAmbientTemp}ºC</p>
                    <p><strong>Limites Fluido:</strong> {equip.minFluidTemp}ºC a {equip.maxFluidTemp}ºC</p>
                    <p><strong>Dimensões:</strong> {equip.dimensions} mm</p>
                    <p><strong>Peso:</strong> {equip.weight.toLocaleString()} kg</p>
                  </div>
                  <button onClick={() => { toggleEquipmentSelection(equip.id); setViewingEquipmentId(null); }} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition">
                    {project.selectedEquipmentIds.includes(equip.id) ? 'Remover Selecção' : 'Adicionar à Selecção'}
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {activeTab === 'home' && (
        <div className="space-y-12 py-10 animate-in fade-in duration-500">
          <div className="flex flex-col md:flex-row justify-between items-center gap-12">
            <div className="flex-1 space-y-6 text-center md:text-left">
              <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-widest">
                <Award size={14} className="mr-2" /> Koelho2000 Profissional Selection
              </div>
              <h2 className="text-6xl md:text-7xl font-black text-slate-900 leading-tight">HVAC <span className="text-blue-600">Selection</span> Suite</h2>
              <p className="text-xl text-slate-500 max-w-xl mx-auto md:mx-0">Plataforma de engenharia térmica para selecção e modelação dinâmica de chillers e bombas de calor.</p>
              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                <button onClick={() => setActiveTab('config')} className="px-10 py-5 bg-slate-900 text-white rounded-[30px] font-black uppercase tracking-widest hover:bg-slate-800 transition shadow-2xl active:scale-95">Configurar Projecto</button>
                <button onClick={() => setActiveTab('selection')} className="px-10 py-5 bg-white border-2 border-slate-100 text-slate-700 rounded-[30px] font-black uppercase tracking-widest hover:bg-slate-50 transition active:scale-95">Explorar OEM</button>
              </div>
            </div>
            <div className="flex-1 w-full max-w-lg bg-gradient-to-br from-blue-600 to-blue-800 rounded-[80px] p-12 text-white shadow-[0_50px_100px_-20px_rgba(37,99,235,0.4)] relative overflow-hidden">
               <Wind className="absolute -top-10 -right-10 opacity-10" size={300} />
               <h3 className="text-3xl font-black mb-10 relative z-10">Status do Projecto</h3>
               <div className="space-y-8 relative z-10">
                 <div className="border-b border-white/20 pb-4 flex justify-between items-end">
                   <div><span className="text-[10px] uppercase font-black opacity-60 tracking-widest">Carga de Pico</span><div className="text-4xl font-black">{project.peakPower} kW</div></div>
                   <Activity className="opacity-40" size={32} />
                 </div>
                 <div className="border-b border-white/20 pb-4 flex justify-between items-end">
                   <div><span className="text-[10px] uppercase font-black opacity-60 tracking-widest">Equipamentos</span><div className="text-4xl font-black">{project.selectedEquipmentIds.length}</div></div>
                   <Database className="opacity-40" size={32} />
                 </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'config' && (
        <div className="space-y-10 animate-in slide-in-from-bottom-6">
          <header>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Dados do Projecto</h2>
            <p className="text-slate-500 mt-2">Identificação oficial da obra e entidades envolvidas.</p>
          </header>

          <div className="bg-white p-10 rounded-[50px] border shadow-2xl grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Referência da Obra</label>
              <input 
                type="text" 
                value={project.workReference} 
                onChange={e => setProject({...project, workReference: e.target.value})} 
                className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-blue-500 transition-all outline-none"
                placeholder="FO-00-00"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Nome do Projecto</label>
              <input 
                type="text" 
                value={project.projectName} 
                onChange={e => setProject({...project, projectName: e.target.value})} 
                className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-blue-500 transition-all outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Nome do Cliente</label>
              <input 
                type="text" 
                value={project.clientName} 
                onChange={e => setProject({...project, clientName: e.target.value})} 
                className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-blue-500 transition-all outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Nome da Instalação</label>
              <input 
                type="text" 
                value={project.installationName} 
                onChange={e => setProject({...project, installationName: e.target.value})} 
                className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-blue-500 transition-all outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Local da Instalação</label>
              <input 
                type="text" 
                value={project.location} 
                onChange={e => setProject({...project, location: e.target.value})} 
                className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-blue-500 transition-all outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Nome Técnico Responsável</label>
              <input 
                type="text" 
                value={project.technicianName} 
                onChange={e => setProject({...project, technicianName: e.target.value})} 
                className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-blue-500 transition-all outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Empresa de Auditoria</label>
              <input 
                type="text" 
                value={project.auditCompany} 
                onChange={e => setProject({...project, auditCompany: e.target.value})} 
                className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-blue-500 transition-all outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Empresa Proponente</label>
              <input 
                type="text" 
                value={project.companyName} 
                onChange={e => setProject({...project, companyName: e.target.value})} 
                className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-blue-500 transition-all outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={() => setActiveTab('loads')} className="px-12 py-5 bg-blue-600 text-white rounded-[25px] font-black uppercase tracking-widest flex items-center gap-4 hover:bg-blue-700 transition shadow-2xl shadow-blue-600/30 active:scale-95">
              Próximo: Cargas <ChevronRight size={24} />
            </button>
          </div>
        </div>
      )}

      {activeTab === 'loads' && (
        <div className="space-y-10 animate-in slide-in-from-bottom-6">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">Análise de Carga Horária</h2>
              <p className="text-slate-500 mt-2">Defina o comportamento térmico para simulação de performance 8760h.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="bg-slate-100 p-1.5 rounded-2xl flex">
                <button 
                  onClick={() => setProject({...project, loadDefinitionMode: 'Profiles'})}
                  className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${project.loadDefinitionMode === 'Profiles' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                >
                  Modo Perfil
                </button>
                <button 
                  onClick={() => setProject({...project, loadDefinitionMode: '8760h'})}
                  className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${project.loadDefinitionMode === '8760h' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                >
                  Import 8760h
                </button>
              </div>
              <button onClick={() => fileInputRef.current?.click()} className="px-6 py-3 bg-white border-2 border-slate-100 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 active:scale-95">
                <FileUp size={18} /> Carregar CSV
              </button>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-8 rounded-[40px] border shadow-xl space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">Potência Nominal (kW)</label>
                  <input type="number" value={project.peakPower} onChange={e => setProject({...project, peakPower: Number(e.target.value)})} className="w-full text-2xl font-black text-blue-600 outline-none p-3 bg-slate-50 rounded-2xl focus:ring-2 ring-blue-500 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">Temp. Saída Fluid (ºC)</label>
                  <input type="number" value={project.targetTemperature} onChange={e => setProject({...project, targetTemperature: Number(e.target.value)})} className="w-full text-2xl font-black text-indigo-600 outline-none p-3 bg-slate-50 rounded-2xl focus:ring-2 ring-indigo-500 transition-all" />
                </div>
                <div className="pt-4 border-t border-slate-100">
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-3 block">Selecção de Perfil</label>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                    {STANDARD_PROFILES.map((p, idx) => (
                      <button key={idx} onClick={() => applyStandardProfile(idx)} className="w-full text-left p-3 text-xs font-bold rounded-xl hover:bg-blue-50 hover:text-blue-600 border border-transparent hover:border-blue-100 transition-all flex items-center justify-between">
                        {p.name} <ChevronRight size={14} className="opacity-30" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="bg-slate-900 p-8 rounded-[40px] text-white shadow-2xl">
                <h4 className="text-[10px] font-black uppercase opacity-40 mb-6 tracking-widest">Resumo Anual</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center"><span className="text-xs text-slate-400">Consumo MWh</span><span className="text-lg font-black text-emerald-400">{stats.energy.toFixed(1)}</span></div>
                  <div className="flex justify-between items-center"><span className="text-xs text-slate-400">Load Factor</span><span className="text-lg font-black">{stats.loadFactor.toFixed(1)}%</span></div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-3 space-y-10">
              <div className="bg-white p-8 rounded-[40px] border shadow-lg grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                   <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><Clock size={16} className="text-blue-500"/> Procura Diária (Dias Úteis)</h4>
                   <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={project.dailyProfiles.weekday.map((v, i) => ({ h: i, v }))}>
                        <Tooltip contentStyle={{borderRadius: '12px', border: 'none'}} />
                        <Bar dataKey="v" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                   </div>
                </div>
                <div className="space-y-4">
                   <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><Calendar size={16} className="text-indigo-500"/> Sazonalidade Mensal</h4>
                   <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={project.monthlyProfile.map((v, i) => ({ m: ['J','F','M','A','M','J','J','A','S','O','N','D'][i], v }))}>
                        <XAxis dataKey="m" axisLine={false} tickLine={false} fontSize={10} />
                        <Bar dataKey="v" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                   </div>
                </div>
              </div>

              <div className="bg-slate-900 p-10 rounded-[50px] text-white shadow-2xl">
                <div className="flex justify-between items-center mb-10">
                  <h4 className="text-sm font-black uppercase opacity-40 tracking-[0.2em] flex items-center gap-3"><Activity size={18}/> Perfil de Carga Anual Simulado (8760h)</h4>
                  <div className="flex gap-3">
                    <button onClick={handleExport8760CSV} className="px-6 py-3 bg-white/10 text-white border border-white/20 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition flex items-center gap-2">
                      <Download size={14} /> Exportar CSV
                    </button>
                    <button onClick={generateYearlyLoadFromProfiles} className="px-8 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition">Calcular Modelo</button>
                  </div>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={project.hourlyLoads.map((v, i) => ({ v }))}>
                      <Area type="monotone" dataKey="v" stroke="#3b82f6" strokeWidth={2} fill="#3b82f6" fillOpacity={0.1} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-12 rounded-[50px] border shadow-2xl space-y-10 animate-in fade-in slide-in-from-bottom-6">
            <div className="flex flex-col md:flex-row justify-between items-start gap-8 border-b pb-8">
              <div className="flex-1 space-y-4">
                <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3"><Info className="text-blue-600" /> Nota de Análise da Carga (Estatística 8760h)</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Resumo técnico da distribuição de energia e perfis de procura térmica simulados para o ciclo anual completo.
                </p>
              </div>
              <button 
                onClick={handleAnalyzeLoads} 
                disabled={isAnalyzingLoads || stats.max === 0}
                className="px-10 py-5 bg-indigo-600 text-white rounded-[25px] font-black uppercase tracking-widest flex items-center gap-4 hover:bg-indigo-700 transition shadow-2xl active:scale-95 disabled:opacity-50"
              >
                {isAnalyzingLoads ? <RefreshCw className="animate-spin" /> : <Lightbulb />}
                {isAnalyzingLoads ? 'Analisando...' : 'Gerar Recomendação IA'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="p-6 bg-slate-50 rounded-3xl space-y-3">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Análise Diária</span>
                <div className="text-sm font-bold text-slate-700">Pico: <span className="text-blue-600 font-black">{stats.max.toFixed(1)} kW</span></div>
                <div className="text-xs text-slate-500">Distribuição baseada em regime de ocupação {(project.loadDefinitionMode === 'Profiles' ? 'estático' : 'importado')}.</div>
              </div>
              <div className="p-6 bg-slate-50 rounded-3xl space-y-3">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Análise Semanal</span>
                <div className="text-sm font-bold text-slate-700">Factor Fim de Semana: <span className="text-indigo-600 font-black">{((project.weeklyProfile[5] + project.weeklyProfile[6]) / 2 * 100).toFixed(0)}%</span></div>
                <div className="text-xs text-slate-500">Redução de carga média em regime de repouso semanal.</div>
              </div>
              <div className="p-6 bg-slate-50 rounded-3xl space-y-3">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Análise Mensal</span>
                <div className="text-sm font-bold text-slate-700">Amplitude Sazonal: <span className="text-emerald-600 font-black">{(Math.max(...project.monthlyProfile) - Math.min(...project.monthlyProfile)).toFixed(2)}</span></div>
                <div className="text-xs text-slate-500">Diferença de procura entre meses de pico e regime reduzido.</div>
              </div>
              <div className="p-6 bg-slate-50 rounded-3xl space-y-3">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Análise Anual</span>
                <div className="text-sm font-bold text-slate-700">Eficiência Alvo: <span className="text-blue-900 font-black">{stats.loadFactor < 40 ? 'Alta' : 'Padrão'}</span></div>
                <div className="text-xs text-slate-500">Load Factor de {stats.loadFactor.toFixed(1)}% sugere necessidade de regulação fina.</div>
              </div>
            </div>

            {loadAnalysisAI && (
              <div className="p-8 bg-indigo-50 border-2 border-indigo-100 rounded-[35px] relative animate-in zoom-in-95">
                <div className="absolute -top-4 left-10 px-4 py-1 bg-indigo-600 text-white text-[10px] font-black uppercase rounded-full">Recomendação do Especialista IA</div>
                <p className="text-indigo-900 text-lg font-medium italic leading-relaxed">
                  "{loadAnalysisAI}"
                </p>
                <div className="mt-6 flex items-center gap-4 text-indigo-400">
                  <CheckCircle size={20} />
                  <span className="text-xs font-bold uppercase tracking-widest">Configuração sugerida para optimização de CAPEX/OPEX</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'selection' && (
        <div className="space-y-10 animate-in slide-in-from-bottom-6">
          <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-8 rounded-[40px] border shadow-xl">
            <div className="flex-1">
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">Catálogo OEM Multimarca</h2>
              <p className="text-slate-500 mt-2">Selecção técnica de equipamentos com filtragem inteligente por carga.</p>
            </div>
            <div className="flex flex-wrap gap-4">
               <button 
                onClick={() => setIntelligentFilterEnabled(!intelligentFilterEnabled)} 
                className={`px-6 py-4 rounded-[25px] text-xs font-black uppercase tracking-widest flex items-center gap-3 transition-all shadow-xl active:scale-95 ${intelligentFilterEnabled ? 'bg-blue-600 text-white' : 'bg-white border-2 border-slate-100 text-blue-600'}`}
               >
                 <Sparkles size={20} /> Filtro Inteligente {intelligentFilterEnabled ? 'ON' : 'OFF'}
               </button>
               <div className="relative">
                 <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                 <input type="text" placeholder="Procurar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-14 pr-8 py-4 bg-slate-50 rounded-[25px] border-2 border-transparent focus:border-blue-500 transition-all font-bold w-64" />
               </div>
               <button onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} className={`p-4 rounded-[25px] transition-all shadow-lg active:scale-95 ${showAdvancedFilters ? 'bg-blue-600 text-white' : 'bg-slate-900 text-white'}`}>
                 <SlidersHorizontal size={24} />
               </button>
            </div>
          </header>

          {showAdvancedFilters && (
            <div className="bg-white p-10 rounded-[40px] border shadow-2xl space-y-8 animate-in slide-in-from-top-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">Marca</label>
                  <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-bold">
                    <option value="All">Todas as Marcas</option>
                    {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">Refrigerante</label>
                  <select value={refrigerantFilter} onChange={e => setRefrigerantFilter(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-bold">
                    <option value="All">Todos os Fluidos</option>
                    {Object.values(Refrigerant).map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">Compressor</label>
                  <select value={compressorFilter} onChange={e => setCompressorFilter(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-bold">
                    <option value="All">Todos os Compressores</option>
                    {Object.values(CompressorType).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4 border-t border-slate-100">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">Modo de Operação</label>
                  <select value={modeFilter} onChange={e => setModeFilter(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-bold">
                    <option value="All">Todos (Cool & Heat)</option>
                    <option value="Cooling">Só Frio (Cool)</option>
                    <option value="Heating">Só Calor (Heat)</option>
                    <option value="HeatPump">Bomba Calor (Reversível)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">Temp. Fluido Mínima (ºC)</label>
                  <div className="relative">
                    <ThermometerSnowflake className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400" size={18} />
                    <input type="number" value={minTempFilter} onChange={e => setMinTempFilter(e.target.value)} placeholder="Min ºC" className="w-full pl-12 p-4 bg-slate-50 rounded-2xl font-bold" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">Temp. Fluido Máxima (ºC)</label>
                  <div className="relative">
                    <Flame className="absolute left-4 top-1/2 -translate-y-1/2 text-red-400" size={18} />
                    <input type="number" value={maxTempFilter} onChange={e => setMaxTempFilter(e.target.value)} placeholder="Max ºC" className="w-full pl-12 p-4 bg-slate-50 rounded-2xl font-bold" />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-[50px] border shadow-2xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] border-b">
                <tr>
                  <th className="px-10 py-8">Equipamento / Marca</th>
                  <th className="px-10 py-8">Capacidade (kW)</th>
                  <th className="px-10 py-8">ESEER</th>
                  <th className="px-10 py-8">Limites de Operação</th>
                  <th className="px-10 py-8 text-right">Selecção</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOEMDatabase.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-10 py-8">
                      <div>
                        <span className="font-black text-slate-900 text-lg block">{item.brand}</span>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{item.model}</span>
                        <div className="flex gap-2 mt-2">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-black rounded-md">{item.compressorType}</span>
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-black rounded-md">{item.refrigerant}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <div className="space-y-1">
                        <span className="text-xl font-black text-slate-900">{item.coolingCapacity.toFixed(1)} <span className="text-[10px] text-slate-400">(Cool)</span></span>
                        {item.heatingCapacity > 0 && <span className="block text-[11px] font-bold text-red-500">+{item.heatingCapacity.toFixed(1)} kW (Heat)</span>}
                      </div>
                    </td>
                    <td className="px-10 py-8"><span className="text-2xl font-black text-emerald-600">{item.eseer.toFixed(2)}</span></td>
                    <td className="px-10 py-8">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[11px] font-black text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 w-fit">
                          <Sun size={14}/> {item.minAmbientTemp}ºC a {item.maxAmbientTemp}ºC (Amb)
                        </div>
                        <div className="flex items-center gap-2 text-[11px] font-black text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100 w-fit">
                          <Droplets size={14}/> {item.minFluidTemp}ºC a {item.maxFluidTemp}ºC (Fluid)
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8 text-right">
                       <div className="flex justify-end gap-3">
                         <button onClick={() => setViewingEquipmentId(item.id)} className="p-4 bg-white border border-slate-100 text-slate-400 hover:text-blue-600 hover:shadow-lg rounded-2xl transition-all active:scale-90 shadow-sm"><Eye size={24} /></button>
                         <button onClick={() => toggleEquipmentSelection(item.id)} className={`px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 ${project.selectedEquipmentIds.includes(item.id) ? 'bg-red-500 text-white shadow-red-200' : 'bg-slate-100 text-slate-600 hover:bg-blue-600 hover:text-white shadow-slate-200'}`}>{project.selectedEquipmentIds.includes(item.id) ? 'Remover' : 'Seleccionar'}</button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'analysis' && (
        <div className="space-y-12 animate-in slide-in-from-bottom-6">
          <header>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Análise Comparativa & Eficiência</h2>
            <p className="text-slate-500 mt-2">Validação técnica e comparação de curvas de carga parcial (part-load).</p>
          </header>
          
          {selectedUnits.length === 0 ? (
            <div className="p-32 bg-slate-100/50 border-4 border-dashed border-slate-200 rounded-[60px] text-center w-full max-w-5xl mx-auto space-y-6">
               <div className="bg-white w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-sm text-slate-200"><BarChart2 size={40} /></div>
               <p className="text-slate-400 font-medium italic">Seleccione equipamentos no catálogo OEM para comparar.</p>
            </div>
          ) : (
            <div className="space-y-16">
              <div className="bg-white p-12 rounded-[50px] border shadow-2xl overflow-x-auto">
                <h3 className="text-2xl font-black mb-10 flex items-center gap-4"><Table className="text-blue-500" size={28} /> Quadro Comparativo</h3>
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[11px] font-black uppercase text-slate-400 tracking-widest border-b">
                    <tr>
                      <th className="px-6 py-5">Solução HVAC</th>
                      <th className="px-6 py-5 text-center">ESEER</th>
                      <th className="px-6 py-5 text-center">EER / COP</th>
                      <th className="px-6 py-5 text-center">Preço Est. (€)</th>
                      <th className="px-6 py-5 text-right">Relatório</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedUnits.map(u => (
                      <tr key={u.id} className={`hover:bg-slate-50/50 transition-colors ${selectedReportUnitId === u.id ? 'bg-blue-50/30' : ''}`}>
                        <td className="px-6 py-6">
                          <div className="font-black text-slate-900">{u.brand} {u.model}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">{u.compressorType} / {u.refrigerant}</div>
                        </td>
                        <td className="px-6 py-6 text-center font-black text-2xl text-emerald-600">{u.eseer.toFixed(2)}</td>
                        <td className="px-6 py-6 text-center font-bold text-slate-700">{u.eer.toFixed(2)} / {u.cop.toFixed(2)}</td>
                        <td className="px-6 py-6 text-center font-black text-slate-900">{u.price.toLocaleString('pt-PT')}</td>
                        <td className="px-6 py-6 text-right">
                          <button onClick={() => setSelectedReportUnitId(selectedReportUnitId === u.id ? null : u.id)} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ml-auto ${selectedReportUnitId === u.id ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                            {selectedReportUnitId === u.id ? <Check size={14}/> : <Star size={14}/>} {selectedReportUnitId === u.id ? 'Principal' : 'Seleccionar'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="bg-white p-12 rounded-[50px] border shadow-2xl h-[500px] flex flex-col">
                  <h3 className="text-2xl font-black mb-10 flex items-center gap-4"><TrendingUp className="text-emerald-500" size={28} /> Curvas de Eficiência</h3>
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={efficiencyChartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="x" stroke="#94a3b8" fontSize={11} fontStyle="bold" />
                        <YAxis stroke="#94a3b8" fontSize={11} fontStyle="bold" domain={[0.6, 1.1]} />
                        <Tooltip />
                        <Legend />
                        {selectedUnits.map((u, i) => (
                          <Line key={u.id} type="monotone" dataKey={u.model} stroke={['#3b82f6','#10b981','#f59e0b','#ef4444'][i % 4]} strokeWidth={4} dot={{r:6}} />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-slate-900 p-12 rounded-[50px] text-white shadow-2xl relative overflow-hidden flex flex-col">
                  <Sparkles className="absolute -top-10 -right-10 text-blue-500 opacity-10" size={200} />
                  <div className="relative z-10 space-y-8 flex-1 flex flex-col">
                    <div className="flex justify-between items-start gap-6">
                      <h3 className="text-3xl font-black tracking-tight">Parecer IA Especialista</h3>
                      <button onClick={handleGenerateComparisonAnalysis} disabled={isComparing} className="px-10 py-5 bg-blue-600 text-white rounded-3xl font-black uppercase tracking-widest flex items-center gap-4 hover:bg-blue-700 transition active:scale-95 disabled:opacity-50">
                        {isComparing ? <RefreshCw className="animate-spin" size={24} /> : <Wand2 size={24} />} 
                        {isComparing ? 'Analisando...' : 'Gerar Parecer'}
                      </button>
                    </div>
                    
                    {comparisonAnalysis && (
                      <div className="p-8 bg-white/5 rounded-[40px] text-lg leading-relaxed border border-white/10 flex-1 overflow-y-auto custom-scrollbar italic text-slate-300">
                        {comparisonAnalysis}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'selectionSheet' && (
        <div className="space-y-16 animate-in slide-in-from-bottom-6 pb-32">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 no-print">
            <div>
              <h2 className="text-5xl font-black text-slate-900 tracking-tight">Folha de Seleção</h2>
              <p className="text-slate-500 text-lg mt-2">Documentação técnica para incorporação em projectos de execução.</p>
            </div>
            <div className="flex flex-wrap gap-4">
              {mainEquipment && (
                <>
                  <button onClick={handleCopyToClipboard} className={`px-8 py-4 rounded-[25px] text-[11px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl active:scale-95 transition-all ${copySuccess ? 'bg-emerald-500 text-white' : 'bg-white text-slate-700 hover:bg-slate-50 border-2 border-slate-100'}`}>
                    {copySuccess ? <Check size={20}/> : <Copy size={20}/>} {copySuccess ? 'Copiado!' : 'Copiar para Word'}
                  </button>
                  <button onClick={handleExportHTML} className="px-8 py-4 bg-white text-slate-700 rounded-[25px] text-[11px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl hover:bg-slate-50 border-2 border-slate-100 active:scale-95">
                    <FileCode size={20}/> HTML
                  </button>
                  <button onClick={handleExportDOC} className="px-8 py-4 bg-white text-slate-700 rounded-[25px] text-[11px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl hover:bg-slate-50 border-2 border-slate-100 active:scale-95">
                    <FileOutput size={20}/> Word (DOC)
                  </button>
                  <button onClick={() => window.print()} className="px-10 py-5 bg-slate-900 text-white rounded-[25px] font-black uppercase tracking-widest flex items-center gap-4 shadow-2xl hover:bg-slate-800 transition active:scale-95">
                    <Printer size={24}/> Imprimir A4
                  </button>
                </>
              )}
            </div>
          </header>

          {!mainEquipment ? (
            <div className="p-32 bg-slate-100/50 border-4 border-dashed border-slate-200 rounded-[60px] text-center w-full max-w-5xl mx-auto space-y-6">
              <ClipboardList className="mx-auto text-slate-200" size={100} />
              <p className="text-slate-400 font-medium italic">Defina uma "Solução Principal" na aba Análise para visualizar a folha de dados.</p>
            </div>
          ) : (
            <div className="w-[210mm] min-h-[297mm] bg-white shadow-2xl mx-auto p-16 text-[#2a3f5f] font-sans text-[11px] border border-slate-200 selection-sheet-printable" ref={selectionSheetRef}>
              <div className="flex justify-between items-start mb-12 border-b-4 border-blue-900 pb-8">
                <div>
                  <h1 className="text-5xl font-black text-blue-900 tracking-tighter">{mainEquipment.brand}</h1>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Koelho2000 Pro Selection Suite</p>
                </div>
                <div className="text-right space-y-3">
                  <div className="text-2xl font-black uppercase text-blue-900">Folha de Selecção</div>
                  <div className="grid grid-cols-2 gap-x-6 text-[10px] font-bold text-slate-500">
                    <span className="text-right uppercase opacity-60">Ref:</span><span className="text-slate-900 text-left font-black">{project.workReference}</span>
                    <span className="text-right uppercase opacity-60">Projecto:</span><span className="text-slate-900 text-left">{project.projectName}</span>
                    <span className="text-right uppercase opacity-60">Instalação:</span><span className="text-slate-900 text-left">{project.installationName} ({project.location})</span>
                    <span className="text-right uppercase opacity-60">Cliente:</span><span className="text-slate-900 text-left">{project.clientName}</span>
                    <span className="text-right uppercase opacity-60">Auditores:</span><span className="text-slate-900 text-left">{project.auditCompany}</span>
                    <span className="text-right uppercase opacity-60">Engenheiro:</span><span className="text-slate-900 text-left">{project.technicianName}</span>
                    <span className="text-right uppercase opacity-60">Data:</span><span className="text-slate-900 text-left">{new Date().toLocaleDateString('pt-PT')}</span>
                  </div>
                </div>
              </div>

              <div className="mb-12">
                <h2 className="text-4xl font-black text-blue-900 mb-2">{mainEquipment.model}</h2>
                <p className="text-blue-500 font-black text-xl uppercase tracking-widest">{mainEquipment.compressorType}-cooled Industrial Solution</p>
              </div>

              <div className="grid grid-cols-2 gap-16">
                <section className="space-y-6">
                  <h3 className="bg-[#1e3a8a] text-white px-5 py-3 font-black uppercase tracking-widest rounded-xl text-xs">Informação de Performance</h3>
                  <table className="w-full border-separate border-spacing-y-1">
                    <tbody>
                      <tr className="bg-slate-50"><td className="px-4 py-3 font-bold text-slate-500">Capacidade Arrefecimento (kW)</td><td className="px-4 py-3 text-right font-black text-slate-900 text-lg">{mainEquipment.coolingCapacity.toFixed(1)}</td></tr>
                      {mainEquipment.heatingCapacity > 0 && <tr className="bg-slate-50"><td className="px-4 py-3 font-bold text-slate-500">Capacidade Aquecimento (kW)</td><td className="px-4 py-3 text-right font-black text-red-600 text-lg">{mainEquipment.heatingCapacity.toFixed(1)}</td></tr>}
                      <tr className="bg-slate-50"><td className="px-4 py-3 font-bold text-slate-500">Eficiência ESEER</td><td className="px-4 py-3 text-right font-black text-emerald-600 text-lg">{mainEquipment.eseer.toFixed(2)}</td></tr>
                      <tr className="bg-slate-50"><td className="px-4 py-3 font-bold text-slate-500">Consumo Elétrico Nominal (kW)</td><td className="px-4 py-3 text-right font-black text-slate-900">{(mainEquipment.coolingCapacity / mainEquipment.eer).toFixed(1)}</td></tr>
                      <tr className="bg-slate-50"><td className="px-4 py-3 font-bold text-slate-500">Fluido Refrigerante</td><td className="px-4 py-3 text-right font-black text-blue-900">{mainEquipment.refrigerant}</td></tr>
                      <tr className="bg-slate-50"><td className="px-4 py-3 font-bold text-slate-500">Peso Unidade (kg)</td><td className="px-4 py-3 text-right font-black text-slate-900">{mainEquipment.weight.toLocaleString()}</td></tr>
                      <tr className="bg-slate-50"><td className="px-4 py-3 font-bold text-slate-500">Dimensões (LxPxH mm)</td><td className="px-4 py-3 text-right font-black text-slate-900">{mainEquipment.dimensions}</td></tr>
                      <tr className="bg-slate-50"><td className="px-4 py-3 font-bold text-slate-500">Nível Sonoro dB(A)</td><td className="px-4 py-3 text-right font-black text-slate-900">{mainEquipment.noiseLevel}.0</td></tr>
                    </tbody>
                  </table>
                </section>
                
                <section className="space-y-6">
                  <h3 className="bg-[#1e3a8a] text-white px-5 py-3 font-black uppercase tracking-widest rounded-xl text-xs">Condições de Operação</h3>
                  <div className="bg-slate-50 p-6 rounded-2xl space-y-6 border border-slate-100">
                    <div className="space-y-3">
                      <span className="font-black text-[10px] uppercase text-blue-800 tracking-widest block border-b pb-2 border-blue-100">Evaporador / Circuito Primário</span>
                      <div className="grid grid-cols-2 gap-y-2 text-[11px]">
                        <span className="text-slate-500">Temp. Saída Fluid:</span><span className="font-black text-right">{project.targetTemperature}.0 ºC</span>
                        <span className="text-slate-500">Caudal Fluid:</span><span className="font-black text-right">{(mainEquipment.coolingCapacity/4.186/5).toFixed(2)} l/s</span>
                        <span className="text-slate-500">Tipo Fluid:</span><span className="font-black text-right">Água Fresca</span>
                      </div>
                    </div>
                    <div className="space-y-3 pt-4">
                      <span className="font-black text-[10px] uppercase text-indigo-800 tracking-widest block border-b pb-2 border-indigo-100">Condições de Ar Exterior</span>
                      <div className="grid grid-cols-2 gap-y-2 text-[11px]">
                        <span className="text-slate-500">Limites Ambiente:</span><span className="font-black text-right">{mainEquipment.minAmbientTemp}ºC a {mainEquipment.maxAmbientTemp}ºC</span>
                        <span className="text-slate-500">Tipo de Condensação:</span><span className="font-black text-right">{mainEquipment.condensationType}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6 bg-slate-900 text-white rounded-2xl flex justify-between items-center shadow-lg">
                    <div className="flex items-center gap-3">
                       <Calculator className="text-blue-400" size={20} />
                       <span className="text-[10px] uppercase font-black tracking-widest">Valor do Investimento</span>
                    </div>
                    <span className="text-2xl font-black">{mainEquipment.price.toLocaleString('pt-PT')} €</span>
                  </div>

                  <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl flex items-center gap-4">
                     <Award className="text-blue-900" size={32} />
                     <div className="text-[9px] font-black uppercase tracking-tighter text-blue-900 leading-tight">
                       José Coelho • PQ00851 • OET 2321<br/>Certificação AQUA+ AQ0222
                     </div>
                  </div>
                </section>
              </div>

              <div className="mt-12 space-y-6">
                <h3 className="bg-[#1e3a8a] text-white px-5 py-3 font-black uppercase tracking-widest rounded-xl text-xs">Curva de Eficiência vs Carga Partilhada</h3>
                <div className="grid grid-cols-3 gap-8 items-center bg-slate-50 p-8 rounded-3xl border border-slate-100">
                  <div className="col-span-2 h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={mainEquipment.efficiencyCurve}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis 
                          dataKey="x" 
                          stroke="#64748b" 
                          fontSize={10} 
                          fontStyle="bold" 
                          label={{ value: 'Carga (%)', position: 'insideBottom', offset: -5, fontSize: 10, fontWeight: 'bold' }} 
                        />
                        <YAxis 
                          stroke="#64748b" 
                          fontSize={10} 
                          fontStyle="bold" 
                          label={{ value: 'Eficiência Rel.', angle: -90, position: 'insideLeft', fontSize: 10, fontWeight: 'bold' }} 
                        />
                        <Line type="monotone" dataKey="y" stroke="#1e3a8a" strokeWidth={3} dot={{ r: 4, fill: '#1e3a8a' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="col-span-1">
                    <table className="w-full text-[10px] border-collapse">
                      <thead>
                        <tr className="border-b-2 border-slate-200">
                          <th className="text-left py-2 uppercase opacity-60">Carga (%)</th>
                          <th className="text-right py-2 uppercase opacity-60">Eficiência Rel.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mainEquipment.efficiencyCurve.map((p, idx) => (
                          <tr key={idx} className="border-b border-slate-100">
                            <td className="py-2 font-bold">{p.x}%</td>
                            <td className="py-2 text-right font-black text-blue-900">{p.y.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="mt-24 pt-8 border-t-2 border-slate-100 text-[9px] text-slate-400 font-bold uppercase tracking-[0.4em] flex justify-between items-center">
                <div className="space-y-1">
                  <div>Koelho2000 Engenharia • NIF PT513183647</div>
                  <div className="opacity-60 lowercase">www.koelho2000.com • koelho2000@gmail.com</div>
                </div>
                <span>Folha de Dados Certificada</span>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'report' && (
        <div className="space-y-16 animate-in slide-in-from-bottom-6 pb-32">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 no-print">
            <div>
              <h2 className="text-5xl font-black text-slate-900 tracking-tight">Relatório Técnico IA</h2>
              <p className="text-slate-500 text-lg mt-2">Documentação profissional gerada sob os padrões da Koelho2000.</p>
            </div>
            <div className="flex gap-4">
               {generatedReport && (
                 <button onClick={() => window.print()} className="p-6 bg-slate-900 text-white rounded-[30px] shadow-2xl hover:bg-slate-800 transition active:scale-95">
                   <Printer size={32}/>
                 </button>
               )}
               <button 
                onClick={handleGenerateReport} 
                disabled={isGeneratingReport || selectedUnits.length === 0} 
                className="px-12 py-6 bg-blue-600 text-white rounded-[35px] font-black uppercase tracking-widest flex items-center gap-4 hover:bg-blue-700 transition shadow-2xl shadow-blue-600/30 disabled:opacity-50 active:scale-95"
               >
                 {isGeneratingReport ? <RefreshCw className="animate-spin" size={28} /> : <Sparkles size={28} />} 
                 {isGeneratingReport ? 'Processando...' : (generatedReport ? 'Regerar Relatório' : 'Gerar Relatório A4')}
               </button>
            </div>
          </header>

          <div className="flex flex-col items-center">
            {isGeneratingReport && (
              <div className="flex flex-col items-center gap-10 py-32 text-center no-print">
                <div className="relative">
                  <div className="w-32 h-32 border-[12px] border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-600 animate-pulse" size={48} />
                </div>
                <p className="text-3xl font-black text-slate-900">Compilando Relatório Profissional...</p>
              </div>
            )}

            {!isGeneratingReport && reportPages.length > 0 && (
              <div ref={reportRef} className="print:block space-y-0">
                {reportPages.map((page, idx) => renderReportPage(page, idx))}
              </div>
            )}

            {!isGeneratingReport && reportPages.length === 0 && (
              <div className="bg-slate-100/50 border-4 border-dashed border-slate-200 p-32 rounded-[60px] text-center w-full max-w-5xl no-print">
                <FileText className="mx-auto mb-10 text-slate-200" size={100} />
                <h4 className="text-3xl font-black text-slate-400 mb-4 uppercase tracking-widest">Aguardando Selecção</h4>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
