
import React, { useMemo, useRef } from 'react';
import { 
  Printer, 
  ShieldCheck, 
  Zap, 
  Thermometer, 
  Wind, 
  Droplets, 
  Waves, 
  Activity, 
  ZapOff, 
  Info, 
  Settings,
  FileCode,
  FileType,
  Copy,
  Check,
  ArrowRightLeft
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { ProjectData, CondensationType } from '../../types';
import { OEM_DATABASE } from '../../constants';

interface Props {
  project: ProjectData;
  selectedReportUnitId: string | null;
}

const SheetTab: React.FC<Props> = ({ project, selectedReportUnitId }) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = React.useState(false);

  const mainEquipment = useMemo(() => 
    OEM_DATABASE.find(u => u.id === selectedReportUnitId) || 
    OEM_DATABASE.filter(e => project.selectedEquipmentIds.includes(e.id))[0] || null
  , [selectedReportUnitId, project.selectedEquipmentIds]);

  const hydraulics = useMemo(() => {
    if (!mainEquipment) return null;
    
    // Circuito Primário (Carga / Evaporador)
    const coolingFlow = mainEquipment.coolingCapacity / (1.163 * 5);
    const heatingFlow = mainEquipment.heatingCapacity / (1.163 * 5);
    
    // Circuito Secundário (Rejeição / Condensador) - Apenas para Water-Cooled
    // Heat Rejection approx = Cooling Capacity + Power Input (P_abs = Q_cool / EER)
    const absorbedPower = mainEquipment.coolingCapacity / (mainEquipment.eer || 3);
    const heatRejection = mainEquipment.coolingCapacity + absorbedPower;
    const condenserFlow = heatRejection / (1.163 * 5);
    
    return { coolingFlow, heatingFlow, condenserFlow, heatRejection };
  }, [mainEquipment]);

  const efficiencyData = useMemo(() => {
    if (!mainEquipment) return [];
    return [
      { name: 'ESEER', value: mainEquipment.eseer, color: '#3b82f6' },
      { name: 'SCOP', value: mainEquipment.scop, color: '#6366f1' },
      { name: 'EER', value: mainEquipment.eer, color: '#10b981' },
      { name: 'COP', value: mainEquipment.cop, color: '#f59e0b' }
    ].filter(d => d.value > 0);
  }, [mainEquipment]);

  const exportToHTML = () => {
    if (!sheetRef.current) return;
    const content = sheetRef.current.innerHTML;
    const tailwind = `<script src="https://cdn.tailwindcss.com"></script>`;
    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Ficha Técnica - ${mainEquipment?.brand} ${mainEquipment?.model}</title>
          ${tailwind}
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Inter', sans-serif; background: #f1f5f9; padding: 40px; display: flex; justify-content: center; }
            .selection-sheet-printable { background: white; width: 210mm; min-height: 297mm; padding: 15mm; border: 1px solid #e2e8f0; box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25); }
          </style>
        </head>
        <body>
          <div class="selection-sheet-printable">${content}</div>
        </body>
      </html>
    `;
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ficha_Tecnica_${mainEquipment?.brand}_${mainEquipment?.model}.html`;
    a.click();
  };

  const exportToDOC = () => {
    if (!sheetRef.current) return;
    const content = sheetRef.current.innerHTML;
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Export</title></head><body>`;
    const footer = `</body></html>`;
    const source = header + content + footer;
    const blob = new Blob([source], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ficha_Tecnica_${mainEquipment?.brand}_${mainEquipment?.model}.doc`;
    a.click();
  };

  const copyToClipboard = async () => {
    if (!sheetRef.current) return;
    try {
      const type = "text/html";
      const blob = new Blob([sheetRef.current.innerHTML], { type });
      const data = [new ClipboardItem({ [type]: blob })];
      await navigator.clipboard.write(data);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Erro ao copiar:", err);
    }
  };

  const isWaterCooled = mainEquipment?.condensationType === CondensationType.WATER;

  return (
    <div className="space-y-10 animate-in slide-in-from-bottom-6 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-center gap-8 no-print">
        <div className="flex-1">
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Folha de Dados Profissional</h2>
          <p className="text-slate-500 mt-2 font-medium">Ficha técnica oficial para submissão e projecto executivo.</p>
        </div>
        {mainEquipment && (
          <div className="flex flex-wrap gap-3 justify-center">
            <button 
              onClick={copyToClipboard}
              className="p-4 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl hover:bg-slate-50 transition shadow-sm flex items-center gap-2 font-black uppercase text-[10px]"
              title="Copiar para área de transferência"
            >
              {copied ? <Check size={18} className="text-emerald-500"/> : <Copy size={18}/>} 
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
            <button 
              onClick={exportToHTML}
              className="p-4 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl hover:bg-slate-50 transition shadow-sm flex items-center gap-2 font-black uppercase text-[10px]"
              title="Exportar para HTML"
            >
              <FileCode size={18}/> HTML
            </button>
            <button 
              onClick={exportToDOC}
              className="p-4 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl hover:bg-slate-50 transition shadow-sm flex items-center gap-2 font-black uppercase text-[10px]"
              title="Exportar para Word (.doc)"
            >
              <FileType size={18}/> Word
            </button>
            <button 
              onClick={() => window.print()} 
              className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase flex items-center gap-2 shadow-xl hover:bg-blue-700 transition active:scale-95 text-[10px]"
            >
              <Printer size={18}/> PDF / Imprimir
            </button>
          </div>
        )}
      </header>

      {mainEquipment ? (
        <div className="flex justify-center bg-slate-200 py-20 px-4 no-print rounded-[60px]">
          <div 
            ref={sheetRef}
            className="w-[210mm] min-h-[297mm] bg-white shadow-2xl p-[15mm] text-slate-800 font-sans selection-sheet-printable flex flex-col border border-slate-300"
          >
            
            {/* Cabeçalho */}
            <div className="flex justify-between items-start mb-10 border-b-4 border-slate-900 pb-8 relative">
              <div>
                <h1 className="text-5xl font-black text-blue-900 tracking-tighter italic leading-none">{mainEquipment.brand}</h1>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] mt-3 ml-1">K-CHBC Select Pro Suite • v2.5</p>
                <div className="mt-6 space-y-1">
                   <p className="text-xs font-black text-slate-900 uppercase">Referência: {project.workReference}</p>
                   <p className="text-xs font-bold text-slate-500 uppercase">{project.location}</p>
                </div>
              </div>

              <div className="text-right text-[10px] font-bold text-slate-500 mt-2">
                <div className="text-xl font-black text-blue-900 uppercase mb-4 border-b-2 border-blue-100 pb-2">Folha de Características</div>
                <p>Projecto: <span className="text-slate-900 font-black">{project.projectName}</span></p>
                <p>Cliente: <span className="text-slate-900 font-black">{project.clientName}</span></p>
                <p>Data de Emissão: <span className="text-slate-900 font-black">{new Date().toLocaleDateString('pt-PT')}</span></p>
              </div>
            </div>

            {/* Corpo da Folha de Dados */}
            <div className="grid grid-cols-2 gap-x-12 gap-y-10 flex-1">
              
              {/* Secção 1: Performance Nominal */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 border-l-4 border-blue-900 pl-3">
                  <Activity size={16} className="text-blue-900" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-blue-900">Performance Nominal</h3>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <table className="w-full text-xs border-separate border-spacing-y-2">
                    <tbody>
                      <tr><td className="text-slate-500 font-bold">Capacidade de Arrefecimento</td><td className="text-right font-black text-blue-600">{mainEquipment.coolingCapacity.toFixed(1)} kW</td></tr>
                      <tr><td className="text-slate-500 font-bold">Capacidade de Aquecimento</td><td className="text-right font-black text-red-600">{mainEquipment.heatingCapacity > 0 ? `${mainEquipment.heatingCapacity.toFixed(1)} kW` : 'N/A'}</td></tr>
                      <tr><td className="text-slate-500 font-bold">Consumo Nominal EER (EER)</td><td className="text-right font-black">{mainEquipment.eer.toFixed(2)}</td></tr>
                      <tr><td className="text-slate-500 font-bold">Consumo Nominal COP (COP)</td><td className="text-right font-black">{mainEquipment.cop > 0 ? mainEquipment.cop.toFixed(2) : 'N/A'}</td></tr>
                      <tr className="border-t"><td className="text-slate-900 font-black pt-2">Eficiência Sazonal ESEER</td><td className="text-right font-black text-emerald-600 pt-2">{mainEquipment.eseer.toFixed(2)}</td></tr>
                      {mainEquipment.scop > 0 && (
                        <tr><td className="text-slate-900 font-black">Eficiência Sazonal SCOP</td><td className="text-right font-black text-indigo-600">{mainEquipment.scop.toFixed(2)}</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="h-40 w-full bg-white border border-slate-100 rounded-2xl p-2 no-print">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={efficiencyData} layout="vertical" margin={{ left: 10, right: 30 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" hide />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                        {efficiencyData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                        <LabelList 
                          dataKey="value" 
                          position="right" 
                          fontSize={9} 
                          fontWeight="black" 
                          fill="#1e293b" 
                          formatter={(val: number) => val.toFixed(2)}
                        />
                        <LabelList dataKey="name" position="insideLeft" fontSize={8} fontWeight="black" fill="#ffffff" offset={10} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              {/* Secção 2: Dados Hidráulicos (Primário e Secundário) */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 border-l-4 border-indigo-600 pl-3">
                  <Waves size={16} className="text-indigo-600" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-indigo-600">
                    Dados Hidráulicos {isWaterCooled ? '(Prim. & Sec.)' : '(Primário)'}
                  </h3>
                </div>
                
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
                  {/* Circuito Primário */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                      <span className="text-[9px] font-black uppercase text-indigo-600 tracking-tighter">Carga (Primário)</span>
                      <span className="text-[8px] font-bold text-slate-400">ΔT = 5K</span>
                    </div>
                    <table className="w-full text-xs border-separate border-spacing-y-1">
                      <tbody>
                        <tr><td className="text-slate-500 font-bold italic">Saída Fluido (Set-point)</td><td className="text-right font-black">{project.targetTemperature} ºC</td></tr>
                        {hydraulics && (
                          <>
                            <tr><td className="text-slate-500 font-bold">Caudal Água (Frio)</td><td className="text-right font-black">{hydraulics.coolingFlow.toFixed(2)} m³/h</td></tr>
                            {mainEquipment.heatingCapacity > 0 && (
                              <tr><td className="text-slate-500 font-bold">Caudal Água (Calor)</td><td className="text-right font-black">{hydraulics.heatingFlow.toFixed(2)} m³/h</td></tr>
                            )}
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Circuito Secundário (Apenas para Condensação a Água) */}
                  {isWaterCooled && hydraulics && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                        <span className="text-[9px] font-black uppercase text-red-600 tracking-tighter">Condensador (Secundário)</span>
                        <span className="text-[8px] font-bold text-slate-400">ΔT = 5K (Std)</span>
                      </div>
                      <table className="w-full text-xs border-separate border-spacing-y-1">
                        <tbody>
                          <tr><td className="text-slate-500 font-bold italic">Rejeição de Calor</td><td className="text-right font-black text-red-600">{hydraulics.heatRejection.toFixed(1)} kW</td></tr>
                          <tr><td className="text-slate-500 font-bold">Caudal Condensação</td><td className="text-right font-black">{hydraulics.condenserFlow.toFixed(2)} m³/h</td></tr>
                          <tr><td className="text-slate-500 font-bold italic">Temp. Arrefecimento</td><td className="text-right font-black">30/35 ºC (Nom.)</td></tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  <table className="w-full text-xs border-separate border-spacing-y-1 border-t pt-2">
                    <tbody>
                      <tr><td className="text-slate-500 font-bold">Diâmetro Nominal (DN)</td><td className="text-right font-black">DN {mainEquipment.pipeDN}</td></tr>
                      <tr><td className="text-slate-500 font-bold">Fluido Portador</td><td className="text-right font-black">Água / Glicol</td></tr>
                      <tr><td className="text-slate-500 font-bold">Tipo Permutador</td><td className="text-right font-black">Inox 316 / Tubular</td></tr>
                    </tbody>
                  </table>
                </div>

                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center gap-3">
                   <Info size={16} className="text-indigo-600 shrink-0" />
                   <p className="text-[8px] font-bold text-indigo-800 leading-tight">Cálculos de caudal e rejeição baseados em condições nominais EUROVENT.</p>
                </div>
              </section>

              {/* Secção 3: Dados de Instalação */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 border-l-4 border-amber-500 pl-3">
                  <Zap size={16} className="text-amber-500" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-amber-500">Instalação e Apoios</h3>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <table className="w-full text-xs border-separate border-spacing-y-2">
                    <tbody>
                      <tr><td className="text-slate-500 font-bold">Consumo Máximo (A)</td><td className="text-right font-black text-amber-600">{mainEquipment.amperage} A</td></tr>
                      <tr><td className="text-slate-500 font-bold">Tensão / Fases</td><td className="text-right font-black">{mainEquipment.voltage}</td></tr>
                      <tr><td className="text-slate-500 font-bold">Protecção (Disjuntor)</td><td className="text-right font-black uppercase">{mainEquipment.circuitBreaker} (C/D)</td></tr>
                      <tr><td className="text-slate-500 font-bold">Secção de Cabo (mín)</td><td className="text-right font-black">{mainEquipment.cableSection} mm² (Cu)</td></tr>
                      <tr className="border-t"><td className="text-slate-500 font-bold pt-2">Dimensões Base Maciço</td><td className="text-right font-black pt-2">{mainEquipment.baseDimensions} mm</td></tr>
                      <tr><td className="text-slate-500 font-bold">Peso em Operação</td><td className="text-right font-black">{mainEquipment.weight.toLocaleString()} kg</td></tr>
                      <tr><td className="text-slate-500 font-bold">Carga Frigorigéneo</td><td className="text-right font-black">{mainEquipment.refrigerantCharge.toFixed(1)} kg ({mainEquipment.refrigerant})</td></tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Secção 4: Limites Operacionais */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 border-l-4 border-emerald-600 pl-3">
                  <Thermometer size={16} className="text-emerald-600" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-emerald-600">Limites de Operação</h3>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <table className="w-full text-xs border-separate border-spacing-y-2">
                    <tbody>
                      <tr><td className="text-slate-500 font-bold flex items-center gap-2"><Wind size={12} /> Temp. Ar Exterior (mín)</td><td className="text-right font-black">{mainEquipment.minAmbientTemp} ºC</td></tr>
                      <tr><td className="text-slate-500 font-bold flex items-center gap-2"><Wind size={12} /> Temp. Ar Exterior (máx)</td><td className="text-right font-black">{mainEquipment.maxAmbientTemp} ºC</td></tr>
                      <tr><td className="text-slate-500 font-bold flex items-center gap-2"><Waves size={12} /> Temp. Saída Fluido (mín)</td><td className="text-right font-black">{mainEquipment.minFluidTemp} ºC</td></tr>
                      <tr><td className="text-slate-500 font-bold flex items-center gap-2"><Waves size={12} /> Temp. Saída Fluido (máx)</td><td className="text-right font-black">{mainEquipment.maxFluidTemp} ºC</td></tr>
                      <tr className="border-t"><td className="text-slate-500 font-bold pt-2">Pressão Máx. Hidráulica</td><td className="text-right font-black pt-2">10 bar</td></tr>
                      <tr><td className="text-slate-500 font-bold">Ruído (Pressão Sonora 10m)</td><td className="text-right font-black">{mainEquipment.noiseLevel} dB(A)</td></tr>
                    </tbody>
                  </table>
                </div>
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3">
                   <Droplets size={16} className="text-emerald-600 shrink-0" />
                   <p className="text-[8px] font-bold text-emerald-800 leading-tight">Para temperaturas negativas é obrigatório o uso de mistura anticongelante.</p>
                </div>
              </section>

              {/* Detalhes de Hardware e Controlo */}
              <section className="col-span-2 space-y-4 border-t pt-8">
                <div className="flex items-center gap-2 border-l-4 border-slate-400 pl-3">
                  <Settings className="w-4 h-4 text-slate-400" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Equipamento Complementar e Controlo</h3>
                </div>
                <div className="grid grid-cols-3 gap-6">
                   <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <span className="text-[8px] font-black uppercase text-slate-400 block mb-2 tracking-widest">Instrumentação</span>
                      <ul className="text-[9px] font-bold text-slate-700 list-disc pl-3">
                        {project.instrumentation.map((i, idx) => <li key={idx}>{i}</li>)}
                      </ul>
                   </div>
                   <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <span className="text-[8px] font-black uppercase text-slate-400 block mb-2 tracking-widest">Válvulas / Órgãos</span>
                      <ul className="text-[9px] font-bold text-slate-700 list-disc pl-3">
                        {project.valves.map((v, idx) => <li key={idx}>{v}</li>)}
                      </ul>
                   </div>
                   <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <span className="text-[8px] font-black uppercase text-slate-400 block mb-2 tracking-widest">Protocolo de Controlo</span>
                      <p className="text-[9px] font-black text-slate-900">{project.controlType}</p>
                   </div>
                </div>
              </section>
            </div>

            {/* Rodapé do Documento */}
            <div className="mt-12 pt-8 border-t-2 border-slate-100 flex justify-between items-end">
              <div className="flex flex-col gap-1">
                <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Entidade Projectista</span>
                <span className="text-sm font-black text-blue-900">Koelho2000 Engenharia AVAC</span>
                <span className="text-[9px] font-bold text-slate-500">Sintra, Portugal • www.koelho2000.com</span>
              </div>
              
              <div className="text-right">
                 <div className="flex flex-col items-end gap-1 mb-4">
                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Validação Técnica</span>
                    <p className="text-[10px] font-black text-slate-900 uppercase">Eng. José Coelho</p>
                    <p className="text-[9px] font-bold text-slate-500 leading-none">PQ00851 | OET 2321</p>
                 </div>
                 <div className="h-12 w-32 border-b-2 border-slate-300"></div>
                 <span className="text-[7px] font-black uppercase text-slate-300 tracking-[0.3em]">Assinatura Qualificada</span>
              </div>
            </div>

            <div className="mt-8 text-[7px] text-slate-300 font-bold uppercase tracking-tighter text-justify leading-tight">
              Este documento foi gerado pelo software K-CHBC SELECT PRO. As características indicadas são nominais e baseadas nos dados fornecidos pelos fabricantes (OEM). O dimensionamento final deve ser validado em sede de projecto executivo considerando todas as perdas de carga e condições específicas do local. Todos os direitos reservados à Koelho2000 Engenharia.
            </div>
          </div>
        </div>
      ) : (
        <div className="p-40 text-center bg-slate-100/50 border-4 border-dashed rounded-[60px] text-slate-400 italic flex flex-col items-center gap-6">
          <ZapOff size={64} className="opacity-20" />
          <p className="text-xl font-bold uppercase tracking-widest">Seleccione um equipamento para visualizar a folha técnica profissional.</p>
        </div>
      )}
    </div>
  );
};

export default SheetTab;
