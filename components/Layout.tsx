
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
  ExternalLink
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
    { id: 'config', label: 'Configuração', icon: Settings },
    { id: 'loads', label: 'Cargas Térmicas', icon: Activity },
    { id: 'selection', label: 'Seleção OEM', icon: Database },
    { id: 'analysis', label: 'Análise & Curvas', icon: BarChart2 },
    { id: 'report', label: 'Relatório IA', icon: FileText },
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col no-print">
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-tight text-blue-400">K-CHBCSELECT</h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold">HVAC Design System</p>
        </div>

        <nav className="flex-1 mt-4 px-3 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab.id 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="mr-3 h-5 w-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-2">
          <div className="flex gap-2">
            <button onClick={onNew} title="Novo" className="flex-1 p-2 bg-slate-800 rounded hover:bg-slate-700 transition"><FilePlus size={18} className="mx-auto" /></button>
            <button onClick={onOpen} title="Abrir" className="flex-1 p-2 bg-slate-800 rounded hover:bg-slate-700 transition"><FolderOpen size={18} className="mx-auto" /></button>
            <button onClick={onSave} title="Gravar" className="flex-1 p-2 bg-blue-600 rounded hover:bg-blue-500 transition"><Save size={18} className="mx-auto" /></button>
          </div>
          <div className="pt-2 text-[10px] text-slate-500 text-center">
            <p>Version 2.0.4 • 2024</p>
            <p>by koelho2000</p>
            <a href="https://www.koelho2000.com" target="_blank" className="hover:text-blue-400 flex items-center justify-center gap-1 mt-1">
              www.koelho2000.com <ExternalLink size={10} />
            </a>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
