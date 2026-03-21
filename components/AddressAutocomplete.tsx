'use client';

import React, { useState, useEffect, useCallback } from 'react';
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
  CommandGroup,
} from "@/components/ui/command";
import { Navigation, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';

const LeafletMap = dynamic(() => import('@/components/LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full bg-gray-100 animate-pulse rounded-lg flex items-center justify-center text-gray-400">
      Loading Map...
    </div>
  )
});

const defaultCenter = { lat: 6.9271, lng: 79.8612 };

interface AddressAutocompleteProps {
  onLocationSelectAction: (lat: number, lng: number, address: string) => void;
  initialAddress?: string;
}

export default function AddressAutocomplete({
  onLocationSelectAction,
  initialAddress
}: AddressAutocompleteProps) {
  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      componentRestrictions: { country: "lk" },
    },
    debounce: 300,
    defaultValue: initialAddress
  });

  const [isLocating, setIsLocating] = useState(false);
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [zoom, setZoom] = useState(10);

  const handleSelect = useCallback(async (description: string) => {
    setValue(description, false);
    clearSuggestions();

    try {
      const results = await getGeocode({ address: description });
      const { lat, lng } = await getLatLng(results[0]);
      
      setMapCenter({ lat, lng });
      setMarkerPosition({ lat, lng });
      setZoom(15);
      onLocationSelectAction(lat, lng, description);
    } catch (error) {
      console.error("Error selecting place:", error);
    }
  }, [setValue, clearSuggestions, onLocationSelectAction]);

  const handleMarkerDragEnd = useCallback(async (lat: number, lng: number) => {
    setMarkerPosition({ lat, lng });
    try {
      const results = await getGeocode({ location: { lat, lng } });
      const address = results[0].formatted_address;
      setValue(address, false);
      onLocationSelectAction(lat, lng, address);
    } catch (error) {
      console.error("Error during reverse geocoding:", error);
    }
  }, [setValue, onLocationSelectAction]);

  const findMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setMapCenter({ lat: latitude, lng: longitude });
        setMarkerPosition({ lat: latitude, lng: longitude });
        setZoom(16);

        try {
          const results = await getGeocode({ location: { lat: latitude, lng: longitude } });
          const address = results[0].formatted_address;
          setValue(address, false);
          onLocationSelectAction(latitude, longitude, address);
        } catch (error) {
          console.error("Error during reverse geocoding:", error);
          setValue(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`, false);
          onLocationSelectAction(latitude, longitude, `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error("Error getting location:", error);
        toast.error("Unable to retrieve your location. Please ensure location services are enabled.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
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
            className="flex items-center gap-1.5 text-xs font-medium text-[#2a7db4] transition-colors bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100 disabled:opacity-50"
          >
            {isLocating ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
            {isLocating ? "Locating..." : "Find My Location"}
          </button>
        </div>
        <Command className="border border-gray-300 rounded-[6px]" shouldFilter={false}>
          <CommandInput
            placeholder="Type your shop address..."
            value={value}
            onValueChange={setValue}
            disabled={!ready}
            className="text-base"
          />
          <CommandList>
            {status === "OK" && (
              <CommandGroup>
                {data.map(({ place_id, description }) => (
                  <CommandItem
                    key={place_id}
                    onSelect={() => handleSelect(description)}
                    className="cursor-pointer font-normal text-sm py-3"
                  >
                    {description}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {value.length > 2 && status === "ZERO_RESULTS" && (
              <CommandEmpty className="py-6 text-sm text-gray-400 font-normal text-center">No address found in Sri Lanka.</CommandEmpty>
            )}
          </CommandList>
        </Command>
        <p className="mt-2 text-[11px] text-gray-400 font-normal italic">
          * Select from the dropdown for accurate map pinning. Biased to Sri Lanka.
        </p>
      </div>

      <div className="h-64 w-full rounded-[6px] overflow-hidden border border-gray-300">
        <LeafletMap
          centerLat={mapCenter.lat}
          centerLng={mapCenter.lng}
          zoom={zoom}
          height="100%"
          draggableMarker={true}
          onMarkerDragEnd={handleMarkerDragEnd}
          onMapClick={handleMarkerDragEnd}
          showUserLocation={false}
        />
      </div>
    </div>
  );
}
