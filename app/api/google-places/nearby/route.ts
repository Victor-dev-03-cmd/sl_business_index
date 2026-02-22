import { NextRequest, NextResponse } from 'next/server';

// Use the correct environment variable name that you have set
const GOOGLE_PLACES_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

interface NearbySearchRequest {
  latitude: number;
  longitude: number;
  query: string;
  radius: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: NearbySearchRequest = await request.json();
    const { latitude, longitude, query, radius } = body;

    if (!latitude || !longitude || !query) {
      return NextResponse.json(
        { error: 'Missing required parameters: latitude, longitude, query' },
        { status: 400 }
      );
    }

    if (!GOOGLE_PLACES_API_KEY) {
      console.error('Google Places API key not configured. Make sure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set.');
      return NextResponse.json(
        { error: 'API configuration error' },
        { status: 500 }
      );
    }

    const searchUrl = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
    searchUrl.searchParams.append('location', `${latitude},${longitude}`);
    searchUrl.searchParams.append('radius', radius.toString());
    searchUrl.searchParams.append('keyword', query);
    searchUrl.searchParams.append('key', GOOGLE_PLACES_API_KEY);

    const response = await fetch(searchUrl.toString());
    const data = await response.json();

    console.log('Google Places Response:', {
      status: data.status,
      error_message: data.error_message,
    });

    if (data.status === 'ZERO_RESULTS') {
      return NextResponse.json({ places: [] });
    }

    if (data.status !== 'OK') {
      console.error('Google Places API error:', data.status, data.error_message);
      return NextResponse.json(
        { error: `Google Places API error: ${data.status} - ${data.error_message || 'Unknown error'}` },
        { status: 500 }
      );
    }

    const places = data.results.map((result: any) => ({
      id: result.place_id,
      name: result.name,
      address: result.vicinity,
      rating: result.rating || 0,
      reviewCount: result.user_ratings_total || 0,
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      types: result.types || [],
      photoUrl: result.photos
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${result.photos[0].photo_reference}&key=${GOOGLE_PLACES_API_KEY}`
        : null,
      openingHours: result.opening_hours
        ? {
            open: result.opening_hours.open_now,
            weekdayText: result.opening_hours.weekday_text || [],
          }
        : undefined,
      distance: calculateDistance(latitude, longitude, result.geometry.location.lat, result.geometry.location.lng),
    }));

    return NextResponse.json({ places: places.sort((a: any, b: any) => a.distance - b.distance) });
  } catch (error) {
    console.error('Error in nearby search:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000;
}
