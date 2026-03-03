import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Clean up the search query for the database.
 * We rely on the Database Full-Text Search (FTS) to handle synonyms and 
 * broad matching (like "repair" matching "computer repair" and "vehicle repair").
 */
export function expandSearchQuery(query: string): string {
  if (!query) return "";
  
  // Simply clean up spaces. 
  // Broadening is now handled by the SQL 'formatted_query' using OR (|) logic.
  return query.replace(/\s+/g, ' ').trim();
}
