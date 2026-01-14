
import { OEMEquipment, Refrigerant, CompressorType, CondensationType, EquipmentType } from './types';

// Exported brands to be used in filtering and UI
export const BRANDS = ['Carrier', 'Daikin', 'Mitsubishi', 'Trane', 'AERMEC', 'Systemair'];

export const PT_DISTRICTS_CLIMATE: Record<string, { minT: number, maxT: number, avgRH: number }> = {
  'Lisboa': { minT: 8, maxT: 32, avgRH: 65 },
  'Porto': { minT: 5, maxT: 28, avgRH: 75 },
  'Faro': { minT: 10, maxT: 35, avgRH: 60 },
  'Beja': { minT: 4, maxT: 42, avgRH: 50 },
  'Évora': { minT: 3, maxT: 40, avgRH: 55 },
  'Setúbal': { minT: 8, maxT: 34, avgRH: 68 },
  'Santarém': { minT: 5, maxT: 38, avgRH: 60 },
  'Leiria': { minT: 6, maxT: 30, avgRH: 72 },
  'Coimbra': { minT: 5, maxT: 33, avgRH: 70 },
  'Castelo Branco': { minT: 2, maxT: 39, avgRH: 55 },
  'Portalegre': { minT: 3, maxT: 38, avgRH: 58 },
  'Guarda': { minT: -2, maxT: 31, avgRH: 65 },
  'Viseu': { minT: 1, maxT: 32, avgRH: 68 },
  'Aveiro': { minT: 7, maxT: 28, avgRH: 78 },
  'Braga': { minT: 4, maxT: 32, avgRH: 70 },
  'Viana do Castelo': { minT: 6, maxT: 27, avgRH: 75 },
  'Vila Real': { minT: 1, maxT: 34, avgRH: 62 },
  'Bragança': { minT: -1, maxT: 35, avgRH: 58 },
  'Funchal': { minT: 13, maxT: 26, avgRH: 65 },
  'Ponta Delgada': { minT: 11, maxT: 25, avgRH: 80 }
};

