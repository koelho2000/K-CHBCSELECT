
import { OEMEquipment, Refrigerant, CompressorType, CondensationType, EquipmentType } from './types';

const BRANDS = ['Carrier', 'Daikin', 'Mitsubishi', 'Trane', 'AERMEC', 'Systemair'];

const generateMockData = (): OEMEquipment[] => {
  const data: OEMEquipment[] = [];
  
  BRANDS.forEach(brand => {
    for (let i = 1; i <= 20; i++) {
      const coolingCap = 100 + Math.random() * 1200;
      const typeSeed = Math.random();
      
      let type: EquipmentType = EquipmentType.AIR_COOLED_CHILLER;
      let condensationType = CondensationType.AIR;
      let maxFluidTemp = 15;
      let minFluidTemp = -10;
      let minAmbientTemp = -15;
      let maxAmbientTemp = 48;
      let refrigerant = Refrigerant.R134a;
      let compressor = CompressorType.SCREW;

      if (typeSeed > 0.8) {
        type = EquipmentType.HIGH_TEMP_HEAT_PUMP;
        condensationType = CondensationType.WATER;
        maxFluidTemp = 75 + Math.floor(Math.random() * 15);
        minFluidTemp = 35;
        minAmbientTemp = 5;
        maxAmbientTemp = 35; 
        refrigerant = Math.random() > 0.5 ? Refrigerant.R290 : Refrigerant.R1234ze;
        compressor = CompressorType.RECIPROCATING;
      } else if (typeSeed > 0.6) {
        type = EquipmentType.HEAT_PUMP;
        condensationType = CondensationType.AIR;
        maxFluidTemp = 55;
        minFluidTemp = -15;
        minAmbientTemp = -20;
        maxAmbientTemp = 45;
        refrigerant = Refrigerant.R32;
        compressor = CompressorType.SCROLL;
      } else if (typeSeed > 0.4) {
        type = EquipmentType.WATER_COOLED_CHILLER;
        condensationType = CondensationType.WATER;
        maxFluidTemp = 18;
        minFluidTemp = -8;
        minAmbientTemp = 10;
        maxAmbientTemp = 40;
        refrigerant = Refrigerant.R513A;
        compressor = CompressorType.CENTRIFUGAL;
      } else if (typeSeed > 0.2) {
        type = EquipmentType.TWO_STAGE_CHILLER;
        condensationType = CondensationType.WATER;
        refrigerant = Refrigerant.R134a;
        compressor = CompressorType.TURBOCOR;
      }

      let model = "";
      const capSuffix = Math.round(coolingCap);
      switch(brand) {
        case 'Carrier': model = `${type === EquipmentType.HIGH_TEMP_HEAT_PUMP ? '61CHT' : '30XW'}-${capSuffix}`; break;
        case 'Daikin': model = `${type === EquipmentType.HIGH_TEMP_HEAT_PUMP ? 'EWHT' : 'EWAD'}-${capSuffix}-PRO`; break;
        case 'Mitsubishi': model = `${type === EquipmentType.HIGH_TEMP_HEAT_PUMP ? 'MEHP' : 'NX-W'}-${capSuffix}`; break;
        case 'Trane': model = `${type === EquipmentType.HIGH_TEMP_HEAT_PUMP ? 'RHTA' : 'RTWD'}-${capSuffix}`; break;
        case 'AERMEC': model = `${type === EquipmentType.HIGH_TEMP_HEAT_PUMP ? 'HWW' : 'NSG'}-${capSuffix}`; break;
        case 'Systemair': model = `${type === EquipmentType.HIGH_TEMP_HEAT_PUMP ? 'SYSHI' : 'SYSCROLL'}-${capSuffix}`; break;
        default: model = `${brand}-${capSuffix}`;
      }

      data.push({
        id: `${brand.toLowerCase()}-${type.toLowerCase().replace(/\s/g, '-')}-${i}`,
        brand,
        model,
        condensationType,
        coolingCapacity: coolingCap,
        heatingCapacity: type.includes('Heat Pump') ? coolingCap * (1.1 + Math.random() * 0.4) : 0,
        eer: 2.8 + Math.random() * 1.8,
        cop: 3.2 + Math.random() * 1.5,
        eseer: 4.2 + Math.random() * 3.5,
        refrigerant,
        compressorType: compressor,
        dimensions: `${Math.round(2000 + Math.random() * 3000)}x${Math.round(1500 + Math.random() * 800)}x${Math.round(2000 + Math.random() * 1000)}`,
        weight: Math.round(1200 + Math.random() * 6000),
        noiseLevel: 58 + Math.round(Math.random() * 20),
        price: Math.round(45000 + (coolingCap * 180) + (type === EquipmentType.HIGH_TEMP_HEAT_PUMP ? 25000 : 0)),
        minFluidTemp,
        maxFluidTemp,
        minAmbientTemp,
        maxAmbientTemp,
        efficiencyCurve: [
          { x: 25, y: 0.7 + Math.random() * 0.1 },
          { x: 50, y: 0.9 + Math.random() * 0.05 },
          { x: 75, y: 1.0 },
          { x: 100, y: 0.85 + Math.random() * 0.05 }
        ]
      });
    }
  });
  return data;
};

