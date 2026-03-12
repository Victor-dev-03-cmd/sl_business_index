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

/**
 * Sanitize a filename to remove special characters and spaces.
 */
export function sanitizeFilename(filename: string): string {
  // Extract extension if exists
  const parts = filename.split('.');
  const ext = parts.length > 1 ? parts.pop() : '';
  const base = parts.join('.');
  
  const sanitizedBase = base
    .replace(/[^a-z0-9]/gi, '_') // Replace non-alphanumeric with underscore
    .replace(/_{2,}/g, '_')      // Collapse multiple underscores
    .toLowerCase();
    
  return ext ? `${sanitizedBase}.${ext.toLowerCase()}` : sanitizedBase;
}

/**
 * Log an analytics event to the database.
 */
export async function logEvent(
  business_id: string | number,
  event_type: 'view' | 'call_click' | 'lead_form_submit' | 'location_click',
  city?: string,
  metadata: Record<string, any> = {}
) {
  try {
    const response = await fetch('/api/analytics/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        business_id: business_id.toString(),
        event_type,
        city,
        metadata,
      }),
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to log event:', error);
    return null;
  }
}
