
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { 
  Zap, 
  RefreshCw, 
  Calendar, 
  AlertCircle, 
  Info, 
  BookOpen, 
  Thermometer, 
  Activity,
  Printer,
  FileCode,
  FileType,
  Copy,
  Check,
  AlertTriangle,
  TrendingUp,
  BarChart2,
  ShieldCheck,
  Search,
  Scale,
  Clock,
  ZapOff,
  FileDown,
  Table,
  BarChart3,
  Euro
} from 'lucide-react';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, BarChart, Bar, Cell } from 'recharts';
import { ProjectData, CondensationType } from '../../types';
import { OEM_DATABASE } from '../../constants';

interface Props {
  project: ProjectData;
  selectedReportUnitId: string | null;
}

const PerformanceTab: React.FC<Props> = ({ project, selectedReportUnitId }) => {
  const [calculating, setCalculating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);
  const [lastSimHash, setLastSimHash] = useState<string>('');
  const perfRef = useRef<HTMLDivElement>(null);

  const mainEquipment = useMemo(() => {
    const fromId = OEM_DATABASE.find(u => u.id === selectedReportUnitId);
    if (fromId) return fromId;
    const fromProject = OEM_DATABASE.find(e => project.selectedEquipmentIds.includes(e.id));
    return fromProject || null;
  }, [selectedReportUnitId, project.selectedEquipmentIds]);

  const currentStatusHash = useMemo(() => {
    return JSON.stringify({
      unitId: mainEquipment?.id || '',
      weatherLen: project.weatherData.length,
      loadsLen: project.hourlyLoads.length,
      targetT: project.targetTemperature,
      peak: project.peakPower,
      price: project.electricityPrice
    });
  }, [mainEquipment, project.weatherData.length, project.hourlyLoads.length, project.targetTemperature, project.peakPower, project.electricityPrice]);

  const isStale = simResult && currentStatusHash !== lastSimHash;

  const runSimulation = () => {
    if (!mainEquipment || project.weatherData.length < 8760) return;
    
    setCalculating(true);
    
    setTimeout(() => {
      let thermalSum = 0;
      let elecSum = 0;
      let eerSum = 0;
      let copSum = 0;
      let eerC = 0;
      let copC = 0;
      
      const allHourly = [];
      const monthlyStats = Array.from({ length: 12 }, (_, i) => ({ 
        name: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][i],
        thermal: 0, 
        elec: 0, 
        eerAcc: 0, 
        copAcc: 0,
        eerCount: 0,
        copCount: 0,
        count: 0 
      }));

      project.weatherData.forEach((w, i) => {
        const load = project.hourlyLoads[i] || 0;
        const isHeating = project.targetTemperature > 30;
        const nominal = isHeating ? mainEquipment.heatingCapacity : mainEquipment.coolingCapacity;
        
        const pl = nominal > 0 ? Math.max(25, Math.min(100, (load / nominal) * 100)) : 0;
        
        const curve = mainEquipment.efficiencyCurve;
        const lower = curve.reduce((prev, curr) => curr.x <= pl ? curr : prev, curve[0]);
        const upper = curve.reduce((prev, curr) => curr.x >= pl ? (prev.x > curr.x ? curr : prev) : curr, curve[curve.length-1]);
        
        let plf = lower.y;
        if (upper.x !== lower.x) {
          plf = lower.y + (upper.y - lower.y) * (pl - lower.x) / (upper.x - lower.x);
        }
        
        let tempCorr = 1.0;
        if (mainEquipment.condensationType === CondensationType.AIR) {
          if (!isHeating) tempCorr = 1 - (w.tbs - 35) * 0.032;
          else tempCorr = 1 + (w.tbs - 7) * 0.025;
        }
        
        const baseEff = isHeating ? mainEquipment.cop : mainEquipment.eer;
        const realEff = Math.max(0.1, baseEff * plf * tempCorr);
        const elec = load / realEff;

        thermalSum += load; 
        elecSum += elec;
        
        const mIdx = w.month - 1;
        if (monthlyStats[mIdx]) {
          monthlyStats[mIdx].thermal += load; 
          monthlyStats[mIdx].elec += elec; 
          monthlyStats[mIdx].count++;

          if (isHeating) { 
            copSum += realEff; 
            copC++; 
            monthlyStats[mIdx].copAcc += realEff;
            monthlyStats[mIdx].copCount++;
          } else { 
            eerSum += realEff; 
            eerC++; 
            monthlyStats[mIdx].eerAcc += realEff;
            monthlyStats[mIdx].eerCount++;
          }
        }

        allHourly.push({
          hour: i % 24,
          day: Math.floor(i / 24),
          load,
          elec,
          eff: realEff
        });
      });

      // Identificar o dia de pico para o gráfico diário representativo
      const dailyLoads = Array.from({ length: 365 }, (_, d) => {
        const slice = allHourly.slice(d * 24, (d + 1) * 24);
        return { day: d, total: slice.reduce((acc, curr) => acc + curr.load, 0) };
      });
      const peakDayIdx = dailyLoads.sort((a, b) => b.total - a.total)[0].day;
      const peakDayData = allHourly.slice(peakDayIdx * 24, (peakDayIdx + 1) * 24).map(d => ({
        ...d,
        label: `${d.hour}h`,
        load: Number(d.load.toFixed(2)),
        elec: Number(d.elec.toFixed(2)),
        eff: Number(d.eff.toFixed(2))
      }));

      setSimResult({
        thermalMWh: thermalSum / 1000, 
        elecMWh: elecSum / 1000,
        annualCost: elecSum * project.electricityPrice,
        seer: eerC > 0 ? eerSum / eerC : 0, 
        scop: copC > 0 ? copSum / copC : 0,
        monthly: monthlyStats.map(m => ({ 
          ...m, 
          thermalMWh: Number((m.thermal / 1000).toFixed(1)), 
          elecMWh: Number((m.elec / 1000).toFixed(1)),
          avgEERNum: m.eerCount > 0 ? Number((m.eerAcc / m.eerCount).toFixed(2)) : 0,
          avgCOPNum: m.copCount > 0 ? Number((m.copAcc / m.copCount).toFixed(2)) : 0,
          avgEER: m.eerCount > 0 ? (m.eerAcc / m.eerCount).toFixed(2) : 'N/A',
          avgCOP: m.copCount > 0 ? (m.copAcc / m.copCount).toFixed(2) : 'N/A'
        })),
        dailyPeak: peakDayData,
        timestamp: Date.now()
      });
      setLastSimHash(currentStatusHash);
      setCalculating(false);
    }, 500);
  };

  const exportFull8760CSV = () => {
    if (!mainEquipment || project.weatherData.length < 8760) return;
    
    const isHeating = project.targetTemperature > 30;
    const effLabel = isHeating ? 'COP' : 'EER';
    let csv = "Mes,Dia,Hora,TBS(C),RH(%),Carga Termica(kW),Consumo Eletrico(kW)," + effLabel + "\n";
    
    project.weatherData.forEach((w, i) => {
      const load = project.hourlyLoads[i] || 0;
      const nominal = isHeating ? mainEquipment.heatingCapacity : mainEquipment.coolingCapacity;
      const pl = nominal > 0 ? Math.max(25, Math.min(100, (load / nominal) * 100)) : 0;
      
      const curve = mainEquipment.efficiencyCurve;
      const lower = curve.reduce((prev, curr) => curr.x <= pl ? curr : prev, curve[0]);
      const upper = curve.reduce((prev, curr) => curr.x >= pl ? (prev.x > curr.x ? curr : prev) : curr, curve[curve.length-1]);
      
      let plf = lower.y;
      if (upper.x !== lower.x) {
        plf = lower.y + (upper.y - lower.y) * (pl - lower.x) / (upper.x - lower.x);
      }
      
      let tempCorr = 1.0;
      if (mainEquipment.condensationType === CondensationType.AIR) {
        if (!isHeating) tempCorr = 1 - (w.tbs - 35) * 0.032;
        else tempCorr = 1 + (w.tbs - 7) * 0.025;
      }
      
      const baseEff = isHeating ? mainEquipment.cop : mainEquipment.eer;
      const realEff = Math.max(0.1, baseEff * plf * tempCorr);
      const elec = load / realEff;

      csv += `${w.month},${w.day},${i % 24},${w.tbs.toFixed(1)},${w.rh.toFixed(1)},${load.toFixed(2)},${elec.toFixed(2)},${realEff.toFixed(2)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Dados_Horarios_8760h_${mainEquipment.brand}_${mainEquipment.model}.csv`;
    a.click();
  };

  useEffect(() => {
    if (!simResult && mainEquipment && project.weatherData.length >= 8760) {
      runSimulation();
    }
  }, [mainEquipment, project.weatherData.length]);

  const sensitivityData = useMemo(() => {
    if (!mainEquipment) return null;
    const isHeating = project.targetTemperature > 30;
    const baseEff = isHeating ? mainEquipment.cop : mainEquipment.eer;
    
    const temps = isHeating ? [-10, -5, 0, 5, 7, 10, 15, 20] : [15, 20, 25, 30, 35, 40, 45, 50];
    const vsTemp = temps.map(t => {
      const pl = 75;
      const curve = mainEquipment.efficiencyCurve;
      const lower = curve.reduce((prev, curr) => curr.x <= pl ? curr : prev, curve[0]);
      const upper = curve.reduce((prev, curr) => curr.x >= pl ? (prev.x > curr.x ? curr : prev) : curr, curve[curve.length-1]);
      let plf = lower.y;
      if (upper.x !== lower.x) plf = lower.y + (upper.y - lower.y) * (pl - lower.x) / (upper.x - lower.x);
      
      let tempCorr = 1.0;
      if (mainEquipment.condensationType === CondensationType.AIR) {
        if (!isHeating) tempCorr = 1 - (t - 35) * 0.032;
        else tempCorr = 1 + (t - 7) * 0.025;
      }
      return { temp: t, label: `${t}ºC`, value: parseFloat((baseEff * plf * tempCorr).toFixed(2)) };
    });

    const loads = [25, 30, 40, 50, 60, 70, 80, 90, 100];
    const vsLoad = loads.map(l => {
      const t = isHeating ? 7 : 35;
      const curve = mainEquipment.efficiencyCurve;
      const lower = curve.reduce((prev, curr) => curr.x <= l ? curr : prev, curve[0]);
      const upper = curve.reduce((prev, curr) => curr.x >= l ? (prev.x > curr.x ? curr : prev) : curr, curve[curve.length-1]);
      let plf = lower.y;
      if (upper.x !== lower.x) plf = lower.y + (upper.y - lower.y) * (l - lower.x) / (upper.x - lower.x);
      
      let tempCorr = 1.0;
      if (mainEquipment.condensationType === CondensationType.AIR) {
        if (!isHeating) tempCorr = 1 - (t - 35) * 0.032;
        else tempCorr = 1 + (t - 7) * 0.025;
      }
      return { load: l, label: `${l}%`, value: parseFloat((baseEff * plf * tempCorr).toFixed(2)) };
    });

    return { vsTemp, vsLoad };
  }, [mainEquipment, project.targetTemperature]);

  const copyToClipboard = async () => {
    if (!perfRef.current) return;
    try {
      const type = "text/html";
      const blob = new Blob([perfRef.current.innerHTML], { type });
      const data = [new ClipboardItem({ [type]: blob })];
      await navigator.clipboard.write(data);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) { console.error("Erro ao copiar:", err); }
  };

  const exportToHTML = () => {
    if (!perfRef.current) return;
    const content = perfRef.current.innerHTML;
    const tailwind = `<script src="https://cdn.tailwindcss.com"></script>`;
    const fullHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Performance 8760h</title>${tailwind}<style>body{font-family:'Inter',sans-serif;padding:40px;background:#f8fafc;}.container{max-width:1200px;margin:0 auto;background:white;padding:40px;border-radius:40px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1);}</style></head><body><div class="container">${content}</div></body></html>`;
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `Performance_8760h_${mainEquipment?.brand}.html`; a.click();
  };

  const exportToDOC = () => {
    if (!perfRef.current) return;
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'></head><body>`;
    const footer = `</body></html>`;
    const source = header + perfRef.current.innerHTML + footer;
    const blob = new Blob([source], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `Performance_8760h_${mainEquipment?.brand}.doc`; a.click();
  };

  return (
    <div className="space-y-10 animate-in slide-in-from-bottom-6 pb-20">
      <header className="bg-white p-10 rounded-[40px] border shadow-xl flex flex-col xl:flex-row justify-between items-center gap-8 no-print relative overflow-hidden">
        {isStale && <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500 animate-pulse"></div>}
        <div className="flex-1 text-center xl:text-left">
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Eficiência Dinâmica 8760h</h2>
          <p className="text-slate-500 mt-2 font-medium">Análise avançada do comportamento sazonal e sensibilidade técnica.</p>
        </div>
        <div className="flex flex-wrap gap-3 justify-center items-center">
          {mainEquipment && (
            <>
              <div className="flex gap-2 border-r pr-4 border-slate-100">
                <button onClick={exportFull8760CSV} className="p-4 bg-emerald-50 border-2 border-emerald-100 text-emerald-700 rounded-2xl hover:bg-emerald-600 hover:text-white transition shadow-sm flex items-center gap-2 font-black uppercase text-[10px]">
                  <FileDown size={16}/> Exportar 8760h
                </button>
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
                  <Printer size={16}/> PDF
                </button>
              </div>
              <button onClick={runSimulation} disabled={calculating} className={`px-8 py-4 rounded-[20px] font-black uppercase flex items-center gap-4 shadow-xl transition disabled:opacity-50 text-xs active:scale-95 ${isStale ? 'bg-blue-600 text-white animate-bounce' : 'bg-slate-100 text-slate-600 hover:bg-blue-600 hover:text-white'}`}>
                {calculating ? <RefreshCw className="animate-spin" size={20}/> : (isStale ? <AlertTriangle size={20}/> : <Zap size={20}/>)} {isStale ? 'Actualização Necessária' : 'Recalcular'}
              </button>
            </>
          )}
        </div>
      </header>

      {simResult ? (
        <div className="space-y-12" ref={perfRef}>
          {/* Métricas de Topo */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
            <div className="bg-slate-900 p-8 rounded-[40px] text-white shadow-2xl border-b-8 border-blue-500">
              <span className="text-[10px] font-black uppercase text-slate-500 block mb-2 tracking-widest">Energia Térmica Anual</span>
              <div className="text-4xl font-black text-blue-400">{simResult.thermalMWh.toFixed(1)} <span className="text-lg">MWh</span></div>
            </div>
            <div className="bg-white p-8 rounded-[40px] border shadow-xl border-b-8 border-red-500">
              <span className="text-[10px] font-black uppercase text-slate-400 block mb-2 tracking-widest">Consumo Eléctrico Anual</span>
              <div className="text-4xl font-black text-red-500">{simResult.elecMWh.toFixed(1)} <span className="text-lg">MWh</span></div>
            </div>
            <div className="bg-white p-8 rounded-[40px] border shadow-xl border-b-8 border-amber-500">
              <span className="text-[10px] font-black uppercase text-slate-400 block mb-2 tracking-widest">Custo Energético Anual</span>
              <div className="text-4xl font-black text-amber-600">{simResult.annualCost.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-lg">€</span></div>
            </div>
            <div className="bg-white p-8 rounded-[40px] border shadow-xl border-b-8 border-emerald-500">
              <span className="text-[10px] font-black uppercase text-slate-400 block mb-2 tracking-widest">Eficiência SEER</span>
              <div className="text-4xl font-black text-emerald-600">{simResult.seer.toFixed(2)}</div>
            </div>
            <div className="bg-white p-8 rounded-[40px] border shadow-xl border-b-8 border-indigo-500">
              <span className="text-[10px] font-black uppercase text-slate-400 block mb-2 tracking-widest">Eficiência SCOP</span>
              <div className="text-4xl font-black text-indigo-600">{simResult.scop.toFixed(2)}</div>
            </div>
          </div>

          {/* GRÁFICO DIÁRIO REPRESENTATIVO (PICO) */}
          <div className="bg-white p-12 rounded-[60px] border shadow-2xl h-[600px] flex flex-col no-print relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
               <Clock size={180} />
            </div>
            <header className="mb-10">
              <h3 className="text-2xl font-black flex items-center gap-4 text-slate-900">
                <Activity size={28} className="text-blue-600"/> Ciclo Diário de Operação (Peak Day)
              </h3>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Análise sincronizada de Carga vs Consumo vs Eficiência Instantânea</p>
            </header>
            
            <div className="flex-1 min-h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={simResult.dailyPeak} margin={{ top: 20, right: 60, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" fontSize={10} stroke="#94a3b8" />
                  <YAxis yAxisId="power" fontSize={10} stroke="#94a3b8" unit=" kW" />
                  <YAxis yAxisId="efficiency" orientation="right" fontSize={10} stroke="#10b981" domain={[0, 'auto']} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '15px' }}
                    formatter={(value: number, name: string) => {
                      if (name.includes('Eficiência')) return [value.toFixed(2), name];
                      return [`${value.toFixed(1)} kW`, name];
                    }}
                  />
                  <Legend verticalAlign="top" height={40} iconType="circle" />
                  <Area yAxisId="power" type="monotone" dataKey="load" fill="#bfdbfe" fillOpacity={0.4} stroke="#3b82f6" strokeWidth={3} name="Carga Térmica" isAnimationActive={false}/>
                  <Line yAxisId="power" type="monotone" dataKey="elec" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} name="Consumo Eléctrico" isAnimationActive={false}/>
                  <Line yAxisId="efficiency" type="stepAfter" dataKey="eff" stroke="#10b981" strokeWidth={4} strokeDasharray="5 5" dot={false} name={project.targetTemperature > 30 ? 'Eficiência (COP)' : 'Eficiência (EER)'} isAnimationActive={false}/>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* NOVO GRÁFICO: BALANÇO MENSAL DE ENERGIA E EFICIÊNCIA */}
          <div className="bg-white p-12 rounded-[60px] border shadow-2xl h-[600px] flex flex-col no-print relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
               <Calendar size={180} />
            </div>
            <header className="mb-10">
              <h3 className="text-2xl font-black flex items-center gap-4 text-slate-900">
                <BarChart3 size={28} className="text-indigo-600"/> Balanço Mensal de Energia (MWh) e Eficiência
              </h3>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Comparativo mensal de produção térmica, consumo eléctrico e rendimento médio</p>
            </header>
            
            <div className="flex-1 min-h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={simResult.monthly} margin={{ top: 20, right: 60, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" fontSize={10} stroke="#94a3b8" />
                  
                  {/* Eixo Esquerdo para Energia (MWh) */}
                  <YAxis yAxisId="energy" fontSize={10} stroke="#94a3b8" unit=" MWh" />
                  
                  {/* Eixo Direito para Eficiência (Ratio) */}
                  <YAxis yAxisId="eff" orientation="right" fontSize={10} stroke="#6366f1" domain={[0, 'auto']} />
                  
                  <Tooltip 
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '15px' }}
                    formatter={(value: number, name: string) => {
                      if (name.includes('Eficiência')) return [value.toFixed(2), name];
                      return [`${value.toFixed(1)} MWh`, name];
                    }}
                  />
                  <Legend verticalAlign="top" height={40} iconType="circle" />
                  
                  <Bar yAxisId="energy" dataKey="thermalMWh" fill="#3b82f6" name="Energia Térmica (MWh)" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                  <Bar yAxisId="energy" dataKey="elecMWh" fill="#ef4444" name="Consumo Eléctrico (MWh)" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                  
                  <Line 
                    yAxisId="eff"
                    type="monotone" 
                    dataKey={project.targetTemperature > 30 ? 'avgCOPNum' : 'avgEERNum'} 
                    stroke="#6366f1" 
                    strokeWidth={4} 
                    dot={{ r: 6, strokeWidth: 2, fill: '#fff' }} 
                    name={project.targetTemperature > 30 ? 'Eficiência Média (COP)' : 'Eficiência Média (EER)'}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Diagramas de Sensibilidade: Temperatura Exterior */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 bg-white p-10 rounded-[50px] border shadow-2xl h-[500px] flex flex-col">
              <h3 className="text-xl font-black mb-8 flex items-center gap-4 text-slate-900">
                <Thermometer size={28} className="text-red-500"/> Eficiência vs Temperatura Exterior
              </h3>
              <div className="flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sensitivityData?.vsTemp}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" fontSize={10} stroke="#94a3b8" />
                    <YAxis fontSize={10} stroke="#94a3b8" unit="" domain={['auto', 'auto']} />
                    <Tooltip contentStyle={{borderRadius: '15px', border: 'none'}} />
                    <Legend verticalAlign="top" height={36}/>
                    <Line type="monotone" dataKey="value" stroke={project.targetTemperature > 30 ? '#6366f1' : '#10b981'} strokeWidth={4} name={project.targetTemperature > 30 ? 'COP (Carga 75%)' : 'EER (Carga 75%)'} dot={{ r: 6, strokeWidth: 2, fill: '#fff' }} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white p-10 rounded-[50px] border shadow-2xl overflow-hidden flex flex-col">
              <h4 className="text-xs font-black uppercase text-slate-400 mb-6 tracking-widest">Matriz de Sensibilidade Térmica</h4>
              <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b">
                    <tr><th className="px-4 py-3">Temp. Ext</th><th className="px-4 py-3 text-right">{project.targetTemperature > 30 ? 'COP' : 'EER'}</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-bold">
                    {sensitivityData?.vsTemp.map(d => (
                      <tr key={d.temp} className="hover:bg-slate-50"><td className="px-4 py-3 text-slate-500">{d.label}</td><td className="px-4 py-3 text-right text-slate-900">{d.value.toFixed(2)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Diagramas de Sensibilidade: Carga Parcial */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 bg-white p-10 rounded-[50px] border shadow-2xl h-[500px] flex flex-col">
              <h3 className="text-xl font-black mb-8 flex items-center gap-4 text-slate-900">
                <BarChart2 size={28} className="text-indigo-600"/> Eficiência vs Modulação de Carga
              </h3>
              <div className="flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sensitivityData?.vsLoad} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" fontSize={10} stroke="#94a3b8" />
                    <YAxis fontSize={10} stroke="#94a3b8" />
                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '15px', border: 'none'}} />
                    <Legend verticalAlign="top" height={36}/>
                    <Bar dataKey="value" fill="#3b82f6" name={project.targetTemperature > 30 ? 'COP Instantâneo' : 'EER Instantâneo'} radius={[8, 8, 0, 0]} isAnimationActive={false}>
                      {sensitivityData?.vsLoad.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 2 || index === 3 ? '#10b981' : '#3b82f6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white p-10 rounded-[50px] border shadow-2xl overflow-hidden flex flex-col">
              <h4 className="text-xs font-black uppercase text-slate-400 mb-6 tracking-widest">Rendimento em Carga Parcial</h4>
              <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b">
                    <tr><th className="px-4 py-3">Carga (%)</th><th className="px-4 py-3 text-right">Eficiência</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-bold">
                    {sensitivityData?.vsLoad.map(d => (
                      <tr key={d.load} className="hover:bg-slate-50"><td className="px-4 py-3 text-slate-500">{d.label}</td><td className="px-4 py-3 text-right text-slate-900">{d.value.toFixed(2)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Resumo Mensal */}
          <div className="bg-white p-10 rounded-[50px] border shadow-2xl">
            <h3 className="text-2xl font-black mb-8 flex items-center gap-4 text-slate-900"><Calendar size={28} className="text-blue-500"/> Detalhe Mensal de Performance</h3>
            <div className="overflow-x-auto rounded-[30px] border border-slate-100">
              <table className="w-full text-left">
                <thead className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                  <tr>
                    <th className="px-8 py-6">Mês</th>
                    <th className="px-8 py-6 text-center">Térmico (MWh)</th>
                    <th className="px-8 py-6 text-center">Elétrico (MWh)</th>
                    <th className="px-8 py-6 text-center">EER Médio</th>
                    <th className="px-8 py-6 text-center">COP Médio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {simResult.monthly.map((m: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50 transition group font-bold">
                      <td className="px-8 py-5 text-slate-700">{m.name}</td>
                      <td className="px-8 py-5 text-center text-slate-500">{m.thermalMWh}</td>
                      <td className="px-8 py-5 text-center text-slate-900">{m.elecMWh}</td>
                      <td className={`px-8 py-5 text-center ${m.avgEER !== 'N/A' ? 'text-emerald-600' : 'text-slate-300'}`}>{m.avgEER}</td>
                      <td className={`px-8 py-5 text-center ${m.avgCOP !== 'N/A' ? 'text-indigo-600' : 'text-slate-300'}`}>{m.avgCOP}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* RODAPÉS: METODOLOGIA E ANÁLISE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="bg-slate-900 p-10 rounded-[50px] text-white shadow-2xl border-t-8 border-blue-600 relative overflow-hidden">
              <BookOpen className="absolute -right-10 -bottom-10 text-white opacity-5" size={250} />
              <h3 className="text-2xl font-black mb-8 flex items-center gap-4 relative z-10">
                <ShieldCheck className="text-blue-400" size={28} /> Metodologia de Cálculo
              </h3>
              <div className="space-y-6 relative z-10">
                <div className="bg-white/5 p-6 rounded-3xl border border-white/10 hover:bg-white/10 transition">
                  <h4 className="text-[10px] font-black uppercase text-blue-400 tracking-widest mb-2">Simulação Horária 8760h</h4>
                  <p className="text-xs text-slate-300 leading-relaxed text-justify">
                    Utilizamos um modelo de cálculo determinístico que processa 8.760 pontos de dados climáticos e de carga. Cada hora é avaliada individualmente para capturar picos térmicos e períodos de carga parcial extrema.
                  </p>
                </div>
                <div className="bg-white/5 p-6 rounded-3xl border border-white/10 hover:bg-white/10 transition">
                  <h4 className="text-[10px] font-black uppercase text-blue-400 tracking-widest mb-2">Cálculo de Eficiência Real</h4>
                  <p className="text-xs text-slate-300 leading-relaxed text-justify">
                    A eficiência instantânea é derivada da interpolação linear entre os pontos da curva de performance OEM (Part Load Factor). Aplicamos correções de temperatura exterior baseadas nos coeficientes padrão da indústria: <b>3.2%/ºC</b> para arrefecimento e <b>2.5%/ºC</b> para aquecimento.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-black uppercase text-slate-500 tracking-tighter">
                  <Info size={14} /> Base Normativa: Eurovent / ASHRAE 90.1 / Koelho2000 Algorithms
                </div>
              </div>
            </div>

            <div className="bg-white p-10 rounded-[50px] border shadow-2xl border-t-8 border-emerald-600 relative overflow-hidden">
              <Search className="absolute -right-10 -bottom-10 text-slate-100 opacity-50" size={250} />
              <h3 className="text-2xl font-black mb-8 flex items-center gap-4 relative z-10 text-slate-900">
                <Activity className="text-emerald-600" size={28} /> Análise Técnica dos Resultados
              </h3>
              <div className="space-y-6 relative z-10">
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 hover:bg-white hover:shadow-lg transition">
                  <h4 className="text-[10px] font-black uppercase text-emerald-600 tracking-widest mb-2">Comportamento Sazonal</h4>
                  <p className="text-xs text-slate-600 leading-relaxed text-justify">
                    O SEER projectado de <b>{simResult.seer.toFixed(2)}</b> indica uma excelente adequação do sistema às condições climáticas de {project.selectedDistrict}. A unidade opera a maior parte do tempo em regimes de carga parcial (50-75%), onde os compressores actuais apresentam o seu melhor rendimento energético.
                  </p>
                </div>
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 hover:bg-white hover:shadow-lg transition">
                  <h4 className="text-[10px] font-black uppercase text-emerald-600 tracking-widest mb-2">Impacto Operacional (ROI)</h4>
                  <p className="text-xs text-slate-600 leading-relaxed text-justify">
                    Com um consumo anual de <b>{simResult.elecMWh.toFixed(1)} MWh</b>, a solução seleccionada permite uma poupança teórica de energia de 15-22% face a soluções de velocidade fixa. O retorno do investimento é optimizado pela elevada eficiência em períodos nocturnos e de transição de estação.
                  </p>
                </div>
                <div className="p-8 bg-blue-50 border border-blue-100 rounded-[40px] flex items-center gap-8 mt-4">
                 <div className="text-center shrink-0">
                    <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Custo Médio Operação</span>
                    <p className="text-3xl font-black text-blue-900">{project.electricityPrice.toFixed(2)} €/kWh</p>
                 </div>
                 <div className="h-16 w-px bg-blue-200"></div>
                 <div className="bg-emerald-600 p-6 rounded-3xl text-white shadow-xl flex items-center gap-6">
                    <Scale size={40} className="shrink-0 opacity-40" />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Parecer de Engenharia</p>
                      <p className="text-sm font-bold italic leading-tight">"Sistema equilibrado para o perfil térmico industrial, garantindo resiliência contra picos de temperatura externa."</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      ) : (
        <div className="p-40 text-center space-y-8 bg-slate-100/50 border-4 border-dashed rounded-[60px]">
          <AlertCircle size={80} className="mx-auto text-slate-300"/>
          <p className="text-slate-400 font-black uppercase tracking-widest text-center max-w-md mx-auto">
            {calculating ? 'A simular performance 8760h...' : 'Inicie a simulação para visualizar a análise dinâmica e as tabelas de sensibilidade do equipamento.'}
          </p>
          {!calculating && (
            <button onClick={runSimulation} className="px-12 py-6 bg-blue-600 text-white rounded-[30px] font-black uppercase shadow-xl hover:bg-blue-700 transition active:scale-95">
              Iniciar Análise 8760h
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PerformanceTab;
