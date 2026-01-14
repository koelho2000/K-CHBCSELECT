
import React, { useState, useCallback, useEffect } from 'react';
import Layout from './components/Layout';
import { 
  ProjectData, 
  EquipmentType, 
  Refrigerant, 
  CompressorType, 
  WeatherDataPoint
} from './types';
import { 
  OEM_DATABASE, 
  DEFAULT_WEEKDAY_LOAD, 
  DEFAULT_WEEKEND_LOAD,
  PT_DISTRICTS_CLIMATE
} from './constants';

// Tab Components
import HomeTab from './components/tabs/HomeTab';
import ConfigTab from './components/tabs/ConfigTab';
import ClimateTab from './components/tabs/ClimateTab';
import LoadsTab from './components/tabs/LoadsTab';
import SelectionTab from './components/tabs/SelectionTab';
import AnalysisTab from './components/tabs/AnalysisTab';
import PerformanceTab from './components/tabs/PerformanceTab';
import SheetTab from './components/tabs/SheetTab';
import ReportTab from './components/tabs/ReportTab';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('home');
  // State lifted from AnalysisTab to App level to sync between Report/Sheet
  const [selectedReportUnitId, setSelectedReportUnitId] = useState<string | null>(null);
  
  // Selection Filters
  const [brandFilter, setBrandFilter] = useState('All');
  const [refrigerantFilter, setRefrigerantFilter] = useState('All');
  const [compressorFilter, setCompressorFilter] = useState('All');
  const [condensationFilter, setCondensationFilter] = useState('All');
  const [modeFilter, setModeFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [intelligentFilterEnabled, setIntelligentFilterEnabled] = useState(true);

  const [project, setProject] = useState<ProjectData>({
    projectName: 'Projecto K-CHBC',
    workReference: 'FO-00-00',
    clientName: 'Cliente Industrial',
    installationName: 'Instalação Norte',
    technicianName: 'José Coelho (PQ00851 | OET 2321)',
    companyName: 'Koelho2000 Engenharia',
    auditCompany: 'K2000 Auditoria',
    location: 'Lisboa, Portugal',
    equipmentType: EquipmentType.AIR_COOLED_CHILLER,
    refrigerant: Refrigerant.R134a,
    compressorType: CompressorType.SCREW,
    selectedEquipmentIds: [],
    hourlyLoads: Array(8760).fill(0),
    peakPower: 800,
    targetTemperature: 7,
    targetEfficiency: 'High',
    loadDefinitionMode: 'Profiles',
    dailyProfiles: {
      weekday: [...DEFAULT_WEEKDAY_LOAD],
      weekend: [...DEFAULT_WEEKEND_LOAD]
    },
    weeklyProfile: [1, 1, 1, 1, 1, 0.4, 0.2],
    monthlyProfile: [0.6, 0.5, 0.7, 0.8, 0.9, 1.0, 1.0, 0.9, 0.8, 0.7, 0.6, 0.5],
    budget: 0,
    instrumentation: ['Sonda Temp PT100', 'Fluxostato'],
    valves: ['Válvula de 3 vias', 'Válvula de equilíbrio'],
    controlType: 'BMS Integrado',
    weatherData: [],
    selectedDistrict: 'Lisboa',
    selectedProfileName: 'Padrão (Custom)',
    electricityPrice: 0.15
  });

  const calculateWetBulb = useCallback((tbs: number, rh: number) => {
    return tbs * Math.atan(0.151977 * Math.pow(rh + 8.313659, 0.5)) +
           Math.atan(tbs + rh) - Math.atan(rh - 1.676331) +
           0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh) - 4.686035;
  }, []);

  const generateWeather = useCallback((district: string) => {
    const info = PT_DISTRICTS_CLIMATE[district];
    if (!info) return;
    const data: WeatherDataPoint[] = [];
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let hourCounter = 0;
    for (let m = 0; m < 12; m++) {
      const seasonalBase = Math.cos((m - 7) * Math.PI / 6);
      const monthAvgT = info.minT + (info.maxT - info.minT) * (seasonalBase + 1) / 2;
      for (let d = 0; d < daysInMonth[m]; d++) {
        for (let h = 0; h < 24; h++) {
          const dailyVar = Math.sin((h - 8) * Math.PI / 12);
          const tbsVal = monthAvgT + (5 * dailyVar) + (Math.random() * 2 - 1);
          const rhVal = info.avgRH - (15 * dailyVar) + (Math.random() * 4 - 2);
          const tbs = parseFloat(tbsVal.toFixed(1));
          const rh = Math.min(100, Math.max(0, parseFloat(rhVal.toFixed(1))));
          const tbh = parseFloat(calculateWetBulb(tbs, rh).toFixed(1));
          
          data.push({
            hour: hourCounter++,
            month: m + 1,
            day: d + 1,
            tbs: tbs,
            rh: rh,
            tbh: tbh
          });
        }
      }
    }
    setProject(prev => ({ ...prev, weatherData: data, selectedDistrict: district }));
  }, [calculateWetBulb]);

  useEffect(() => {
    if (project.weatherData.length === 0) {
      generateWeather('Lisboa');
    }
  }, [generateWeather, project.weatherData.length]);

  const handleSave = () => {
    const data = JSON.stringify(project);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `K-CHBC_${project.projectName.replace(/\s+/g, '_')}.json`;
    a.click();
  };

  const handleOpen = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event: any) => {
        try {
          const imported = JSON.parse(event.target.result);
          setProject(imported);
        } catch (err) { alert("Erro ao importar ficheiro."); }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      onNew={() => window.location.reload()} 
      onOpen={handleOpen} 
      onSave={handleSave}
    >
      {activeTab === 'home' && <HomeTab project={project} setActiveTab={setActiveTab} />}
      {activeTab === 'config' && <ConfigTab project={project} setProject={setProject} setActiveTab={setActiveTab} selectedReportUnitId={selectedReportUnitId} />}
      {activeTab === 'climate' && <ClimateTab project={project} setProject={setProject} generateWeather={generateWeather} />}
      {activeTab === 'loads' && <LoadsTab project={project} setProject={setProject} />}
      {activeTab === 'selection' && (
        <SelectionTab 
          project={project} 
          setProject={setProject}
          brandFilter={brandFilter} setBrandFilter={setBrandFilter}
          refrigerantFilter={refrigerantFilter} setRefrigerantFilter={setRefrigerantFilter}
          compressorFilter={compressorFilter} setCompressorFilter={setCompressorFilter}
          condensationFilter={condensationFilter} setCondensationFilter={setCondensationFilter}
          modeFilter={modeFilter} setModeFilter={setModeFilter}
          searchTerm={searchTerm} setSearchTerm={setSearchTerm}
          intelligentFilterEnabled={intelligentFilterEnabled} setIntelligentFilterEnabled={setIntelligentFilterEnabled}
        />
      )}
      {activeTab === 'analysis' && (
        <AnalysisTab 
          project={project} 
          selectedReportUnitId={selectedReportUnitId} 
          setSelectedReportUnitId={setSelectedReportUnitId} 
        />
      )}
      {activeTab === 'performance' && (
        <PerformanceTab 
          project={project} 
          selectedReportUnitId={selectedReportUnitId} 
        />
      )}
      {activeTab === 'selectionSheet' && (
        <SheetTab 
          project={project} 
          selectedReportUnitId={selectedReportUnitId} 
        />
      )}
      {activeTab === 'report' && <ReportTab project={project} selectedReportUnitId={selectedReportUnitId} />}
    </Layout>
  );
};

export default App;
