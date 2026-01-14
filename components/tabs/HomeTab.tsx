
import React from 'react';
import { Award, Zap, ChevronRight } from 'lucide-react';
import { ProjectData } from '../../types';

interface Props {
  project: ProjectData;
  setActiveTab: (t: string) => void;
}

const HomeTab: React.FC<Props> = ({ project, setActiveTab }) => (
  <div className="py-20 space-y-12 animate-in fade-in duration-700">
    <div className="flex flex-col md:flex-row items-center justify-between gap-16">
      <div className="flex-1 space-y-8">
        <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-widest rounded-full">
          <Award size={14} className="mr-2" /> Koelho2000 Pro Suite
        </div>
        <h2 className="text-8xl font-black text-slate-900 leading-none tracking-tighter">
          Selecção <span className="text-blue-600 italic">AVAC</span> de Alta Precisão
        </h2>
        <p className="text-2xl text-slate-500 max-w-2xl leading-relaxed">
          Modelagem dinâmica 8760h, análise climática real e inteligência artificial para projectos industriais de chillers e bombas de calor.
        </p>
        <div className="flex gap-4">
          <button onClick={() => setActiveTab('config')} className="px-12 py-6 bg-slate-900 text-white rounded-[30px] font-black uppercase hover:bg-slate-800 transition shadow-2xl scale-105">Começar Projecto</button>
          <button onClick={() => setActiveTab('selection')} className="px-12 py-6 bg-white border-2 border-slate-100 text-slate-700 rounded-[30px] font-black uppercase hover:bg-slate-50 transition">Ver Catálogo</button>
        </div>
      </div>
      <div className="flex-1 w-full max-w-lg bg-gradient-to-br from-blue-600 to-indigo-800 rounded-[100px] p-16 text-white shadow-2xl relative overflow-hidden">
        <Zap className="absolute -top-10 -right-10 opacity-10" size={300} />
        <h3 className="text-3xl font-black mb-10">Status Projecto</h3>
        <div className="space-y-8">
          <div className="border-b border-white/20 pb-4 flex justify-between items-end">
            <div><span className="text-[10px] uppercase font-black opacity-60">Pico Térmico</span><div className="text-4xl font-black">{project.peakPower} kW</div></div>
          </div>
          <div className="border-b border-white/20 pb-4 flex justify-between items-end">
            <div><span className="text-[10px] uppercase font-black opacity-60">Equipamentos</span><div className="text-4xl font-black">{project.selectedEquipmentIds.length}</div></div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default HomeTab;
