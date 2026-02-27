import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function expandSearchQuery(query: string): string {
  const lowerQuery = query.toLowerCase().trim();
  
  // Define common search patterns and their expansions
  const patterns: Record<string, string[]> = {
    'hotel': ['hotel', 'rooms', 'restaurant', 'stay'],
    'restaurant': ['restaurant', 'food', 'dining', 'hotel'],
    'room': ['hotel', 'rooms', 'stay', 'accommodation', 'villa'],
    'rooms': ['hotel', 'rooms', 'stay', 'accommodation', 'villa'],
    'lodge': ['hotel', 'rooms', 'resthouse', 'stay'],
    'resort': ['hotel', 'rooms', 'resort', 'stay']
  };

  for (const [key, expansions] of Object.entries(patterns)) {
    if (lowerQuery === key || lowerQuery.includes(key)) {
      // If the query matches a pattern, we could either return all expansions
      // or just ensure those keywords are used.
      // For a simple 'ilike' search, returning a space-separated string might be too broad.
      // But for Google Places API or full-text search, it's helpful.
      
      // Let's return the most common terms to broaden the search
      return [...new Set([query, ...expansions])].join(' ');
    }
  }

  return query;
}

