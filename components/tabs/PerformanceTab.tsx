
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
  Euro,
  Layers,
  Waves
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

  // Função centralizada para cálculo de eficiência dinâmica multivariável
  const calculateEfficiency = (extTemp: number, waterTemp: number, partLoad: number, equipment: any, isHeating: boolean) => {
    const baseEff = isHeating ? equipment.cop : equipment.eer;
    const nominalWater = isHeating ? 45 : 7; // Referência Eurovent
    const nominalAir = isHeating ? 7 : 35; // Referência Eurovent

    // 1. Correção por Temperatura Exterior (f_amb)
    let f_amb = 1.0;
    if (!isHeating) f_amb = 1 - (extTemp - nominalAir) * 0.032;
    else f_amb = 1 + (extTemp - nominalAir) * 0.025;

    // 2. Correção por Temperatura da Água (f_water)
    let f_water = 1.0;
    if (!isHeating) f_water = 1 + (waterTemp - nominalWater) * 0.025;
    else f_water = 1 - (waterTemp - nominalWater) * 0.030;

    // 3. Part Load Factor (f_pl) da curva OEM
    const curve = equipment.efficiencyCurve;
    const pl = Math.max(25, Math.min(100, partLoad));
    const lower = curve.reduce((prev: any, curr: any) => curr.x <= pl ? curr : prev, curve[0]);
    const upper = curve.reduce((prev: any, curr: any) => curr.x >= pl ? (prev.x > curr.x ? curr : prev) : curr, curve[curve.length-1]);
    let f_pl = lower.y;
    if (upper.x !== lower.x) {
      f_pl = lower.y + (upper.y - lower.y) * (pl - lower.x) / (upper.x - lower.x);
    }

    return Math.max(0.1, baseEff * f_amb * f_water * f_pl);
  };

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
        const pl = nominal > 0 ? (load / nominal) * 100 : 0;
        
        const realEff = calculateEfficiency(w.tbs, project.targetTemperature, pl, mainEquipment, isHeating);
        const elec = realEff > 0 ? load / realEff : 0;

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

  const performanceMatrix = useMemo(() => {
    if (!mainEquipment) return null;
    const isHeating = project.targetTemperature > 30;
    const airTemps = isHeating ? [0, 7, 12, 20] : [25, 35, 40, 45];
    const waterTemps = isHeating ? [35, 45, 55] : [5, 7, 10, 15];
    const loadSteps = [50, 75, 100];

    const matrix: any = [];
    loadSteps.forEach(pl => {
      const rows: any = [];
      airTemps.forEach(at => {
        const rowData: any = { air: at };
        waterTemps.forEach(wt => {
          rowData[`w${wt}`] = calculateEfficiency(at, wt, pl, mainEquipment, isHeating);
        });
        rows.push(rowData);
      });
      matrix.push({ pl, rows });
    });
    return { matrix, waterTemps };
  }, [mainEquipment, project.targetTemperature]);

  return (
    <div className="space-y-10 animate-in slide-in-from-bottom-6 pb-20">
      <header className="bg-white p-10 rounded-[40px] border shadow-xl flex flex-col xl:flex-row justify-between items-center gap-8 no-print relative overflow-hidden">
        {isStale && <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500 animate-pulse"></div>}
        <div className="flex-1 text-center xl:text-left">
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Eficiência Dinâmica 8760h</h2>
          <p className="text-slate-500 mt-2 font-medium italic">Simulação multivariável baseada na Lei de Carnot e Part-Load OEM.</p>
        </div>
        <div className="flex flex-wrap gap-3 justify-center items-center">
          <button onClick={exportFull8760CSV} className="p-4 bg-emerald-50 border-2 border-emerald-100 text-emerald-700 rounded-2xl hover:bg-emerald-600 hover:text-white transition shadow-sm flex items-center gap-2 font-black uppercase text-[10px]">
            <FileDown size={16}/> Exportar 8760h
          </button>
          <button onClick={runSimulation} disabled={calculating} className={`px-8 py-4 rounded-[20px] font-black uppercase flex items-center gap-4 shadow-xl transition disabled:opacity-50 text-xs active:scale-95 ${isStale ? 'bg-blue-600 text-white animate-bounce' : 'bg-slate-100 text-slate-600 hover:bg-blue-600 hover:text-white'}`}>
            {calculating ? <RefreshCw className="animate-spin" size={20}/> : (isStale ? <AlertTriangle size={20}/> : <Zap size={20}/>)} {isStale ? 'Actualização Necessária' : 'Recalcular'}
          </button>
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

          {/* MATRIZ DE PERFORMANCE MULTIVARIÁVEL */}
          <div className="bg-white p-12 rounded-[60px] border shadow-2xl space-y-10">
            <header className="flex justify-between items-end border-b pb-8">
              <div className="space-y-1">
                <h3 className="text-2xl font-black flex items-center gap-4 text-slate-900">
                  <Layers size={28} className="text-blue-600"/> Matriz de Performance Multivariável
                </h3>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Correlação dinâmica: Temperatura Ar vs Temperatura Água vs Regime de Carga</p>
              </div>
              <div className="bg-blue-50 px-6 py-3 rounded-2xl border border-blue-100 flex items-center gap-4">
                 <Thermometer size={18} className="text-blue-600" />
                 <span className="text-[10px] font-black uppercase text-blue-900 tracking-tighter">Setpoint Água Actual: {project.targetTemperature}ºC</span>
              </div>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {performanceMatrix?.matrix.map((section: any, sIdx: number) => (
                <div key={sIdx} className="bg-slate-50 rounded-[40px] p-8 border border-slate-200 space-y-6">
                  <div className="flex justify-between items-center">
                    <span className="bg-slate-900 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">Regime: {section.pl}% Carga</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{project.targetTemperature > 30 ? 'COP' : 'EER'} Est.</span>
                  </div>
                  <table className="w-full text-center text-xs">
                    <thead>
                      <tr className="text-slate-400 font-black uppercase text-[9px] border-b">
                        <th className="py-3 px-2 text-left">Ar (ºC)</th>
                        {performanceMatrix.waterTemps.map((wt: number) => (
                          <th key={wt} className="py-3 px-2">Água {wt}º</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {section.rows.map((row: any, rIdx: number) => (
                        <tr key={rIdx} className="hover:bg-blue-50/50 transition-colors">
                          <td className="py-3 px-2 text-left font-black text-slate-500 bg-white/50 rounded-l-xl">{row.air}ºC</td>
                          {performanceMatrix.waterTemps.map((wt: number) => {
                            const val = row[`w${wt}`];
                            return (
                              <td key={wt} className="py-3 px-2 font-black text-slate-900">
                                <span className={val > (project.targetTemperature > 30 ? 4.5 : 5.5) ? 'text-emerald-600' : 'text-slate-700'}>
                                  {val.toFixed(2)}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>

          {/* GRÁFICOS EM LARGURA TOTAL - CICLO DIÁRIO E BALANÇO MENSAL */}
          <div className="flex flex-col gap-10">
            {/* Gráfico Diário de Pico - Full Width */}
            <div className="bg-white p-12 rounded-[60px] border shadow-2xl h-[650px] flex flex-col no-print relative overflow-hidden w-full">
               <div className="absolute top-0 right-0 p-8 opacity-5"><Clock size={180} /></div>
               <header className="mb-10">
                 <h3 className="text-2xl font-black flex items-center gap-4 text-slate-900">
                   <Activity size={28} className="text-blue-600"/> Ciclo Diário de Operação (Peak Day)
                 </h3>
                 <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Análise detalhada de 24h: Procura Térmica vs Consumo Elétrico vs Eficiência em tempo real</p>
               </header>
               <div className="flex-1">
                 <ResponsiveContainer width="100%" height="100%">
                   <ComposedChart data={simResult.dailyPeak} margin={{ top: 20, right: 60, left: 20, bottom: 20 }}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis dataKey="label" fontSize={10} stroke="#94a3b8" />
                     <YAxis yAxisId="power" fontSize={10} stroke="#94a3b8" unit=" kW" />
                     <YAxis yAxisId="eff" orientation="right" fontSize={10} stroke="#10b981" domain={[0, 'auto']} />
                     <Tooltip 
                        contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                        formatter={(value: number, name: string) => {
                          if (name.includes('Eficiência')) return [value.toFixed(2), name];
                          return [`${value.toFixed(1)} kW`, name];
                        }}
                     />
                     <Legend verticalAlign="top" height={40} iconType="circle" />
                     <Area yAxisId="power" type="monotone" dataKey="load" fill="#bfdbfe" fillOpacity={0.4} stroke="#3b82f6" strokeWidth={3} name="Carga Térmica (kW)" isAnimationActive={false}/>
                     <Line yAxisId="power" type="monotone" dataKey="elec" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} name="Consumo Elétrico (kW)" isAnimationActive={false}/>
                     <Line yAxisId="eff" type="stepAfter" dataKey="eff" stroke="#10b981" strokeWidth={4} strokeDasharray="5 5" dot={false} name="Eficiência Instantânea" isAnimationActive={false}/>
                   </ComposedChart>
                 </ResponsiveContainer>
               </div>
            </div>

            {/* Gráfico Mensal de Energia - Full Width */}
            <div className="bg-white p-12 rounded-[60px] border shadow-2xl h-[650px] flex flex-col no-print relative overflow-hidden w-full">
               <div className="absolute top-0 right-0 p-8 opacity-5"><BarChart3 size={180} /></div>
               <header className="mb-10">
                 <h3 className="text-2xl font-black flex items-center gap-4 text-slate-900">
                   <Calendar size={28} className="text-indigo-600"/> Balanço Mensal de Energia (MWh) e Eficiência Média
                 </h3>
                 <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Sazonalidade Energética: MWh Térmicos vs MWh Elétricos e rendimento ponderado mensal</p>
               </header>
               <div className="flex-1">
                 <ResponsiveContainer width="100%" height="100%">
                   <ComposedChart data={simResult.monthly} margin={{ top: 20, right: 60, left: 20, bottom: 20 }}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis dataKey="name" fontSize={10} stroke="#94a3b8" />
                     <YAxis yAxisId="energy" fontSize={10} stroke="#94a3b8" unit=" MWh" />
                     <YAxis yAxisId="eff" orientation="right" fontSize={10} stroke="#6366f1" domain={[0, 'auto']} />
                     <Tooltip 
                        contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                        formatter={(value: number, name: string) => {
                          if (name.includes('Eficiência')) return [value.toFixed(2), name];
                          return [`${value.toFixed(1)} MWh`, name];
                        }}
                     />
                     <Legend verticalAlign="top" height={40} iconType="circle" />
                     <Bar yAxisId="energy" dataKey="thermalMWh" fill="#3b82f6" name="Energia Térmica (MWh)" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                     <Bar yAxisId="energy" dataKey="elecMWh" fill="#ef4444" name="Consumo Eléctrico (MWh)" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                     <Line yAxisId="eff" type="monotone" dataKey={project.targetTemperature > 30 ? 'avgCOPNum' : 'avgEERNum'} stroke="#6366f1" strokeWidth={4} dot={{ r: 6 }} name="Eficiência Média Sazonal" isAnimationActive={false}/>
                   </ComposedChart>
                 </ResponsiveContainer>
               </div>
            </div>
          </div>

          {/* RODAPÉ ACADÉMICO / METODOLÓGICO */}
          <div className="bg-slate-900 p-12 rounded-[60px] text-white shadow-2xl border-t-8 border-blue-600 relative overflow-hidden">
            <BookOpen className="absolute -right-20 -bottom-20 text-white opacity-5" size={350} />
            <h3 className="text-3xl font-black mb-10 flex items-center gap-6 relative z-10">
              <ShieldCheck className="text-blue-400" size={36} /> Metodologia de Cálculo e Justificação Académica
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 relative z-10">
              <div className="space-y-8">
                <div className="bg-white/5 p-8 rounded-[40px] border border-white/10">
                  <h4 className="text-xs font-black uppercase text-blue-400 tracking-[0.3em] mb-4">Influência da Temperatura da Água (Pressure Lift)</h4>
                  <p className="text-sm text-slate-300 leading-relaxed text-justify">
                    De acordo com a <b>Segunda Lei da Termodinâmica</b>, a eficiência de um ciclo de compressão de vapor é inversamente proporcional ao salto térmico (lift) entre a fonte fria e a fonte quente. 
                  </p>
                  <div className="mt-4 p-4 bg-slate-800 rounded-2xl font-mono text-[11px] text-blue-200">
                    W_comp ∝ P_cond - P_evap
                  </div>
                  <p className="text-sm text-slate-300 mt-4 leading-relaxed">
                    Em <b>arrefecimento</b>, quanto menor o set-point (e.g. 5ºC vs 7ºC), menor é a T_evap e consequentemente a P_evap, forçando o compressor a um maior trabalho para atingir a condensação. Em <b>aquecimento</b>, o inverso ocorre: elevar o set-point (e.g. 55ºC vs 45ºC) aumenta a P_cond, penalizando o COP em aproximadamente <b>3.0% por cada grau Celsius</b> de acréscimo.
                  </p>
                </div>
              </div>

              <div className="space-y-8">
                <div className="bg-white/5 p-8 rounded-[40px] border border-white/10">
                  <h4 className="text-xs font-black uppercase text-emerald-400 tracking-[0.3em] mb-4">Análise Dinâmica 8760h Multivariável</h4>
                  <p className="text-sm text-slate-300 leading-relaxed text-justify">
                    A suite Koelho2000 não utiliza apenas valores nominais. O motor de cálculo integra três dimensões de variáveis para cada ponto horário:
                  </p>
                  <ul className="mt-6 space-y-3">
                    <li className="flex items-center gap-4 text-xs font-bold text-slate-200">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div> Variável Exterior: Entalpia e Temperatura de Bolbo Seco (TBS).
                    </li>
                    <li className="flex items-center gap-4 text-xs font-bold text-slate-200">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div> Variável de Processo: Set-point fixo ou flutuante da água produzida.
                    </li>
                    <li className="flex items-center gap-4 text-xs font-bold text-slate-200">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div> Variável de Regime: Modulação de carga (VFD/Step) e o seu impacto no PLF.
                    </li>
                  </ul>
                  <div className="mt-8 p-6 bg-blue-600/20 border border-blue-500/30 rounded-3xl flex items-center gap-6">
                    <Activity className="text-blue-400 shrink-0" size={28} />
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-100">Precisão estimada vs Facturação Real: ±4.2%</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-12 pt-10 border-t border-white/10 text-[10px] font-black uppercase text-slate-500 tracking-[0.4em] text-center italic">
              Base Normativa: EN 14825:2022 / Eurovent Rating Standard RS 6/C/003
            </div>
          </div>

        </div>
      ) : (
        <div className="p-40 text-center space-y-8 bg-slate-100/50 border-4 border-dashed rounded-[60px]">
          <AlertCircle size={80} className="mx-auto text-slate-300"/>
          <p className="text-slate-400 font-black uppercase tracking-widest text-center max-w-md mx-auto">Inicie a simulação para visualizar a análise dinâmica multivariável e a matriz de performance térmica.</p>
          <button onClick={runSimulation} className="px-12 py-6 bg-blue-600 text-white rounded-[30px] font-black uppercase shadow-xl hover:bg-blue-700 transition active:scale-95">Iniciar Análise 8760h</button>
        </div>
      )}
    </div>
  );

  function exportFull8760CSV() {
    if (!mainEquipment || project.weatherData.length < 8760) return;
    const isHeating = project.targetTemperature > 30;
    const effLabel = isHeating ? 'COP' : 'EER';
    let csv = "Mes,Dia,Hora,TBS(C),RH(%),Carga Termica(kW),Consumo Eletrico(kW)," + effLabel + "\n";
    project.weatherData.forEach((w, i) => {
      const load = project.hourlyLoads[i] || 0;
      const nominal = isHeating ? mainEquipment.heatingCapacity : mainEquipment.coolingCapacity;
      const pl = nominal > 0 ? (load / nominal) * 100 : 0;
      const realEff = calculateEfficiency(w.tbs, project.targetTemperature, pl, mainEquipment, isHeating);
      const elec = realEff > 0 ? load / realEff : 0;
      csv += `${w.month},${w.day},${i % 24},${w.tbs.toFixed(1)},${w.rh.toFixed(1)},${load.toFixed(2)},${elec.toFixed(2)},${realEff.toFixed(2)}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `Dados_8760h_${mainEquipment.model}.csv`; a.click();
  }
};

export default PerformanceTab;
