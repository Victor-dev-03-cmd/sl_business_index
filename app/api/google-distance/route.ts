import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

interface DistanceRequest {
  origins: Array<{ lat: number; lng: number }>;
  destinations: Array<{ lat: number; lng: number }>;
}

export async function POST(request: NextRequest) {
  try {
    const body: DistanceRequest = await request.json();
    const { origins, destinations } = body;

    if (!origins || !destinations || origins.length === 0 || destinations.length === 0) {
      return NextResponse.json(
        { error: 'Missing origins or destinations' },
        { status: 400 }
      );
    }

    if (!GOOGLE_MAPS_API_KEY) {
      return NextResponse.json(
        { error: 'API configuration error' },
        { status: 500 }
      );
    }

    const originsStr = origins.map(o => `${o.lat},${o.lng}`).join('|');
    const destinationsStr = destinations.map(d => `${d.lat},${d.lng}`).join('|');

    const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
    url.searchParams.append('origins', originsStr);
    url.searchParams.append('destinations', destinationsStr);
    url.searchParams.append('key', GOOGLE_MAPS_API_KEY);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('Google Distance Matrix error:', data.status, data.error_message);
      return NextResponse.json(
        { error: `Google Distance Matrix API error: ${data.status}` },
        { status: 500 }
      );
    }

    const rows = data.rows[0].elements.map((element: any) => ({
      distance: element.distance?.value || 0,
      distanceText: element.distance?.text || 'Unknown',
      duration: element.duration?.value || 0,
      durationText: element.duration?.text || 'Unknown',
      status: element.status,
    }));

    return NextResponse.json({ distances: rows });
  } catch (error) {
    console.error('Error in distance calculation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
