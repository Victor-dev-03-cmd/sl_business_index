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
import { Map, AdvancedMarker, MapMouseEvent, useApiIsLoaded } from '@vis.gl/react-google-maps';

const defaultCenter = { lat: 6.9271, lng: 79.8612 };

export default function AddressAutocomplete({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number, address: string) => void }) {
  const apiIsLoaded = useApiIsLoaded();
  
  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
    init,
  } = usePlacesAutocomplete({
    requestOptions: {
      componentRestrictions: { country: "lk" },
    },
    debounce: 300,
    initOnMount: false,
  });

  useEffect(() => {
    if (apiIsLoaded) {
      init();
    }
  }, [apiIsLoaded, init]);

  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [zoom, setZoom] = useState(10);

  useEffect(() => {
    if (markerPosition && value) {
      onLocationSelect(markerPosition.lat, markerPosition.lng, value);
    }
  }, [markerPosition, value, onLocationSelect]);

  const handleSelect = useCallback(async (address: string) => {
    setValue(address, false);
    clearSuggestions();

    try {
      const results = await getGeocode({ address });
      const { lat, lng } = await getLatLng(results[0]);
      
      setMapCenter({ lat, lng });
      setMarkerPosition({ lat, lng });
      setZoom(15);
    } catch (error) {
      console.error("Error fetching location data:", error);
    }
  }, [setValue, clearSuggestions]);

  const handleMapClick = useCallback(async (event: MapMouseEvent) => {
    if (event.detail.latLng) {
      const { lat, lng } = event.detail.latLng;
      setMarkerPosition({ lat, lng });

      try {
        const results = await getGeocode({ location: { lat, lng } });
        if (results[0]) {
          setValue(results[0].formatted_address, false);
        }
      } catch (error) {
        console.error("Error during reverse geocoding:", error);
      }
    }
  }, [setValue]);

  return (
    <div className="w-full space-y-4">
      <div>
        <label className="block text-sm font-normal text-gray-600 mb-2">Business Address</label>
        <Command className="border rounded-md" shouldFilter={false}>
          <CommandInput
            placeholder={ready ? "Type your shop address..." : "Loading maps..."}
            value={value}
            onValueChange={setValue}
            className="text-base"
            disabled={!ready}
          />
          <CommandList>
            {status === "OK" && (
              <CommandGroup>
                {data.map(({ place_id, description }) => (
                  <CommandItem
                    key={place_id}
                    onSelect={() => handleSelect(description)}
                    className="cursor-pointer"
                  >
                    {description}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {value.length > 2 && status !== "OK" && (
              <CommandEmpty>
                {status === "ZERO_RESULTS" ? "No address found." : `Error: ${status}`}
              </CommandEmpty>
            )}
          </CommandList>
        </Command>
        <p className="mt-2 text-[11px] text-gray-400 font-normal italic">* Select from the dropdown for accurate map pinning.</p>
      </div>

      <div className="h-64 w-full rounded-lg overflow-hidden border">
        <Map
          center={mapCenter}
          zoom={zoom}
          onZoomChanged={(e) => setZoom(e.detail.zoom)}
          mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "BUSINESS_REGISTRATION_MAP"}
          onClick={handleMapClick}
          gestureHandling={'greedy'}
        >
          {markerPosition && (
            <AdvancedMarker
              position={markerPosition}
              draggable={true}
              onDragEnd={(e) => {
                if (e.latLng) {
                    const { lat, lng } = e.latLng;
                    setMarkerPosition({ lat: lat(), lng: lng() });
                }
              }}
            />
          )}
        </Map>
      </div>
    </div>
  );
}
