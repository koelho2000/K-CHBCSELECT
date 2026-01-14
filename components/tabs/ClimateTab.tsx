
import React, { useMemo, useRef } from 'react';
import { Globe2, MapPin, Activity, BarChart2, FileUp, Thermometer, Droplets, Info, Waves, Zap, Flame, Wind } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, Legend } from 'recharts';
import { ProjectData, WeatherDataPoint } from '../../types';
import { PT_DISTRICTS_CLIMATE } from '../../constants';

interface ClimateTabProps {
  project: ProjectData;
  setProject: React.Dispatch<React.SetStateAction<ProjectData>>;
  generateWeather: (d: string) => void;
}

const ClimateTab: React.FC<ClimateTabProps> = ({ project, setProject, generateWeather }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const calculateWetBulb = (tbs: number, rh: number) => {
    return tbs * Math.atan(0.151977 * Math.pow(rh + 8.313659, 0.5)) +
           Math.atan(tbs + rh) - Math.atan(rh - 1.676331) +
           0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh) - 4.686035;
  };

  const weatherStats = useMemo(() => {
    if (project.weatherData.length === 0) return null;
    const tbsValues = project.weatherData.map(d => d.tbs);
    const rhValues = project.weatherData.map(d => d.rh);
    const tbhValues = project.weatherData.map(d => d.tbh);
    
    return {
      maxT: Math.max(...tbsValues),
      minT: Math.min(...tbsValues),
      avgT: tbsValues.reduce((a, b) => a + b, 0) / tbsValues.length,
      maxRH: Math.max(...rhValues),
      minRH: Math.min(...rhValues),
      avgRH: rhValues.reduce((a, b) => a + b, 0) / rhValues.length,
      maxTbh: Math.max(...tbhValues),
      minTbh: Math.min(...tbhValues),
      avgTbh: tbhValues.reduce((a, b) => a + b, 0) / tbhValues.length
    };
  }, [project.weatherData]);

  const histogramData = useMemo(() => {
    if (project.weatherData.length === 0) return [];
    const binsTbs: Record<number, number> = {};
    const binsTbh: Record<number, number> = {};
    
    project.weatherData.forEach(d => {
      const binTbs = Math.floor(d.tbs);
      const binTbh = Math.floor(d.tbh);
      binsTbs[binTbs] = (binsTbs[binTbs] || 0) + 1;
      binsTbh[binTbh] = (binsTbh[binTbh] || 0) + 1;
    });

    const tbsKeys = Object.keys(binsTbs).map(Number);
    const tbhKeys = Object.keys(binsTbh).map(Number);
    const allBins = Array.from(new Set([...tbsKeys, ...tbhKeys])).sort((a, b) => a - b);

    return allBins.map(bin => ({
      bin: bin,
      name: `${bin}ºC`,
      tbs: binsTbs[bin] || 0,
      tbh: binsTbh[bin] || 0
    }));
  }, [project.weatherData]);

  const dailyChart = useMemo(() => {
    const res = [];
    for (let i = 0; i < 365; i++) {
      const slice = project.weatherData.slice(i * 24, (i + 1) * 24);
      if (slice.length > 0) {
        res.push({
          day: i + 1,
          tbs: slice.reduce((a, b) => a + b.tbs, 0) / slice.length,
          tbh: slice.reduce((a, b) => a + b.tbh, 0) / slice.length,
          rh: slice.reduce((a, b) => a + b.rh, 0) / slice.length
        });
      }
    }
    return res;
  }, [project.weatherData]);

  const handleEPWImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;
      const lines = text.split('\n');
      const weatherData: WeatherDataPoint[] = [];
      
      let hourCounter = 0;
      for (const line of lines) {
        const cols = line.split(',');
        if (cols.length >= 31 && !isNaN(parseInt(cols[0], 10))) {
          const tbs = parseFloat(cols[6]);
          const rh = parseFloat(cols[8]);
          const month = parseInt(cols[1], 10);
          const day = parseInt(cols[2], 10);
          
          if (hourCounter < 8760) {
            weatherData.push({
              hour: hourCounter++,
              month: month,
              day: day,
              tbs: tbs,
              rh: rh,
              tbh: parseFloat(calculateWetBulb(tbs, rh).toFixed(1))
            });
          }
        }
      }

      if (weatherData.length >= 8760) {
        setProject(prev => ({ 
          ...prev, 
          weatherData: weatherData.slice(0, 8760),
          selectedDistrict: 'Importado (EPW)' 
        }));
      } else {
        alert(`Ficheiro EPW inválido ou incompleto. Encontradas apenas ${weatherData.length} horas.`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-10 animate-in slide-in-from-bottom-6 pb-20">
      <header className="flex flex-col lg:flex-row justify-between items-center bg-white p-10 rounded-[40px] border shadow-xl gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Perfil Climático 8760h</h2>
          <p className="text-slate-500 mt-2 flex items-center gap-2 font-medium">
            <MapPin size={18} className="text-blue-500"/> {project.selectedDistrict}
          </p>
        </div>
        <div className="flex flex-wrap gap-4 justify-center">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleEPWImport} 
            accept=".epw,.csv" 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-4 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl text-xs font-black uppercase flex items-center gap-2 hover:bg-slate-50 transition shadow-sm active:scale-95"
          >
            <FileUp size={18}/> Importar EPW
          </button>
          <button 
            onClick={() => window.open('https://koelho2000.github.io/K-CLIMEPWCREATE/', '_blank')} 
            className="px-6 py-4 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase flex items-center gap-2 shadow-lg hover:bg-emerald-700 transition active:scale-95"
          >
            <Globe2 size={18}/> Criar EPW Online
          </button>
          <select 
            value={project.selectedDistrict} 
            onChange={e => generateWeather(e.target.value)} 
            className="bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-black text-xs uppercase outline-none focus:ring-2 ring-blue-500 transition cursor-pointer"
          >
            <option disabled value="">Seleccionar Distrito...</option>
            {Object.keys(PT_DISTRICTS_CLIMATE).map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </header>

      {weatherStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="bg-white p-8 rounded-[40px] border shadow-xl relative overflow-hidden group border-l-8 border-l-red-500">
            <Thermometer className="absolute -right-4 -bottom-4 text-red-50 opacity-40 group-hover:scale-110 transition-transform" size={100} />
            <span className="text-[10px] font-black uppercase text-slate-400 block mb-2 tracking-widest">Temp. Seca (TBS)</span>
            <div className="text-4xl font-black text-slate-900">{weatherStats.maxT.toFixed(1)}ºC <span className="text-xs text-slate-400 font-bold">Máx</span></div>
            <div className="text-xs font-bold text-slate-400 mt-1">Média: {weatherStats.avgT.toFixed(1)}ºC | Mín: {weatherStats.minT.toFixed(1)}ºC</div>
          </div>
          <div className="bg-white p-8 rounded-[40px] border shadow-xl relative overflow-hidden group border-l-8 border-l-blue-500">
            <Waves className="absolute -right-4 -bottom-4 text-blue-50 opacity-40 group-hover:scale-110 transition-transform" size={100} />
            <span className="text-[10px] font-black uppercase text-slate-400 block mb-2 tracking-widest">Temp. Húmida (TBH)</span>
            <div className="text-4xl font-black text-slate-900">{weatherStats.maxTbh.toFixed(1)}ºC <span className="text-xs text-slate-400 font-bold">Máx</span></div>
            <div className="text-xs font-bold text-slate-400 mt-1">Média: {weatherStats.avgTbh.toFixed(1)}ºC | Mín: {weatherStats.minTbh.toFixed(1)}ºC</div>
          </div>
          <div className="bg-white p-8 rounded-[40px] border shadow-xl relative overflow-hidden group border-l-8 border-l-emerald-500">
            <Droplets className="absolute -right-4 -bottom-4 text-emerald-50 opacity-40 group-hover:scale-110 transition-transform" size={100} />
            <span className="text-[10px] font-black uppercase text-slate-400 block mb-2 tracking-widest">Humidade Relativa</span>
            <div className="text-4xl font-black text-slate-900">{weatherStats.avgRH.toFixed(0)}% <span className="text-xs text-slate-400 font-bold">Média</span></div>
            <div className="text-xs font-bold text-slate-400 mt-1">Mín: {weatherStats.minRH.toFixed(0)}% | Máx: {weatherStats.maxRH.toFixed(0)}%</div>
          </div>
          <div className="bg-slate-900 p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden border-l-8 border-l-blue-400">
             <div className="relative z-10">
              <span className="text-[10px] font-black uppercase text-slate-500 block mb-2 tracking-widest">Ponto de Orvalho / Geada</span>
              <div className="text-3xl font-black text-blue-400">{weatherStats.minT < 2 ? 'Risco Elevado' : 'Risco Baixo'}</div>
              <p className="text-[9px] text-slate-500 mt-3 leading-tight uppercase font-black">Essencial para dimensionamento de condensadores e evaporadores.</p>
             </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-white p-10 rounded-[50px] border shadow-2xl h-[550px] flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black flex items-center gap-3 tracking-tight"><Activity size={22} className="text-blue-500"/> Médias Diárias TBS vs TBH</h3>
          </div>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyChart}>
                <defs>
                  <linearGradient id="colorTbs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorTbh" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" hide />
                <YAxis fontSize={11} stroke="#94a3b8" tickFormatter={(v) => `${v}ºC`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                  formatter={(value: any) => [`${parseFloat(value).toFixed(1)} ºC`]}
                />
                <Legend verticalAlign="top" height={36}/>
                <Area type="monotone" dataKey="tbs" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorTbs)" name="Temp. Seca (TBS)"/>
                <Area type="monotone" dataKey="tbh" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorTbh)" name="Temp. Húmida (TBH)"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[50px] border shadow-2xl h-[550px] flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black flex items-center gap-3 tracking-tight"><BarChart2 size={22} className="text-indigo-500"/> Frequência Térmica (Ocorrências)</h3>
          </div>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={histogramData} margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={10} interval={3} stroke="#94a3b8" />
                <YAxis fontSize={10} stroke="#94a3b8" />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '15px', border: 'none' }} />
                <Legend verticalAlign="top" height={36}/>
                <Bar dataKey="tbs" fill="#f87171" name="Horas TBS" radius={[4, 4, 0, 0]} />
                <Bar dataKey="tbh" fill="#60a5fa" name="Horas TBH" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white p-12 rounded-[50px] border shadow-2xl space-y-12">
        <header className="border-b pb-8">
          <h3 className="text-2xl font-black text-slate-900 flex items-center gap-4">
            <Zap size={28} className="text-blue-600"/> 
            Análise Técnica de Impacto AVAC
          </h3>
          <p className="text-slate-500 mt-2 font-medium">Avaliação das variáveis climáticas na performance dos subsistemas térmicos.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="space-y-6 group">
            <div className="flex items-center gap-4">
              <div className="bg-red-100 p-3 rounded-2xl text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors">
                <Wind size={24}/>
              </div>
              <h4 className="font-black text-slate-800 uppercase tracking-tight">Chillers (Ar)</h4>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed text-justify">
              A eficiência (EER) degrada-se exponencialmente com o aumento da <b>TBS</b>. Temperaturas acima de 35ºC aumentam a pressão de condensação, reduzindo a capacidade frigorífica líquida e aumentando o consumo específico (kW/kW).
            </p>
            <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
              <span className="text-[10px] font-black uppercase text-red-500 block mb-1">Impacto Crítico</span>
              <p className="text-xs font-bold text-red-700">Redução de até 3% no EER por cada grau acima de 35ºC TBS.</p>
            </div>
          </div>

          <div className="space-y-6 group">
            <div className="flex items-center gap-4">
              <div className="bg-indigo-100 p-3 rounded-2xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Flame size={24}/>
              </div>
              <h4 className="font-black text-slate-800 uppercase tracking-tight">Bombas de Calor</h4>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed text-justify">
              O desempenho (COP) é severamente afetado pela <b>TBS</b> baixa e <b>RH</b> elevada. Abaixo dos 7ºC, inicia-se o risco de formação de geada (frosting) no evaporador, ativando ciclos de descongelação.
            </p>
            <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
              <span className="text-[10px] font-black uppercase text-indigo-500 block mb-1">Impacto Crítico</span>
              <p className="text-xs font-bold text-indigo-700">Inversão de ciclo para descongelação penaliza o COP em 15-20%.</p>
            </div>
          </div>

          <div className="space-y-6 group">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Waves size={24}/>
              </div>
              <h4 className="font-black text-slate-800 uppercase tracking-tight">Torres & Adiabáticos</h4>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed text-justify">
              A performance é limitada estritamente pela <b>TBH</b>. O "approach" da torre determina a temperatura da água de condensação (T_cw = TBH + Approach). Sistemas sofrem em zonas com RH elevada.
            </p>
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
              <span className="text-[10px] font-black uppercase text-blue-500 block mb-1">Impacto Crítico</span>
              <p className="text-xs font-bold text-blue-700">Impossibilidade física de arrefecer abaixo da TBH local.</p>
            </div>
          </div>
        </div>

        <footer className="pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-black uppercase text-slate-400 tracking-widest italic">
          <div className="flex items-center gap-2">
            <Info size={14} className="text-blue-500"/>
            Análise Baseada em DIN 4710 / ASHRAE
          </div>
          <div>Eng. José Coelho • PQ00851 | OET 2321</div>
        </footer>
      </div>
    </div>
  );
};

export default ClimateTab;
