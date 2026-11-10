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
    categories: ["Repairing & Services","Vehicles & Automative","Electrical Equipment and Services"],
    general: ["repair","repairs","electrician","electricians","plumber","plumbers","mechanic","mechanics","service center","பழுதுபார்ப்பு","மின்சார வேலை","අලුත්වැඩියා"],
    specific: [
      "phone repair","laptop repair","computer repair","ac repair","fridge repair",
      "car repair","car repairs","car repairing","car mechanic","auto repair",
      "automotive repair","vehicle repair","mechanic garage","car garage",
      "කාර් රෙපෙයාර්","කාර් රිපෙයාර්","කාර් රෙපයාර්",
      "කාර් රෙපෙයාර් කරන තැන්","කාර් අලුත්වැඩියා","වාහන අලුත්වැඩියා",
      "වාහන ගරාජ්","කාර් ගරාජ්",
      "கார் ரிப்பேர்","கார் ரிப்பேரிங்","கார் ரிපෙයரிங்",
      "கார் ரிப்பெரிங்","கார் பழுதுபார்ப்பு","வாகன பழுதுபார்ப்பு",
      "கார் மெக்கானிக்","கார் கராஜ்",
    ],
  },
] as const;

// Only explicitly curated, language-aware product synonyms are canonicalized.
// Unlike category aliases, these never prove product availability for a listing.
const SPECIFIC_SYNONYMS: Readonly<Record<string,string>> = {
  "biriyani":"biryani", "briyani":"biryani", "பிரியாணி":"biryani",
  "பிரியாணி கடை":"biryani", "බිරියානි":"biryani",
  "பீட்சா":"pizza", "පීසා":"pizza", "pizzas":"pizza",
  "burgers":"burger", "கொத்து":"kottu", "කොත්තු":"kottu",
  "rice and curry":"rice curry",
  "car repairs":"car repair", "car repairing":"car repair",
  "car mechanic":"car repair", "auto repair":"car repair",
  "automotive repair":"car repair", "vehicle repair":"car repair",
  "mechanic garage":"car repair", "car garage":"car repair",
  "කාර් රෙපෙයාර්":"car repair", "කාර් රිපෙයාර්":"car repair",
  "කාර් රෙපයාර්":"car repair", "කාර් රෙපෙයාර් කරන තැන්":"car repair",
  "කාර් අලුත්වැඩියා":"car repair", "වාහන අලුත්වැඩියා":"car repair",
  "වාහන ගරාජ්":"car repair", "කාර් ගරාජ්":"car repair",
  "கார் ரிப்பேர்":"car repair", "கார் ரிப்பேரிங்":"car repair",
  "கார் ரிපෙයரிங்":"car repair", "கார் ரிப்பெரிங்":"car repair",
  "கார் பழுதுபார்ப்பு":"car repair", "வாகன பழுதுபார்ப்பு":"car repair",
  "கார் மெக்கானிக்":"car repair", "கார் கராஜ்":"car repair",
};

const GENERIC_WORDS = new Set(["shop","shops","store","stores","business","businesses","service","services","company","companies","place","places","near","nearby","around","in","at","for","me","my","the","best","find","a","an","local"]);
const PLACE_INDEX = new WeakMap<object, SearchPlace[]>();

// Curated geographic aliases. Inflected Sinhala and Tamil spellings need an
// explicit place match; a generic transliterator cannot reliably handle them.
// Canonical coordinates are always read from SL_TOWNS, never invented.
const PLACE_ALIASES: ReadonlyArray<{ canonical: string; forms: readonly string[] }> = [
  { canonical: "Jaffna", forms: [
    "යාපනයේ","යාපනය","යාපනේ","යාපනයට","ජාෆ්නා","ජාෆ්නාවේ",
    "யாழ்ப்பாணத்தில்","யாழ்ப்பாணத்தில","யாழ்ப்பாணம்","யாழ்ப்பாண",
    "ஜப்னா டவுன்","ஜப்னாவில்","ஜப்னா","ஜாஃப்னா","ஜாஃப்னாவில்",
    "jaffna town","jaffna city","jafna","jafnah",
  ] },
  { canonical: "Colombo", forms: [
    "කොළඹ","කොළඹදී","கொழும்பில்","கொழும்பு","colombo city",
  ] },
  { canonical: "Kandy", forms: [
    "මහනුවර","මහනුවරදී","கண்டியில்","கண்டி","kandy city",
  ] },
] as const;

const SERVICE_NOISE_WORDS = new Set([
  "කරන","තැන්","තැන","ආයතන","කඩ","කඩවල්",
  "கடை","கடைகள்","சென்டர்","நிலையம்","டவுன்","டவுண்",
  "place","places","center","centre","shop","shops",
]);


const scrub = (s: string) =>
  s.normalize("NFKC").toLocaleLowerCase().replace(/[.,!?;:/\\()[\]{}"'’–—-]+/g, " ").replace(/\s+/g, " ").trim();

function containsPhrase(haystack: string, phrase: string) {
  return (" " + haystack + " ").includes(" " + scrub(phrase) + " ");
}

export function extractSearchPlace(query: string, places: readonly SearchPlace[] = []) {
  const clean = scrub(query);
  const tokens = clean.split(" ").filter(Boolean);

  // Resolve exact curated aliases before English-only town names.
  const variants = PLACE_ALIASES.flatMap(group =>
    group.forms.map(form => ({place: group.canonical, form: scrub(form)})),
  ).sort((a,b) => b.form.length - a.form.length);
  for (const alias of variants) {
    if (!containsPhrase(clean, alias.form)) continue;
    const town = places.find(place => scrub(place.name) === scrub(alias.place));
    if (!town) continue;
    const phrase = alias.form.split(" ");
    for (let index=0; index<=tokens.length-phrase.length; index++) {
      if (tokens.slice(index,index+phrase.length).join(" ") !== alias.form) continue;
      const before = tokens.slice(0,index);
      if (["in","near","at","around","දී","இல்"].includes(before[before.length-1])) before.pop();
      const after = tokens.slice(index+phrase.length);
      return { location:town, remaining:[...before,...after].join(" ").trim() };
    }
  }

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
    } else if (specificService) {
      // Canonical English product name bridges Sinhala/Tamil query text to
      // English-listed services without claiming every category match sells it.
      const canonical = SPECIFIC_SYNONYMS[best.phrase] || best.phrase;
      const rest = cleaned.replace(best.phrase, " ").split(" ")
        .filter(word => word && !SERVICE_NOISE_WORDS.has(word)).join(" ").trim();
      canonicalQuery = rest ? (canonical + " " + rest).trim() : canonical;
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