const generateMockData = (): OEMEquipment[] => {
  const data: OEMEquipment[] = [];
  
  BRANDS.forEach(brand => {
    // Helper to estimate installation data
    const getInstallData = (cap: number, eer: number, dims: string) => {
      const absorbedPower = cap / (eer || 3);
      const amp = Math.round(absorbedPower * 1.7); // 400V estimate
      const cb = amp < 32 ? "32A" : amp < 63 ? "63A" : amp < 100 ? "100A" : amp < 160 ? "160A" : amp < 250 ? "250A" : amp < 400 ? "400A" : "630A";
      const section = amp < 25 ? 4 : amp < 35 ? 6 : amp < 50 ? 10 : amp < 70 ? 16 : amp < 95 ? 25 : amp < 125 ? 35 : amp < 160 ? 50 : amp < 200 ? 70 : 95;
      const dn = cap < 100 ? 50 : cap < 250 ? 80 : cap < 500 ? 100 : cap < 800 ? 125 : 150;
      const [l, p, h] = dims.split('x').map(Number);
      return {
        amperage: amp,
        voltage: "400V / 3Ph / 50Hz",
        cableSection: section,
        circuitBreaker: cb,
        pipeDN: dn,
        baseDimensions: `${l + 400}x${p + 400}x300`,
        refrigerantCharge: Math.round(cap * 0.15)
      };
    };

    // 1. STANDARD CHILLERS
    for (let i = 1; i <= 5; i++) {
      const coolingCap = 200 + Math.random() * 900;
      const condensationType = Math.random() > 0.3 ? CondensationType.AIR : CondensationType.WATER;
      const dims = "4200x2250x2500";
      const eer = 3.1 + Math.random() * 0.8;
      
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
        eer,
        cop: 0,
        eseer: 4.8 + Math.random() * 1.5,
        scop: 0,
        refrigerant,
        compressorType: compressor,
        dimensions: dims,
        weight: 5200,
        noiseLevel: 67,
        price: Math.round(45000 + coolingCap * 175),
        minFluidTemp: -8,
        maxFluidTemp: 20,
        minAmbientTemp: -10,
        maxAmbientTemp: 50,
        efficiencyCurve: [
          { x: 25, y: 0.72 }, { x: 50, y: 0.90 }, { x: 75, y: 1.0 }, { x: 100, y: 0.85 }
        ],
        ...getInstallData(coolingCap, eer, dims)
      });
    }

    // 2. AIR-COOLED HEAT PUMPS
    const airHPSeries = [
      { cap: 60, refr: Refrigerant.R32, comp: CompressorType.SCROLL, tag: 'Compact' },
      { cap: 130, refr: Refrigerant.R32, comp: CompressorType.SCROLL, tag: 'Mid' },
      { cap: 320, refr: Refrigerant.R410A, comp: CompressorType.SCROLL, tag: 'Power' },
      { cap: 580, refr: Refrigerant.R1234ze, comp: CompressorType.SCREW, tag: 'Heavy' },
      { cap: 850, refr: Refrigerant.R513A, comp: CompressorType.SCREW, tag: 'Industrial' }
    ];

    airHPSeries.forEach((sol, idx) => {
      const cap = sol.cap * (0.9 + Math.random() * 0.2);
      const dims = "3200x1150x2300";
      const eer = 2.9 + Math.random() * 0.6;
      let model = "";
      
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
        eer,
        cop: 3.3 + Math.random() * 0.7,
        eseer: 4.1 + Math.random() * 1.2,
        scop: 3.8 + Math.random() * 0.8,
        refrigerant: sol.refr,
        compressorType: sol.comp,
        dimensions: dims,
        weight: 1200 + cap * 4,
        noiseLevel: 70,
        price: Math.round(30000 + cap * 310),
        minFluidTemp: -12,
        maxFluidTemp: 60,
        minAmbientTemp: -22,
        maxAmbientTemp: 48,
        efficiencyCurve: [
          { x: 25, y: 0.84 }, { x: 50, y: 0.97 }, { x: 75, y: 1.0 }, { x: 100, y: 0.91 }
        ],
        ...getInstallData(cap * 0.92, eer, dims)
      });
    });

    // 3. SPECIALIZED AIR-COOLED MULTIPURPOSE
    const multiPurpose = [
      { cap: 200, refr: Refrigerant.R410A, comp: CompressorType.SCROLL },
      { cap: 450, refr: Refrigerant.R134a, comp: CompressorType.SCREW }
    ];

    multiPurpose.forEach((sol, idx) => {
      const cap = sol.cap + (Math.random() * 50);
      const dims = "4500x2200x2500";
      const eer = 3.0;
      data.push({
        id: `${brand.toLowerCase()}-air-multi-${idx}`,
        brand,
        model: `${brand}-POLY-${Math.round(cap)}`,
        condensationType: CondensationType.AIR,
        coolingCapacity: cap,
        heatingCapacity: cap * 1.1,
        eer,
        cop: 3.5,
        eseer: 4.5,
        scop: 4.2,
        refrigerant: sol.refr,
        compressorType: sol.comp,
        dimensions: dims,
        weight: 3500 + cap * 2,
        noiseLevel: 72,
        price: Math.round(60000 + cap * 350),
        minFluidTemp: -5,
        maxFluidTemp: 55,
        minAmbientTemp: -15,
        maxAmbientTemp: 45,
        efficiencyCurve: [
          { x: 25, y: 0.70 }, { x: 50, y: 0.88 }, { x: 75, y: 1.0 }, { x: 100, y: 0.95 }
        ],
        ...getInstallData(cap, eer, dims)
      });
    });

    // 4. WATER-COOLED HEAT PUMP SOLUTIONS
    const waterCooledHPSolutions = [
      { cap: 150, refr: Refrigerant.R410A, comp: CompressorType.SCROLL },
      { cap: 600, refr: Refrigerant.R134a, comp: CompressorType.SCREW }
    ];

    waterCooledHPSolutions.forEach((sol, idx) => {
      const cap = sol.cap + (Math.random() * 100);
      const dims = "2000x1000x1700";
      const eer = 4.8 + Math.random();
      data.push({
        id: `${brand.toLowerCase()}-w2w-hp-std-${idx}`,
        brand,
        model: `${brand === 'Carrier' ? '61WG' : brand === 'Daikin' ? 'EWWD' : 'RTWD'}-${Math.round(cap)}`,
        condensationType: CondensationType.WATER,
        coolingCapacity: cap * 0.85, 
        heatingCapacity: cap,
        eer, 
        cop: 5.1 + Math.random(), 
        eseer: 6.2 + Math.random() * 2,
        scop: 5.8 + Math.random() * 1.5,
        refrigerant: sol.refr,
        compressorType: sol.comp,
        dimensions: dims,
        weight: 1500 + cap * 2,
        noiseLevel: 55,
        price: Math.round(38000 + cap * 240),
        minFluidTemp: -10,
        maxFluidTemp: 65,
        minAmbientTemp: 5,
        maxAmbientTemp: 45,
        efficiencyCurve: [
          { x: 25, y: 0.76 }, { x: 50, y: 0.92 }, { x: 75, y: 1.0 }, { x: 100, y: 0.94 }
        ],
        ...getInstallData(cap * 0.85, eer, dims)
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
    name: "Data Center (Constante 100%)",
    weekday: Array(24).fill(1),
    weekend: Array(24).fill(1),
    weekly: Array(7).fill(1),
    monthly: Array(12).fill(1)
  },
  {
    name: "Centros Comerciais (RECS)",
    weekday: Array(24).fill(0.2).map((v, i) => (i >= 9 && i < 23 ? 1.0 : v)),
    weekend: Array(24).fill(0.2).map((v, i) => (i >= 9 && i < 23 ? 1.0 : v)),
    weekly: Array(7).fill(1),
    monthly: SEASONAL_YEAR
  },
  {
    name: "Escritórios (RECS 08-20h)",
    weekday: Array(24).fill(0).map((_, i) => (i >= 8 && i < 20 ? 1 : 0)),
    weekend: Array(24).fill(0),
    weekly: [1, 1, 1, 1, 1, 0, 0],
    monthly: SEASONAL_YEAR
  },
  {
    name: "Grande Superfície Comercial",
    weekday: Array(24).fill(0.15).map((v, i) => (i >= 8 && i < 22 ? 1.0 : v)),
    weekend: Array(24).fill(0.15).map((v, i) => (i >= 8 && i < 22 ? 1.0 : v)),
    weekly: Array(7).fill(1),
    monthly: SEASONAL_YEAR
  },
  {
    name: "Ginásios / Health Club",
    weekday: Array(24).fill(0.2).map((v, i) => {
      if (i >= 7 && i < 10) return 1.0;
      if (i >= 12 && i < 14) return 0.8;
      if (i >= 17 && i < 22) return 1.0;
      if (i >= 10 && i < 17) return 0.5;
      return v;
    }),
    weekend: Array(24).fill(0.2).map((v, i) => (i >= 9 && i < 14 ? 0.9 : 0.4)),
    weekly: Array(7).fill(1),
    monthly: CONSTANT_YEAR
  },
  {
    name: "Restauração (Almoço/Jantar)",
    weekday: Array(24).fill(0.1).map((v, i) => {
      if (i >= 12 && i < 15) return 1.0;
      if (i >= 19 && i < 23) return 1.0;
      if (i >= 15 && i < 19) return 0.3;
      return v;
    }),
    weekend: Array(24).fill(0.1).map((v, i) => {
      if (i >= 12 && i < 16) return 1.0;
      if (i >= 19 && i < 0) return 1.0;
      return 0.4;
    }),
    weekly: Array(7).fill(1),
    monthly: CONSTANT_YEAR
  },
  {
    name: "Hospitalar (RECS 24h)",
    weekday: Array(24).fill(0.5).map((v, i) => (i >= 8 && i < 21 ? 1.0 : v)),
    weekend: Array(24).fill(0.5).map((v, i) => (i >= 9 && i < 19 ? 0.8 : v)),
    weekly: Array(7).fill(1),
    monthly: CONSTANT_YEAR
  },
  {
    name: "Hotelaria (RECS)",
    weekday: Array(24).fill(0.3).map((v, i) => {
      if ((i >= 7 && i < 10) || (i >= 19 && i < 23)) return 1;
      if (i >= 10 && i < 19) return 0.6;
      return v;
    }),
    weekend: Array(24).fill(0.4).map((v, i) => (i >= 8 && i < 23 ? 1 : v)),
    weekly: Array(7).fill(1),
    monthly: SEASONAL_YEAR
  },
  {
    name: "Escolar (RECS 08-18h)",
    weekday: Array(24).fill(0).map((_, i) => (i >= 8 && i < 18 ? 1 : 0)),
    weekend: Array(24).fill(0),
    weekly: [1, 1, 1, 1, 1, 0, 0],
    monthly: [0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.2, 0.2, 1.0, 1.0, 1.0, 1.0]
  },
  {
    name: "Museus e Centros Culturais",
    weekday: Array(24).fill(0.2).map((v, i) => (i >= 10 && i < 19 ? 1.0 : v)),
    weekend: Array(24).fill(0.2).map((v, i) => (i >= 10 && i < 20 ? 1.0 : v)),
    weekly: [0, 1, 1, 1, 1, 1, 1],
    monthly: SEASONAL_YEAR
  },
  {
    name: "Aeroportos / Hubs Transp.",
    weekday: Array(24).fill(0.6).map((v, i) => {
      if ((i >= 6 && i < 10) || (i >= 16 && i < 20)) return 1.0;
      return 0.8;
    }),
    weekend: Array(24).fill(0.6).map((v, i) => (i >= 7 && i < 21 ? 1.0 : 0.8)),
    weekly: Array(7).fill(1),
    monthly: CONSTANT_YEAR
  },
  {
    name: "Auditórios / Cinemas",
    weekday: Array(24).fill(0).map((_, i) => (i >= 14 && i < 23 ? 1.0 : 0)),
    weekend: Array(24).fill(0).map((_, i) => (i >= 11 && i < 23 ? 1.0 : 0)),
    weekly: Array(7).fill(1),
    monthly: CONSTANT_YEAR
  }
];
