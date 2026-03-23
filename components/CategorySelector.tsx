'use client';

import React, { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useQuery } from '@tanstack/react-query';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown, Tags } from "lucide-react";
import * as LucideIcons from 'lucide-react';
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  icon: string | null;
  parent_id: string | null;
}

interface CategorySelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function CategorySelector({ value, onChange }: CategorySelectorProps) {
  const [open, setOpen] = useState(false);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, icon, parent_id')
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Category[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const IconComponent = ({ name }: { name: string | null }) => {
    if (!name) return <Tags size={16} />;
    const Icon = (LucideIcons as any)[name];
    return Icon ? <Icon size={16} /> : <Tags size={16} />;
  };

  const selectedCategory = useMemo(() => {
    return categories.find((c) => c.name === value);
  }, [categories, value]);

  return (
    <div className="w-full">
      <label className="block text-sm font-normal text-gray-600 mb-2">Category <span className="text-red-500">*</span></label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between px-4 py-3.5 rounded-[6px] border border-gray-300 bg-gray-50/50 focus:bg-white focus:ring-1 focus:ring-blue-900 outline-none transition-all text-left"
        >
          <span className={cn("block truncate", !value && "text-gray-400")}>
            {value ? selectedCategory?.name || value : "Select a category..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>

        {open && (
          <div className="absolute z-50 w-full mt-2 bg-white rounded-[6px] border border-gray-300 shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <Command shouldFilter={true}>
              <CommandInput placeholder="Search categories..." className="h-11" />
              <CommandList className="max-h-[300px]">
                <CommandEmpty>{isLoading ? "Loading categories..." : "No category found."}</CommandEmpty>
                <CommandGroup>
                  {categories.map((category) => (
                    <CommandItem
                      key={category.id}
                      value={category.name}
                      onSelect={(currentValue) => {
                        onChange(currentValue === value ? "" : currentValue);
                        setOpen(false);
                      }}
                      className="flex items-center px-4 py-2 hover:bg-green-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center flex-1">
                        <span className="text-brand-dark mr-3">
                          <IconComponent name={category.icon} />
                        </span>
                        <div className="flex flex-col">
                          <span className="text-sm font-normal text-gray-700">
                            {category.name}
                          </span>
                          {category.parent_id && (
                            <span className="text-[10px] text-gray-400">
                              Subcategory of {categories.find(c => c.id === category.parent_id)?.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          value === category.name ? "opacity-100 text-brand-dark" : "opacity-0"
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
