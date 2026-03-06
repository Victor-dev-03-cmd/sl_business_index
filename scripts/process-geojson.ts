import fs from 'fs';
import path from 'path';

const inputPath = '/home/laxsan-victor/WebstormProjects/sl_business_index/public/srilanka.geojson';
const outputPath = '/home/laxsan-victor/WebstormProjects/sl_business_index/lib/sri-lanka-towns.json';

interface GeoJSONFeature {
  properties: {
    name?: string;
    'is_in:district'?: string;
    'addr:district'?: string;
    district?: string;
    place?: string;
  };
  geometry: {
    coordinates: number[];
  };
}

interface TownData {
  name: string;
  lat: number;
  lon: number;
  district: string;
  type: string;
}

const sriLankanDistricts = [
  "Ampara", "Anuradhapura", "Badulla", "Batticaloa", "Colombo", "Galle", "Gampaha",
  "Hambantota", "Jaffna", "Kalutara", "Kandy", "Kegalle", "Kilinochchi", "Kurunegala",
  "Mannar", "Matale", "Matara", "Monaragala", "Mullaitivu", "Nuwara Eliya",
  "Polonnaruwa", "Puttalam", "Ratnapura", "Trincomalee", "Vavuniya"
];

function cleanDistrict(district?: string): string {
  if (!district) return 'Unknown';
  let cleaned = district.replace(/ District$/i, '').trim();
  
  const matched = sriLankanDistricts.find(d => 
    d.toLowerCase() === cleaned.toLowerCase() || 
    cleaned.toLowerCase().includes(d.toLowerCase())
  );
  
  return matched || cleaned;
}

try {
  const rawData = fs.readFileSync(inputPath, 'utf8');
  const data = JSON.parse(rawData);
  
  const towns = (data.features as GeoJSONFeature[])
    .filter((feature: GeoJSONFeature) => 
      feature.properties && 
      feature.properties.name && 
      feature.geometry && 
      feature.geometry.coordinates
    )
    .map((feature: GeoJSONFeature): TownData => ({
      name: feature.properties.name as string,
      lat: feature.geometry.coordinates[1],
      lon: feature.geometry.coordinates[0],
      district: cleanDistrict(
        feature.properties['is_in:district'] || 
        feature.properties['addr:district'] || 
        feature.properties.district
      ),
      type: feature.properties.place || 'Unknown'
    }));

  const seen = new Set<string>();
  const uniqueTowns = towns.filter((town: TownData) => {
    const key = `${town.name}-${town.lat}-${town.lon}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Minified JSON output
  fs.writeFileSync(outputPath, JSON.stringify(uniqueTowns));
  console.log('Successfully processed ' + uniqueTowns.length + ' locations from srilanka.geojson');
} catch (error) {
  console.error('Error:', error);
}
