
import { OEMEquipment, Refrigerant, CompressorType, CondensationType, EquipmentType } from './types';

// Exported brands to be used in filtering and UI
export const BRANDS = ['Carrier', 'Daikin', 'Mitsubishi', 'Trane', 'AERMEC', 'Systemair'];

const generateMockData = (): OEMEquipment[] => {
  const data: OEMEquipment[] = [];
  
  BRANDS.forEach(brand => {
    // 1. STANDARD CHILLERS (Mostly Air-Cooled)
    for (let i = 1; i <= 5; i++) {
      const coolingCap = 200 + Math.random() * 900;
      const condensationType = Math.random() > 0.3 ? CondensationType.AIR : CondensationType.WATER;
      
      let refrigerant = Refrigerant.R134a;
      let compressor = CompressorType.SCREW;

      if (condensationType === CondensationType.WATER) {
        compressor = CompressorType.CENTRIFUGAL;
        refrigerant = Refrigerant.R513A;
      }

      data.push({
        id: `${brand.toLowerCase()}-chiller-std-${i}`,
        brand,
        model: `${brand === 'Carrier' ? '30XB' : brand === 'Daikin' ? 'EWAD' : brand === 'Trane' ? 'RCAF' : 'NX'}-${Math.round(coolingCap)}`,
        condensationType,
        coolingCapacity: coolingCap,
        heatingCapacity: 0,
        eer: 3.1 + Math.random() * 0.8,
        cop: 0,
        eseer: 4.8 + Math.random() * 1.5,
        refrigerant,
        compressorType: compressor,
        dimensions: "4200x2250x2500",
        weight: 5200,
        noiseLevel: 67,
        price: Math.round(45000 + coolingCap * 175),
        minFluidTemp: -8,
        maxFluidTemp: 20,
        minAmbientTemp: -10,
        maxAmbientTemp: 50,
        efficiencyCurve: [
          { x: 25, y: 0.72 }, { x: 50, y: 0.90 }, { x: 75, y: 1.0 }, { x: 100, y: 0.85 }
        ]
      });
    }

    // 2. AIR-COOLED HEAT PUMPS (Air-to-Water Reversible)
    // Expanded set specifically for Air-Cooled as requested
    const airHPSeries = [
      { cap: 60, refr: Refrigerant.R32, comp: CompressorType.SCROLL, tag: 'Compact' },
      { cap: 130, refr: Refrigerant.R32, comp: CompressorType.SCROLL, tag: 'Mid' },
      { cap: 320, refr: Refrigerant.R410A, comp: CompressorType.SCROLL, tag: 'Power' },
      { cap: 580, refr: Refrigerant.R1234ze, comp: CompressorType.SCREW, tag: 'Heavy' },
      { cap: 850, refr: Refrigerant.R513A, comp: CompressorType.SCREW, tag: 'Industrial' }
    ];

    airHPSeries.forEach((sol, idx) => {
      const cap = sol.cap * (0.9 + Math.random() * 0.2);
      let model = "";
      
      // Brand-specific real-world series mapping
      if (brand === 'Carrier') model = sol.cap > 400 ? `30XQ-${Math.round(cap)}` : `30RQ-${Math.round(cap)}`;
      else if (brand === 'Daikin') model = `EWYT-${Math.round(cap)}-B-XL`;
      else if (brand === 'Mitsubishi') model = `MEHP-iS-G07-${Math.round(cap)}`;
      else if (brand === 'Trane') model = `CXAF-${Math.round(cap)}-HE`;
      else if (brand === 'AERMEC') model = `NRP-${Math.round(cap)}-HighEff`;
      else model = `${brand}-AIR-HP-${Math.round(cap)}`;

      data.push({
        id: `${brand.toLowerCase()}-air-hp-ext-${idx}`,
        brand,
        model,
        condensationType: CondensationType.AIR,
        coolingCapacity: cap * 0.92, 
        heatingCapacity: cap,
        eer: 2.9 + Math.random() * 0.6,
        cop: 3.3 + Math.random() * 0.7,
        eseer: 4.1 + Math.random() * 1.2,
        refrigerant: sol.refr,
        compressorType: sol.comp,
        dimensions: "3200x1150x2300",
        weight: 1200 + cap * 4,
        noiseLevel: 70,
        price: Math.round(30000 + cap * 310),
        minFluidTemp: -12,
        maxFluidTemp: 60, // Modern air-cooled max temp
        minAmbientTemp: -22, // Enhanced low ambient
        maxAmbientTemp: 48,
        efficiencyCurve: [
          { x: 25, y: 0.84 }, { x: 50, y: 0.97 }, { x: 75, y: 1.0 }, { x: 100, y: 0.91 }
        ]
      });
    });

    // 3. SPECIALIZED AIR-COOLED MULTIPURPOSE (4-Pipe Simultaneous Units)
    const multiPurpose = [
      { cap: 200, refr: Refrigerant.R410A, comp: CompressorType.SCROLL },
      { cap: 450, refr: Refrigerant.R134a, comp: CompressorType.SCREW }
    ];

    multiPurpose.forEach((sol, idx) => {
      const cap = sol.cap + (Math.random() * 50);
      data.push({
        id: `${brand.toLowerCase()}-air-multi-${idx}`,
        brand,
        model: `${brand}-POLY-${Math.round(cap)}`,
        condensationType: CondensationType.AIR,
        coolingCapacity: cap,
        heatingCapacity: cap * 1.1,
        eer: 3.0,
        cop: 3.5,
        eseer: 4.5,
        refrigerant: sol.refr,
        compressorType: sol.comp,
        dimensions: "4500x2200x2500",
        weight: 3500 + cap * 2,
        noiseLevel: 72,
        price: Math.round(60000 + cap * 350),
        minFluidTemp: -5,
        maxFluidTemp: 55,
        minAmbientTemp: -15,
        maxAmbientTemp: 45,
        efficiencyCurve: [
          { x: 25, y: 0.70 }, { x: 50, y: 0.88 }, { x: 75, y: 1.0 }, { x: 100, y: 0.95 }
        ]
      });
    });

    // 4. WATER-COOLED HEAT PUMP SOLUTIONS
    const waterCooledHPSolutions = [
      { cap: 150, refr: Refrigerant.R410A, comp: CompressorType.SCROLL },
      { cap: 600, refr: Refrigerant.R134a, comp: CompressorType.SCREW }
    ];

    waterCooledHPSolutions.forEach((sol, idx) => {
      const cap = sol.cap + (Math.random() * 100);
      data.push({
        id: `${brand.toLowerCase()}-w2w-hp-std-${idx}`,
        brand,
        model: `${brand === 'Carrier' ? '61WG' : brand === 'Daikin' ? 'EWWD' : 'RTWD'}-${Math.round(cap)}`,
        condensationType: CondensationType.WATER,
        coolingCapacity: cap * 0.85, 
        heatingCapacity: cap,
        eer: 4.8 + Math.random(), 
        cop: 5.1 + Math.random(), 
        eseer: 6.2 + Math.random() * 2,
        refrigerant: sol.refr,
        compressorType: sol.comp,
        dimensions: "2000x1000x1700",
        weight: 1500 + cap * 2,
        noiseLevel: 55,
        price: Math.round(38000 + cap * 240),
        minFluidTemp: -10,
        maxFluidTemp: 65,
        minAmbientTemp: 5,
        maxAmbientTemp: 45,
        efficiencyCurve: [
          { x: 25, y: 0.76 }, { x: 50, y: 0.92 }, { x: 75, y: 1.0 }, { x: 100, y: 0.94 }
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
