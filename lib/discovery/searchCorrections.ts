/**
 * SLBI Search Correction v1.0.0 — conservative dictionary-based typo and
 * romanized phonetic fallback, not a neural semantic model.
 * Approximate matching runs only if exact service/category/location matching
 * failed. Never auto-generate a listing or claim a product is in stock.
 */
export const SEARCH_CORRECTIONS_VERSION = "1.0.0";

export type CorrectionDictionaryRow = {
  alias: string;
  alias_kind: "location" | "category" | "service";
  canonical_query: string;
  language?: string | null;
  town_name?: string | null;
  specific_service?: boolean;
  intent_key?: string;
  categories?: string[];
};

export type CorrectionMatch<T extends CorrectionDictionaryRow> = {
  entry: T;
  strategy: "typo" | "phonetic";
  confidence: number;
  matchedPhrase: string;
};

const normalize = (value: string): string =>
  String(value || "").normalize("NFKC").toLocaleLowerCase()
    .replace(/[.,!?;:/\\()[\]{}"'’–—-]+/g, " ")
    .replace(/\s+/g, " ").trim();

const isRomanized = (text: string): boolean =>
  /^[a-z ]+$/.test(text) && text.trim().length >= 6;

const phoneticLatin = (word: string): string =>
  normalize(word)
    .replace(/aa/g,"a").replace(/ee/g,"i").replace(/oo/g,"u")
    .replace(/th/g,"t").replace(/dh/g,"d").replace(/sh/g,"s")
    .replace(/ph/g,"f").replace(/ck/g,"k").replace(/w/g,"v")
    .replace(/([a-z])\1+/g,"$1");

/**
 * A bounded Levenshtein distance on Unicode codepoints (combining marks stay
 * intact as codepoints). Stop when the edit budget cannot be met.
 */
export function boundedEditDistance(a: string, b: string, maxEdits: number): number {
  const left = Array.from(a), right = Array.from(b);
  if (Math.abs(left.length - right.length) > maxEdits) return maxEdits + 1;
  if (left.length === 0) return right.length;
  if (right.length === 0) return left.length;
  let previous = Array.from({length:right.length + 1},(_,i)=>i);
  let beforePrevious: number[] = [];
  for (let i=1;i<=left.length;i++) {
    const next = [i];
    let rowMin=i;
    for (let j=1;j<=right.length;j++) {
      const cost=left[i-1]===right[j-1]?0:1;
      let value=Math.min(previous[j]+1,next[j-1]+1,previous[j-1]+cost);
      // Adjacent key swaps such as "repiar" -> "repair" are a single
      // Damerau-OSA edit, while different services remain separated.
      if (i>1 && j>1 && left[i-1]===right[j-2] &&
          left[i-2]===right[j-1] && beforePrevious.length) {
        value=Math.min(value,beforePrevious[j-2]+1);
      }
      next[j]=value;rowMin=Math.min(rowMin,value);
    }
    if (rowMin>maxEdits) return maxEdits+1;
    beforePrevious=previous;
    previous=next;
  }
  return previous[right.length];
}

const EXCLUDED_LATIN = new Set(["car","food","shop","near","town","city","best","find"]);
const CACHE = new WeakMap<object, Array<{
  text: string; phonetic: string; row: CorrectionDictionaryRow;
}>>();
function indexedDictionary<T extends CorrectionDictionaryRow>(dictionary: readonly T[]) {
  let indexed=CACHE.get(dictionary) as Array<{text:string;phonetic:string;row:T}>|undefined;
  if (!indexed) {
    indexed=dictionary
      .filter(row=>row && typeof row.alias==="string" && row.alias.length>=5 && row.alias.length<=100)
      .map(row=>({text:normalize(row.alias),phonetic:phoneticLatin(row.alias),row}))
      .filter(row=>row.text.length>=5);
    CACHE.set(dictionary,indexed as Array<{text:string;phonetic:string;row:CorrectionDictionaryRow}>);
  }
  return indexed;
}
function matches<T extends CorrectionDictionaryRow>(
  input: string,
  dictionary: readonly T[],
  kind: "intent" | "location",
): CorrectionMatch<T> | null {
  const query=normalize(input);
  if (query.length<6 || query.length>64 || query.split(" ").length>5) return null;
  const entries=indexedDictionary(dictionary).filter(entry =>
    kind==="location" ? entry.row.alias_kind==="location" && Boolean(entry.row.town_name) :
    entry.row.alias_kind!=="location");
  const queryPhonetic=isRomanized(query)?phoneticLatin(query):"";
  const seen=new Map<string,{row:T;confidence:number;strategy:"typo"|"phonetic";matchedPhrase:string}>();
  const qLen=Array.from(query).length;
  for (const entry of entries) {
    const {text,phonetic,row}=entry;
    const aliasLen=Array.from(text).length;
    if (Math.abs(qLen-aliasLen)>2 && (!queryPhonetic || Math.abs(queryPhonetic.length-phonetic.length)>1)) continue;
    // At most one edit for ordinary short terms; two for long phrases.
    const limit=Math.max(qLen,aliasLen)>=11?2:1;
    const distance=boundedEditDistance(query,text,limit);
    let confidence=0, strategy:"typo"|"phonetic"="typo";
    if (distance>0 && distance<=limit) {
      confidence=1-distance/Math.max(qLen,aliasLen);
    }
    // Phonetic matching applies to explicitly tagged Latin transliterations,
    // never to native scripts or generic English category words.
    if (queryPhonetic && (row.language==="ta-Latn"||row.language==="si-Latn") &&
        !EXCLUDED_LATIN.has(query)) {
      const pDist=boundedEditDistance(queryPhonetic,phonetic,1);
      if (pDist<=1 && pDist>0 && queryPhonetic.length>=5 &&
          phonetic.length>=5 && 1-pDist/Math.max(queryPhonetic.length,phonetic.length)>=0.86) {
        const pConfidence=0.91-pDist/Math.max(queryPhonetic.length,phonetic.length)*0.3;
        if (pConfidence>confidence){confidence=pConfidence;strategy="phonetic";}
      }
      if (pDist===0 && query!==text && queryPhonetic.length>=5 && phonetic.length>=5) {
        if(0.92>confidence){confidence=0.92;strategy="phonetic";}
      }
    }
    const threshold=kind==="location"?0.83:(Math.max(qLen,aliasLen)>=10?0.80:0.82);
    if(confidence<threshold || text===query)continue;
    const canonical=kind==="location" ? String(row.town_name||"").toLocaleLowerCase() :
      String(row.canonical_query||"").toLocaleLowerCase();
    if(!canonical)continue;
    const prior=seen.get(canonical);
    if(!prior || confidence>prior.confidence) {
      seen.set(canonical,{row,confidence,strategy,matchedPhrase:entry.text});
    }
  }
  const sorted=[...seen.values()].sort((a,b)=>b.confidence-a.confidence);
  if (!sorted.length)return null;
  // Fail closed: different plausible services/towns must never be guessed.
  if (sorted[1] && sorted[0].confidence-sorted[1].confidence<0.08)return null;
  const best=sorted[0];
  return {entry:best.row,confidence:best.confidence,
    strategy:best.strategy,matchedPhrase:best.matchedPhrase};
}

/** Run only for a whole category/service phrase after town extraction. */
export function findIntentCorrection<T extends CorrectionDictionaryRow>(
  query: string,
  dictionary: readonly T[],
): CorrectionMatch<T> | null {
  const exactPhrase=matches(query,dictionary,"intent");
  if(exactPhrase)return exactPhrase;
  // Common natural-language endings must not block typo recognition.
  const cleaned=normalize(query).replace(/\b(shop|shops|store|stores|place|places|centre|center)\b/g," ")
    .replace(/\s+/g," ").trim();
  return cleaned!==normalize(query) ? matches(cleaned,dictionary,"intent") : null;
}

/** Optional town typo correction; callers must still look up a known town. */
export function findTownCorrection<T extends CorrectionDictionaryRow>(
  query: string,
  dictionary: readonly T[],
): CorrectionMatch<T> | null {
  return matches(query,dictionary,"location");
}
