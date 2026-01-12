
import { OEMEquipment, Refrigerant, CompressorType, CondensationType, EquipmentType } from './types';

// Exported brands to be used in filtering and UI
export const BRANDS = ['Carrier', 'Daikin', 'Mitsubishi', 'Trane', 'AERMEC', 'Systemair'];

const generateMockData = (): OEMEquipment[] => {
  const data: OEMEquipment[] = [];
  
  BRANDS.forEach(brand => {
    // Generate Standard Chillers
    for (let i = 1; i <= 10; i++) {
      const coolingCap = 150 + Math.random() * 800;
      const typeSeed = Math.random();
      
      let type: EquipmentType = EquipmentType.AIR_COOLED_CHILLER;
      let condensationType = CondensationType.AIR;
      let maxFluidTemp = 18;
      let minFluidTemp = -10;
      let minAmbientTemp = -15;
      let maxAmbientTemp = 48;
      let refrigerant = Refrigerant.R134a;
      let compressor = CompressorType.SCREW;

      if (typeSeed > 0.5) {
        type = EquipmentType.WATER_COOLED_CHILLER;
        condensationType = CondensationType.WATER;
        compressor = CompressorType.CENTRIFUGAL;
        refrigerant = Refrigerant.R513A;
      }

      data.push({
        id: `${brand.toLowerCase()}-chiller-${i}`,
        brand,
        model: `${brand === 'Carrier' ? '30XB' : brand === 'Daikin' ? 'EWAD' : 'NX'}-${Math.round(coolingCap)}`,
        condensationType,
        coolingCapacity: coolingCap,
        heatingCapacity: 0,
        eer: 3.1 + Math.random() * 1.2,
        cop: 0,
        eseer: 4.5 + Math.random() * 2.5,
        refrigerant,
        compressorType: compressor,
        dimensions: "3500x2200x2400",
        weight: 4500,
        noiseLevel: 65,
        price: Math.round(40000 + coolingCap * 160),
        minFluidTemp,
        maxFluidTemp,
        minAmbientTemp,
        maxAmbientTemp,
        efficiencyCurve: [
          { x: 25, y: 0.75 }, { x: 50, y: 0.92 }, { x: 75, y: 1.0 }, { x: 100, y: 0.88 }
        ]
      });
    }

    // SPECIAL ADDITION: High Temperature Heat Pumps (60ºC, 70ºC, 80ºC+)
    // These are specific market-aligned solutions
    const highTempSolutions = [
      { temp: 65, label: 'HT65', refr: Refrigerant.R410A, comp: CompressorType.SCROLL },
      { temp: 75, label: 'VHT75', refr: Refrigerant.R290, comp: CompressorType.RECIPROCATING },
      { temp: 82, label: 'UHT82', refr: Refrigerant.R1234ze, comp: CompressorType.SCREW },
      { temp: 90, label: 'Q-TON-CO2', refr: Refrigerant.R134a, comp: CompressorType.RECIPROCATING } // Simulated CO2 as R134a for now as per enum
    ];

    highTempSolutions.forEach((sol, idx) => {
      const cap = 50 + Math.random() * 400;
      let model = "";
      
      // Market alignment for models
      if (brand === 'Carrier') model = sol.temp > 75 ? `61XWH-ZE-${Math.round(cap)}` : `61AF-${Math.round(cap)}`;
      else if (brand === 'Daikin') model = sol.temp > 70 ? `EWHT-P-${Math.round(cap)}` : `EWAH-TZ-${Math.round(cap)}`;
      else if (brand === 'Mitsubishi') model = sol.temp > 80 ? `Q-TON-ESA-${Math.round(cap)}` : `CAHV-P-${Math.round(cap)}`;
      else if (brand === 'Trane') model = sol.temp > 75 ? `RHTA-Ex-${Math.round(cap)}` : `RTWD-HiTemp-${Math.round(cap)}`;
      else model = `${brand}-VHT-${sol.temp}-${Math.round(cap)}`;

      data.push({
        id: `${brand.toLowerCase()}-ht-hp-${sol.temp}-${idx}`,
        brand,
        model,
        condensationType: CondensationType.WATER,
        coolingCapacity: cap * 0.7, // Some recovery capacity
        heatingCapacity: cap,
        eer: 2.5 + Math.random(),
        cop: 3.2 + (sol.temp < 70 ? 0.8 : 0), // Higher efficiency at lower hot water temps
        eseer: 3.5 + Math.random(),
        refrigerant: sol.refr,
        compressorType: sol.comp,
        dimensions: "2200x1200x2000",
        weight: 1800,
        noiseLevel: 62,
        price: Math.round(55000 + cap * 250),
        minFluidTemp: 30, // Entrance temp
        maxFluidTemp: sol.temp, // Target temp
        minAmbientTemp: 5,
        maxAmbientTemp: 40,
        efficiencyCurve: [
          { x: 25, y: 0.82 }, { x: 50, y: 0.95 }, { x: 75, y: 1.0 }, { x: 100, y: 0.90 }
        ]
      });
    });
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
