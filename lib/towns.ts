import townsData from './sri-lanka-towns.json';

export interface Town {
  name: string;
  lat: number;
  lon: number;
  district: string;
  type: string;
}

// Sort by name length descending to match longer town names first
export const SL_TOWNS: Town[] = (townsData as Town[]).sort((a, b) => b.name.length - a.name.length);
