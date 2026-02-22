'use client';

import React from 'react';
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
} from "@/components/ui/command"; // Assuming you have shadcn command components

export default function AddressAutocomplete({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number, address: string) => void }) {
  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      componentRestrictions: { country: "lk" }, // Restrict to Sri Lanka
    },
    debounce: 300,
  });

  const handleSelect = async (address: string) => {
    setValue(address, false);
    clearSuggestions();

    try {
      const results = await getGeocode({ address });
      const { lat, lng } = await getLatLng(results[0]);
      
      onLocationSelect(lat, lng, address);
      console.log("📍 Selected Location:", { lat, lng, address });
    } catch (error) {
      console.error("Error fetching location data:", error);
    }
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">Business Address</label>
      <Command className="border rounded-md">
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
                  className="cursor-pointer"
                >
                  {description}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {value.length > 2 && status !== "OK" && <CommandEmpty>No address found.</CommandEmpty>}
        </CommandList>
      </Command>
    </div>
  );
}
