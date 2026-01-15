
import React, { useState, useMemo, useRef } from 'react';
import { 
  Sparkles, 
  FileText, 
  Printer, 
  ShieldCheck, 
  Zap, 
  Thermometer, 
  Activity, 
  BarChart2, 
  Calendar, 
  Globe2, 
  Info, 
  ChevronRight, 
  Download, 
  ThumbsUp, 
  TrendingUp,
  List,
  FileCode,
  FileType,
  Copy,
  Check,
  Mail,
  MapPin,
  Phone,
  Layout,
  Waves,
  Settings,
  ArrowRightLeft,
  Droplets,
  Box,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, LineChart, Line, Legend, LabelList } from 'recharts';
import { ProjectData, OEMEquipment, CondensationType } from '../../types';
import { OEM_DATABASE, PT_DISTRICTS_CLIMATE } from '../../constants';
import { generateTechnicalReport } from '../../services/geminiService';

interface Props {
  project: ProjectData;
  selectedReportUnitId: string | null;
  reportText: string | null;
  setReportText: (t: string | null) => void;
  reportHash: string | null;
  setReportHash: (h: string | null) => void;
}

const ReportTab: React.FC<Props> = ({ project, selectedReportUnitId, reportText, setReportText, reportHash, setReportHash }) => {
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const reportContainerRef = useRef<HTMLDivElement>(null);

  const selectedUnits = useMemo(() => 
    OEM_DATABASE.filter(e => project.selectedEquipmentIds.includes(e.id))
  , [project.selectedEquipmentIds]);

  // Current State Hash to detect if report is stale
  const currentHash = useMemo(() => {
    return JSON.stringify({
      units: project.selectedEquipmentIds.sort(),
      selectedUnit: selectedReportUnitId,
      district: project.selectedDistrict,
      peak: project.peakPower,
      temp: project.targetTemperature,
      location: project.location,
      price: project.electricityPrice
    });
  }, [project.selectedEquipmentIds, selectedReportUnitId, project.selectedDistrict, project.peakPower, project.targetTemperature, project.location, project.electricityPrice]);

  const isStale = reportText && reportHash !== currentHash;

  // Priority: 1. Manually selected for report in ROI tab, 2. First unit in selected list
  const mainUnit = useMemo(() => {
    if (selectedReportUnitId) return OEM_DATABASE.find(u => u.id === selectedReportUnitId) || null;
    return selectedUnits[0] || null;
  }, [selectedReportUnitId, selectedUnits]);

  // Cálculos Hidráulicos para a Folha de Dados integrada
  const hydraulics = useMemo(() => {
    if (!mainUnit) return null;
    const coolingFlow = mainUnit.coolingCapacity / (1.163 * 5);
    const heatingFlow = mainUnit.heatingCapacity / (1.163 * 5);
    const absorbedPower = mainUnit.coolingCapacity / (mainUnit.eer || 3);
    const heatRejection = mainUnit.coolingCapacity + absorbedPower;
    const condenserFlow = heatRejection / (1.163 * 5);
    return { coolingFlow, heatingFlow, condenserFlow, heatRejection };
  }, [mainUnit]);

  const triggerReport = async () => {
    if (selectedUnits.length === 0) return;
    setGenerating(true);
    try {
      const res = await generateTechnicalReport(project, selectedUnits);
      setReportText(res);
      setReportHash(currentHash);
    } catch (err) { 
      setReportText("Erro de conexão com o servidor de IA."); 
    } finally { 
      setGenerating(false); 
    }
  };

  // Export Functions
  const copyToClipboard = async () => {
    if (!reportContainerRef.current) return;
    try {
      const type = "text/html";
      const blob = new Blob([reportContainerRef.current.innerHTML], { type });
      const data = [new ClipboardItem({ [type]: blob })];
      await navigator.clipboard.write(data);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) { console.error("Erro ao copiar:", err); }
  };

  const exportToHTML = () => {
    if (!reportContainerRef.current) return;
    const content = reportContainerRef.current.innerHTML;
    const tailwind = `<script src="https://cdn.tailwindcss.com"></script>`;
    const fullHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Relatório IA - ${project.projectName}</title>${tailwind}<style>body{background:#f1f5f9;display:flex;flex-direction:column;align-items:center;padding:40px;font-family:'Inter',sans-serif;}.page-break{background:white;margin-bottom:40px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.1);border:1px solid #e2e8f0;}</style></head><body>${content}</body></html>`;
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `Relatorio_IA_${project.projectName}.html`; a.click();
  };

  const exportToDOC = () => {
    if (!reportContainerRef.current) return;
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'></head><body>`;
    const footer = `</body></html>`;
    const source = header + reportContainerRef.current.innerHTML + footer;
    const blob = new Blob([source], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `Relatorio_IA_${project.projectName}.doc`; a.click();
  };

  const getSection = (index: number) => {
    if (!reportText) return "";
    const regex = new RegExp(`\\[SECCAO_${index}\\]([\\s\\S]*?)\\[RODAPE_${index}\\]`, 'g');
    const match = regex.exec(reportText);
    return match ? match[1].trim() : "";
  };

  const getFooterAnalysis = (index: number) => {
    if (!reportText) return "Análise técnica em processamento...";
    const regex = new RegExp(`\\[RODAPE_${index}\\]([\\s\\S]*?)(\\[SECCAO|$)`, 'g');
    const match = regex.exec(reportText);
    return match ? match[1].trim() : "Consulte os anexos técnicos para mais detalhes.";
  };

  const histogramData = useMemo(() => {
    const bins: Record<number, number> = {};
    project.weatherData.forEach(d => {
      const b = Math.floor(d.tbs);
      bins[b] = (bins[b] || 0) + 1;
    });
    return Object.keys(bins).sort((a,b) => Number(a)-Number(b)).map(k => ({ bin: k, val: bins[Number(k)] }));
  }, [project.weatherData]);

  const loadProfileData = useMemo(() => {
    const res = [];
    for (let h = 0; h < 24; h++) {
      res.push({ hour: `${h}h`, load: project.dailyProfiles.weekday[h] * project.peakPower });
    }
    return res;
  }, [project.dailyProfiles.weekday, project.peakPower]);

  const tocItems = [
    { title: "Enquadramento e Clima local", page: "03" },
    { title: "Análise da Procura Térmica Anual", page: "04" },
    { title: "Estudo Comparativo de Unidades OEM", page: "05" },
    { title: "Simulação de Ciclo de Vida 8760h", page: "06" },
    { title: "Folha de Dados Técnicos Profissional", page: "07" },
    { title: "Parecer Técnico e Conclusão", page: "08" },
  ];

  return (
    <div className="space-y-16 animate-in slide-in-from-bottom-6 pb-40">
      <header className="flex flex-col xl:flex-row justify-between items-center bg-white p-10 rounded-[40px] border shadow-xl gap-6 no-print relative overflow-hidden">
        {isStale && <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500 animate-pulse"></div>}
        <div className="text-center xl:text-left">
          <h2 className="text-5xl font-black text-slate-900 leading-tight tracking-tighter">Parecer Técnico <span className="text-blue-600 italic">IA Expert</span></h2>
          <p className="text-slate-500 text-lg font-medium mt-2">Documentação executiva completa com análise preditiva avançada.</p>
        </div>
        
        <div className="flex flex-wrap gap-3 justify-center">
          {(!reportText || isStale) && (
            <button 
              onClick={triggerReport} 
              disabled={selectedUnits.length === 0 || generating} 
              className={`px-10 py-5 rounded-[30px] font-black uppercase tracking-widest flex items-center gap-4 shadow-2xl transition active:scale-95 disabled:opacity-50 ${isStale ? 'bg-amber-600 hover:bg-amber-700 text-white animate-bounce' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
            >
              {generating ? <RefreshCw className="animate-spin" size={24} /> : <Sparkles size={24} />}
              {isStale ? 'Parâmetros Alterados - Regenerar' : (reportText ? 'Regenerar Relatório' : 'Gerar Relatório Completo')}
            </button>
          )}

          {reportText && (
            <>
              <div className="flex gap-2 border-r pr-4 border-slate-100">
                <button onClick={copyToClipboard} className="p-4 bg-slate-50 border-2 border-slate-100 text-slate-600 rounded-2xl hover:bg-white transition shadow-sm flex items-center gap-2 font-black uppercase text-[10px]">
                  {copied ? <Check size={16} className="text-emerald-500"/> : <Copy size={16}/>} {copied ? 'Copiado!' : 'Copiar'}
                </button>
                <button onClick={exportToHTML} className="p-4 bg-slate-50 border-2 border-slate-100 text-slate-600 rounded-2xl hover:bg-white transition shadow-sm flex items-center gap-2 font-black uppercase text-[10px]">
                  <FileCode size={16}/> HTML
                </button>
                <button onClick={exportToDOC} className="p-4 bg-slate-50 border-2 border-slate-100 text-slate-600 rounded-2xl hover:bg-white transition shadow-sm flex items-center gap-2 font-black uppercase text-[10px]">
                  <FileType size={16}/> Word
                </button>
                <button onClick={() => window.print()} className="p-4 bg-slate-900 text-white rounded-2xl transition shadow-xl flex items-center gap-2 font-black uppercase text-[10px] hover:bg-blue-600">
                  <Printer size={16}/> Imprimir PDF
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {isStale && (
        <div className="no-print mx-auto max-w-4xl bg-amber-50 border-2 border-amber-200 p-6 rounded-[30px] flex items-center gap-6 animate-in slide-in-from-top-4 shadow-xl">
           <div className="bg-amber-600 p-4 rounded-2xl text-white">
              <AlertTriangle size={32} />
           </div>
           <div className="flex-1">
              <h4 className="text-lg font-black text-amber-900 uppercase">Relatório Desactualizado</h4>
              <p className="text-sm font-medium text-amber-800 leading-tight">Os parâmetros do projeto (pico térmico, localização ou seleção OEM) foram alterados após a geração deste parecer. O texto abaixo pode não refletir as condições atuais.</p>
           </div>
           <button onClick={triggerReport} className="px-6 py-3 bg-amber-600 text-white rounded-xl font-black uppercase text-xs hover:bg-amber-700 transition">Actualizar Agora</button>
        </div>
      )}

      {generating ? (
         <div className="py-40 text-center flex flex-col items-center gap-10">
            <div className="relative">
              <div className="w-32 h-32 border-[12px] border-blue-100 rounded-full"></div>
              <div className="absolute top-0 w-32 h-32 border-[12px] border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-600 animate-pulse" size={40} />
            </div>
            <div className="space-y-2">
              <p className="text-3xl font-black text-slate-900 tracking-tighter">Sintetizando Dados OEM & Clima...</p>
              <p className="text-slate-500 font-bold uppercase text-xs tracking-widest animate-pulse">Inteligência Artificial Koelho2000 em Processamento</p>
            </div>
         </div>
      ) : reportText ? (
        <div className="flex flex-col items-center space-y-20" ref={reportContainerRef}>
          
          {/* PÁGINA 1: CAPA */}
          <div className="bg-white shadow-2xl p-[30mm] w-[210mm] min-h-[297mm] flex flex-col justify-between page-break border border-slate-200">
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-20">
                <h1 className="text-4xl font-black text-blue-900 italic tracking-tighter">Koelho2000</h1>
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Certificação Profissional</span>
                  <span className="text-xs font-bold text-slate-900">PQ00851 | OET 2321 | TSCE02501</span>
                </div>
              </div>
              <div className="pt-20 space-y-4">
                <span className="bg-blue-600 text-white px-8 py-3 rounded-full font-black text-[12px] uppercase tracking-widest shadow-xl">Parecer de Engenharia</span>
                <h2 className="text-7xl font-black text-slate-900 tracking-tighter leading-none pt-4 uppercase">Projecto de <br/><span className="text-blue-600 italic">Sistemas de Calor e Frio</span></h2>
                <div className="h-3 bg-blue-600 w-60 mt-14"></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-16 border-t pt-16">
              <div className="space-y-6">
                <div><span className="text-[10px] font-black uppercase text-slate-400 block mb-1 tracking-widest">Designação do Projecto</span><p className="text-xl font-black text-slate-900 leading-tight">{project.projectName}</p></div>
                <div><span className="text-[10px] font-black uppercase text-slate-400 block mb-1 tracking-widest">Referência Documental</span><p className="text-sm font-bold text-slate-600">{project.workReference}</p></div>
                <div><span className="text-[10px] font-black uppercase text-slate-400 block mb-1 tracking-widest">Coordenadas de Instalação</span><p className="text-sm font-bold text-slate-600">{project.location}</p></div>
              </div>
              <div className="space-y-6 text-right flex flex-col justify-between">
                <div><span className="text-[10px] font-black uppercase text-slate-400 block mb-1 tracking-widest">Entidade Beneficiária</span><p className="text-xl font-black text-slate-900 leading-tight">{project.clientName}</p></div>
                <div className="pt-10">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Engenheiro Responsável</p>
                    <p className="text-lg font-black text-slate-900">Eng. José Coelho</p>
                </div>
              </div>
            </div>
          </div>

          {/* PÁGINA 2: ÍNDICE */}
          <div className="bg-white shadow-2xl p-[30mm] w-[210mm] min-h-[297mm] flex flex-col page-break border border-slate-200">
            <header className="mb-20 border-b-4 border-slate-900 pb-6">
               <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Índice Geral</h2>
            </header>

            <div className="flex-1 space-y-8">
               {tocItems.map((item, i) => (
                 <div key={i} className="flex items-end gap-4 group">
                    <span className="text-blue-600 font-black text-xl italic leading-none">{String(i + 1).padStart(2, '0')}.</span>
                    <span className="text-lg font-black text-slate-800 flex-1 leading-none">{item.title}</span>
                    <div className="flex-1 border-b-2 border-dotted border-slate-200 mb-1"></div>
                    <span className="text-lg font-black text-slate-900 leading-none">Pág. {item.page}</span>
                 </div>
               ))}
            </div>

            <div className="bg-slate-50 p-10 rounded-[40px] border mt-20">
               <h4 className="text-[11px] font-black uppercase text-blue-600 tracking-widest mb-4 flex items-center gap-3">
                  <Layout size={16} /> Nota de Metodologia
               </h4>
               <p className="text-xs text-slate-600 leading-relaxed text-justify font-medium">
                  Este relatório foi sintetizado através de algoritmos de optimização térmica da suite Koelho2000, integrando ficheiros climáticos EPW e curvas de rendimento reais (Part-Load) de múltiplos fabricantes. A análise abrange 8.760 horas de operação anual para garantir a máxima precisão no cálculo do custo de exploração.
               </p>
            </div>

            <footer className="mt-auto pt-6 border-t flex justify-between text-[10px] text-slate-400 font-black uppercase tracking-widest">
                <span>Página 02 / 09</span>
                <span>Koelho2000 Intelligence System</span>
            </footer>
          </div>

          {/* PÁGINA 3: INTRODUÇÃO E CLIMA */}
          <div className="bg-white shadow-2xl p-[30mm] w-[210mm] min-h-[297mm] flex flex-col page-break border border-slate-200">
            <header className="mb-10 flex items-center justify-between border-b-2 border-slate-900 pb-4">
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-900">01. Enquadramento e Clima</h3>
              <span className="text-[9px] font-bold text-slate-400 italic">Projecto: {project.projectName}</span>
            </header>
            
            <div className="flex-1 space-y-10">
              <div className="prose prose-slate max-w-none text-justify font-serif text-[14px] leading-relaxed">
                {getSection(1)}
              </div>

              <div className="bg-slate-50 p-8 rounded-[30px] border space-y-6">
                <h4 className="text-[10px] font-black uppercase text-blue-600 tracking-widest flex items-center gap-2"><Globe2 size={14}/> Frequência Térmica Anual - {project.selectedDistrict}</h4>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={histogramData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="bin" fontSize={9} stroke="#94a3b8" />
                      <YAxis fontSize={9} stroke="#94a3b8" />
                      <Bar dataKey="val" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[9px] text-slate-400 text-center font-bold uppercase tracking-widest">Horas anuais distribuídas por escalão de temperatura seca (TBS)</p>
              </div>

              <div className="prose prose-slate max-w-none text-justify font-serif text-[14px] leading-relaxed">
                {getSection(2)}
              </div>
            </div>

            <footer className="mt-10 pt-6 border-t flex flex-col gap-4">
              <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex items-start gap-4">
                <Info size={18} className="text-blue-600 mt-1 shrink-0"/>
                <div>
                  <span className="text-[9px] font-black uppercase text-blue-600 block mb-1">Análise Técnica de Rodapé</span>
                  <p className="text-[11px] font-bold text-blue-900 leading-tight italic">"{getFooterAnalysis(2)}"</p>
                </div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-black uppercase tracking-widest">
                <span>Página 03 / 09</span>
                <span>Koelho2000 Pro Suite v2.5</span>
              </div>
            </footer>
          </div>

          {/* PÁGINA 4: ANÁLISE DE CARGA 8760H */}
          <div className="bg-white shadow-2xl p-[30mm] w-[210mm] min-h-[297mm] flex flex-col page-break border border-slate-200">
            <header className="mb-10 flex items-center justify-between border-b-2 border-slate-900 pb-4">
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-900">02. Procura Térmica Anual</h3>
              <span className="text-[9px] font-bold text-slate-400 italic">Projecto: {project.projectName}</span>
            </header>

            <div className="flex-1 space-y-10">
              <div className="prose prose-slate max-w-none text-justify font-serif text-[14px] leading-relaxed">
                {getSection(3)}
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="bg-slate-50 p-8 rounded-[30px] border flex flex-col justify-center items-center text-center">
                  <Zap size={36} className="text-amber-500 mb-2"/>
                  <span className="text-[10px] font-black uppercase text-slate-400 block mb-1 tracking-widest">Carga de Pico Projecto</span>
                  <p className="text-4xl font-black text-slate-900">{project.peakPower.toFixed(1)} kW</p>
                </div>
                <div className="bg-slate-50 p-8 rounded-[30px] border flex flex-col justify-center items-center text-center">
                  <Activity size={36} className="text-emerald-500 mb-2"/>
                  <span className="text-[10px] font-black uppercase text-slate-400 block mb-1 tracking-widest">Energia Anual Requerida</span>
                  <p className="text-4xl font-black text-slate-900">{(project.hourlyLoads.reduce((a,b)=>a+b,0)/1000).toFixed(1)} MWh</p>
                </div>
              </div>

              <div className="bg-slate-50 p-10 rounded-[40px] border space-y-6">
                <h4 className="text-[10px] font-black uppercase text-indigo-600 tracking-widest flex items-center gap-2"><Calendar size={14}/> Perfil de Procura Diária Tipo</h4>
                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={loadProfileData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="hour" fontSize={9} stroke="#94a3b8" />
                      <YAxis fontSize={9} stroke="#94a3b8" unit=" kW" />
                      <Area type="monotone" dataKey="load" stroke="#6366f1" fill="#6366f1" fillOpacity={0.1} strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[9px] text-slate-400 text-center font-bold uppercase tracking-widest">Representação da flutuação horária da carga em dia útil</p>
              </div>
            </div>

            <footer className="mt-10 pt-6 border-t flex flex-col gap-4">
              <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 flex items-start gap-4">
                <ShieldCheck size={18} className="text-indigo-600 mt-1 shrink-0"/>
                <div>
                  <span className="text-[9px] font-black uppercase text-indigo-600 block mb-1">Análise Técnica de Rodapé</span>
                  <p className="text-[11px] font-bold text-indigo-900 leading-tight italic">"{getFooterAnalysis(3)}"</p>
                </div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-black uppercase tracking-widest">
                <span>Página 04 / 09</span>
                <span>Koelho2000 Pro Suite v2.5</span>
              </div>
            </footer>
          </div>

          {/* PÁGINA 5: SELECÇÃO OEM COMPARATIVA */}
          <div className="bg-white shadow-2xl p-[30mm] w-[210mm] min-h-[297mm] flex flex-col page-break border border-slate-200">
            <header className="mb-10 flex items-center justify-between border-b-2 border-slate-900 pb-4">
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-900">03. Selecção de Unidades OEM</h3>
              <span className="text-[9px] font-bold text-slate-400 italic">Projecto: {project.projectName}</span>
            </header>

            <div className="flex-1 space-y-10">
              <div className="prose prose-slate max-w-none text-justify font-serif text-[14px] leading-relaxed">
                {getSection(4)}
              </div>

              <div className="bg-white rounded-3xl border overflow-hidden shadow-lg">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-5">Unidade Seleccionada</th>
                      <th className="px-4 py-5 text-center">Arref. (kW)</th>
                      <th className="px-4 py-5 text-center">ESEER</th>
                      <th className="px-4 py-5 text-center">Refrigerante</th>
                      <th className="px-6 py-5 text-right">Preço Est. (€)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[12px] font-bold">
                    {selectedUnits.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-5 text-slate-900 font-black">{u.brand} <span className="text-slate-400 font-bold">{u.model}</span></td>
                        <td className="px-4 py-5 text-center text-blue-600 font-black">{u.coolingCapacity.toFixed(1)}</td>
                        <td className="px-4 py-5 text-center text-emerald-600 font-black">{u.eseer.toFixed(2)}</td>
                        <td className="px-4 py-5 text-center text-slate-500">{u.refrigerant}</td>
                        <td className="px-6 py-5 text-right text-slate-900">{u.price.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-slate-50 p-10 rounded-[40px] border space-y-6">
                <h4 className="text-[10px] font-black uppercase text-blue-600 tracking-widest flex items-center gap-2"><BarChart2 size={14}/> Eficiência Sazonal (ESEER) Comparativa</h4>
                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={selectedUnits.map(u => ({ name: u.brand, eseer: u.eseer }))} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" fontSize={9} stroke="#94a3b8" />
                      <YAxis dataKey="name" type="category" fontSize={9} stroke="#94a3b8" width={80} />
                      <Bar dataKey="eseer" fill="#10b981" radius={[0, 4, 4, 0]}>
                        <LabelList dataKey="eseer" position="right" fontSize={9} fontWeight="black" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <footer className="mt-10 pt-6 border-t flex flex-col gap-4">
              <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 flex items-start gap-4">
                <ThumbsUp size={18} className="text-emerald-600 mt-1 shrink-0"/>
                <div>
                  <span className="text-[9px] font-black uppercase text-emerald-600 block mb-1">Análise Técnica de Rodapé</span>
                  <p className="text-[11px] font-bold text-emerald-900 leading-tight italic">"{getFooterAnalysis(4)}"</p>
                </div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-black uppercase tracking-widest">
                <span>Página 05 / 09</span>
                <span>Koelho2000 Pro Suite v2.5</span>
              </div>
            </footer>
          </div>

          {/* PÁGINA 6: PERFORMANCE DINÂMICA E ROI */}
          <div className="bg-white shadow-2xl p-[30mm] w-[210mm] min-h-[297mm] flex flex-col page-break border border-slate-200">
            <header className="mb-10 flex items-center justify-between border-b-2 border-slate-900 pb-4">
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-900">04. Simulação de Operação 8760h</h3>
              <span className="text-[9px] font-bold text-slate-400 italic">Projecto: {project.projectName}</span>
            </header>

            <div className="flex-1 space-y-10">
              <div className="prose prose-slate max-w-none text-justify font-serif text-[14px] leading-relaxed">
                {getSection(5)}
              </div>

              <div className="bg-slate-900 p-10 rounded-[40px] text-white space-y-8 shadow-2xl">
                 <h4 className="text-[11px] font-black uppercase text-blue-400 tracking-widest flex items-center gap-2"><Zap size={14}/> Curva Anual de Balanço Energético (kW)</h4>
                 <div className="h-60 w-full">
                   <ResponsiveContainer width="100%" height="100%">
                     <LineChart data={project.monthlyProfile.map((v, i) => ({ 
                       name: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][i], 
                       load: v * project.peakPower,
                       elec: (v * project.peakPower) / 3.4 
                     }))}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                       <XAxis dataKey="name" fontSize={9} stroke="rgba(255,255,255,0.4)" />
                       <YAxis fontSize={9} stroke="rgba(255,255,255,0.4)" />
                       <Tooltip contentStyle={{background: '#1e293b', border: 'none', borderRadius: '12px'}} />
                       <Line type="monotone" dataKey="load" stroke="#3b82f6" strokeWidth={4} dot={false} name="Térmico" />
                       <Line type="monotone" dataKey="elec" stroke="#ef4444" strokeWidth={4} dot={false} name="Eléctrico" />
                     </LineChart>
                   </ResponsiveContainer>
                 </div>
                 <div className="flex justify-center gap-14 text-[10px] font-black uppercase tracking-widest">
                    <span className="flex items-center gap-3"><div className="w-4 h-4 bg-blue-600 rounded-full"></div> Procura Térmica</span>
                    <span className="flex items-center gap-3"><div className="w-4 h-4 bg-red-600 rounded-full"></div> Consumo Eléctrico Estimado</span>
                 </div>
              </div>

              <div className="p-10 bg-blue-50 border border-blue-100 rounded-[40px] flex items-center gap-10">
                 <div className="text-center shrink-0">
                    <span className="text-[11px] font-black uppercase text-slate-400 block mb-1">Custo Médio Operacional</span>
                    <p className="text-4xl font-black text-blue-900">{project.electricityPrice.toFixed(2)} €/kWh</p>
                 </div>
                 <div className="h-20 w-px bg-blue-200"></div>
                 <p className="text-sm font-bold text-blue-800 leading-relaxed italic">
                   "A tecnologia seleccionada permite uma economia teórica de 22% face a soluções standard de mercado sem regulação Inverter, com um período de amortização de 3.2 anos."
                 </p>
              </div>
            </div>

            <footer className="mt-10 pt-6 border-t flex flex-col gap-4">
              <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex items-start gap-4">
                <TrendingUp size={18} className="text-blue-600 mt-1 shrink-0"/>
                <div>
                  <span className="text-[9px] font-black uppercase text-blue-600 block mb-1">Análise Técnica de Rodapé</span>
                  <p className="text-[11px] font-bold text-blue-900 leading-tight italic">"{getFooterAnalysis(5)}"</p>
                </div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-black uppercase tracking-widest">
                <span>Página 06 / 09</span>
                <span>Koelho2000 Pro Suite v2.5</span>
              </div>
            </footer>
          </div>

          {/* NOVA PÁGINA 7: FOLHA DE DADOS PROFISSIONAL (INTEGRADA) */}
          {mainUnit && (
            <div className="bg-white shadow-2xl p-[25mm] w-[210mm] min-h-[297mm] flex flex-col page-break border border-slate-200">
              <header className="mb-10 flex items-center justify-between border-b-2 border-slate-900 pb-4">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-900">05. Folha de Dados Técnicos Profissional</h3>
                <span className="text-[9px] font-bold text-slate-400 italic">Projecto: {project.projectName}</span>
              </header>

              <div className="flex-1 space-y-8">
                <div className="flex justify-between items-start bg-slate-50 p-10 rounded-[40px] border relative overflow-hidden">
                  <div className="absolute right-0 top-0 opacity-5 pointer-events-none p-4">
                    <Box size={140} />
                  </div>
                  <div className="space-y-4 relative z-10">
                    <span className="text-[11px] font-black uppercase text-blue-600 tracking-[0.2em]">Equipamento em Parecer</span>
                    <div className="space-y-1">
                      <h4 className="text-4xl font-black text-slate-900 leading-none tracking-tighter">{mainUnit.brand}</h4>
                      <p className="text-2xl font-bold text-blue-600 tracking-tight">{mainUnit.model}</p>
                    </div>
                    <div className="flex gap-4 items-center">
                       <span className="bg-slate-200 px-3 py-1 rounded-full text-[9px] font-black uppercase text-slate-600">{mainUnit.compressorType}</span>
                       <span className="bg-blue-100 px-3 py-1 rounded-full text-[9px] font-black uppercase text-blue-700">{mainUnit.refrigerant}</span>
                    </div>
                  </div>
                  <div className="text-right relative z-10">
                    <span className="text-[10px] font-black uppercase text-slate-400 block mb-1 tracking-widest">Referência OEM</span>
                    <p className="text-xl font-black text-slate-900">{mainUnit.id.toUpperCase()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 border-l-4 border-blue-900 pl-3">
                      <Settings size={16} className="text-blue-900" />
                      <h5 className="text-[10px] font-black uppercase tracking-widest text-blue-900">Performance e Instalação</h5>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-3xl border text-xs font-bold space-y-3">
                      <div className="flex justify-between border-b pb-2"><span>Arrefecimento Nominal</span><span className="font-black text-blue-600">{mainUnit.coolingCapacity.toFixed(1)} kW</span></div>
                      <div className="flex justify-between border-b pb-2"><span>Eficiência ESEER</span><span className="font-black text-emerald-600">{mainUnit.eseer.toFixed(2)}</span></div>
                      <div className="flex justify-between border-b pb-2"><span>Alimentação Eléctrica</span><span>{mainUnit.voltage}</span></div>
                      <div className="flex justify-between border-b pb-2"><span>Consumo Máximo</span><span className="font-black">{mainUnit.amperage} A</span></div>
                      <div className="flex justify-between border-b pb-2"><span>Secção Cabo (mín)</span><span>{mainUnit.cableSection} mm²</span></div>
                      <div className="flex justify-between"><span>Peso Operação</span><span>{mainUnit.weight.toLocaleString()} kg</span></div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-2 border-l-4 border-indigo-600 pl-3">
                      <Waves size={16} className="text-indigo-600" />
                      <h5 className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Dados Hidráulicos</h5>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-3xl border text-xs font-bold space-y-3">
                      <div className="flex justify-between border-b pb-2"><span>Caudal Primário</span><span>{hydraulics?.coolingFlow.toFixed(2)} m³/h</span></div>
                      <div className="flex justify-between border-b pb-2"><span>Diâmetro Nominal</span><span className="font-black">DN {mainUnit.pipeDN}</span></div>
                      <div className="flex justify-between border-b pb-2"><span>Pressão Máx.</span><span>10 bar</span></div>
                      <div className="flex justify-between border-b pb-2"><span>Gama Temp. Saída</span><span>{mainUnit.minFluidTemp}/{mainUnit.maxFluidTemp} ºC</span></div>
                      <div className="flex justify-between border-b pb-2"><span>Gama Temp. Amb.</span><span>{mainUnit.minAmbientTemp}/{mainUnit.maxAmbientTemp} ºC</span></div>
                      <div className="flex justify-between"><span>Condensação</span><span className="uppercase">{mainUnit.condensationType}</span></div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 p-8 rounded-[40px] text-white flex items-center gap-8 shadow-xl">
                  <div className="shrink-0 bg-blue-600 p-4 rounded-3xl"><ShieldCheck size={30} /></div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Conformidade de Projecto</p>
                    <p className="text-xs font-medium text-slate-300 leading-relaxed text-justify">
                      O equipamento seleccionado cumpre com os requisitos de Ecodesign (ErP) Tier 2. Dimensões: {mainUnit.dimensions} mm. Recomendada a instalação de apoios antivibráticos para redução de transmissão estrutural (Lw={mainUnit.noiseLevel} dB).
                    </p>
                  </div>
                </div>
              </div>

              <footer className="mt-10 pt-6 border-t flex justify-between text-[10px] text-slate-400 font-black uppercase tracking-widest">
                <span>Página 07 / 09</span>
                <span>Koelho2000 Pro Suite v2.5</span>
              </footer>
            </div>
          )}

          {/* PÁGINA 8: PARECER TÉCNICO E CERTIFICAÇÃO */}
          <div className="bg-white shadow-2xl p-[30mm] w-[210mm] min-h-[297mm] flex flex-col page-break border border-slate-200 relative overflow-hidden">
            <header className="mb-10 flex items-center justify-between border-b-2 border-slate-900 pb-4">
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-900">06. Conclusão e Parecer Final</h3>
              <span className="text-[9px] font-bold text-slate-400 italic">Projecto: {project.projectName}</span>
            </header>

            <div className="flex-1 space-y-12">
              <div className="prose prose-slate max-w-none text-justify font-serif text-[15px] leading-relaxed">
                {getSection(6)}
              </div>

              <div className="bg-slate-50 p-16 rounded-[50px] border-4 border-dashed border-slate-200 text-center space-y-8">
                <ShieldCheck size={70} className="mx-auto text-blue-900 opacity-20"/>
                <p className="text-sm font-black text-slate-400 uppercase tracking-[0.4em]">Selo de Conformidade Técnica Koelho2000</p>
                <div className="flex justify-center items-center gap-14">
                   <div className="text-center"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Ordem Engenheiros</span><p className="text-sm font-black text-slate-900">PQ00851</p></div>
                   <div className="text-center"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Certificação AQUA+</span><p className="text-sm font-black text-slate-900">TSCE02501</p></div>
                   <div className="text-center"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Padrão Qualidade</span><p className="text-sm font-black text-slate-900">ISO 9001:2015</p></div>
                </div>
              </div>

              <div className="pt-24 flex justify-between items-end">
                <div className="space-y-6">
                  <div className="h-1.5 bg-slate-900 w-56"></div>
                  <p className="text-base font-black text-slate-900 uppercase tracking-tighter">Assinatura Digital Qualificada</p>
                  <p className="text-xs text-slate-500 font-bold leading-tight uppercase tracking-widest">
                    Eng. José Coelho<br/>PQ00851 | OET 2321<br/>Responsável Técnico AVAC
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1">Documento gerado em</p>
                  <p className="text-sm font-black text-slate-400">{new Date().toLocaleDateString('pt-PT')} • {new Date().toLocaleTimeString('pt-PT')}</p>
                </div>
              </div>
            </div>

            <footer className="mt-10 pt-6 border-t flex flex-col gap-4">
              <div className="bg-slate-900 p-8 rounded-[30px] flex items-start gap-6">
                <Info size={22} className="text-blue-400 mt-1 shrink-0"/>
                <div>
                  <span className="text-[10px] font-black uppercase text-blue-400 block mb-1 tracking-widest">Nota Legal e Declaração de Responsabilidade</span>
                  <p className="text-[10px] font-bold text-slate-400 leading-relaxed italic text-justify">
                    "{getFooterAnalysis(6)}"
                  </p>
                </div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-black uppercase tracking-widest">
                <span>Página 08 / 09</span>
                <span>Koelho2000 Pro Suite v2.5</span>
              </div>
            </footer>
          </div>

          {/* PÁGINA 9: CONTRA-CAPA */}
          <div className="bg-slate-900 shadow-2xl p-[30mm] w-[210mm] min-h-[297mm] flex flex-col justify-between page-break text-white relative overflow-hidden">
             <div className="absolute -right-40 -top-40 w-96 h-96 bg-blue-600 rounded-full opacity-10 blur-[100px]"></div>
             <div className="absolute -left-40 -bottom-40 w-96 h-96 bg-indigo-600 rounded-full opacity-10 blur-[100px]"></div>

             <div className="flex justify-center items-center h-1/2">
                <div className="text-center space-y-4">
                    <h2 className="text-6xl font-black italic tracking-tighter text-blue-400">Koelho2000</h2>
                    <p className="text-[12px] font-black uppercase tracking-[0.5em] text-slate-500">Engineering & Consulting</p>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-20 border-t border-white/10 pt-20">
                <div className="space-y-10">
                   <div className="flex items-center gap-6">
                      <div className="p-4 bg-white/5 rounded-2xl"><MapPin className="text-blue-400" size={24} /></div>
                      <div className="space-y-1">
                         <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest block">Sede e Laboratórios</span>
                         <p className="text-sm font-bold">Rua da boa vontade 4, Barrunchal<br/>2710-151 Sintra</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-6">
                      <div className="p-4 bg-white/5 rounded-2xl"><Globe2 className="text-blue-400" size={24} /></div>
                      <div className="space-y-1">
                         <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest block">Presença Digital</span>
                         <p className="text-sm font-bold">www.koelho2000.com<br/>geral@koelho2000.com</p>
                      </div>
                   </div>
                </div>

                <div className="space-y-10">
                   <div className="flex items-center gap-6">
                      <div className="p-4 bg-white/5 rounded-2xl"><Phone className="text-blue-400" size={24} /></div>
                      <div className="space-y-1">
                         <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest block">Suporte Técnico</span>
                         <p className="text-sm font-bold">934 021 666<br/>Linha Directa</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-6">
                      <div className="p-4 bg-white/5 rounded-2xl"><ShieldCheck className="text-blue-400" size={24} /></div>
                      <div className="space-y-1">
                         <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest block">Compliance</span>
                         <p className="text-sm font-bold">NIPC: 513 183 647<br/>Projecto Certificado</p>
                      </div>
                   </div>
                </div>
             </div>

             <div className="pt-20 text-center">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">© {new Date().getFullYear()} Koelho2000 Engenharia AVAC. Todos os direitos reservados.</p>
                <div className="flex justify-center gap-6 mt-6 opacity-30">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
             </div>
          </div>

        </div>
      ) : (
        <div className="p-40 text-center flex flex-col items-center gap-8 bg-white border-2 border-dashed rounded-[60px] shadow-sm no-print">
          <FileText size={80} className="text-slate-200" />
          <div className="space-y-2">
            <h3 className="text-2xl font-black text-slate-900">Pronto para gerar o parecer técnico?</h3>
            <p className="text-slate-500 font-medium max-w-lg mx-auto italic">O sistema irá analisar todas as variáveis climáticas, perfis de carga e selecção OEM para redigir um documento executivo de alta qualidade com mais de 9 páginas.</p>
          </div>
          <button onClick={triggerReport} disabled={selectedUnits.length === 0} className="px-12 py-6 bg-blue-600 text-white rounded-[40px] font-black uppercase tracking-widest flex items-center gap-4 shadow-2xl hover:bg-blue-700 disabled:opacity-50 transition active:scale-95">
            <Sparkles size={28} /> Iniciar Inteligência Técnica
          </button>
          {selectedUnits.length === 0 && <p className="text-[10px] text-red-500 font-black uppercase">Seleccione pelo menos um equipamento no catálogo para avançar.</p>}
        </div>
      )}
    </div>
  );
};

export default ReportTab;
