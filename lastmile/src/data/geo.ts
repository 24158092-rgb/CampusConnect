import type { HazardType } from '../types';

/**
 * Schematic map of the synthetic "Demo Coastal District" (SVG units, 1000 × 640).
 * Drawn locally so the map works fully offline — it is not a real place.
 */
export type ZoneId = 'Z1' | 'Z2' | 'Z3' | 'Z4' | 'Z5' | 'Z6';

export interface Zone {
  id: ZoneId;
  name: string;
  points: [number, number][];
  label: [number, number];
  /** Share of the population living here (sums to 1). */
  population: number;
}

export const ZONES: Zone[] = [
  { id: 'Z4', name: 'Hill Colony', points: [[20, 20], [380, 20], [360, 250], [200, 270], [20, 250]], label: [170, 120], population: 0.12 },
  { id: 'Z3', name: 'Old Town', points: [[380, 20], [790, 20], [780, 200], [600, 240], [360, 250]], label: [600, 110], population: 0.2 },
  { id: 'Z2', name: 'Riverside Colony', points: [[200, 270], [360, 250], [600, 240], [780, 200], [790, 330], [600, 380], [380, 400], [220, 390]], label: [470, 345], population: 0.22 },
  { id: 'Z6', name: 'Airport Road', points: [[20, 250], [200, 270], [220, 390], [240, 620], [20, 620]], label: [110, 540], population: 0.12 },
  { id: 'Z5', name: 'Market Area', points: [[220, 390], [380, 400], [600, 380], [590, 620], [240, 620]], label: [420, 590], population: 0.18 },
  { id: 'Z1', name: 'Harbour Ward', points: [[600, 380], [790, 330], [800, 360], [790, 470], [805, 620], [590, 620]], label: [700, 590], population: 0.16 },
];

export const zoneById = (id: ZoneId) => ZONES.find((z) => z.id === id)!;

export const SEA_PATH = 'M800,0 C780,150 830,260 800,360 C770,470 820,560 810,640 L1000,640 L1000,0 Z';
export const RIVER_PATH = 'M0,300 C150,280 250,330 360,320 S560,290 650,320 S760,360 805,352';

/** 0 = none … 4 = severe, per zone and hazard (synthetic). */
export const ZONE_RISK: Record<HazardType, Record<ZoneId, number>> = {
  flood: { Z1: 4, Z2: 4, Z5: 3, Z3: 2, Z6: 2, Z4: 0 },
  cyclone: { Z1: 4, Z2: 3, Z3: 3, Z5: 3, Z6: 2, Z4: 2 },
  heat: { Z5: 4, Z3: 4, Z6: 3, Z2: 3, Z1: 2, Z4: 2 },
  heavyRain: { Z4: 4, Z2: 3, Z6: 2, Z3: 2, Z5: 2, Z1: 2 },
  severeWeather: { Z1: 3, Z2: 3, Z3: 2, Z4: 2, Z5: 3, Z6: 2 },
};

export const RISK_LABEL = ['No risk', 'Low', 'Moderate', 'High', 'Severe'];

export type ReliefKind = 'shelter' | 'medical' | 'food' | 'water' | 'assembly' | 'helipad';

export interface ReliefSite {
  id: string;
  kind: ReliefKind;
  name: string;
  zone: ZoneId;
  x: number;
  y: number;
  capacity: number;
  baseOccupancy: number;
  contact: string;
  facilities: string[];
}

