
import React from 'react';
import { 
  Home, 
  Settings, 
  Activity, 
  Database, 
  FileText, 
  BarChart2, 
  Layers,
  Save,
  FolderOpen,
  FilePlus,
  ExternalLink,
  ClipboardList
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, onNew, onOpen, onSave }) => {
  const tabs = [
    { id: 'home', label: 'Início', icon: Home },
    { id: 'config', label: 'Projecto', icon: Settings },
    { id: 'loads', label: 'Cargas Térmicas', icon: Activity },
    { id: 'selection', label: 'Seleção OEM', icon: Database },
    { id: 'analysis', label: 'Eficiência & ROI', icon: BarChart2 },
    { id: 'selectionSheet', label: 'Folha de Dados', icon: ClipboardList },
    { id: 'report', label: 'Relatório IA', icon: FileText },
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col no-print">
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-tight text-blue-400 italic">K-CHBC SELECT</h1>
          <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-black">Professional Engineering</p>
        </div>

        <nav className="flex-1 mt-4 px-3 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center px-4 py-3 text-sm font-bold rounded-xl transition-all ${
                  activeTab === tab.id 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="mr-3 h-5 w-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="p-6 border-t border-slate-800 space-y-4">
          <div className="flex gap-2">
            <button onClick={onNew} title="Novo" className="flex-1 p-3 bg-slate-800 rounded-xl hover:bg-slate-700 transition active:scale-95"><FilePlus size={18} className="mx-auto" /></button>
            <button onClick={onOpen} title="Abrir" className="flex-1 p-3 bg-slate-800 rounded-xl hover:bg-slate-700 transition active:scale-95"><FolderOpen size={18} className="mx-auto" /></button>
            <button onClick={onSave} title="Gravar" className="flex-1 p-3 bg-blue-600 rounded-xl hover:bg-blue-500 transition active:scale-95 shadow-lg shadow-blue-600/30"><Save size={18} className="mx-auto" /></button>
          </div>
          <div className="pt-2 text-[9px] text-slate-500 text-center leading-relaxed">
            <p className="font-black text-slate-400 mb-1">Eng. José Coelho</p>
            <p>PQ00851 | OET 2321</p>
            <p>Sintra, Portugal</p>
            <a href="https://www.koelho2000.com" target="_blank" className="hover:text-blue-400 flex items-center justify-center gap-1 mt-2 text-blue-500 font-bold">
              www.koelho2000.com <ExternalLink size={10} />
            </a>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-[#fafbfc]">
        <div className="max-w-7xl mx-auto p-12">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
