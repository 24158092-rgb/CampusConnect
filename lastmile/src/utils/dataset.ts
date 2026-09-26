import { ZONES, pointInPolygon, type ZoneId } from '../data/geo';
import type { LanguageCode, PersonaId } from '../types';
import { nextRandom } from './random';

export type Device = 'smartphone' | 'feature' | 'none';
export type Connectivity = 'good' | 'weak' | 'none';

/** One synthetic resident in the temporary demo dataset. */
export interface Person {
  id: number;
  name: string;
  zone: ZoneId;
  language: LanguageCode;
  persona: PersonaId;
  device: Device;
  connectivity: Connectivity;
  age: number;
  x: number;
  y: number;
  phone: string;
}

const FIRST = ['Asha', 'Ravi', 'Meena', 'Arjun', 'Priya', 'Sanjay', 'Kavya', 'Imran', 'Lata', 'Deepak', 'Nisha', 'Gopal', 'Sunita', 'Rahul', 'Farida', 'Manoj', 'Rekha', 'Vikram', 'Pooja', 'Suresh', 'Anjali', 'Biswa', 'Mamata', 'Subrat', 'Rina', 'Tapan', 'Joya', 'Amit', 'Sabita', 'Hari'];
const LAST = ['Das', 'Sahu', 'Nayak', 'Mishra', 'Patra', 'Roy', 'Khan', 'Sharma', 'Behera', 'Singh', 'Ghosh', 'Mohanty', 'Paul', 'Rao', 'Pradhan', 'Sen'];

function pick<T>(r: number, items: [T, number][]): T {
  let acc = 0;
  for (const [item, w] of items) {
    acc += w;
    if (r < acc) return item;
  }
  return items[items.length - 1][0];
}

/** Deterministic synthetic population (same seed → same people). */
export function generateDataset(size: number, seed = 42): Person[] {
  let s = seed >>> 0 || 1;
  const rand = () => {
    const [v, n] = nextRandom(s);
    s = n;
    return v;
  };
  const people: Person[] = [];
  for (let i = 0; i < size; i++) {
    const zone = pick(rand(), ZONES.map((z) => [z, z.population] as [typeof z, number]));
    const xs = zone.points.map((p) => p[0]);
    const ys = zone.points.map((p) => p[1]);
    let x = 0;
    let y = 0;
    for (let tries = 0; tries < 30; tries++) {
      x = Math.min(...xs) + rand() * (Math.max(...xs) - Math.min(...xs));
      y = Math.min(...ys) + rand() * (Math.max(...ys) - Math.min(...ys));
      if (pointInPolygon(x, y, zone.points)) break;
    }
    const age = Math.round(8 + rand() * 80);
    const device = pick<Device>(rand(), age > 68 ? [['smartphone', 0.3], ['feature', 0.5], ['none', 0.2]] : [['smartphone', 0.68], ['feature', 0.24], ['none', 0.08]]);
    const connectivity = device === 'none' ? 'none' : pick<Connectivity>(rand(), zone.id === 'Z4' || zone.id === 'Z6' ? [['good', 0.45], ['weak', 0.45], ['none', 0.1]] : [['good', 0.7], ['weak', 0.25], ['none', 0.05]]);
    const language = pick<LanguageCode>(rand(), [['or', 0.4], ['hi', 0.25], ['bn', 0.15], ['en', 0.2]]);
    const persona = pick<PersonaId>(rand(), [
      ['general', 0.42],
      ['olderAdult', age > 62 ? 0.4 : 0.05],
      ['lowLiteracy', 0.15],
      ['localLanguage', 0.12],
      ['visual', 0.04],
      ['hearing', 0.04],
      ['volunteer', 0.05],
    ]);
    people.push({
      id: i + 1,
      name: `${FIRST[Math.floor(rand() * FIRST.length)]} ${LAST[Math.floor(rand() * LAST.length)]}`,
      zone: zone.id,
      language,
      persona,
      device,
      connectivity,
      age,
      x: Math.round(x),
      y: Math.round(y),
      phone: `DEMO-${String(100000 + i).slice(1)}`,
    });
  }
  return people;
}

export function datasetCsv(people: Person[]) {
  const head = 'id,name,zone,language,persona,device,connectivity,age,x,y,phone';
  return ['# SYNTHETIC DEMO DATASET — not real people', head, ...people.map((p) => [p.id, p.name, p.zone, p.language, p.persona, p.device, p.connectivity, p.age, p.x, p.y, p.phone].join(','))].join('\n');
}