export const RELIEF_SITES: ReliefSite[] = [
  { id: 'S1', kind: 'shelter', name: 'Demo School Shelter', zone: 'Z4', x: 320, y: 110, capacity: 600, baseOccupancy: 90, contact: 'DEMO-SHELTER-01', facilities: ['Beds', 'Drinking water', 'Toilets', 'First aid'] },
  { id: 'S2', kind: 'shelter', name: 'Hill Community Hall', zone: 'Z4', x: 130, y: 170, capacity: 400, baseOccupancy: 60, contact: 'DEMO-SHELTER-02', facilities: ['Beds', 'Kitchen', 'Power backup'] },
  { id: 'S3', kind: 'shelter', name: 'Old Town Stadium Shelter', zone: 'Z3', x: 540, y: 90, capacity: 1200, baseOccupancy: 150, contact: 'DEMO-SHELTER-03', facilities: ['Mass shelter', 'Medical desk', 'Kitchen', 'Toilets'] },
  { id: 'S4', kind: 'shelter', name: 'Airport Road Relief Camp', zone: 'Z6', x: 100, y: 450, capacity: 800, baseOccupancy: 110, contact: 'DEMO-SHELTER-04', facilities: ['Tents', 'Drinking water', 'Child-friendly space'] },
  { id: 'M1', kind: 'medical', name: 'District Hospital (Demo)', zone: 'Z3', x: 440, y: 170, capacity: 250, baseOccupancy: 120, contact: 'DEMO-MED-01', facilities: ['Emergency ward', 'Ambulances', 'Blood bank'] },
  { id: 'M2', kind: 'medical', name: 'Mobile Medical Unit 2', zone: 'Z6', x: 170, y: 330, capacity: 60, baseOccupancy: 12, contact: 'DEMO-MED-02', facilities: ['First aid', 'ORS', 'Heat-stroke care'] },
  { id: 'F1', kind: 'food', name: 'Food Distribution Point', zone: 'Z3', x: 680, y: 150, capacity: 2000, baseOccupancy: 0, contact: 'DEMO-FOOD-01', facilities: ['Dry rations', 'Cooked meals'] },
  { id: 'W1', kind: 'water', name: 'Drinking Water Station', zone: 'Z6', x: 60, y: 330, capacity: 3000, baseOccupancy: 0, contact: 'DEMO-WATER-01', facilities: ['Safe drinking water', 'ORS packets'] },
  { id: 'A1', kind: 'assembly', name: 'Market Assembly Point', zone: 'Z5', x: 330, y: 470, capacity: 1500, baseOccupancy: 0, contact: 'DEMO-ASSEMBLY-01', facilities: ['Open ground', 'Volunteer desk'] },
  { id: 'A2', kind: 'assembly', name: 'Harbour Assembly Point', zone: 'Z1', x: 700, y: 430, capacity: 900, baseOccupancy: 0, contact: 'DEMO-ASSEMBLY-02', facilities: ['Open ground'] },
  { id: 'H1', kind: 'helipad', name: 'Relief Helipad', zone: 'Z4', x: 250, y: 60, capacity: 0, baseOccupancy: 0, contact: 'DEMO-AIR-01', facilities: ['Air evacuation', 'Supply drops'] },
];

export const RELIEF_LABEL: Record<ReliefKind, string> = {
  shelter: 'Shelter',
  medical: 'Medical',
  food: 'Food',
  water: 'Water',
  assembly: 'Assembly point',
  helipad: 'Helipad',
};

/** A site is unsafe to send people to when its own zone is at high/severe risk. */
export const siteUsable = (site: ReliefSite, hazard: HazardType) => ZONE_RISK[hazard][site.zone] < 3;

export interface EvacRoute {
  id: string;
  from: ZoneId;
  to: string;
  points: [number, number][];
}

export const EVAC_ROUTES: EvacRoute[] = [
  { id: 'R1', from: 'Z1', to: 'S3', points: [[700, 520], [640, 400], [600, 250], [548, 108]] },
  { id: 'R2', from: 'Z2', to: 'S1', points: [[430, 330], [380, 240], [330, 128]] },
  { id: 'R3', from: 'Z5', to: 'S4', points: [[420, 560], [300, 520], [200, 480], [118, 458]] },
  { id: 'R4', from: 'Z2', to: 'S2', points: [[260, 330], [200, 250], [140, 186]] },
];

export function pointInPolygon(x: number, y: number, pts: [number, number][]) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
