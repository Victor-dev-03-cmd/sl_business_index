/**
 * SLBI SmartSearch v1.0.0 — deterministic, explainable multilingual intent parser.
 * No external AI service or Elasticsearch cluster. PostgreSQL lexical retrieval
 * and GeoRank consume these signals. Never infer that a business serves a product
 * merely because it belongs to a related category.
 */
export const SMART_SEARCH_VERSION = "1.0.0";

export type SearchPlace = {
  name: string;
  lat?: number;
  lon?: number;
  district?: string;
};

export type SearchIntent = {
  rawQuery: string;
  query: string;
  canonicalQuery: string;
  categories: string[];
  label: string | null;
  intentKey: string | null;
  specificService: boolean;
  location: SearchPlace | null;
};

type DictionaryGroup = {
  key: string;
  name: string;
  categories: readonly string[];
  general: readonly string[];
  specific: readonly string[];
};

const GROUPS: readonly DictionaryGroup[] = [
  {
    key: "clothing", name: "Clothing & Brands",
    categories: ["Clothing & Brands"],
    general: ["clothing","clothings","clothes","cloth","garment","garments","apparel","fashion","boutique","boutiques","textile","textiles","dress","dresses","shirt","shirts","ஆடைகள்","உடைகள்","துணிக்கடை","ඇඳුම්","රෙදි","ඇඳුම් සාප්පු"],
    specific: [],
  },
  {
    key: "food", name: "Food & Dining",
    categories: ["Food & Dining", "Hotels & Restaurants"],
    general: ["food","foods","restaurant","restaurants","dining","eatery","eateries","cafe","cafes","café","உணவு","உணவகம்","சாப்பாடு","உணவுக்கடை","ආහාර","අවන්හල","කෑම"],
    specific: ["biryani","biriyani","briyani","biryani shop","burger","burgers","pizza","pizzas","kottu","fried rice","shawarma","noodles","rice and curry","பிரியாணி","பிரியாணி கடை","பரோட்டா","கொத்து","බිරියානි","කොත්තු","පීසා"],
  },
  {
    key: "medical", name: "Health & Medical",
    categories: ["Health & Medical", "Beauty & Health"],
    general: ["medical","health","healthcare","health care","hospital","hospitals","clinic","clinics","pharmacy","pharmacies","doctor","doctors","மருத்துவம்","மருத்துவமனை","வைத்தியசாலை","மருந்தகம்","රෝහල","වෛද්‍ය","ෆාමසිය"],
    specific: ["dentist","dental clinic","physiotherapy","physio","lab tests","blood test","பல் மருத்துவர்","දන්ත වෛද්‍ය"],
  },
  {
    key: "retail", name: "Shopping & Retail",
    categories: ["Shopping & Retail", "Retail & Others"],
    general: ["shopping","retail","supermarket","supermarkets","grocery","groceries","மளிகை","கடை","கடைகள்","සාප්පු","වෙළඳසැල"],
    specific: [],
  },
  {
    key: "education", name: "Education",
    categories: ["Educational institutes & Services"],
    general: ["education","school","schools","tuition","tuition class","tuition classes","academy","training","பாடசாலை","பள்ளி","கல்வி","ரியூஷன்","පාසල","අධ්‍යාපන","පන්ති"],
    specific: ["english class","math tuition","it course","coding class"],
  },
  {
    key: "travel", name: "Travel & Tourism",
    categories: ["Travel & Tourism","Travel & Transportation"],
    general: ["travel","tourism","tour","tours","transport","taxi","cab","bus","பயணம்","சுற்றுலா","ගමන්","සංචාරක"],
    specific: ["airport taxi","car rental","rent a car","hotel booking"],
  },
  {
    key: "repair", name: "Repairing & Services",
    categories: ["Repairing & Services","Electrical Equipment and Services"],
    general: ["repair","repairs","electrician","electricians","plumber","plumbers","mechanic","mechanics","service center","பழுதுபார்ப்பு","மின்சார வேலை","අලුත්වැඩියා"],
    specific: ["phone repair","laptop repair","computer repair","ac repair","fridge repair"],
  },
] as const;

