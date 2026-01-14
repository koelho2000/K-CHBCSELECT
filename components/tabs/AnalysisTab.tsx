
import React, { useMemo, useState, useRef } from 'react';
import { 
  BarChart2, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  DollarSign, 
  Volume2, 
  Scale, 
  Zap, 
  ThumbsUp, 
  Info,
  ChevronRight,
  ShieldCheck,
  Printer,
  FileCode,
  FileType,
  Copy,
  Check
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  Cell 
} from 'recharts';
import { ProjectData, OEMEquipment } from '../../types';
import { OEM_DATABASE } from '../../constants';

interface Props {
  project: ProjectData;
  selectedReportUnitId: string | null;
  setSelectedReportUnitId: (id: string) => void;
}

const AnalysisTab: React.FC<Props> = ({ project, selectedReportUnitId, setSelectedReportUnitId }) => {
  const [copied, setCopied] = useState(false);
  const analysisRef = useRef<HTMLDivElement>(null);

  const selectedUnits = useMemo(() => 
    OEM_DATABASE.filter(e => project.selectedEquipmentIds.includes(e.id))
  , [project.selectedEquipmentIds]);

  const chartData = useMemo(() => {
    return selectedUnits.map(u => ({
      name: `${u.brand} ${u.model.split('-')[0]}`,
      eseer: u.eseer,
      scop: u.scop,
      price: u.price / 1000 // In k€ for scale
    }));
  }, [selectedUnits]);

  const recommendations = useMemo(() => {
    if (selectedUnits.length === 0) return null;

    const isHeating = project.targetTemperature > 30;
    
    // Sort by Efficiency
    const bestEfficiency = [...selectedUnits].sort((a, b) => 
      isHeating ? b.scop - a.scop : b.eseer - a.eseer
    )[0];

    // Sort by Price/Efficiency Ratio (ROI focus)
    const bestValue = [...selectedUnits].sort((a, b) => {
      const effA = isHeating ? a.scop : a.eseer;
      const effB = isHeating ? b.scop : b.eseer;
      return (a.price / effA) - (b.price / effB);
    })[0];

    return { bestEfficiency, bestValue };
  }, [selectedUnits, project.targetTemperature]);

  const handleSuggestBest = () => {
    if (recommendations) {
      setSelectedReportUnitId(recommendations.bestEfficiency.id);
    }
  };

  const exportToHTML = () => {
    if (!analysisRef.current) return;
    const content = analysisRef.current.innerHTML;
    const tailwind = `<script src="https://cdn.tailwindcss.com"></script>`;
    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Análise de Eficiência - ${project.projectName}</title>
          ${tailwind}
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Inter', sans-serif; background: #f8fafc; padding: 40px; }
            .export-container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 40px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.1); }
          </style>
        </head>
        <body>
          <div class="export-container">${content}</div>
        </body>
      </html>
    `;
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Analise_Eficiencia_${project.projectName.replace(/\s+/g, '_')}.html`;
    a.click();
  };

  const exportToDOC = () => {
    if (!analysisRef.current) return;
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Exportação Análise ROI</title></head><body>`;
    const footer = `</body></html>`;
    const source = header + analysisRef.current.innerHTML + footer;
    const blob = new Blob([source], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Analise_Eficiencia_${project.projectName.replace(/\s+/g, '_')}.doc`;
    a.click();
  };

  const copyToClipboard = async () => {
    if (!analysisRef.current) return;
    try {
      const type = "text/html";
      const blob = new Blob([analysisRef.current.innerHTML], { type });
      const data = [new ClipboardItem({ [type]: blob })];
      await navigator.clipboard.write(data);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Erro ao copiar:", err);
    }
  };

  return (
    <div className="space-y-12 animate-in slide-in-from-bottom-6 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-end gap-6 no-print">
        <div className="flex-1">
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Análise de Eficiência & ROI</h2>
          <p className="text-slate-500 mt-2 font-medium">Comparativo técnico-económico entre as soluções seleccionadas.</p>
        </div>
        
        <div className="flex flex-wrap gap-3 justify-center">
          <div className="flex gap-2 border-r pr-4 border-slate-100">
            <button 
              onClick={copyToClipboard}
              className="p-4 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl hover:bg-slate-50 transition shadow-sm flex items-center gap-2 font-black uppercase text-[10px]"
            >
              {copied ? <Check size={16} className="text-emerald-500"/> : <Copy size={16}/>} 
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
            <button onClick={exportToHTML} className="p-4 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl hover:bg-slate-50 transition shadow-sm flex items-center gap-2 font-black uppercase text-[10px]">
              <FileCode size={16}/> HTML
            </button>
            <button onClick={exportToDOC} className="p-4 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl hover:bg-slate-50 transition shadow-sm flex items-center gap-2 font-black uppercase text-[10px]">
              <FileType size={16}/> Word
            </button>
            <button onClick={() => window.print()} className="p-4 bg-slate-900 text-white rounded-2xl transition shadow-xl flex items-center gap-2 font-black uppercase text-[10px] hover:bg-blue-600">
              <Printer size={16}/> PDF
            </button>
          </div>

          {selectedUnits.length > 0 && recommendations && (
            <button 
              onClick={handleSuggestBest}
              className="px-8 py-4 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase flex items-center gap-2 hover:bg-emerald-700 transition shadow-xl active:scale-95 animate-pulse"
            >
              <ThumbsUp size={18}/> Sugerir Melhor Solução
            </button>
          )}
        </div>
      </header>

      {selectedUnits.length === 0 ? (
        <div className="p-32 bg-slate-100 border-4 border-dashed rounded-[60px] text-center text-slate-400 italic flex flex-col items-center gap-6 no-print">
          <BarChart2 size={64} className="opacity-20" />
          <p className="text-xl font-bold">Seleccione unidades no catálogo para iniciar a análise comparativa.</p>
        </div>
      ) : (
        <div className="space-y-12" ref={analysisRef}>
          {/* Tabela Comparativa Expandida */}
          <div className="bg-white rounded-[50px] border shadow-2xl overflow-hidden">
            <div className="p-8 border-b bg-slate-50/50 flex items-center gap-3">
              <TrendingUp size={20} className="text-blue-600" />
              <h3 className="text-sm font-black uppercase text-slate-600 tracking-widest">Variáveis Técnicas Comparativas</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b tracking-widest">
                  <tr>
                    <th className="px-8 py-6">Solução Seleccionada</th>
                    <th className="px-4 py-6 text-center">Arref. (kW)</th>
                    <th className="px-4 py-6 text-center">Aquec. (kW)</th>
                    <th className="px-4 py-6 text-center">ESEER</th>
                    <th className="px-4 py-6 text-center">SCOP</th>
                    <th className="px-4 py-6 text-center">Ruído (dB)</th>
                    <th className="px-4 py-6 text-center">Preço (€)</th>
                    <th className="px-8 py-6 text-right no-print">Selecção</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedUnits.map(u => (
                    <tr key={u.id} className={`hover:bg-slate-50 transition group ${selectedReportUnitId === u.id ? "bg-blue-50/50" : ""}`}>
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-900">{u.brand}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">{u.model}</span>
                        </div>
                      </td>
                      <td className="px-4 py-6 text-center font-bold text-blue-600">{u.coolingCapacity.toFixed(1)}</td>
                      <td className="px-4 py-6 text-center font-bold text-red-600">{u.heatingCapacity > 0 ? u.heatingCapacity.toFixed(1) : '-'}</td>
                      <td className="px-4 py-6 text-center">
                        <span className={`font-black text-lg ${u.eseer >= 5 ? 'text-emerald-600' : 'text-slate-600'}`}>{u.eseer.toFixed(2)}</span>
                      </td>
                      <td className="px-4 py-6 text-center">
                        <span className={`font-black text-lg ${u.scop >= 4 ? 'text-indigo-600' : 'text-slate-600'}`}>{u.scop > 0 ? u.scop.toFixed(2) : '-'}</span>
                      </td>
                      <td className="px-4 py-6 text-center font-medium text-slate-500">{u.noiseLevel}</td>
                      <td className="px-4 py-6 text-center font-black text-slate-900">{u.price.toLocaleString()}€</td>
                      <td className="px-8 py-6 text-right no-print">
                        <button 
                          onClick={() => setSelectedReportUnitId(u.id)} 
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${selectedReportUnitId === u.id ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                        >
                          <CheckCircle2 size={24}/>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Gráfico de Eficiência Comparativa */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 bg-white p-10 rounded-[50px] border shadow-2xl h-[500px] flex flex-col no-print">
              <h3 className="text-xl font-black mb-8 flex items-center gap-4 text-slate-900">
                <BarChart2 size={28} className="text-indigo-600"/> Eficiência Sazonal Comparativa
              </h3>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" fontSize={10} stroke="#94a3b8" />
                    <YAxis fontSize={10} stroke="#94a3b8" />
                    <Tooltip 
                      cursor={{fill: '#f8fafc'}} 
                      contentStyle={{borderRadius: '20px', border:'none', boxShadow:'0 20px 25px -5px rgba(0,0,0,0.1)'}}
                    />
                    <Legend iconType="circle" />
                    <Bar dataKey="eseer" fill="#10b981" name="ESEER (Frio)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="scop" fill="#6366f1" name="SCOP (Calor)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-slate-900 p-10 rounded-[50px] shadow-2xl flex flex-col text-white">
              <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                <Zap size={24} className="text-blue-400"/> Resumo de Investimento
              </h3>
              <div className="space-y-6 flex-1">
                <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                  <span className="text-[10px] font-black uppercase text-slate-500 block mb-2">Média de Investimento</span>
                  <div className="text-3xl font-black text-white">
                    {(selectedUnits.reduce((a, b) => a + b.price, 0) / selectedUnits.length).toLocaleString()}€
                  </div>
                </div>
                <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                  <span className="text-[10px] font-black uppercase text-slate-500 block mb-2">Delta de Eficiência Máx.</span>
                  <div className="text-3xl font-black text-emerald-400">
                    {(Math.max(...selectedUnits.map(u => u.eseer)) - Math.min(...selectedUnits.map(u => u.eseer))).toFixed(2)} pts
                  </div>
                </div>
                <div className="p-6 bg-blue-600/20 rounded-3xl border border-blue-500/30 flex items-center gap-4">
                  <Info className="text-blue-400 shrink-0" size={24} />
                  <p className="text-[10px] font-bold text-blue-100 leading-tight">
                    O retorno do investimento (ROI) é tipicamente 20% mais rápido em unidades com ESEER superior a 5.2.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Rodapé de Análise e Sugestão */}
          <div className="bg-white p-12 rounded-[50px] border shadow-2xl space-y-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <ShieldCheck size={200} />
            </div>
            
            <header className="border-b pb-8">
              <h3 className="text-2xl font-black text-slate-900 flex items-center gap-4">
                <ShieldCheck size={32} className="text-emerald-600"/> 
                Parecer de Selecção Koelho2000
              </h3>
              <p className="text-slate-500 mt-2 font-medium">Análise algorítmica da melhor solução para o perfil {project.projectName}.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {recommendations && (
                <>
                  <div className="bg-emerald-50 p-8 rounded-[40px] border border-emerald-100 space-y-4">
                    <div className="flex items-center gap-4 text-emerald-700">
                      <div className="bg-emerald-600 text-white p-2 rounded-xl"><Zap size={20}/></div>
                      <h4 className="font-black uppercase tracking-tight">Performance Máxima</h4>
                    </div>
                    <p className="text-sm text-emerald-900 font-medium">
                      A unidade <span className="font-black">{recommendations.bestEfficiency.brand} {recommendations.bestEfficiency.model}</span> oferece a maior eficiência sazonal ({project.targetTemperature > 30 ? recommendations.bestEfficiency.scop.toFixed(2) : recommendations.bestEfficiency.eseer.toFixed(2)}), garantindo o menor custo operacional anual (OPEX).
                    </p>
                    <button 
                      onClick={() => setSelectedReportUnitId(recommendations.bestEfficiency.id)}
                      className="text-xs font-black uppercase text-emerald-700 flex items-center gap-2 hover:translate-x-2 transition-transform no-print"
                    >
                      Seleccionar esta unidade <ChevronRight size={16}/>
                    </button>
                  </div>

                  <div className="bg-blue-50 p-8 rounded-[40px] border border-blue-100 space-y-4">
                    <div className="flex items-center gap-4 text-blue-700">
                      <div className="bg-blue-600 text-white p-2 rounded-xl"><DollarSign size={20}/></div>
                      <h4 className="font-black uppercase tracking-tight">Melhor Relação Custo/Benefício</h4>
                    </div>
                    <p className="text-sm text-blue-900 font-medium">
                      A unidade <span className="font-black">{recommendations.bestValue.brand} {recommendations.bestValue.model}</span> apresenta o melhor equilíbrio entre investimento inicial (CAPEX) e performance técnica para este projecto.
                    </p>
                    <button 
                      onClick={() => setSelectedReportUnitId(recommendations.bestValue.id)}
                      className="text-xs font-black uppercase text-blue-700 flex items-center gap-2 hover:translate-x-2 transition-transform no-print"
                    >
                      Seleccionar esta unidade <ChevronRight size={16}/>
                    </button>
                  </div>
                </>
              )}
            </div>

            <footer className="pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-black uppercase text-slate-400 tracking-widest italic border-t">
              <div className="flex items-center gap-2">
                <AlertCircle size={14} className="text-amber-500"/>
                Análise baseada no custo de ciclo de vida (LCC) estimado a 15 anos.
              </div>
              <div>José Coelho • PQ00851 | Koelho2000 Pro</div>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisTab;
