'use client';

import React, { useState } from 'react';
import { categories } from '@/lib/categories';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CategorySelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function CategorySelector({ value, onChange }: CategorySelectorProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full">
      <label className="block text-sm font-normal text-gray-600 mb-2">Category</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between px-4 py-3.5 rounded-[6px] border border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-1 focus:ring-green-600 outline-none transition-all text-left"
        >
          <span className={cn("block truncate", !value && "text-gray-400")}>
            {value ? categories.find((c) => c.name === value)?.name : "Select a category..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>

        {open && (
          <div className="absolute z-50 w-full mt-2 bg-white rounded-[6px] border border-gray-100 shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <Command shouldFilter={true}>
              <CommandInput placeholder="Search categories..." className="h-11" />
              <CommandList className="max-h-[300px]">
                <CommandEmpty>No category found.</CommandEmpty>
                <CommandGroup>
                  {categories.map((category) => (
                    <CommandItem
                      key={category.name}
                      value={category.name}
                      onSelect={(currentValue) => {
                        onChange(currentValue === value ? "" : currentValue);
                        setOpen(false);
                      }}
                      className="flex items-center px-4 py-2 hover:bg-green-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center flex-1">
                        <span className="text-green-600 mr-3">{category.icon}</span>
                        <span className="text-sm font-normal text-gray-700">{category.name}</span>
                      </div>
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          value === category.name ? "opacity-100 text-green-600" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        )}
      </div>
      {/* Background overlay to close the dropdown when clicking outside */}
      {open && (
        <div 
          className="fixed inset-0 z-40 bg-transparent" 
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
}
