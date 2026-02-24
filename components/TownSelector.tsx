'use client';

import * as React from 'react';
import { Check, ChevronDown, MapPin, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SL_TOWNS, Town } from '@/lib/towns';

interface TownSelectorProps {
  onSelect: (town: Town) => void;
  selectedTownName?: string;
  className?: string;
  placeholder?: string;
  iconClassName?: string;
  textClassName?: string;
}

export default function TownSelector({ 
  onSelect, 
  selectedTownName, 
  className, 
  placeholder = "Select a town...",
  iconClassName = "text-emerald-600",
  textClassName = ""
}: TownSelectorProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center justify-between w-full px-4 py-2.5 text-sm font-medium text-left bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-sm",
          className
        )}
      >
        <div className="flex items-center overflow-hidden">
          <MapPin className={cn("mr-3 h-5 w-5 flex-shrink-0", iconClassName)} />
          <span className={cn("block truncate", !selectedTownName ? "opacity-70" : "font-medium", textClassName)}>
            {selectedTownName || placeholder}
          </span>
        </div>
        <ChevronDown className={cn("ml-2 h-4 w-4 text-gray-400 flex-shrink-0 transition-transform duration-200", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 w-full min-w-[280px] mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <Command shouldFilter={true} className="rounded-none border-none">
              <CommandInput 
                placeholder="Search towns..." 
                className="h-11 border-none focus:ring-0" 
                autoFocus
              />
              <CommandList className="max-h-[300px] overflow-y-auto custom-scrollbar">
                <CommandEmpty className="py-6 text-center text-sm text-gray-500">No town found.</CommandEmpty>
                <CommandGroup heading="Sri Lankan Towns">
                  {SL_TOWNS.map((town) => (
                    <CommandItem
                      key={`${town.name}-${town.district}`}
                      value={`${town.name} ${town.district}`}
                      onSelect={() => {
                        onSelect(town);
                        setOpen(false);
                      }}
                      className="flex items-center px-4 py-2.5 hover:bg-emerald-50 cursor-pointer transition-colors"
                    >
                      <div className="flex flex-col flex-1">
                        <span className="text-sm font-medium text-gray-900">{town.name}</span>
                        <span className="text-xs text-gray-500">{town.district} District</span>
                      </div>
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          selectedTownName === town.name ? "opacity-100 text-emerald-600" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        </>
      )}
    </div>
  );
}
