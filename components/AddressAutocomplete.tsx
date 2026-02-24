'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
  CommandGroup,
} from "@/components/ui/command";
import { Navigation } from 'lucide-react';

// Mapbox Map-ஐ Dynamic-ஆக இம்போர்ட் செய்கிறோம் (SSR எர்ரரைத் தவிர்க்க)
const MapboxMap = dynamic(() => import('@/components/MapboxMap'), {
  ssr: false,
  loading: () => (
      <div className="h-64 w-full bg-gray-100 animate-pulse rounded-lg flex items-center justify-center text-gray-400">
        Loading Map...
      </div>
  )
});

const defaultCenter = { lat: 6.9271, lng: 79.8612 };

interface Suggestion {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

// Prop பெயரை onLocationSelectAction என்று மாற்றியுள்ளோம்
export default function AddressAutocomplete({
                                              onLocationSelectAction
                                            }: {
  onLocationSelectAction: (lat: number, lng: number, address: string) => void
}) {
  const [value, setValue] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'OK' | 'ZERO_RESULTS' | 'ERROR'>('IDLE');
  const [isLocating, setIsLocating] = useState(false);
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [zoom, setZoom] = useState(10);

  // Nominatim API மூலம் முகவரியைத் தேடுதல்
  useEffect(() => {
    if (value.length < 3) {
      setSuggestions([]);
      setStatus('IDLE');
      return;
    }

    const timer = setTimeout(async () => {
      setStatus('LOADING');
      try {
        // இலங்கை (Sri Lanka) என்று தேடலை மட்டுப்படுத்துகிறோம்
        const response = await fetch(`/api/geocode?q=${encodeURIComponent(value + ', Sri Lanka')}`);
        const data = await response.json();

        if (data && data.length > 0) {
          setSuggestions(data);
          setStatus('OK');
        } else {
          setSuggestions([]);
          setStatus('ZERO_RESULTS');
        }
      } catch (error) {
        console.error("Error fetching suggestions:", error);
        setStatus('ERROR');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [value]);

  // லொகேஷன் மாறும்போதெல்லாம் Parent காம்போனென்டிற்கு தகவல் அனுப்புதல்
  useEffect(() => {
    if (markerPosition && value) {
      onLocationSelectAction(markerPosition.lat, markerPosition.lng, value);
    }
  }, [markerPosition, value, onLocationSelectAction]);

  const handleSelect = (suggestion: Suggestion) => {
    const lat = parseFloat(suggestion.lat);
    const lng = parseFloat(suggestion.lon);

    setValue(suggestion.display_name);
    setSuggestions([]);
    setStatus('IDLE');
    setMapCenter({ lat, lng });
    setMarkerPosition({ lat, lng });
    setZoom(15);
  };

  // மேப்பில் மார்க்கரை நகர்த்தும்போது முகவரியைப் புதுப்பித்தல் (Reverse Geocoding)
  const handleMarkerDragEnd = async (lat: number, lng: number) => {
    setMarkerPosition({ lat, lng });

    try {
      const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      if (data && data.display_name) {
        setValue(data.display_name);
      }
    } catch (error) {
      console.error("Error during reverse geocoding:", error);
    }
  };

  const findMyLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const lat = latitude;
        const lng = longitude;

        setMapCenter({ lat, lng });
        setMarkerPosition({ lat, lng });
        setZoom(16);

        // Get address via reverse geocoding
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          const data = await response.json();
          if (data && data.display_name) {
            setValue(data.display_name);
          }
        } catch (error) {
          console.error("Error during reverse geocoding:", error);
          setValue(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error("Error getting location:", error);
        alert("Unable to retrieve your location. Please ensure location services are enabled.");
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  return (
      <div className="w-full space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-normal text-gray-600">Business Address</label>
            <button
              type="button"
              onClick={findMyLocation}
              disabled={isLocating}
              className="flex items-center gap-1.5 text-xs font-medium text-green-700 hover:text-green-800 transition-colors bg-green-50 px-2.5 py-1.5 rounded-lg border border-green-100 disabled:opacity-50"
            >
              <Navigation size={14} className={isLocating ? "animate-pulse" : ""} />
              {isLocating ? "Locating..." : "Find My Location"}
            </button>
          </div>
          <Command className="border rounded-md" shouldFilter={false}>
            <CommandInput
                placeholder="Type your shop address..."
                value={value}
                onValueChange={setValue}
                className="text-base"
            />
            <CommandList>
              {status === "LOADING" && <div className="p-4 text-center text-sm text-gray-500">Searching...</div>}
              {status === "OK" && (
                  <CommandGroup>
                    {suggestions.map((suggestion) => (
                        <CommandItem
                            key={suggestion.place_id}
                            onSelect={() => handleSelect(suggestion)}
                            className="cursor-pointer"
                        >
                          {suggestion.display_name}
                        </CommandItem>
                    ))}
                  </CommandGroup>
              )}
              {value.length > 2 && status === "ZERO_RESULTS" && (
                  <CommandEmpty>No address found.</CommandEmpty>
              )}
              {status === "ERROR" && (
                  <div className="p-4 text-center text-sm text-red-500">Error fetching addresses.</div>
              )}
            </CommandList>
          </Command>
          <p className="mt-2 text-[11px] text-gray-400 font-normal italic">
            * Select from the dropdown for accurate map pinning.
          </p>
        </div>

        <div className="h-64 w-full rounded-lg overflow-hidden border">
          <MapboxMap
              userLat={mapCenter.lat}
              userLng={mapCenter.lng}
              zoom={zoom}
              height="100%"
              draggableMarker={true}
              onMarkerDragEnd={handleMarkerDragEnd}
              onMapClick={handleMarkerDragEnd}
          />
        </div>
      </div>
  );
}