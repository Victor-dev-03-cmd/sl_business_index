"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import type { SearchDictionaryEntry } from "./smartSearch";

const EMPTY_SEARCH_DICTIONARY: SearchDictionaryEntry[] = [];

/**
 * Public, RLS-approved dictionary; one query is reused by Homepage and Nearby
 * through the existing React Query provider. This never writes user searches.
 */
export function useSearchDictionary(): readonly SearchDictionaryEntry[] {
  const { data } = useQuery<SearchDictionaryEntry[]>({
    queryKey: ["slbi-search-dictionary", "v2"],
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase
        .from("search_dictionary")
        .select("alias,language,alias_kind,intent_key,canonical_query,categories,specific_service,town_name")
        .eq("review_status", "approved")
        .eq("is_active", true)
        .order("alias_normalized", { ascending: true })
        .limit(1000)
        .abortSignal(signal);
      if (error) throw error;
      return (data || []) as SearchDictionaryEntry[];
    },
    staleTime: 6 * 60 * 60 * 1000,
    gcTime: 12 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
  // A transient connection problem never disables built-in matching.
  return data ?? EMPTY_SEARCH_DICTIONARY;
}