const GENERIC_WORDS = new Set(["shop","shops","store","stores","business","businesses","service","services","company","companies","place","places","near","nearby","around","in","at","for","me","my","the","best","find","a","an","local"]);
const PLACE_INDEX = new WeakMap<object, SearchPlace[]>();

const scrub = (s: string) =>
  s.normalize("NFKC").toLocaleLowerCase().replace(/[.,!?;:/\\()[\]{}"'’–—-]+/g, " ").replace(/\s+/g, " ").trim();

function containsPhrase(haystack: string, phrase: string) {
  return (" " + haystack + " ").includes(" " + scrub(phrase) + " ");
}

export function extractSearchPlace(query: string, places: readonly SearchPlace[] = []) {
  const clean = scrub(query);
  // Reuse the stable Sri Lankan town index across keystrokes/autocomplete.
  let candidates = PLACE_INDEX.get(places);
  if (!candidates) {
    candidates = places
      .filter(place => place.name.length >= 3 && place.name.length <= 65)
      .sort((a, b) => b.name.length - a.name.length);
    PLACE_INDEX.set(places, candidates);
  }
  for (const place of candidates) {
    const city = scrub(place.name);
    if (!containsPhrase(clean, city)) continue;
    const parts = clean.split(" ");
    const cityParts = city.split(" ");
    let position = -1;
    for (let i = 0; i <= parts.length - cityParts.length; i++) {
      if (parts.slice(i, i + cityParts.length).join(" ") === city) { position = i; break; }
    }
    if (position < 0) continue;
    const before = parts.slice(0, position);
    if (["in","near","at","around"].includes(before[before.length-1])) before.pop();
    const after = parts.slice(position + cityParts.length);
    return { location: place, remaining: [...before, ...after].join(" ").trim() };
  }
  return { location: null, remaining: clean };
}

export function resolveSmartSearch(
  query: string,
  places: readonly SearchPlace[] = [],
  knownCategories?: readonly string[],
): SearchIntent {
  const rawQuery = String(query ?? "").trim().slice(0, 160);
  const { location, remaining } = extractSearchPlace(rawQuery, places);
  const normalized = scrub(remaining);
  let best: { group: DictionaryGroup; phrase: string; specific: boolean } | null = null;

  for (const group of GROUPS) {
    for (const [specific, words] of [[true,group.specific],[false,group.general]] as const) {
      for (const phrase of words) {
        if (!containsPhrase(normalized, phrase)) continue;
        if (!best || phrase.length > best.phrase.length ||
           (phrase.length === best.phrase.length && specific && !best.specific)) {
          best = { group, phrase, specific };
        }
      }
    }
  }

  // Case-preserving raw keywords are not necessary for Postgres; the user-visible
  // search field itself remains unchanged until submission.
  const meaningful = normalized.split(" ").filter(word => !GENERIC_WORDS.has(word));
  const cleaned = meaningful.join(" ").trim() || normalized;
  let canonicalQuery = cleaned;
  let categories: string[] = [];
  let label: string | null = null;
  let intentKey: string | null = null;
  let specificService = false;
  if (best) {
    categories = [...best.group.categories];
    if (knownCategories?.length) {
      const matches = categories.filter(name=>knownCategories.some(known => scrub(known) === scrub(name)));
      if (matches.length) categories = matches;
    }
    label = best.group.name;
    intentKey = best.group.key;
    specificService = best.specific;

    // A generic word identifies a category, while a specific food/product name
    // must stay as a keyword so exact claims can be distinguished from related.
    if (!specificService && (cleaned === best.phrase || scrub(best.phrase) === normalized)) {
      canonicalQuery = best.group.key;
    } else {
      canonicalQuery = cleaned;
    }
  }

  return {
    rawQuery, query: normalized, canonicalQuery: canonicalQuery.slice(0, 100),
    categories, label, intentKey, specificService, location,
  };
}

/**
 * Bounded expansion, only for an actual search with no candidates.
 * No quiet location change. The UI must disclose any expanded radius.
 */
export function radiusSteps(initialMeters: number, maxMeters = 50000) {
  const safe = Math.min(maxMeters, Math.max(1000, Number.isFinite(initialMeters) ? initialMeters : 10000));
  const preset = [3000, 10000, 20000, 30000, 50000];
  return [safe, ...preset.filter(n=>n>safe && n<=maxMeters)].slice(0, 5);
}
