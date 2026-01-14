
import React from 'react';
import { ChevronRight, Euro } from 'lucide-react';
import { ProjectData } from '../../types';

interface Props {
  project: ProjectData;
  setProject: React.Dispatch<React.SetStateAction<ProjectData>>;
  setActiveTab: (t: string) => void;
}

const ConfigTab: React.FC<Props> = ({ project, setProject, setActiveTab }) => {
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

  return (
    <div className="space-y-10 animate-in slide-in-from-bottom-6">
      <header><h2 className="text-4xl font-black text-slate-900 tracking-tight">Dados do Projecto</h2></header>
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
        {/* Adição do campo de Preço de Eletricidade */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1">
            <Euro size={10} /> Custo de Energia (€/kWh)
          </label>
          <input 
            type="number" 
            step="0.01"
            value={project.electricityPrice} 
            onChange={e => setProject({...project, electricityPrice: parseFloat(e.target.value) || 0})} 
            className="w-full p-4 bg-blue-50 rounded-2xl font-black text-blue-700 border-2 border-transparent focus:border-blue-500 outline-none transition" 
          />
        </div>
      </div>
      <div className="flex justify-end">
        <button onClick={() => setActiveTab('climate')} className="px-12 py-5 bg-blue-600 text-white rounded-[25px] font-black uppercase flex items-center gap-4 hover:bg-blue-700 transition shadow-2xl">
          Clima <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
};

export default ConfigTab;
