
export enum EquipmentType {
  WATER_COOLED_CHILLER = 'Water-Cooled Chiller',
  AIR_COOLED_CHILLER = 'Air-Cooled Chiller',
  HEAT_PUMP = 'Heat Pump',
  TWO_STAGE_CHILLER = '2-Stage Chiller',
  HIGH_TEMP_HEAT_PUMP = 'High-Temperature Heat Pump'
}

export enum CondensationType {
  AIR = 'Ar',
  WATER = 'Água'
}

export enum Refrigerant {
  R134a = 'R134a',
  R513A = 'R513A',
  R1234ze = 'R1234ze',
  R32 = 'R32',
  R410A = 'R410A',
  R290 = 'R290'
}

export enum CompressorType {
  SCREW = 'Screw',
  SCROLL = 'Scroll',
  CENTRIFUGAL = 'Centrifugal',
  RECIPROCATING = 'Reciprocating',
  TURBOCOR = 'Turbocor'
}

export interface OEMEquipment {
  id: string;
  brand: string;
  model: string;
  condensationType: CondensationType;
  coolingCapacity: number; // kW
  heatingCapacity: number; // kW
  eer: number;
  cop: number;
  eseer: number;
  refrigerant: Refrigerant;
  compressorType: CompressorType;
  dimensions: string;
  weight: number; // kg
  noiseLevel: number; // dB(A)
  price: number;
  minFluidTemp: number; // °C
  maxFluidTemp: number; // °C
  minAmbientTemp: number; // °C
  maxAmbientTemp: number; // °C
  efficiencyCurve: { x: number; y: number }[]; // Part load vs Efficiency
}

export interface ProjectData {
  projectName: string;
  workReference: string;
  clientName: string;
  installationName: string;
  technicianName: string;
  companyName: string;
  auditCompany: string;
  location: string;
  equipmentType: EquipmentType;
  refrigerant: Refrigerant;
  compressorType: CompressorType;
  selectedEquipmentIds: string[];
  hourlyLoads: number[];
  peakPower: number; 
  targetTemperature: number; // °C
  targetEfficiency: 'Standard' | 'High' | 'Ultra';
  loadDefinitionMode: 'Profiles' | '8760h';
  dailyProfiles: {
    weekday: number[];
    weekend: number[];
  };
  weeklyProfile: number[]; // 7 values
  monthlyProfile: number[]; // 12 values
  budget: number;
  instrumentation: string[];
  valves: string[];
  controlType: string;
}
