
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
// Import GoogleGenAI from @google/genai
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
  STANDARD_PROFILES
} from './constants';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, ScatterChart, Scatter, Legend, ReferenceLine
} from 'recharts';
import { generateTechnicalReport, suggestEquipment } from './services/geminiService';
import { 
  Plus, Trash2, ChevronRight, Cpu, Wind, Thermometer, 
  TrendingUp, FileText, Printer, Sparkles, Download, 
  Layers, Search, Filter, RefreshCw, Upload, Calendar, 
  Activity, Info, Scale, CheckCircle2, AlertCircle,
  Database, ArrowUpRight, Gauge, Briefcase, Globe,
  Settings, Droplets, Sun, Snowflake, Zap, MapPin, Building2, User, Table, LayoutGrid, Clock, FileDown, FileUp, ListChecks, Copy, FileCode, FileType, Check, Wand2, Eye, X, Award, CheckCircle, Calculator, SlidersHorizontal, Sparkle
} from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [dailyEditMode, setDailyEditMode] = useState<'graph' | 'table'>('graph');
  const [copySuccess, setCopySuccess] = useState(false);
  const [viewingEquipmentId, setViewingEquipmentId] = useState<string | null>(null);
  const [selectedReportUnitId, setSelectedReportUnitId] = useState<string | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonAnalysis, setComparisonAnalysis] = useState<string | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [intelligentFilterEnabled, setIntelligentFilterEnabled] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  
  // Filters
  const [brandFilter, setBrandFilter] = useState<string>('All');
  const [refrigerantFilter, setRefrigerantFilter] = useState<string>('All');
  const [compressorFilter, setCompressorFilter] = useState<string>('All');
  const [condensationFilter, setCondensationFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [modeFilter, setModeFilter] = useState<'Both' | 'Cooling' | 'Heating'>('Both');
  const [capacityRange, setCapacityRange] = useState<[number, number]>([0, 5000]);
  const [tempFluidRange, setTempFluidRange] = useState<[number, number]>([-20, 90]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [project, setProject] = useState<ProjectData>({
    projectName: 'Projecto K-CHBC',
    clientName: 'Cliente Industrial',
    installationName: 'Instalação Norte',
    technicianName: 'Eng. Técnico Especialista',
    companyName: 'Koelho2000 HVAC Solutions',
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
    monthlyProfile: Array(12).fill(1), // Default flat monthly profile
    budget: 0,
    instrumentation: ['Sonda Temp PT100', 'Fluxostato'],
    valves: ['Válvula de 3 vias', 'Válvula de equilíbrio'],
    controlType: 'BMS Integrado'
  });

  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);

  const brands = useMemo(() => ['All', ...new Set(OEM_DATABASE.map(item => item.brand))], []);
  const refrigerants = useMemo(() => ['All', ...Object.values(Refrigerant)], []);
  const compressors = useMemo(() => ['All', ...Object.values(CompressorType)], []);
  const condensationTypes = useMemo(() => ['All', ...Object.values(CondensationType)], []);
  const equipmentTypesList = useMemo(() => ['All', ...Object.values(EquipmentType)], []);

  const stats = useMemo(() => {
    const loads = project.hourlyLoads;
    const max = Math.max(...loads);
    const min = loads.length > 0 ? Math.min(...loads.filter(l => l > 0)) : 0;
    const sum = loads.reduce((a, b) => a + b, 0);
    const avg = sum / (loads.length || 1);
    const energy = sum / 1000;
    const fullLoadHours = max > 0 ? sum / max : 0;
    const loadFactor = max > 0 ? (avg / max) * 100 : 0;
    return { max, min, avg, energy, fullLoadHours, loadFactor };
  }, [project.hourlyLoads]);

  const filteredOEMDatabase = useMemo(() => {
    const isHeatingMode = project.targetTemperature > 20; // Assume >20C is heating selection
    const smartRange = [stats.max * 0.9, stats.max * 1.1];
    
    return OEM_DATABASE.filter(item => {
      const matchesBrand = brandFilter === 'All' || item.brand === brandFilter;
      const matchesRefr = refrigerantFilter === 'All' || item.refrigerant === refrigerantFilter;
      const matchesComp = compressorFilter === 'All' || item.compressorType === compressorFilter;
      const matchesCond = condensationFilter === 'All' || item.condensationType === condensationFilter;
      const matchesType = typeFilter === 'All' || item.id.includes(typeFilter.toLowerCase().replace(/\s/g, '-'));
      
      const cap = isHeatingMode ? item.heatingCapacity : item.coolingCapacity;
      
      // If intelligent filter is on:
      // 1. Capacity within 10% of REAL PEAK
      // 2. Target Temperature within equipment's supported fluid range
      // 3. Proper mode (Heating capacity > 0 if heating, etc.)
      const matchesIntelligent = !intelligentFilterEnabled || (
        cap >= smartRange[0] && 
        cap <= smartRange[1] &&
        project.targetTemperature >= item.minFluidTemp &&
        project.targetTemperature <= item.maxFluidTemp &&
        (isHeatingMode ? item.heatingCapacity > 0 : item.coolingCapacity > 0)
      );

      const matchesCapacity = intelligentFilterEnabled ? true : (cap >= capacityRange[0] && cap <= capacityRange[1]);
      
      const matchesMode = modeFilter === 'Both' || (modeFilter === 'Cooling' && item.coolingCapacity > 0) || (modeFilter === 'Heating' && item.heatingCapacity > 0);
      const matchesTemp = (item.minFluidTemp <= tempFluidRange[1] && item.maxFluidTemp >= tempFluidRange[0]);
      
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === '' || [item.model, item.brand, item.refrigerant, item.compressorType, item.condensationType, item.dimensions].some(val => val.toString().toLowerCase().includes(searchLower));
      
      return matchesBrand && matchesRefr && matchesComp && matchesCond && matchesType && matchesIntelligent && matchesCapacity && matchesMode && matchesTemp && matchesSearch;
    });
  }, [brandFilter, refrigerantFilter, compressorFilter, condensationFilter, typeFilter, capacityRange, modeFilter, tempFluidRange, searchTerm, intelligentFilterEnabled, stats.max, project.targetTemperature]);

  const selectedUnits = useMemo(() => OEM_DATABASE.filter(e => project.selectedEquipmentIds.includes(e.id)), [project.selectedEquipmentIds]);

  const toggleEquipmentSelection = useCallback((id: string) => {
    setProject(prev => {
      const isSelected = prev.selectedEquipmentIds.includes(id);
      const newIds = isSelected ? prev.selectedEquipmentIds.filter(itemId => itemId !== id) : [...prev.selectedEquipmentIds, id];
      return { ...prev, selectedEquipmentIds: newIds };
    });
  }, []);

  const generateYearlyLoadFromProfiles = useCallback(() => {
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
    setProject(prev => ({ ...prev, hourlyLoads: newLoads, loadDefinitionMode: 'Profiles' }));
  }, [project.peakPower, project.dailyProfiles, project.weeklyProfile, project.monthlyProfile]);

  const updateProfileValue = (type: 'weekday' | 'weekend' | 'weekly' | 'monthly', index: number, value: number) => {
    setProject(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (type === 'weekday') next.dailyProfiles.weekday[index] = value;
      if (type === 'weekend') next.dailyProfiles.weekend[index] = value;
      if (type === 'weekly') next.weeklyProfile[index] = value;
      if (type === 'monthly') next.monthlyProfile[index] = value;
      return next;
    });
  };

  const applyStandardProfile = (index: number) => {
    const profile = STANDARD_PROFILES[index];
    setProject(prev => ({
      ...prev,
      dailyProfiles: { weekday: [...profile.weekday], weekend: [...profile.weekend] },
      weeklyProfile: [...profile.weekly],
      monthlyProfile: [...profile.monthly],
      loadDefinitionMode: 'Profiles'
    }));
  };

  const handleSaveJSON = useCallback(() => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(project));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${project.projectName.replace(/\s+/g, '_')}_project.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }, [project]);

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,Hora,Carga (kW)\n";
    project.hourlyLoads.forEach((load, index) => {
      csvContent += `${index},${load.toFixed(2)}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${project.projectName.replace(/\s+/g, '_')}_8760h.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
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

  const handleCopyToClipboard = async () => {
    if (generatedReport) {
      try {
        await navigator.clipboard.writeText(generatedReport);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err) {
        console.error("Erro ao copiar:", err);
      }
    }
  };

  const handleExportHTML = () => {
    if (!generatedReport) return;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Relatório - ${project.projectName}</title>
        <style>
          body { font-family: sans-serif; line-height: 1.6; padding: 40px; color: #334155; }
          h1, h2, h3 { color: #1e293b; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
          th { background-color: #f8fafc; font-weight: bold; }
        </style>
      </head>
      <body>
        ${generatedReport.replace(/\n/g, '<br/>')}
      </body>
      </html>
    `;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.projectName.replace(/\s+/g, '_')}_Relatorio.html`;
    link.click();
  };

  const handleGenerateComparisonAnalysis = async () => {
    setIsComparing(true);
    setComparisonAnalysis(null);
    try {
      const reportUnit = selectedUnits.find(u => u.id === selectedReportUnitId) || selectedUnits[0];
      const analysisPrompt = `Aja como um engenheiro consultor HVAC. Analise estes ${selectedUnits.length} equipamentos para o projeto ${project.projectName}.
      Requisitos: Pico ${project.peakPower}kW, Temp saída ${project.targetTemperature}C.
      
      Equipamentos:
      ${selectedUnits.map(u => `- ${u.brand} ${u.model}: ESEER ${u.eseer.toFixed(2)}, Cap ${u.coolingCapacity.toFixed(1)}kW, Preço ${u.price}€`).join('\n')}
      
      Forneça uma breve análise técnica (máx 150 palavras) comparando-os e sugerindo qual é a melhor opção global baseada em eficiência e custo. Responda em Português de Portugal.`;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: analysisPrompt
      });
      setComparisonAnalysis(response.text);
    } catch (error) {
      setComparisonAnalysis("Erro ao gerar análise técnica comparativa.");
    } finally {
      setIsComparing(false);
    }
  };

  const renderEquipmentModal = () => {
    const equip = OEM_DATABASE.find(e => e.id === viewingEquipmentId);
    if (!equip) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95">
          <div className="p-8 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-black text-slate-900">{equip.brand} {equip.model}</h3>
              <p className="text-slate-500 font-medium">Especificações Técnicas Completas</p>
            </div>
            <button onClick={() => setViewingEquipmentId(null)} className="p-2 hover:bg-slate-100 rounded-full transition text-slate-400">
              <X size={24} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-8">
                <section>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Dados Operacionais</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Resfriamento</div>
                      <div className="text-lg font-black">{equip.coolingCapacity.toFixed(2)} kW</div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Aquecimento</div>
                      <div className="text-lg font-black">{equip.heatingCapacity.toFixed(2)} kW</div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">ESEER</div>
                      <div className="text-lg font-black text-emerald-600">{equip.eseer.toFixed(2)}</div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">COP</div>
                      <div className="text-lg font-black text-blue-600">{equip.cop.toFixed(2)}</div>
                    </div>
                  </div>
                </section>
                
                <section>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Componentes & Físico</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-slate-50">
                      <span className="text-sm text-slate-500">Compressor</span>
                      <span className="text-sm font-bold">{equip.compressorType}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-50">
                      <span className="text-sm text-slate-500">Fluido Frigorigéneo</span>
                      <span className="text-sm font-bold">{equip.refrigerant}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-50">
                      <span className="text-sm text-slate-500">Dimensões (LxPxA)</span>
                      <span className="text-sm font-bold">{equip.dimensions} mm</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-50">
                      <span className="text-sm text-slate-500">Peso</span>
                      <span className="text-sm font-bold">{equip.weight.toLocaleString()} kg</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-sm text-slate-500">Nível Sonoro</span>
                      <span className="text-sm font-bold">{equip.noiseLevel} dB(A)</span>
                    </div>
                  </div>
                </section>
              </div>
              
              <div className="space-y-8">
                <section>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Curva de Eficiência (Carga Parcial)</h4>
                  <div className="h-48 bg-slate-50 rounded-3xl p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={equip.efficiencyCurve}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="x" stroke="#94a3b8" fontSize={10} label={{ value: '% Carga', position: 'insideBottom', offset: -5 }} />
                        <YAxis stroke="#94a3b8" fontSize={10} />
                        <Tooltip />
                        <Line type="monotone" dataKey="y" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </section>
                
                <section className="bg-blue-600 rounded-3xl p-6 text-white shadow-xl shadow-blue-600/20">
                  <div className="flex items-center gap-3 mb-2">
                    <Zap size={20} />
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Preço Estimado</span>
                  </div>
                  <div className="text-4xl font-black">{equip.price.toLocaleString('pt-PT')} €</div>
                  <p className="text-[10px] mt-4 opacity-70 leading-tight">Valor indicativo para fornecimento base. Não inclui custos de instalação, transporte ou acessórios de instrumentação adicionais.</p>
                </section>
              </div>
            </div>
          </div>
          
          <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-4">
            <button 
              onClick={() => { toggleEquipmentSelection(equip.id); setViewingEquipmentId(null); }}
              className={`px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${project.selectedEquipmentIds.includes(equip.id) ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            >
              {project.selectedEquipmentIds.includes(equip.id) ? 'Remover da Seleção' : 'Adicionar à Seleção'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderHome = () => (
    <div className="space-y-12 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex-1 space-y-4">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-widest">
            <Sparkles size={14} className="mr-2" /> Powered by Gemini
          </div>
          <h2 className="text-6xl font-black text-slate-900 leading-tight">
            Design de Sistemas <span className="text-blue-600">HVAC</span> de Próxima Geração.
          </h2>
          <p className="text-xl text-slate-500 max-w-2xl leading-relaxed">
            Configure cargas térmicas, selecione equipamentos OEM e gere relatórios técnicos automatizados com inteligência artificial.
          </p>
          <div className="flex gap-4 pt-4">
            <button onClick={() => setActiveTab('config')} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition shadow-xl shadow-slate-900/20">
              Começar Projecto <ChevronRight size={20} />
            </button>
            <button onClick={() => setActiveTab('selection')} className="px-8 py-4 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-50 transition">
              Catálogo OEM
            </button>
          </div>
        </div>
        <div className="flex-1 relative">
          <div className="w-full aspect-square bg-gradient-to-br from-blue-50 to-indigo-100 rounded-[80px] flex items-center justify-center overflow-hidden">
             <Layers size={200} className="text-blue-200 absolute -bottom-10 -right-10" />
             <Cpu size={120} className="text-blue-500/20 absolute top-10 left-10" />
             <div className="z-10 bg-white p-8 rounded-[40px] shadow-2xl border border-blue-50 max-w-xs scale-110">
               <div className="flex items-center gap-4 mb-6">
                 <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
                   <Activity size={24} />
                 </div>
                 <div>
                   <div className="text-[10px] font-black text-slate-400 uppercase">Estado do Projecto</div>
                   <div className="font-bold text-slate-900">Configuração Inicial</div>
                 </div>
               </div>
               <div className="space-y-4">
                 <div className="flex justify-between items-center">
                   <span className="text-xs text-slate-500">Unidades Selecionadas</span>
                   <span className="text-sm font-black text-blue-600">{project.selectedEquipmentIds.length}</span>
                 </div>
                 <div className="flex justify-between items-center">
                   <span className="text-xs text-slate-500">Carga de Pico</span>
                   <span className="text-sm font-black text-slate-900">{project.peakPower} kW</span>
                 </div>
                 <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                   <div className="h-full bg-blue-600 rounded-full" style={{ width: '35%' }}></div>
                 </div>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderConfig = () => (
    <div className="space-y-8 animate-in slide-in-from-bottom-4">
      <header>
        <h2 className="text-4xl font-black text-slate-900">Definições do Projecto</h2>
        <p className="text-slate-500">Dados administrativos e de localização para emissão de relatório.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
          <h3 className="text-lg font-black flex items-center gap-2"><Briefcase className="text-blue-500" /> Entidade e Técnico</h3>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Empresa Responsável</label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" value={project.companyName} onChange={e => setProject({...project, companyName: e.target.value})} className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Técnico Projectista</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" value={project.technicianName} onChange={e => setProject({...project, technicianName: e.target.value})} className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
          <h3 className="text-lg font-black flex items-center gap-2"><MapPin className="text-indigo-500" /> Localização e Projecto</h3>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Nome do Projecto</label>
              <input type="text" value={project.projectName} onChange={e => setProject({...project, projectName: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Nome da Instalação</label>
              <input type="text" value={project.installationName} onChange={e => setProject({...project, installationName: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Localização / Morada</label>
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" value={project.location} onChange={e => setProject({...project, location: e.target.value})} className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderLoads = () => (
    <div className="space-y-8 animate-in slide-in-from-bottom-4">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-4xl font-black text-slate-900">Modelação de Carga</h2>
          <p className="text-slate-500">Defina os perfis de consumo e gere a simulação horária anual.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition">
            <FileUp size={14} /> Importar CSV 8760h
          </button>
          <input type="file" ref={fileInputRef} onChange={handleImportCSV} accept=".csv" className="hidden" />
          <button onClick={handleExportCSV} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition">
            <FileDown size={14} /> Exportar CSV 8760h
          </button>
          <button onClick={() => setProject({...project, loadDefinitionMode: 'Profiles'})} className={`px-4 py-2 rounded-xl text-xs font-bold transition ${project.loadDefinitionMode === 'Profiles' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>Modo Perfil</button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <ListChecks size={14} /> Catálogo de Perfis
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
              {STANDARD_PROFILES.map((p, idx) => (
                <button key={idx} onClick={() => applyStandardProfile(idx)} className="w-full text-left p-3 text-xs font-semibold text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition border border-slate-50">
                  {p.name}
                </button>
              ))}
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Configuração de Sistema</h3>
            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Potência Pico de Projeto (kW)</label>
                <input type="number" value={project.peakPower} onChange={e => setProject({...project, peakPower: Number(e.target.value)})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xl font-black text-blue-600 focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Temperatura Pretendida (°C)</label>
                <div className="relative">
                  <Thermometer className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                  <input type="number" value={project.targetTemperature} onChange={e => setProject({...project, targetTemperature: Number(e.target.value)})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xl font-black text-indigo-600 focus:border-indigo-500 outline-none" />
                </div>
                <p className="text-[10px] text-slate-400 mt-2 font-medium">A temperatura define o modo de operação (Arrefecimento vs Aquecimento) no Filtro Inteligente.</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl text-white">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Estatísticas Calculadas</h3>
            <table className="w-full text-xs font-medium">
              <tbody className="divide-y divide-slate-800">
                <tr className="py-2 flex justify-between">
                  <td className="text-slate-500">Pico Real (kW)</td>
                  <td className="text-blue-400 font-black">{stats.max.toFixed(1)}</td>
                </tr>
                <tr className="py-2 flex justify-between">
                  <td className="text-slate-500">Mínimo (kW)</td>
                  <td className="text-slate-300">{stats.min.toFixed(1)}</td>
                </tr>
                <tr className="py-2 flex justify-between">
                  <td className="text-slate-500">Média (kW)</td>
                  <td className="text-slate-300">{stats.avg.toFixed(1)}</td>
                </tr>
                <tr className="py-2 flex justify-between">
                  <td className="text-slate-500">Energia (MWh)</td>
                  <td className="text-emerald-400 font-black">{stats.energy.toFixed(2)}</td>
                </tr>
                <tr className="py-2 flex justify-between">
                  <td className="text-slate-500">Fator Carga (%)</td>
                  <td className="text-slate-300">{stats.loadFactor.toFixed(1)}</td>
                </tr>
                <tr className="py-2 flex justify-between">
                  <td className="text-slate-500">Horas Pico (h)</td>
                  <td className="text-slate-300">{stats.fullLoadHours.toFixed(0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-8">
          <div className="bg-white p-8 rounded-[40px] border-4 border-blue-50 shadow-xl shadow-blue-500/5 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-blue-600/30">
                <Calculator size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900">Gerar Perfil Completo</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Consolida o perfil <strong>Diário</strong>, <strong>Semanal</strong>, <strong>Mensal</strong> e <strong>Anual (8760h)</strong>.
                </p>
              </div>
            </div>
            <button 
              onClick={generateYearlyLoadFromProfiles}
              className="group px-10 py-5 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-4 hover:bg-blue-700 transition active:scale-95 shadow-xl shadow-blue-600/20"
            >
              <RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-700" />
              Executar Geração de Carga
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <Clock size={16} className="text-blue-500" /> Perfil Diário
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Definição horária (%)</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button onClick={() => setDailyEditMode('graph')} className={`p-2 rounded-lg transition ${dailyEditMode === 'graph' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><LayoutGrid size={16} /></button>
                  <button onClick={() => setDailyEditMode('table')} className={`p-2 rounded-lg transition ${dailyEditMode === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><Table size={16} /></button>
                </div>
              </div>
              
              <div className="flex-1 space-y-8">
                <div>
                  <h5 className="text-[10px] font-black text-slate-400 uppercase mb-4 flex justify-between">
                    <span>Dias de Semana (Seg-Sex)</span>
                    <span className="text-blue-600">{Math.round(project.dailyProfiles.weekday.reduce((a, b) => a + b, 0) / 0.24)}% Média</span>
                  </h5>
                  {dailyEditMode === 'graph' ? (
                    <div className="flex items-end gap-1 h-32">
                      {project.dailyProfiles.weekday.map((val, i) => (
                        <div key={i} className="flex-1 group relative h-full flex items-end">
                          <div className="w-full bg-blue-500/20 hover:bg-blue-600 transition-colors rounded-t-sm cursor-pointer relative" style={{ height: `${val * 100}%` }}>
                            <input type="range" min="0" max="1" step="0.05" value={val} onChange={e => updateProfileValue('weekday', i, Number(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-ns-resize" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-6 gap-2 h-32 overflow-y-auto pr-2 custom-scrollbar">
                      {project.dailyProfiles.weekday.map((val, i) => (
                        <div key={i} className="flex flex-col gap-1">
                          <span className="text-[8px] font-bold text-slate-400">{i}h</span>
                          <input type="number" min="0" max="1" step="0.1" value={val} onChange={e => updateProfileValue('weekday', i, Number(e.target.value))} className="w-full p-1 bg-slate-50 border border-slate-100 rounded text-[10px] font-black" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h5 className="text-[10px] font-black text-slate-400 uppercase mb-4 flex justify-between">
                    <span>Fim de Semana (Sáb-Dom)</span>
                    <span className="text-slate-500">{Math.round(project.dailyProfiles.weekend.reduce((a, b) => a + b, 0) / 0.24)}% Média</span>
                  </h5>
                  <div className="flex items-end gap-1 h-32">
                    {project.dailyProfiles.weekend.map((val, i) => (
                      <div key={i} className="flex-1 group relative h-full flex items-end">
                        <div className="w-full bg-slate-200 hover:bg-slate-400 transition-colors rounded-t-sm cursor-pointer relative" style={{ height: `${val * 100}%` }}>
                          <input type="range" min="0" max="1" step="0.05" value={val} onChange={e => updateProfileValue('weekend', i, Number(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-ns-resize" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <Calendar size={16} className="text-indigo-500" /> Perfil Semanal
                    </h4>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-3 h-24 mb-6">
                  {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day, i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                      <div className="flex-1 w-full bg-slate-50 rounded-xl relative flex items-end overflow-hidden group">
                        <div className="w-full bg-indigo-500/20 group-hover:bg-indigo-500 transition-colors" style={{ height: `${project.weeklyProfile[i] * 100}%` }} />
                        <input type="range" min="0" max="1" step="0.05" value={project.weeklyProfile[i]} onChange={e => updateProfileValue('weekly', i, Number(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-ns-resize" />
                      </div>
                      <span className="text-[9px] font-black text-slate-500">{day}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <Layers size={16} className="text-emerald-500" /> Perfil Mensal
                    </h4>
                  </div>
                </div>
                <div className="grid grid-cols-12 gap-1.5 h-24 mb-4">
                  {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].map((m, i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                      <div className="flex-1 w-full bg-slate-50 rounded-lg relative flex items-end overflow-hidden group">
                        <div className="w-full bg-emerald-500/20 group-hover:bg-emerald-500 transition-colors" style={{ height: `${project.monthlyProfile[i] * 100}%` }} />
                        <input type="range" min="0" max="1" step="0.05" value={project.monthlyProfile[i]} onChange={e => updateProfileValue('monthly', i, Number(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-ns-resize" />
                      </div>
                      <span className="text-[8px] font-black text-slate-500">{m}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900 p-8 rounded-[40px] shadow-2xl relative overflow-hidden h-64">
                <div className="absolute top-0 right-0 p-6 text-blue-500/5"><TrendingUp size={100} /></div>
                <div className="relative z-10 flex justify-between items-center mb-6">
                  <h4 className="text-sm font-black text-white uppercase tracking-widest">Carga Anual (8760h)</h4>
                  <div className="text-[10px] font-black text-slate-400 uppercase px-3 py-1 bg-slate-800 rounded-full">kW Anual</div>
                </div>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={project.hourlyLoads.map((v, i) => ({ h: i, v }))}>
                      <Tooltip 
                        labelFormatter={(val) => `Hora ${val}`} 
                        contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '10px' }} 
                      />
                      <Area type="monotone" dataKey="v" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={1} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-between mt-4 text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                  <span>Jan</span><span>Mar</span><span>Mai</span><span>Jul</span><span>Set</span><span>Nov</span><span>Dez</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSelection = () => (
    <div className="space-y-8 animate-in slide-in-from-bottom-4">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="flex-1">
          <h2 className="text-3xl font-black text-slate-900">Catálogo OEM Global</h2>
          <p className="text-slate-500">Consulte a base de dados de fabricantes líderes.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {/* Smart Intelligent Filter Button */}
          <button 
            onClick={() => setIntelligentFilterEnabled(!intelligentFilterEnabled)}
            disabled={stats.max <= 0}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-lg active:scale-95 ${intelligentFilterEnabled ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-white border border-slate-200 text-blue-600 hover:bg-blue-50'} disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <Sparkles size={16} className={intelligentFilterEnabled ? 'animate-pulse' : ''} /> 
            Smart Filter {intelligentFilterEnabled ? 'ON' : 'OFF'}
            {intelligentFilterEnabled && stats.max > 0 && (
              <span className="ml-1 text-[10px] opacity-80">({(stats.max * 0.9).toFixed(0)}-{(stats.max * 1.1).toFixed(0)} kW @ {project.targetTemperature}°C)</span>
            )}
          </button>
          
          <button 
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${showAdvancedFilters ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            <SlidersHorizontal size={16} /> Filtros {showAdvancedFilters ? 'Ocultar' : 'Mostrar'}
          </button>
          
          <div className="relative w-full md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="Pesquisar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition text-sm" />
          </div>
        </div>
      </header>

      {showAdvancedFilters && (
        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-xl animate-in slide-in-from-top-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Fabricante</label>
              <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:border-blue-500 outline-none">
                {brands.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Fluido Refrigerante</label>
              <select value={refrigerantFilter} onChange={e => setRefrigerantFilter(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:border-blue-500 outline-none">
                {refrigerants.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Tipo de Compressor</label>
              <select value={compressorFilter} onChange={e => setCompressorFilter(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:border-blue-500 outline-none">
                {compressors.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Condensação</label>
              <select value={condensationFilter} onChange={e => setCondensationFilter(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:border-blue-500 outline-none">
                {condensationTypes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Tipo de Equipamento</label>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:border-blue-500 outline-none">
                {equipmentTypesList.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Modo Operação</label>
              <select value={modeFilter} onChange={e => setModeFilter(e.target.value as any)} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:border-blue-500 outline-none">
                <option value="Both">Resfriamento & Aquecimento</option>
                <option value="Cooling">Só Resfriamento</option>
                <option value="Heating">Só Aquecimento</option>
              </select>
            </div>
            {!intelligentFilterEnabled && (
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Capacidade (kW)</label>
                <div className="flex gap-2">
                  <input type="number" placeholder="Min" value={capacityRange[0]} onChange={e => setCapacityRange([Number(e.target.value), capacityRange[1]])} className="w-1/2 p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none" />
                  <input type="number" placeholder="Max" value={capacityRange[1]} onChange={e => setCapacityRange([capacityRange[0], Number(e.target.value)])} className="w-1/2 p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none" />
                </div>
              </div>
            )}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Temp. Fluido (°C)</label>
              <div className="flex gap-2">
                <input type="number" placeholder="Min" value={tempFluidRange[0]} onChange={e => setTempFluidRange([Number(e.target.value), tempFluidRange[1]])} className="w-1/2 p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none" />
                <input type="number" placeholder="Max" value={tempFluidRange[1]} onChange={e => setTempFluidRange([tempFluidRange[0], Number(e.target.value)])} className="w-1/2 p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none" />
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
             <button 
              onClick={() => {
                setBrandFilter('All');
                setRefrigerantFilter('All');
                setCompressorFilter('All');
                setCondensationFilter('All');
                setTypeFilter('All');
                setModeFilter('Both');
                setCapacityRange([0, 5000]);
                setTempFluidRange([-20, 90]);
                setSearchTerm('');
                setIntelligentFilterEnabled(false);
              }}
              className="text-xs font-black text-blue-600 hover:text-blue-800 uppercase tracking-widest"
             >
               Limpar Todos os Filtros
             </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Equipamento</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Tecnologia</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Capacidade</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acções</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredOEMDatabase.map(item => (
              <tr key={item.id} className="hover:bg-slate-50/80 transition-all group">
                <td className="px-8 py-6">
                  <div className="font-black text-slate-900">{item.brand}</div>
                  <div className="text-xs text-slate-500 font-medium">{item.model}</div>
                </td>
                <td className="px-8 py-6 text-center">
                  <div className="text-xs font-bold text-slate-700">{item.compressorType}</div>
                  <div className="text-[10px] font-black text-blue-500 uppercase">{item.refrigerant}</div>
                </td>
                <td className="px-8 py-6 text-center">
                  <div className="text-sm font-black text-blue-600">{item.coolingCapacity.toFixed(1)} <span className="text-[10px] text-slate-400">kW (C)</span></div>
                  {item.heatingCapacity > 0 && <div className="text-[10px] font-black text-red-500">{item.heatingCapacity.toFixed(1)} kW (H)</div>}
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setViewingEquipmentId(item.id)} className="p-3 bg-white border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 transition" title="Ver Detalhes">
                      <Eye size={18} />
                    </button>
                    <button onClick={() => toggleEquipmentSelection(item.id)} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${project.selectedEquipmentIds.includes(item.id) ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-blue-600 hover:text-white'}`}>
                      {project.selectedEquipmentIds.includes(item.id) ? 'Remover' : 'Seleccionar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {viewingEquipmentId && renderEquipmentModal()}
    </div>
  );

  const renderAnalysis = () => (
    <div className="space-y-8 animate-in slide-in-from-bottom-4">
      <header>
        <h2 className="text-4xl font-black text-slate-900">Análise Comparativa & Curvas</h2>
        <p className="text-slate-500">Comparação detalhada de todas as variáveis técnicas e análise de eficiência.</p>
      </header>

      {selectedUnits.length === 0 ? (
        <div className="bg-slate-100 p-20 rounded-[40px] text-center italic text-slate-400">Seleccione unidades no catálogo para ver o comparativo detalhado.</div>
      ) : (
        <div className="space-y-12">
          <div className="bg-white rounded-[40px] border border-slate-200 overflow-x-auto shadow-sm">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="p-6 font-black uppercase tracking-widest text-[10px] border-r border-slate-800">Variável Técnica</th>
                  {selectedUnits.map(u => (
                    <th key={u.id} className={`p-6 text-center border-r border-slate-800 relative ${selectedReportUnitId === u.id ? 'bg-blue-800' : ''}`}>
                      <div className="font-black text-base">{u.brand}</div>
                      <div className="text-[10px] font-bold opacity-60 uppercase">{u.model}</div>
                      <button 
                        onClick={() => setSelectedReportUnitId(u.id)}
                        className={`absolute -bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-tighter shadow-lg transition-all ${selectedReportUnitId === u.id ? 'bg-emerald-500 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                      >
                        {selectedReportUnitId === u.id ? <span className="flex items-center gap-1"><Check size={10}/> Relatório</span> : 'Seleccionar p/ Relatório'}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { label: 'Tipo de Condensação', key: 'condensationType', decimals: 0 },
                  { label: 'Potência Resfriamento (kW)', key: 'coolingCapacity', decimals: 2 },
                  { label: 'Potência Aquecimento (kW)', key: 'heatingCapacity', decimals: 2 },
                  { label: 'ESEER (Sazonal)', key: 'eseer', decimals: 2, highlight: true },
                  { label: 'EER (Plena Carga)', key: 'eer', decimals: 2 },
                  { label: 'COP (Aquecimento)', key: 'cop', decimals: 2 },
                  { label: 'Tipo de Compressor', key: 'compressorType', decimals: 0 },
                  { label: 'Fluido Frigorigéneo', key: 'refrigerant', decimals: 0 },
                  { label: 'Dimensões (LxPxA mm)', key: 'dimensions', decimals: 0 },
                  { label: 'Peso em Operação (kg)', key: 'weight', decimals: 0 },
                  { label: 'Pressão Sonora (dB-A)', key: 'noiseLevel', decimals: 1 },
                  { label: 'Fluido: Temp Min/Max (°C)', custom: (u: OEMEquipment) => `${u.minFluidTemp} / ${u.maxFluidTemp}` },
                  { label: 'Ambiente: Temp Min/Max (°C)', custom: (u: OEMEquipment) => `${u.minAmbientTemp} / ${u.maxAmbientTemp}` },
                  { label: 'Investimento Estimado (€)', key: 'price', decimals: 2, highlight: true },
                ].map((row, i) => (
                  <tr key={i} className={`hover:bg-slate-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'}`}>
                    <td className="p-4 pl-8 font-bold text-slate-500 uppercase text-[9px] border-r border-slate-100">{row.label}</td>
                    {selectedUnits.map(u => {
                      let display;
                      if (row.custom) {
                        display = row.custom(u);
                      } else {
                        const val = u[row.key as keyof OEMEquipment];
                        display = typeof val === 'number' ? val.toFixed(row.decimals) : val;
                      }
                      return (
                        <td key={u.id} className={`p-4 text-center font-black text-slate-700 border-r border-slate-100 ${row.highlight ? 'text-blue-600 bg-blue-50/30' : ''}`}>
                          {display}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-xl font-black text-slate-900">Eficiência vs Carga (%)</h3>
                <div className="flex gap-4">
                  {selectedUnits.map((u, i) => (
                    <div key={u.id} className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'][i % 4] }}></div>
                      <span className="text-[10px] font-bold text-slate-400">{u.brand}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis type="number" dataKey="x" name="Carga" domain={[0, 100]} label={{ value: '% Carga', position: 'bottom', offset: 0 }} />
                    <YAxis label={{ value: 'Eficiência Relativa', angle: -90, position: 'insideLeft' }} />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    {selectedUnits.map((u, i) => (
                      <Line key={u.id} type="monotone" data={u.efficiencyCurve} dataKey="y" name={u.model} stroke={['#3b82f6', '#ef4444', '#10b981', '#f59e0b'][i % 4]} strokeWidth={4} dot={{ r: 5 }} activeDot={{ r: 8 }} />
                    ))}
                    <ReferenceLine x={50} stroke="#94a3b8" strokeDasharray="3 3" label={{ position: 'top', value: 'Carga Média', fill: '#64748b', fontSize: 10 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-slate-900 p-10 rounded-[40px] border border-slate-800 shadow-xl text-white">
              <h3 className="text-xl font-black mb-10">Distribuição de Carga vs Capacidade</h3>
              <div className="space-y-8">
                {selectedUnits.map(u => {
                  const coverage = (project.peakPower / u.coolingCapacity) * 100;
                  return (
                    <div key={u.id} className="space-y-2">
                      <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
                        <span>{u.brand} {u.model}</span>
                        <span className={coverage > 100 ? 'text-red-400' : 'text-emerald-400'}>{coverage.toFixed(1)}% de Utilização de Pico</span>
                      </div>
                      <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-1000 ${coverage > 100 ? 'bg-red-500' : (coverage > 85 ? 'bg-amber-500' : 'bg-emerald-500')}`} 
                          style={{ width: `${Math.min(coverage, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-lg animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-8">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-blue-600/30">
                  <Award size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900">Análise de Decisão IA</h3>
                  <p className="text-slate-500">O Gemini analisa o desempenho relativo para encontrar a melhor solução global.</p>
                </div>
              </div>
              <button 
                onClick={handleGenerateComparisonAnalysis}
                disabled={isComparing}
                className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-3 hover:bg-slate-800 transition active:scale-95 disabled:opacity-50"
              >
                {isComparing ? <RefreshCw size={20} className="animate-spin" /> : <Sparkles size={20} />}
                {isComparing ? 'Analisando...' : 'Gerar Parecer Técnico'}
              </button>
            </div>

            {comparisonAnalysis ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="md:col-span-3 prose prose-slate max-w-none text-slate-600 leading-relaxed text-justify">
                  {comparisonAnalysis}
                </div>
                <div className="md:col-span-1 bg-emerald-50 p-8 rounded-[32px] border border-emerald-100 flex flex-col items-center text-center">
                  <CheckCircle size={48} className="text-emerald-500 mb-4" />
                  <h4 className="text-sm font-black text-emerald-900 uppercase tracking-widest mb-2">Sugestão Técnica</h4>
                  <div className="text-lg font-black text-emerald-700 mb-6">
                    {selectedReportUnitId ? OEM_DATABASE.find(u => u.id === selectedReportUnitId)?.model : "Seleccione uma opção"}
                  </div>
                  <button 
                    onClick={() => setActiveTab('report')}
                    className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-700 transition shadow-lg shadow-emerald-600/20"
                  >
                    Prosseguir p/ Relatório
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-20 text-center border-2 border-dashed border-slate-100 rounded-[32px]">
                <p className="text-slate-400 italic">Clique no botão "Gerar Parecer Técnico" para que a IA processe a comparação entre os equipamentos seleccionados.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    setGeneratedReport(null);
    try {
      const reportUnits = selectedReportUnitId 
        ? [OEM_DATABASE.find(u => u.id === selectedReportUnitId)!] 
        : selectedUnits;
      const report = await generateTechnicalReport(project, reportUnits);
      setGeneratedReport(report || "Falha ao gerar o relatório.");
    } catch (error) {
      console.error(error);
      setGeneratedReport("Erro ao gerar o relatório.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const renderReport = () => (
    <div className="space-y-8 animate-in slide-in-from-bottom-4">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 no-print">
        <div>
          <h2 className="text-4xl font-black text-slate-900">Relatório Técnico IA</h2>
          <p className="text-slate-500">Documentação profissional automatizada com análise avançada.</p>
        </div>
        <div className="flex gap-3">
          {generatedReport && (
            <>
              <button onClick={handleExportHTML} title="Exportar HTML" className="p-4 bg-white border border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-50 transition shadow-sm">
                <FileCode size={20} />
              </button>
              <button onClick={handleCopyToClipboard} title="Copiar Tudo" className={`p-4 bg-white border border-slate-200 rounded-2xl transition shadow-sm ${copySuccess ? 'text-emerald-600' : 'text-slate-600 hover:bg-slate-50'}`}>
                {copySuccess ? <Check size={20} /> : <Copy size={20} />}
              </button>
              <button onClick={() => window.print()} title="Imprimir PDF" className="p-4 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition shadow-lg">
                <Printer size={20} />
              </button>
            </>
          )}
          <button 
            onClick={handleGenerateReport} 
            disabled={isGeneratingReport || selectedUnits.length === 0} 
            className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingReport ? <RefreshCw className="animate-spin" size={20} /> : <Sparkles size={20} />}
            {isGeneratingReport ? 'A analisar dados...' : (generatedReport ? 'Actualizar Relatório' : 'Gerar Relatório Profissional')}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 no-print">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Carga de Pico</div>
          <div className="text-xl font-black text-slate-900">{stats.max.toFixed(2)} <span className="text-xs text-slate-400">kW</span></div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Energia Estimada</div>
          <div className="text-xl font-black text-blue-600">{stats.energy.toFixed(2)} <span className="text-xs text-slate-400">MWh/ano</span></div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ESEER Médio</div>
          <div className="text-xl font-black text-emerald-600">{(selectedUnits.reduce((a, b) => a + b.eseer, 0) / (selectedUnits.length || 1)).toFixed(2)}</div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Investimento Est.</div>
          <div className="text-xl font-black text-indigo-600">{selectedUnits.reduce((a, b) => a + b.price, 0).toLocaleString('pt-PT')} <span className="text-xs text-slate-400">€</span></div>
        </div>
      </div>

      {selectedUnits.length === 0 ? (
        <div className="bg-amber-50 border border-amber-100 p-8 rounded-[40px] flex items-center gap-6">
          <div className="w-16 h-16 bg-amber-500 rounded-3xl flex items-center justify-center text-white shadow-lg shadow-amber-500/30"><AlertCircle size={32} /></div>
          <div><h4 className="text-xl font-black text-amber-900">Seleção Necessária</h4><p className="text-amber-700">Seleccione equipamentos no catálogo OEM antes de gerar o relatório técnico.</p></div>
        </div>
      ) : generatedReport ? (
        <div className="bg-white p-8 md:p-16 rounded-[40px] border border-slate-200 shadow-2xl relative overflow-hidden print:p-0 print:shadow-none print:border-none">
           <div className="hidden print:flex justify-between items-center mb-12 border-b-4 border-slate-900 pb-8">
             <div>
               <h1 className="text-3xl font-black text-slate-900">K-CHBCSELECT</h1>
               <p className="text-sm font-bold text-slate-500">HVAC DESIGN SYSTEM</p>
             </div>
             <div className="text-right">
               <div className="text-sm font-black uppercase text-slate-400">Koelho2000 Pro</div>
               <div className="text-lg font-bold">Relatório de Seleção Técnica</div>
             </div>
           </div>
           <div ref={reportRef} className="prose prose-slate max-w-none whitespace-pre-wrap font-serif text-slate-800 <leading-relaxed text-justify selection:bg-blue-100">
             {generatedReport}
           </div>
           <div className="mt-16 pt-8 border-t border-slate-100 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest no-print">
             <span>Gerado por {project.technicianName} via Koelho2000 Gemini AI</span>
             <span>Versão 2.5.0 • Documento Confidencial</span>
           </div>
        </div>
      ) : (
        <div className="bg-slate-100/50 border-2 border-dashed border-slate-200 p-20 rounded-[40px] text-center no-print">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300 shadow-sm"><FileText size={40} /></div>
          <h4 className="text-xl font-bold text-slate-400 mb-2">Relatório pronto a ser gerado</h4>
          <p className="text-slate-400 max-w-sm mx-auto">A inteligência artificial irá consolidar todos os dados de carga, equipamentos seleccionados e indicadores de eficiência num documento profissional.</p>
        </div>
      )}
    </div>
  );

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} onNew={() => window.location.reload()} onOpen={() => alert('Abrir projecto (Em desenvolvimento)')} onSave={handleSaveJSON}>
      {activeTab === 'home' && renderHome()}
      {activeTab === 'config' && renderConfig()}
      {activeTab === 'loads' && renderLoads()}
      {activeTab === 'selection' && renderSelection()}
      {activeTab === 'analysis' && renderAnalysis()}
      {activeTab === 'report' && renderReport()}
    </Layout>
  );
};

export default App;
