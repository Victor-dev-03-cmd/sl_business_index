export interface GooglePlace {
  id: string;
  name: string;
  address: string;
  rating: number;
  reviewCount: number;
  lat: number;
  lng: number;
  types: string[];
  priceLevel?: string;
  openingHours?: {
    open: boolean;
    weekdayText: string[];
  };
  photoUrl?: string;
  distance?: number;
  phone?: string;
  website?: string;
}

export const searchGooglePlaces = async (
  latitude: number,
  longitude: number,
  query: string,
  radius: number = 5000
): Promise<GooglePlace[]> => {
  try {
    const response = await fetch('/api/google-places/nearby', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        latitude,
        longitude,
        query,
        radius,
      }),
    });

    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.places || [];
  } catch (error) {
    console.error('Error searching Google Places:', error);
    throw error;
  }
};

export const getPlaceDetails = async (placeId: string): Promise<GooglePlace | null> => {
  try {
    const response = await fetch('/api/google-places/details', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ placeId }),
    });

    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.place || null;
  } catch (error) {
    console.error('Error fetching place details:', error);
    throw error;
  }
};
