
import React, { useMemo } from 'react';
import { ChevronRight, Euro, Box, Zap, CheckCircle2 } from 'lucide-react';
import { ProjectData } from '../../types';
import { OEM_DATABASE } from '../../constants';

interface Props {
  project: ProjectData;
  setProject: React.Dispatch<React.SetStateAction<ProjectData>>;
  setActiveTab: (t: string) => void;
  selectedReportUnitId: string | null;
}

const ConfigTab: React.FC<Props> = ({ project, setProject, setActiveTab, selectedReportUnitId }) => {
  const fields = [
    { id: 'workReference', label: 'Referência da Obra' },
    { id: 'projectName', label: 'Nome do Projecto' },
    { id: 'clientName', label: 'Nome do Cliente' },
    { id: 'installationName', label: 'Nome da Instalação' },
    { id: 'location', label: 'Local da Instalação' },
    { id: 'technicianName', label: 'Técnico Responsável' },
    { id: 'auditCompany', label: 'Empresa de Auditoria' },
    { id: 'companyName', label: 'Empresa Proponente' }
  ];

  const mainUnit = useMemo(() => {
    if (selectedReportUnitId) return OEM_DATABASE.find(u => u.id === selectedReportUnitId);
    return OEM_DATABASE.find(u => project.selectedEquipmentIds.includes(u.id));
  }, [selectedReportUnitId, project.selectedEquipmentIds]);

  return (
    <div className="space-y-10 animate-in slide-in-from-bottom-6 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Dados do Projecto</h2>
          <p className="text-slate-500 font-medium">Informação base para a documentação técnica e parecer IA.</p>
        </div>
        
        {mainUnit && (
          <div className="bg-white p-2 rounded-[32px] border shadow-xl flex items-center pr-8 gap-6 animate-in fade-in slide-in-from-right-4">
             <div className="bg-slate-900 px-6 py-4 rounded-[28px] flex items-center gap-4 border border-blue-500/20">
                <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-600/20">
                  <Box size={20} />
                </div>
                <div>
                  <span className="text-[8px] font-black uppercase text-blue-400 tracking-[0.2em] block mb-0.5">Marca Seleccionada</span>
                  <p className="text-white font-black text-xl leading-none tracking-tight">{mainUnit.brand}</p>
                </div>
             </div>
             
             <div className="flex flex-col justify-center">
                <span className="text-[8px] font-black uppercase text-slate-400 tracking-[0.2em] block mb-1">Modelo do Equipamento</span>
                <p className="text-slate-900 font-black text-lg leading-none">{mainUnit.model}</p>
                <div className="flex items-center gap-2 mt-2">
                   <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-100">
                      <Zap size={10} className="fill-emerald-500" />
                      <span className="text-[10px] font-black uppercase">{Math.max(mainUnit.coolingCapacity, mainUnit.heatingCapacity).toFixed(0)} kW</span>
                   </div>
                   <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100">
                      <CheckCircle2 size={10} />
                      <span className="text-[10px] font-black uppercase">Validado</span>
                   </div>
                </div>
             </div>
          </div>
        )}
      </header>

      <div className="bg-white p-12 rounded-[50px] border shadow-2xl grid grid-cols-1 md:grid-cols-2 gap-10">
        {fields.map((field) => (
          <div key={field.id} className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{field.label}</label>
            <input 
              type="text" 
              value={(project as any)[field.id]} 
              onChange={e => setProject({...project, [field.id]: e.target.value})} 
              className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-blue-500 outline-none transition" 
            />
          </div>
        ))}
        
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1">
            <Euro size={10} /> Custo de Energia (€/kWh)
          </label>
          <div className="relative">
            <input 
              type="number" 
              step="0.01"
              value={project.electricityPrice} 
              onChange={e => setProject({...project, electricityPrice: parseFloat(e.target.value) || 0})} 
              className="w-full p-4 bg-blue-50/50 rounded-2xl font-black text-blue-700 border-2 border-transparent focus:border-blue-500 outline-none transition" 
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-400 font-black text-xs">€ / kWh</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button onClick={() => setActiveTab('climate')} className="px-12 py-6 bg-blue-600 text-white rounded-[30px] font-black uppercase tracking-widest flex items-center gap-4 hover:bg-blue-700 transition shadow-2xl active:scale-95">
          Configurar Clima <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
};

export default ConfigTab;
