
import React, { useMemo, useState } from 'react';
import { Search, Filter, ThermometerSnowflake, Wind, Info, CheckCircle2, Trash2, Box, Zap, ChevronRight, XCircle, PlusCircle, Droplets } from 'lucide-react';
import { ProjectData, Refrigerant, CompressorType, CondensationType } from '../../types';
import { OEM_DATABASE, BRANDS } from '../../constants';

interface SelectionTabProps {
  project: ProjectData;
  setProject: React.Dispatch<React.SetStateAction<ProjectData>>;
  brandFilter: string;
  setBrandFilter: (v: string) => void;
  refrigerantFilter: string;
  setRefrigerantFilter: (v: string) => void;
  compressorFilter: string;
  setCompressorFilter: (v: string) => void;
  condensationFilter: string;
  setCondensationFilter: (v: string) => void;
  modeFilter: string;
  setModeFilter: (v: string) => void;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  intelligentFilterEnabled: boolean;
  setIntelligentFilterEnabled: (v: boolean) => void;
}

const SelectionTab: React.FC<SelectionTabProps> = (props) => {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const filtered = useMemo(() => {
    return OEM_DATABASE.filter(item => {
      const matchesBrand = props.brandFilter === 'All' || item.brand === props.brandFilter;
      const matchesRefr = props.refrigerantFilter === 'All' || item.refrigerant === props.refrigerantFilter;
      const matchesComp = props.compressorFilter === 'All' || item.compressorType === props.compressorFilter;
      const matchesCond = props.condensationFilter === 'All' || item.condensationType === props.condensationFilter; 
      const matchesSearch = props.searchTerm === '' || item.model.toLowerCase().includes(props.searchTerm.toLowerCase()) || item.brand.toLowerCase().includes(props.searchTerm.toLowerCase());
      
      let matchesMode = true;
      if (props.modeFilter === 'CoolingOnly') {
        matchesMode = item.heatingCapacity === 0;
      } else if (props.modeFilter === 'HeatingOnly') {
        matchesMode = item.coolingCapacity === 0;
      } else if (props.modeFilter === 'HeatPump') {
        matchesMode = item.heatingCapacity > 0 && item.coolingCapacity > 0;
      }
      
      let matchesIntelligent = true;
      if (props.intelligentFilterEnabled) {
        const capacityRangeMin = props.project.peakPower * 0.7;
        const capacityRangeMax = props.project.peakPower * 1.5;
        const val = props.project.targetTemperature > 30 ? item.heatingCapacity : item.coolingCapacity;
        matchesIntelligent = val >= capacityRangeMin && val <= capacityRangeMax;
      }
      return matchesBrand && matchesRefr && matchesComp && matchesCond && matchesSearch && matchesIntelligent && matchesMode;
    });
  }, [props.brandFilter, props.refrigerantFilter, props.compressorFilter, props.condensationFilter, props.searchTerm, props.modeFilter, props.intelligentFilterEnabled, props.project.peakPower, props.project.targetTemperature]);

  const selectedUnits = useMemo(() => 
    OEM_DATABASE.filter(u => props.project.selectedEquipmentIds.includes(u.id))
  , [props.project.selectedEquipmentIds]);

  const toggleSelection = (id: string) => {
    props.setProject(prev => {
      const isSelected = prev.selectedEquipmentIds.includes(id);
      return {
        ...prev,
        selectedEquipmentIds: isSelected 
          ? prev.selectedEquipmentIds.filter(i => i !== id) 
          : [...prev.selectedEquipmentIds, id]
      };
    });
  };

  const selectAllFiltered = () => {
    const filteredIds = filtered.map(item => item.id);
    props.setProject(prev => {
      // Adiciona IDs que ainda não estão seleccionados
      const newIds = [...new Set([...prev.selectedEquipmentIds, ...filteredIds])];
      return { ...prev, selectedEquipmentIds: newIds };
    });
  };

  const clearAllSelections = () => {
    if (confirm("Tem a certeza que deseja remover todos os equipamentos selecionados?")) {
      props.setProject(prev => ({ ...prev, selectedEquipmentIds: [] }));
    }
  };

  const allFilteredSelected = useMemo(() => {
    if (filtered.length === 0) return false;
    return filtered.every(item => props.project.selectedEquipmentIds.includes(item.id));
  }, [filtered, props.project.selectedEquipmentIds]);

  return (
    <div className="space-y-10 animate-in slide-in-from-bottom-6 pb-20">
      <header className="bg-white p-10 rounded-[40px] border shadow-xl space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex-1">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Catálogo OEM Multimarca</h2>
            <p className="text-slate-500 font-medium mt-1">Filtragem avançada por parâmetros técnicos e limites operacionais.</p>
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            <div className="relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
              <input type="text" placeholder="Procurar modelo..." value={props.searchTerm} onChange={e => props.setSearchTerm(e.target.value)} className="pl-14 pr-8 py-4 bg-slate-50 rounded-full font-bold outline-none focus:ring-2 ring-blue-500 w-80 transition-all border-2 border-transparent focus:bg-white" />
            </div>
            
            <div className="flex gap-2">
              <button onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} className={`px-6 py-4 rounded-full text-xs font-black uppercase flex items-center gap-2 transition ${showAdvancedFilters ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}><Filter size={18}/> Filtros</button>
              <button onClick={() => props.setIntelligentFilterEnabled(!props.intelligentFilterEnabled)} className={`px-6 py-4 rounded-full text-xs font-black uppercase transition shadow-sm ${props.intelligentFilterEnabled ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>IA Filter</button>
            </div>

            <div className="flex gap-2 border-l pl-4 border-slate-100">
              {filtered.length > 0 && !allFilteredSelected && (
                <button 
                  onClick={selectAllFiltered}
                  className="px-6 py-4 bg-blue-50 text-blue-700 rounded-full text-xs font-black uppercase flex items-center gap-2 hover:bg-blue-600 hover:text-white transition active:scale-95 border-2 border-blue-100 shadow-sm"
                  title="Seleccionar todos os itens filtrados"
                >
                  <PlusCircle size={18}/> Seleccionar Filtrados
                </button>
              )}
              {props.project.selectedEquipmentIds.length > 0 && (
                <button 
                  onClick={clearAllSelections}
                  className="px-6 py-4 bg-red-50 text-red-600 rounded-full text-xs font-black uppercase flex items-center gap-2 hover:bg-red-600 hover:text-white transition active:scale-95 border-2 border-red-100 shadow-sm"
                  title="Limpar toda a selecção actual"
                >
                  <Trash2 size={18}/> Limpar
                </button>
              )}
            </div>
          </div>
        </div>

        {showAdvancedFilters && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 pt-6 border-t border-slate-100 animate-in fade-in slide-in-from-top-4">
            <div className="space-y-2"><label className="text-[9px] font-black uppercase text-slate-400">Marca</label><select value={props.brandFilter} onChange={e => props.setBrandFilter(e.target.value)} className="w-full p-3 bg-slate-50 border-none rounded-xl text-xs font-bold focus:ring-2 ring-blue-500 transition">{['All', ...BRANDS].map(b => <option key={b} value={b}>{b}</option>)}</select></div>
            <div className="space-y-2"><label className="text-[9px] font-black uppercase text-slate-400">Refrigerante</label><select value={props.refrigerantFilter} onChange={e => props.setRefrigerantFilter(e.target.value)} className="w-full p-3 bg-slate-50 border-none rounded-xl text-xs font-bold focus:ring-2 ring-blue-500 transition">{['All', ...Object.values(Refrigerant)].map(r => <option key={r} value={r}>{r}</option>)}</select></div>
            <div className="space-y-2"><label className="text-[9px] font-black uppercase text-slate-400">Compressor</label><select value={props.compressorFilter} onChange={e => props.setCompressorFilter(e.target.value)} className="w-full p-3 bg-slate-50 border-none rounded-xl text-xs font-bold focus:ring-2 ring-blue-500 transition">{['All', ...Object.values(CompressorType)].map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div className="space-y-2"><label className="text-[9px] font-black uppercase text-slate-400">Condensação</label><select value={props.condensationFilter} onChange={e => props.setCondensationFilter(e.target.value)} className="w-full p-3 bg-slate-50 border-none rounded-xl text-xs font-bold focus:ring-2 ring-blue-500 transition">{['All', ...Object.values(CondensationType)].map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div className="space-y-2"><label className="text-[9px] font-black uppercase text-slate-400">Modo</label><select value={props.modeFilter} onChange={e => props.setModeFilter(e.target.value)} className="w-full p-3 bg-slate-50 border-none rounded-xl text-xs font-bold focus:ring-2 ring-blue-500 transition"><option value="All">Todos</option><option value="CoolingOnly">Apenas Frio</option><option value="HeatingOnly">Apenas Calor</option><option value="HeatPump">Bomba Calor</option></select></div>
          </div>
        )}
      </header>

      <div className="bg-white rounded-[50px] border shadow-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b tracking-widest">
            <tr>
              <th className="px-10 py-8">Equipamento</th>
              <th className="px-6 py-8 text-center">Arrefecimento (kW)</th>
              <th className="px-6 py-8 text-center">Aquecimento (kW)</th>
              <th className="px-4 py-8 text-center">ESEER</th>
              <th className="px-4 py-8 text-center">SCOP</th>
              <th className="px-4 py-8 text-center">Condensação</th>
              <th className="px-6 py-8 text-center">Gamas Operação</th>
              <th className="px-10 py-8 text-right">Acção</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length > 0 ? filtered.map(item => {
              const isHeatPump = item.heatingCapacity > 0;
              const isCoolingOnly = item.heatingCapacity === 0;
              const isHeatingOnly = item.coolingCapacity === 0;

              return (
                <tr key={item.id} className="hover:bg-slate-50 transition group">
                  <td className="px-10 py-8">
                    <div>
                      <span className="font-black text-slate-900 text-lg block leading-tight">{item.brand}</span>
                      <span className="text-[9px] text-slate-400 font-black uppercase tracking-tighter mt-1 block">
                        {item.model} • {item.refrigerant} • {item.compressorType}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-8 text-center">
                    {!isHeatingOnly ? (
                      <div>
                        <span className="font-black text-xl text-blue-600">{item.coolingCapacity.toFixed(1)}</span>
                        <span className="text-[10px] font-black ml-1">kWf</span>
                      </div>
                    ) : (
                      <span className="text-slate-300 font-black">-</span>
                    )}
                  </td>
                  <td className="px-6 py-8 text-center">
                    {isHeatPump || isHeatingOnly ? (
                      <div>
                        <span className="font-black text-xl text-red-600">{item.heatingCapacity.toFixed(1)}</span>
                        <span className="text-[10px] font-black ml-1">kWq</span>
                      </div>
                    ) : (
                      <span className="text-slate-300 font-black">-</span>
                    )}
                  </td>
                  <td className="px-4 py-8 text-center">
                    {!isHeatingOnly ? (
                      <span className="font-black text-xl text-emerald-600">{item.eseer.toFixed(2)}</span>
                    ) : (
                      <span className="text-slate-300 font-black">-</span>
                    )}
                  </td>
                  <td className="px-4 py-8 text-center">
                    {isHeatPump || isHeatingOnly ? (
                      <span className="font-black text-xl text-indigo-600">{item.scop.toFixed(2)}</span>
                    ) : (
                      <span className="text-slate-300 font-black">-</span>
                    )}
                  </td>
                  <td className="px-4 py-8 text-center">
                    <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase flex items-center justify-center gap-1 mx-auto w-fit ${item.condensationType === CondensationType.AIR ? 'bg-blue-100 text-blue-700' : 'bg-cyan-100 text-cyan-700'}`}>
                      {item.condensationType === CondensationType.AIR ? <Wind size={10} /> : <Droplets size={10} />}
                      {item.condensationType}
                    </span>
                  </td>
                  <td className="px-6 py-8">
                    <div className="flex flex-col gap-2 items-center">
                      <div className="flex items-center gap-2 bg-blue-50/50 px-3 py-1.5 rounded-xl border border-blue-100/50 w-32">
                        <ThermometerSnowflake size={14} className="text-blue-600 shrink-0" />
                        <span className="text-[10px] font-black text-slate-700">{item.minFluidTemp}/{item.maxFluidTemp}ºC</span>
                      </div>
                      <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 w-32">
                        <Wind size={14} className="text-slate-400 shrink-0" />
                        <span className="text-[10px] font-black text-slate-700">{item.minAmbientTemp}/{item.maxAmbientTemp}ºC</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-8 text-right">
                    <button 
                      onClick={() => toggleSelection(item.id)} 
                      className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase transition shadow-lg ${props.project.selectedEquipmentIds.includes(item.id) ? 'bg-red-500 text-white shadow-red-200' : 'bg-slate-100 text-slate-600 hover:bg-blue-600 hover:text-white hover:shadow-blue-200'}`}
                    >
                      {props.project.selectedEquipmentIds.includes(item.id) ? 'Remover' : 'Seleccionar'}
                    </button>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={8} className="px-10 py-20 text-center">
                  <div className="flex flex-col items-center gap-4 opacity-30 grayscale">
                    <Box size={64} />
                    <p className="font-black uppercase tracking-widest text-slate-400 italic">Nenhum equipamento encontrado com os filtros actuais.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Resumo Rodapé de Seleccionados */}
      {selectedUnits.length > 0 && (
        <div className="bg-white p-10 rounded-[50px] border shadow-2xl space-y-8 animate-in slide-in-from-bottom-4">
          <div className="flex justify-between items-center border-b pb-6">
            <h3 className="text-2xl font-black text-slate-900 flex items-center gap-4 uppercase tracking-tighter">
              <Box size={28} className="text-blue-600" />
              Resumo da Selecção Técnica
            </h3>
            <span className="bg-blue-600 text-white px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest">
              {selectedUnits.length} {selectedUnits.length === 1 ? 'Unidade' : 'Unidades'}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {selectedUnits.map(u => (
              <div key={u.id} className="bg-slate-50 p-6 rounded-[30px] border border-slate-100 relative group overflow-hidden hover:bg-white hover:shadow-xl transition-all">
                <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => toggleSelection(u.id)}
                    className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-600 hover:text-white transition"
                    title="Remover"
                  >
                    <XCircle size={16} />
                  </button>
                </div>
                <div className="flex flex-col gap-4">
                  <div>
                    <span className="text-[10px] font-black uppercase text-blue-600 block tracking-widest">{u.brand}</span>
                    <span className="text-sm font-black text-slate-900 line-clamp-1">{u.model}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase">Capacidade</span>
                      <div className="flex items-center gap-2">
                        <Zap size={14} className="text-amber-500" />
                        <span className="text-lg font-black text-slate-800">{Math.max(u.coolingCapacity, u.heatingCapacity).toFixed(0)} kW</span>
                      </div>
                    </div>
                    <div className="text-right">
                       <span className="text-[9px] font-bold text-slate-400 block uppercase">Eficiência</span>
                       <span className="text-lg font-black text-emerald-600">{u.eseer.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <button 
              onClick={() => props.setProject(p => ({ ...p, activeTab: 'analysis' }))} /* Mock logic if activeTab was in project */
              className="flex items-center gap-2 px-10 py-5 bg-slate-900 text-white rounded-[25px] font-black uppercase text-xs tracking-widest hover:bg-blue-600 transition shadow-xl"
            >
              Prosseguir para Análise <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      <div className="bg-slate-900 p-8 rounded-[40px] text-white flex items-center justify-between shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
          <Info size={150} />
        </div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="bg-blue-600 p-3 rounded-2xl">
            <Info size={24} />
          </div>
          <div>
            <h4 className="font-black uppercase text-xs tracking-widest">Aviso de Compatibilidade</h4>
            <p className="text-[10px] text-slate-400 font-medium max-w-xl">As gamas de temperatura variam conforme o modelo e fluido frigorigéneo seleccionado. Verifique sempre o catálogo técnico oficial antes da adjudicação.</p>
          </div>
        </div>
        <div className="flex gap-4 relative z-10">
           <div className="text-right border-l-4 border-blue-600 pl-6">
              <span className="block text-[9px] font-black uppercase text-slate-500 mb-1 tracking-widest">Seleccionados / Filtro</span>
              <span className="text-2xl font-black text-blue-400">{selectedUnits.length} / {filtered.length}</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default SelectionTab;
