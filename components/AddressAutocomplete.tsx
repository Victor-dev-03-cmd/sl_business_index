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
  initialLat?: number;
  initialLng?: number;
  hideMap?: boolean;
  hideLabel?: boolean;
  placeholder?: string;
  detailedAddress?: string;
  onDetailedAddressChange?: (value: string) => void;
}

export default function AddressAutocomplete({
  onLocationSelectAction,
  initialAddress,
  initialLat,
  initialLng,
  hideMap = false,
  hideLabel = false,
  placeholder = "Type your shop address...",
  detailedAddress,
  onDetailedAddressChange
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
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  );
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : defaultCenter
  );
  const [zoom, setZoom] = useState(initialLat && initialLng ? 16 : 10);

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
    setMapCenter({ lat, lng });
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
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <div className="space-y-4">
          <div>
            {!hideLabel && (
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-normal text-gray-600">
                  Business Address <span className="text-red-500">*</span>
                </label>
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
            )}
            <div className="relative">
              {hideLabel && (
                <button
                  type="button"
                  onClick={findMyLocation}
                  disabled={isLocating}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex items-center gap-1.5 text-[10px] font-medium text-[#2a7db4] bg-blue-50/80 hover:bg-blue-100 px-2 py-1 rounded transition-colors disabled:opacity-50"
                  title="Find my location"
                >
                  {isLocating ? <Loader2 size={12} className="animate-spin" /> : <Navigation size={12} />}
                  {isLocating ? "" : "Locate Me"}
                </button>
              )}
              <Command className="border border-gray-300 rounded-[6px]" shouldFilter={false}>
                <CommandInput
                  placeholder={placeholder}
                  value={value}
                  onValueChange={setValue}
                  onChange={(e) => setValue(e.target.value)}
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
            </div>
          </div>

          {onDetailedAddressChange && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-widest">Detailed Address</label>
              <textarea
                value={detailedAddress}
                onChange={(e) => onDetailedAddressChange(e.target.value)}
                placeholder="Shop No, Floor, Street Name, Landmark..."
                className="w-full px-4 py-3 rounded-[6px] border border-gray-300 bg-gray-50/50 focus:bg-white focus:ring-1 focus:ring-blue-900 outline-none transition-all font-normal text-sm"
                rows={3}
              />
            </div>
          )}

          {!hideLabel && (
            <div className="flex flex-col gap-1 mt-4 p-4 bg-brand-blue/5 rounded-lg border border-brand-blue/10">
              <p className="text-[11px] text-gray-600 font-medium flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-brand-blue text-white flex items-center justify-center text-[8px]">1</span>
                Type address to find general location
              </p>
              <p className="text-[11px] text-gray-600 font-medium flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-brand-blue text-white flex items-center justify-center text-[8px]">2</span>
                Click or Drag the map pin for exact position
              </p>
            </div>
          )}
        </div>

        {!hideMap && (
          <div className="flex flex-col h-full min-h-[240px] lg:min-h-full">
            <span className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-widest">Nearby Map View</span>
            <div className="flex-1 rounded-[8px] overflow-hidden border border-gray-300 relative">
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
        )}
      </div>
    </div>
  );
}
