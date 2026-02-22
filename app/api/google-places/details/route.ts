import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

interface PlaceDetailsRequest {
  placeId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: PlaceDetailsRequest = await request.json();
    const { placeId } = body;

    if (!placeId) {
      return NextResponse.json(
        { error: 'Missing required parameter: placeId' },
        { status: 400 }
      );
    }

    if (!GOOGLE_PLACES_API_KEY) {
      console.error('Google Places API key not configured');
      return NextResponse.json(
        { error: 'API configuration error' },
        { status: 500 }
      );
    }

    const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    detailsUrl.searchParams.append('place_id', placeId);
    detailsUrl.searchParams.append('fields', 'name,rating,user_ratings_total,formatted_address,formatted_phone_number,website,opening_hours,photos,geometry,url');
    detailsUrl.searchParams.append('key', GOOGLE_PLACES_API_KEY);

    const response = await fetch(detailsUrl.toString());
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('Google Places Details API error:', data.status);
      return NextResponse.json(
        { error: `Google Places API error: ${data.status}` },
        { status: 500 }
      );
    }

    const result = data.result;
    const place = {
      id: placeId,
      name: result.name,
      address: result.formatted_address,
      rating: result.rating || 0,
      reviewCount: result.user_ratings_total || 0,
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      phone: result.formatted_phone_number || null,
      website: result.website || null,
      photoUrl: result.photos
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${result.photos[0].photo_reference}&key=${GOOGLE_PLACES_API_KEY}`
        : null,
      openingHours: result.opening_hours
        ? {
            open: result.opening_hours.open_now,
            weekdayText: result.opening_hours.weekday_text || [],
          }
        : undefined,
      mapsUrl: result.url || null,
    };

    return NextResponse.json({ place });
  } catch (error) {
    console.error('Error in details fetch:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
