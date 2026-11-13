'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { supabase } from '@/lib/supabaseClient';
import { isPlausibleSriLankaPin } from '@/lib/businessLocation';

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
  onLocationClearAction?: () => void;
  locationConfirmed?: boolean;
  onLocationConfirmedChange?: (confirmed: boolean) => void;
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
  onDetailedAddressChange,
  onLocationClearAction,
  locationConfirmed = false,
  onLocationConfirmedChange,
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
    initialLat != null && initialLng != null && isPlausibleSriLankaPin(initialLat, initialLng)
      ? { lat: initialLat, lng: initialLng } : null
  );
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(
    initialLat != null && initialLng != null && isPlausibleSriLankaPin(initialLat, initialLng)
      ? { lat: initialLat, lng: initialLng } : defaultCenter
  );
  const [zoom, setZoom] = useState(initialLat != null && initialLng != null && isPlausibleSriLankaPin(initialLat, initialLng) ? 16 : 10);
  const [nearbyBusinesses, setNearbyBusinesses] = useState<any[]>([]);
  const appliedInitialLocation = useRef('');

  // The registration page can receive a preselected map location via URL
  // after this dynamic component has mounted.
  useEffect(() => {
    if (!initialAddress?.trim() || initialLat == null || initialLng == null
        || !isPlausibleSriLankaPin(initialLat, initialLng)) return;
    const signature = [initialAddress, initialLat, initialLng].join('|');
    if (appliedInitialLocation.current === signature) return;
    appliedInitialLocation.current = signature;
    setValue(initialAddress, false);
    setMarkerPosition({ lat: initialLat, lng: initialLng });
    setMapCenter({ lat: initialLat, lng: initialLng });
    setZoom(16);
  }, [initialAddress, initialLat, initialLng, setValue]);

  const clearSelection = useCallback(() => {
    setMarkerPosition(null);
    onLocationClearAction?.();
    onLocationConfirmedChange?.(false);
  }, [onLocationClearAction, onLocationConfirmedChange]);

  const handleAddressInput = useCallback((nextAddress: string) => {
    setValue(nextAddress);
    clearSelection(); // Typed text must never retain a previous pin.
  }, [setValue, clearSelection]);

  const isSriLankaResult = (result: { address_components?: Array<{ short_name: string; types: string[] }> }) => {
    const country = result.address_components?.find(part => part.types.includes('country'));
    return !country || country.short_name.toUpperCase() === 'LK';
  };

  const fetchNearbyBusinesses = useCallback(async (lat: number, lng: number) => {
    try {
      const { data, error } = await supabase.rpc('get_nearby_businesses', {
        user_lat: lat,
        user_lng: lng,
        dist_limit: 2000 // 2km radius for duplicates check
      });
      if (error) throw error;
      setNearbyBusinesses(data || []);
    } catch (err) {
      console.error('Error fetching nearby businesses:', err);
    }
  }, []);

  useEffect(() => {
    if (markerPosition) {
      fetchNearbyBusinesses(markerPosition.lat, markerPosition.lng);
    }
  }, [markerPosition, fetchNearbyBusinesses]);

  const handleSelect = useCallback(async (description: string) => {
    clearSuggestions();
    try {
      const results = await getGeocode({ address: description });
      const result = results[0];
      if (!result || !isSriLankaResult(result)) {
        toast.error('Choose a business location in Sri Lanka.');
        return;
      }
      const { lat, lng } = await getLatLng(result);
      if (!isPlausibleSriLankaPin(lat, lng)) {
        toast.error('This address is outside the Sri Lankan business area.');
        return;
      }
      const address = result.formatted_address || description;
      setValue(address, false);
      setMapCenter({ lat, lng });
      setMarkerPosition({ lat, lng });
      setZoom(16);
      onLocationConfirmedChange?.(false);
      onLocationSelectAction(lat, lng, address);
    } catch (error) {
      console.error('Error selecting place:', error);
      toast.error('Unable to verify this location. Select another result or map point.');
    }
  }, [setValue, clearSuggestions, onLocationSelectAction, onLocationConfirmedChange]);

  const handleMarkerDragEnd = useCallback(async (lat: number, lng: number) => {
    if (!isPlausibleSriLankaPin(lat, lng)) {
      toast.error('Move the business pin to a location within Sri Lanka.');
      return;
    }
    setMarkerPosition({ lat, lng });
    setMapCenter({ lat, lng });
    setZoom(17);
    onLocationConfirmedChange?.(false);
    onLocationClearAction?.();
    try {
      const results = await getGeocode({ location: { lat, lng } });
      const result = results[0];
      if (!result || !isSriLankaResult(result) || !result.formatted_address) {
        throw new Error('Readable Sri Lankan address unavailable');
      }
      setValue(result.formatted_address, false);
      onLocationSelectAction(lat, lng, result.formatted_address);
    } catch (error) {
      console.error('Error during reverse geocoding:', error);
      setValue('', false);
      toast.error('The map pin has no verified area address. Try a nearby point or address search.');
    }
  }, [setValue, onLocationSelectAction, onLocationClearAction, onLocationConfirmedChange]);

  const findMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        if (!isPlausibleSriLankaPin(latitude, longitude)) {
          toast.error('Find Me returned a position outside Sri Lanka.');
          setIsLocating(false);
          return;
        }
        setMapCenter({ lat: latitude, lng: longitude });
        setMarkerPosition({ lat: latitude, lng: longitude });
        setZoom(17);
        onLocationConfirmedChange?.(false);
        onLocationClearAction?.();
        if (accuracy > 150) {
          toast.warning('GPS is approximate (' + Math.round(accuracy) + ' m). Drag the map pin to your business entrance.');
        }

        try {
          const results = await getGeocode({ location: { lat: latitude, lng: longitude } });
          const result = results[0];
          if (!result || !isSriLankaResult(result) || !result.formatted_address) {
            throw new Error('Readable Sri Lankan address unavailable');
          }
          setValue(result.formatted_address, false);
          onLocationSelectAction(latitude, longitude, result.formatted_address);
          toast.info('GPS located. Confirm your exact shop entrance on the map and type your physical address.');
        } catch (error) {
          console.error('Error during reverse geocoding:', error);
          setValue('', false);
          toast.error('GPS found coordinates, but no readable address. Search for your business area and refine the pin.');
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
                <label htmlFor="business-location-search" className="block text-sm font-semibold text-gray-700">
                  Business Map Location <span className="text-red-600" aria-hidden="true">*</span>
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
                  id="business-location-search"
                  aria-label="Business area or map location"
                  aria-required="true"
                  placeholder={placeholder}
                  value={value}
                  onValueChange={handleAddressInput}
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
              <label htmlFor="business-physical-address" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600">
                Physical Address <span className="text-red-600" aria-hidden="true">*</span>
              </label>
              <textarea
                id="business-physical-address"
                value={detailedAddress || ''}
                onChange={(event) => {
                  onDetailedAddressChange(event.target.value);
                  onLocationConfirmedChange?.(false);
                }}
                placeholder="Shop/building number, street or landmark, village/town"
                aria-describedby="business-physical-address-help"
                aria-required="true"
                required
                minLength={10}
                maxLength={240}
                className="w-full rounded-[6px] border border-gray-300 bg-white px-4 py-3 text-sm font-normal outline-none transition-all focus:border-[#FF7900] focus:ring-2 focus:ring-[#FF7900]/20"
                rows={3}
              />
              <p id="business-physical-address-help" className="mt-2 text-xs leading-5 text-gray-600">
                Required: enter the real address customers can visit. GPS and automatic map results give an area/pin, not a shop number or verified entrance.
              </p>
            </div>
          )}

          {onLocationConfirmedChange && (
            <div className="rounded-lg border border-[#E9DDC8] bg-[#FFFBF5] px-4 py-3">
              {markerPosition && value.trim() ? (
                <p className="mb-2 text-xs text-[#705438]" role="status">
                  Pin selected: {markerPosition.lat.toFixed(6)}, {markerPosition.lng.toFixed(6)} · Check the precise business entrance on the map.
                </p>
              ) : (
                <p className="mb-2 text-xs text-[#94643E]" role="status">
                  Select an address from the suggestions or click a map point to set your business pin.
                </p>
              )}
              <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-5 text-[#4C4138]">
                <input type="checkbox" name="business-location-confirmed" required
                  checked={locationConfirmed}
                  disabled={!markerPosition || !value.trim() || !detailedAddress?.trim()}
                  onChange={(event) => onLocationConfirmedChange(event.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 accent-[#FF7900]" />
                <span>I confirm the pin marks my actual business entrance, and the physical address above is accurate. <span className="text-red-600" aria-hidden="true">*</span></span>
              </label>
            </div>
          )}

          {!hideLabel && (
            <div className="flex flex-col gap-1 mt-4 p-4 bg-brand-blue/5 rounded-lg border border-brand-blue/10">
              <p className="text-[11px] text-gray-600 font-medium flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-brand-blue text-white flex items-center justify-center text-[8px]">1</span>
                Search an address or use Find Me for an approximate area
              </p>
              <p className="text-[11px] text-gray-600 font-medium flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-brand-blue text-white flex items-center justify-center text-[8px]">2</span>
                Drag the map pin to the actual business entrance, then confirm
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
                draggableMarker={markerPosition !== null}
                onMarkerDragEnd={handleMarkerDragEnd}
                onMapClick={handleMarkerDragEnd}
                showUserLocation={false}
                businesses={nearbyBusinesses}
              />
            </div>
            {nearbyBusinesses.length > 0 && (
              <p className="mt-2 text-[10px] text-gray-500 font-normal">
                📍 Showing {nearbyBusinesses.length} registered businesses nearby to avoid duplicates.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
