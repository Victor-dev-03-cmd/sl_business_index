import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_PLACES_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

interface NearbySearchRequest {
  latitude?: number;
  longitude?: number;
  location?: string; // Can be a district name
  query: string;
  radius: number;
}

async function getCoordsForLocation(location: string): Promise<{ lat: number; lng: number } | null> {
  if (!GOOGLE_PLACES_API_KEY) return null;
  const geocodeUrl = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  geocodeUrl.searchParams.append('address', `${location}, Sri Lanka`);
  geocodeUrl.searchParams.append('key', GOOGLE_PLACES_API_KEY);

  try {
    const response = await fetch(geocodeUrl.toString());
    const data = await response.json();
    if (data.status === 'OK' && data.results[0]) {
      return data.results[0].geometry.location;
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: NearbySearchRequest = await request.json();
    let { latitude, longitude, location, query, radius } = body;

    if (!GOOGLE_PLACES_API_KEY) {
      return NextResponse.json({ error: 'API configuration error' }, { status: 500 });
    }

    if (location && (!latitude || !longitude)) {
      const coords = await getCoordsForLocation(location);
      if (coords) {
        latitude = coords.lat;
        longitude = coords.lng;
      } else {
        return NextResponse.json({ error: `Could not find coordinates for ${location}` }, { status: 400 });
      }
    }

    if (!latitude || !longitude) {
      return NextResponse.json({ error: 'Missing location data' }, { status: 400 });
    }

    const searchUrl = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
    searchUrl.searchParams.append('location', `${latitude},${longitude}`);
    searchUrl.searchParams.append('radius', radius.toString());
    searchUrl.searchParams.append('keyword', query);
    searchUrl.searchParams.append('key', GOOGLE_PLACES_API_KEY);

    const response = await fetch(searchUrl.toString());
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return NextResponse.json({ error: `Google Places API error: ${data.status}` }, { status: 500 });
    }

    const places = data.results?.map((result: any) => ({
      id: result.place_id,
      name: result.name,
      address: result.vicinity,
      // ... other fields
    })) || [];

    return NextResponse.json({ places });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