export const OEM_DATABASE = generateMockData();

export const DEFAULT_WEEKDAY_LOAD = [
  0.2, 0.2, 0.2, 0.2, 0.3, 0.5, 0.7, 0.9, 1.0, 1.0, 1.0, 1.0, 
  0.9, 0.9, 1.0, 1.0, 0.9, 0.7, 0.5, 0.4, 0.3, 0.2, 0.2, 0.2
];
export const DEFAULT_WEEKEND_LOAD = [
  0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.2, 0.2, 0.3, 0.3, 0.3, 0.3, 
  0.3, 0.3, 0.3, 0.3, 0.3, 0.2, 0.2, 0.1, 0.1, 0.1, 0.1, 0.1
];

export interface StandardProfile {
  name: string;
  weekday: number[];
  weekend: number[];
  weekly: number[];
  monthly: number[];
}

const CONSTANT_YEAR = Array(12).fill(1);
const SEASONAL_YEAR = [0.6, 0.5, 0.7, 0.8, 0.9, 1.0, 1.0, 0.9, 0.8, 0.7, 0.6, 0.5];

export const STANDARD_PROFILES: StandardProfile[] = [
  {
    name: "24h Todos os dias",
    weekday: Array(24).fill(1),
    weekend: Array(24).fill(1),
    weekly: Array(7).fill(1),
    monthly: Array(12).fill(1)
  },
  {
    name: "24h Dias úteis",
    weekday: Array(24).fill(1),
    weekend: Array(24).fill(0),
    weekly: [1, 1, 1, 1, 1, 0, 0],
    monthly: Array(12).fill(1)
  },
  {
    name: "8h Dias úteis (09-17h)",
    weekday: Array(24).fill(0).map((_, i) => (i >= 9 && i < 17 ? 1 : 0)),
    weekend: Array(24).fill(0),
    weekly: [1, 1, 1, 1, 1, 0, 0],
    monthly: SEASONAL_YEAR
  },
  {
    name: "16h Dias úteis (07-23h)",
    weekday: Array(24).fill(0).map((_, i) => (i >= 7 && i < 23 ? 1 : 0)),
    weekend: Array(24).fill(0),
    weekly: [1, 1, 1, 1, 1, 0, 0],
    monthly: SEASONAL_YEAR
  },
  {
    name: "Comercial (08-20h)",
    weekday: Array(24).fill(0).map((_, i) => (i >= 8 && i < 20 ? 1 : 0)),
    weekend: Array(24).fill(0).map((_, i) => (i >= 9 && i < 13 ? 0.5 : 0)),
    weekly: [1, 1, 1, 1, 1, 1, 0],
    monthly: SEASONAL_YEAR
  },
  {
    name: "Data Center (Constante 100%)",
    weekday: Array(24).fill(1),
    weekend: Array(24).fill(1),
    weekly: Array(7).fill(1),
    monthly: Array(12).fill(1)
  },
  {
    name: "Hotelaria (Picos M/N)",
    weekday: Array(24).fill(0.3).map((v, i) => {
      if ((i >= 7 && i < 10) || (i >= 19 && i < 23)) return 1;
      if (i >= 10 && i < 19) return 0.6;
      return v;
    }),
    weekend: Array(24).fill(0.4).map((v, i) => {
      if (i >= 8 && i < 23) return 1;
      return v;
    }),
    weekly: Array(7).fill(1),
    monthly: SEASONAL_YEAR
  },
  {
    name: "Hospitalar (24h Dinâmico)",
    weekday: Array(24).fill(0.6).map((v, i) => (i >= 8 && i < 20 ? 1 : v)),
    weekend: Array(24).fill(0.6).map((v, i) => (i >= 9 && i < 18 ? 0.8 : v)),
    weekly: Array(7).fill(1),
    monthly: CONSTANT_YEAR
  },
  {
    name: "Escolar (08-18h)",
    weekday: Array(24).fill(0).map((_, i) => (i >= 8 && i < 18 ? 1 : 0)),
    weekend: Array(24).fill(0),
    weekly: [1, 1, 1, 1, 1, 0, 0],
    monthly: [0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.2, 0.2, 1.0, 1.0, 1.0, 1.0]
  },
  {
    name: "Residencial (Manhã/Noite)",
    weekday: Array(24).fill(0.2).map((v, i) => {
      if (i >= 6 && i < 9) return 0.9;
      if (i >= 18 && i < 23) return 1.0;
      return v;
    }),
    weekend: Array(24).fill(0.4).map((v, i) => (i >= 9 && i < 23 ? 1.0 : v)),
    weekly: Array(7).fill(1),
    monthly: SEASONAL_YEAR
  }
];
