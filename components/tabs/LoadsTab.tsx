
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { 
  Settings, 
  FileDown, 
  FileUp, 
  Zap, 
  LayoutGrid, 
  Clock, 
  Activity, 
  BarChart3, 
  TrendingUp, 
  CalendarDays, 
  CheckCircle2, 
  Info, 
  Lightbulb, 
  ShieldCheck, 
  ThermometerSnowflake, 
  AlertTriangle, 
  RefreshCw,
  Globe2 
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend, BarChart, Bar, Cell } from 'recharts';
import { ProjectData } from '../../types';
import { STANDARD_PROFILES } from '../../constants';

interface Props {
  project: ProjectData;
  setProject: React.Dispatch<React.SetStateAction<ProjectData>>;
}

const LoadsTab: React.FC<Props> = ({ project, setProject }) => {
  const [activeProfileIdx, setActiveProfileIdx] = useState<number | null>(null);
  const [needsSimulation, setNeedsSimulation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stats = useMemo(() => {
    const total = project.hourlyLoads.reduce((a, b) => a + b, 0);
    const max = Math.max(...project.hourlyLoads, 0);
    const avg = total / 8760;
    const lf = max > 0 ? (avg / max) * 100 : 0;
    return { energyMWh: total / 1000, max, avg, lf };
  }, [project.hourlyLoads]);

  // Diagrama de Carga Média Diária (24h)
  const averageDayData = useMemo(() => {
    const hourlySums = new Array(24).fill(0);
    project.hourlyLoads.forEach((load, i) => {
      hourlySums[i % 24] += load;
    });
    return hourlySums.map((sum, h) => ({
      hour: `${h}h`,
      avgLoad: sum / 365
    }));
  }, [project.hourlyLoads]);

  // Comparativo Dias Úteis vs Fim de Semana (24h)
  const averageWeeklyComparisonData = useMemo(() => {
    const weeklyProfiles: Record<number, number[]> = {
      0: new Array(24).fill(0), 1: new Array(24).fill(0), 2: new Array(24).fill(0),
      3: new Array(24).fill(0), 4: new Array(24).fill(0), 5: new Array(24).fill(0), 6: new Array(24).fill(0)
    };
    const counts = new Array(7).fill(0);

    for (let i = 0; i < 8760; i++) {
      const dayOfYear = Math.floor(i / 24);
      const dayOfWeek = dayOfYear % 7; 
      const hourOfDay = i % 24;
      weeklyProfiles[dayOfWeek][hourOfDay] += project.hourlyLoads[i];
      if (hourOfDay === 0) counts[dayOfWeek]++;
    }

    const res = [];
    for (let h = 0; h < 24; h++) {
      res.push({
        hour: `${h}h`,
        Úteis: (weeklyProfiles[0][h] + weeklyProfiles[1][h] + weeklyProfiles[2][h] + weeklyProfiles[3][h] + weeklyProfiles[4][h]) / (5 * (counts[0] || 1)),
        FimSemana: (weeklyProfiles[5][h] + weeklyProfiles[6][h]) / (2 * (counts[5] || 1))
      });
    }
    return res;
  }, [project.hourlyLoads]);

  // Diagrama de Carga Média Semanal (2ª a Domingo)
  const weeklyCycleData = useMemo(() => {
    const dailyTotals = new Array(7).fill(0);
    const dailyCounts = new Array(7).fill(0);
    
    for (let i = 0; i < 8760; i++) {
      const dayOfYear = Math.floor(i / 24);
      const dayOfWeek = dayOfYear % 7;
      dailyTotals[dayOfWeek] += project.hourlyLoads[i];
      if (i % 24 === 0) dailyCounts[dayOfWeek]++;
    }
    
    const dayNames = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
    return dailyTotals.map((total, i) => ({
      name: dayNames[i],
      shortName: dayNames[i].substring(0, 3),
      load: dailyCounts[i] > 0 ? (total / (dailyCounts[i] * 24)) : 0
    }));
  }, [project.hourlyLoads]);

  const applyProfile = (idx: number) => {
    const p = STANDARD_PROFILES[idx];
    setActiveProfileIdx(idx);
    setProject(prev => ({
      ...prev,
      dailyProfiles: { weekday: [...p.weekday], weekend: [...p.weekend] },
      weeklyProfile: [...p.weekly],
      monthlyProfile: [...p.monthly],
      selectedProfileName: `Padrão: ${p.name}`
    }));
    setNeedsSimulation(true);
  };

  const calculateModel = () => {
    const newLoads = new Array(8760).fill(0);
    for (let m = 0; m < 12; m++) {
      const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m];
      const startH = [0, 744, 1416, 2160, 2880, 3624, 4344, 5088, 5832, 6552, 7296, 8016][m];
      for (let d = 0; d < monthDays; d++) {
        const dow = (d + (startH / 24)) % 7;
        const profile = dow >= 5 ? project.dailyProfiles.weekend : project.dailyProfiles.weekday;
        const factor = project.weeklyProfile[dow] * project.monthlyProfile[m];
        for (let h = 0; h < 24; h++) {
          const idx = startH + d * 24 + h;
          if (idx < 8760) newLoads[idx] = project.peakPower * profile[h] * factor;
        }
      }
    }
    setProject(prev => ({ ...prev, hourlyLoads: newLoads }));
    setNeedsSimulation(false);
  };

  const handleExportCSV = () => {
    const csv = "Hora,Carga_kW\n" + project.hourlyLoads.map((v, i) => `${i},${v.toFixed(3)}`).join("\n");
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Carga_8760h_${project.projectName}.csv`;
    a.click();
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const newLoads: number[] = [];
      
      lines.forEach(line => {
        const parts = line.split(',');
        const val = parseFloat(parts.length > 1 ? parts[1] : parts[0]);
        if (!isNaN(val)) {
          newLoads.push(val);
        }
      });

      if (newLoads.length >= 8760) {
        const finalLoads = newLoads.slice(0, 8760);
        const newMax = Math.max(...finalLoads);
        setProject(prev => ({ 
          ...prev, 
          hourlyLoads: finalLoads, 
          peakPower: newMax,
          selectedProfileName: 'Importado via CSV (8760h)'
        }));
        setActiveProfileIdx(null);
        setNeedsSimulation(false); 
        alert("Carga 8760h importada com sucesso! Potência de pico e gráficos atualizados.");
      } else {
        alert(`Ficheiro CSV inválido. Encontradas apenas ${newLoads.length} entradas (necessárias 8760).`);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <div className="space-y-10 animate-in slide-in-from-bottom-6 pb-20">
      <header className="bg-white p-10 rounded-[40px] border shadow-xl flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
        {needsSimulation && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500 animate-pulse"></div>
        )}
        <div className="flex-1">
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Análise de Carga Térmica 8760h</h2>
          <p className="text-slate-500 mt-2 font-medium">Defina ou importe o comportamento térmico anual da instalação.</p>
        </div>
        <div className="flex flex-wrap gap-4 justify-center items-center">
          <input type="file" ref={fileInputRef} onChange={handleImportCSV} accept=".csv" className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="px-6 py-4 bg-white border-2 border-indigo-100 text-indigo-700 rounded-2xl text-xs font-black uppercase flex items-center gap-2 hover:bg-indigo-50 transition shadow-sm active:scale-95">
            <FileUp size={18}/> Importar CSV 8760h
          </button>
          
          <button 
            onClick={() => window.open('https://k-kwchartcreate-50850505662.us-west1.run.app/', '_blank')} 
            className="px-6 py-4 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase flex items-center gap-2 shadow-lg hover:bg-emerald-700 transition active:scale-95"
          >
            <Globe2 size={18}/> Criar Carga Online
          </button>

          <button onClick={handleExportCSV} className="px-6 py-4 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl text-xs font-black uppercase flex items-center gap-2 hover:bg-slate-50 transition shadow-sm">
            <FileDown size={18}/> Exportar CSV
          </button>

          <div className="relative">
            <button 
              onClick={calculateModel} 
              className={`px-10 py-4 rounded-2xl text-xs font-black uppercase flex items-center gap-2 shadow-xl transition active:scale-95 ${needsSimulation ? 'bg-amber-600 hover:bg-amber-700 text-white animate-bounce' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
            >
              <Zap size={18}/> Simular 8760h
            </button>
            {needsSimulation && (
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-amber-600 text-white text-[9px] font-black py-2 px-4 rounded-full shadow-lg flex items-center gap-2 whitespace-nowrap border-2 border-white">
                <AlertTriangle size={12} /> Clique para actualizar gráficos
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-white p-10 rounded-[50px] border shadow-2xl space-y-10 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <h4 className="text-xs font-black uppercase text-slate-400 flex items-center gap-2 tracking-widest"><Settings size={16}/> Parâmetros de Carga</h4>
            <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full border border-blue-100">
               <span className="text-[10px] font-black uppercase text-blue-600 tracking-tighter">{project.selectedProfileName}</span>
               <CheckCircle2 size={14} className="text-blue-500" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Potência de Pico (kW)</label>
              <input 
                type="number" 
                value={project.peakPower} 
                onChange={e => {
                  setProject({...project, peakPower: Number(e.target.value), selectedProfileName: 'Padrão (Custom)'});
                  setNeedsSimulation(true);
                }} 
                className="w-full p-6 bg-slate-50 rounded-[25px] font-black text-3xl text-blue-600 border-none focus:ring-2 ring-blue-500 outline-none transition" 
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Set-point Saída (ºC)</label>
              <input type="number" value={project.targetTemperature} onChange={e => setProject({...project, targetTemperature: Number(e.target.value)})} className="w-full p-6 bg-slate-50 rounded-[25px] font-black text-3xl text-indigo-600 border-none focus:ring-2 ring-indigo-500 outline-none transition" />
            </div>
          </div>
          <div className="bg-slate-900 p-8 rounded-[35px] text-white flex justify-between items-center shadow-xl">
            <div><span className="text-[9px] uppercase font-black text-slate-500 block mb-1 tracking-widest">Energia Térmica Anual</span><span className="text-2xl font-black text-blue-400">{stats.energyMWh.toFixed(1)} MWh</span></div>
            <div className="text-right"><span className="text-[9px] uppercase font-black text-slate-500 block mb-1 tracking-widest">Factor de Carga</span><span className="text-2xl font-black text-emerald-400">{stats.lf.toFixed(1)}%</span></div>
          </div>
          
          {needsSimulation && (
            <div className="bg-amber-50 p-6 rounded-[30px] border border-amber-200 flex items-center gap-4 animate-in fade-in slide-in-from-left-4">
              <div className="bg-amber-100 p-3 rounded-2xl text-amber-600">
                <AlertTriangle size={24} />
              </div>
              <div>
                <p className="text-xs font-black text-amber-900 uppercase">Alterações Pendentes</p>
                <p className="text-[10px] text-amber-700 font-bold">Os parâmetros foram alterados. Clique no botão <span className="underline uppercase font-black">Simular 8760h</span> para actualizar os diagramas e estatísticas anuais.</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white p-10 rounded-[50px] border shadow-2xl flex flex-col">
          <h4 className="text-xs font-black uppercase text-slate-400 mb-6 flex items-center gap-2 tracking-widest"><LayoutGrid size={16}/> Perfis Padrão RECS / Koelho2000</h4>
          <div className="grid grid-cols-2 gap-4 flex-1 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
            {STANDARD_PROFILES.map((p, i) => (
              <button key={i} onClick={() => applyProfile(i)} className={`p-5 rounded-3xl text-[10px] font-black transition-all text-left flex items-center gap-4 border-2 ${project.selectedProfileName === `Padrão: ${p.name}` ? 'bg-blue-600 text-white border-blue-400 shadow-xl' : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100 active:scale-95'}`}>
                <Clock size={20} className={project.selectedProfileName === `Padrão: ${p.name}` ? 'opacity-100' : 'opacity-40'} /> {p.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white p-10 rounded-[50px] border shadow-2xl h-[450px] relative">
        {needsSimulation && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 rounded-[50px] flex items-center justify-center">
            <div className="bg-white p-8 rounded-[30px] shadow-2xl border text-center space-y-4 max-w-sm">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                <RefreshCw size={32} className="animate-spin" />
              </div>
              <p className="text-lg font-black text-slate-900 leading-tight">Actualização Necessária</p>
              <p className="text-xs text-slate-500 font-medium">Os dados do gráfico estão desactualizados face aos novos parâmetros.</p>
              <button onClick={calculateModel} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-blue-700 transition">Simular Agora</button>
            </div>
          </div>
        )}
        <h4 className="text-sm font-black uppercase text-slate-400 mb-6 flex items-center gap-3 tracking-widest"><Activity size={20} className="text-blue-500"/> Histórico de Carga 8760h (kW)</h4>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={project.hourlyLoads.map((v, i) => ({v}))}>
            <defs>
              <linearGradient id="loadColor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <Area type="monotone" dataKey="v" fill="url(#loadColor)" stroke="#3b82f6" strokeWidth={1} dot={false} name="Carga Horária"/>
            <XAxis hide /><YAxis fontSize={10} stroke="#94a3b8" /><Tooltip contentStyle={{borderRadius: '15px', border:'none', boxShadow:'0 10px 15px -3px rgba(0,0,0,0.1)'}} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Diagrama Diário Médio */}
        <div className="bg-white p-10 rounded-[50px] border shadow-2xl h-[500px] flex flex-col relative">
          {needsSimulation && <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-10 rounded-[50px]"></div>}
          <h4 className="text-sm font-black uppercase text-slate-400 mb-8 flex items-center gap-3 tracking-widest"><TrendingUp size={20} className="text-emerald-500"/> Perfil Diário (24h)</h4>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={averageDayData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="hour" fontSize={10} stroke="#94a3b8" interval={3} />
                <YAxis fontSize={10} stroke="#94a3b8" />
                <Tooltip contentStyle={{borderRadius: '15px', border:'none'}} />
                <Area type="monotone" dataKey="avgLoad" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={3} name="kW Médio" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Comparativo Semanal */}
        <div className="bg-white p-10 rounded-[50px] border shadow-2xl h-[500px] flex flex-col relative">
          {needsSimulation && <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-10 rounded-[50px]"></div>}
          <h4 className="text-sm font-black uppercase text-slate-400 mb-8 flex items-center gap-3 tracking-widest"><BarChart3 size={20} className="text-indigo-500"/> Úteis vs Fim-Semana</h4>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={averageWeeklyComparisonData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="hour" fontSize={10} stroke="#94a3b8" interval={3} />
                <YAxis fontSize={10} stroke="#94a3b8" />
                <Tooltip contentStyle={{borderRadius: '15px', border:'none'}} />
                <Legend iconType="circle" wrapperStyle={{paddingTop: '20px', fontSize: '10px', fontWeight: 'bold'}} />
                <Line type="monotone" dataKey="Úteis" stroke="#3b82f6" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="FimSemana" stroke="#6366f1" strokeWidth={3} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Diagrama de Carga Média Semanal (2ª a Domingo) */}
        <div className="bg-white p-10 rounded-[50px] border shadow-2xl h-[500px] flex flex-col relative">
          {needsSimulation && <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-10 rounded-[50px]"></div>}
          <h4 className="text-sm font-black uppercase text-slate-400 mb-8 flex items-center gap-3 tracking-widest"><CalendarDays size={20} className="text-blue-600"/> Ciclo Semanal (Médias)</h4>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyCycleData} margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="shortName" fontSize={10} stroke="#94a3b8" />
                <YAxis fontSize={10} stroke="#94a3b8" />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}} 
                  contentStyle={{borderRadius: '15px', border:'none'}}
                  formatter={(val: number) => [`${val.toFixed(1)} kW`, 'Carga Média']}
                />
                <Bar dataKey="load" radius={[8, 8, 0, 0]}>
                  {weeklyCycleData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index >= 5 ? '#6366f1' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[9px] text-slate-400 font-bold uppercase text-center mt-2 tracking-tighter">Representação das médias diárias por dia da semana.</p>
        </div>
      </div>

      {/* Secção de Análise Técnica e Profissional */}
      <div className="bg-white p-12 rounded-[50px] border shadow-2xl space-y-12">
        <header className="border-b pb-8">
          <h3 className="text-2xl font-black text-slate-900 flex items-center gap-4">
            <ShieldCheck size={28} className="text-emerald-600"/> 
            Análise Técnica de Carga Térmica 8760h
          </h3>
          <p className="text-slate-500 mt-2 font-medium">Avaliação profissional do perfil de procura energética e implicações no sistema.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="space-y-6 group">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Lightbulb size={24}/>
              </div>
              <h4 className="font-black text-slate-800 uppercase tracking-tight">Factor de Carga</h4>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed text-justify">
              O Factor de Carga (<b>{stats.lf.toFixed(1)}%</b>) indica quão "achatado" é o perfil de carga. Um valor baixo sugere picos de procura curtos mas intensos, exigindo equipamentos com grande capacidade de modulação para não penalizar a eficiência nos períodos de carga parcial.
            </p>
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
              <span className="text-[10px] font-black uppercase text-blue-500 block mb-1">Impacto no Design</span>
              <p className="text-xs font-bold text-blue-700">Equipamentos com compressores Inverter ou múltiplos estágios são críticos para LF &lt; 50%.</p>
            </div>
          </div>

          <div className="space-y-6 group">
            <div className="flex items-center gap-4">
              <div className="bg-indigo-100 p-3 rounded-2xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <ThermometerSnowflake size={24}/>
              </div>
              <h4 className="font-black text-slate-800 uppercase tracking-tight">Carga Parcial vs SEER</h4>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed text-justify">
              A maioria das horas de funcionamento ocorre em carga parcial (<b>PL</b>). A selecção deve priorizar o SEER/SCOP em vez do EER nominal, dado que o chiller operará fora do ponto de projecto em mais de 90% do tempo anual.
            </p>
            <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
              <span className="text-[10px] font-black uppercase text-indigo-500 block mb-1">Impacto Energético</span>
              <p className="text-xs font-bold text-indigo-700">Uma melhoria de 0.5 no SEER pode representar uma poupança de 10-15% na factura eléctrica.</p>
            </div>
          </div>

          <div className="space-y-6 group">
            <div className="flex items-center gap-4">
              <div className="bg-emerald-100 p-3 rounded-2xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <Activity size={24}/>
              </div>
              <h4 className="font-black text-slate-800 uppercase tracking-tight">Inércia Térmica</h4>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed text-justify">
              Perfis com variações bruscas (e.g. Auditórios ou Processos Industriais) exigem um volume de inércia hidráulica dimensionado para evitar arranques e paragens frequentes do compressor (short-cycling), aumentando a sua vida útil.
            </p>
            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
              <span className="text-[10px] font-black uppercase text-emerald-500 block mb-1">Recomendação Técnica</span>
              <p className="text-xs font-bold text-emerald-700">Garantir um volume mínimo de 6 a 10 litros/kW para sistemas de carga variável.</p>
            </div>
          </div>
        </div>

        <footer className="pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-black uppercase text-slate-400 tracking-widest italic">
          <div className="flex items-center gap-2">
            <Info size={14} className="text-blue-500"/>
            Metodologia de Cálculo: Simulação Horária Baseada em Perfil RECS / DIN 4710
          </div>
          <div>Eng. José Coelho • PQ00851 | OET 2321</div>
        </footer>
      </div>
    </div>
  );
};

export default LoadsTab;
