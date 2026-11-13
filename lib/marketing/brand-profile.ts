/**
 * SLBI Marketing Engine — P2-01 business-scoped brand identity contract.
 * Brand details are vendor-asserted context, NOT a source of verified prices,
 * customer characteristics, offers, payment permissions or social credentials.
 */
export const BRAND_LANGUAGES = ['en', 'ta', 'si'] as const;
export const BRAND_TONES = ['professional', 'friendly', 'bold', 'elegant', 'playful'] as const;

export type BrandLanguage = (typeof BRAND_LANGUAGES)[number];
export type BrandTone = (typeof BRAND_TONES)[number];
export type BrandOffer = {
  title: string;
  details: string;
  validUntil: string | null;
};
export type BrandProfileInput = {
  businessId: string;
  brandName: string;
  slogan: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  audience: string;
  tone: BrandTone;
  languages: BrandLanguage[];
  guidelines: string;
  offers: BrandOffer[];
};

export type BrandValidation =
  | { ok: true; value: BrandProfileInput }
  | { ok: false; error: string };

export const BRAND_DEFAULTS = {
  slogan: '',
  primaryColor: '#202024',
  secondaryColor: '#FFFFFF',
  accentColor: '#FF7900',
  audience: '',
  tone: 'professional' as BrandTone,
  languages: ['en', 'ta', 'si'] as BrandLanguage[],
  guidelines: '',
  offers: [] as BrandOffer[],
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX = /^#[0-9A-Fa-f]{6}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const allowedKeys = [
  'businessId','brandName','slogan','primaryColor','secondaryColor',
  'accentColor','audience','tone','languages','guidelines','offers',
] as const;
const allowedOfferKeys = ['title','details','validUntil'] as const;
const limit = (value: unknown, max: number) =>
  typeof value === 'string' && value.trim().length <= max ? value.trim() : null;
const hasOnlyKeys = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).every(key => keys.includes(key));
const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

export function validateBrandProfile(payload: unknown): BrandValidation {
  if (!isRecord(payload) || !hasOnlyKeys(payload, allowedKeys)) {
    return { ok:false, error:'Invalid or unexpected brand fields.' };
  }
  if (typeof payload.businessId !== 'string' || !UUID.test(payload.businessId)) {
    return { ok:false, error:'Select a valid owned business.' };
  }
  const brandName = limit(payload.brandName,100);
  const slogan = limit(payload.slogan,160);
  const audience = limit(payload.audience,240);
  const guidelines = limit(payload.guidelines,2000);
  if (brandName === null || brandName.length < 2 || !/\p{L}/u.test(brandName)
    || slogan === null || audience === null || guidelines === null) {
    return { ok:false, error:'Brand name, tagline, audience or guidelines exceed their allowed length.' };
  }
  const colors: Record<'primaryColor'|'secondaryColor'|'accentColor', string> = {
    primaryColor:'', secondaryColor:'',accentColor:'',
  };
  for (const key of ['primaryColor','secondaryColor','accentColor'] as const) {
    const color = payload[key];
    if (typeof color !== 'string' || !HEX.test(color)) {
      return { ok:false, error:'Brand colors must be six-digit hexadecimal values.' };
    }
    colors[key] = color.toUpperCase();
  }
  if (typeof payload.tone !== 'string' || !BRAND_TONES.includes(payload.tone as BrandTone)) {
    return { ok:false, error:'Select a supported brand voice.' };
  }
  if (!Array.isArray(payload.languages) || payload.languages.length < 1 ||
      payload.languages.length > BRAND_LANGUAGES.length ||
      new Set(payload.languages).size !== payload.languages.length ||
      !payload.languages.every(x => BRAND_LANGUAGES.includes(x))) {
    return { ok:false, error:'Select one or more supported, distinct languages.' };
  }
  if (!Array.isArray(payload.offers) || payload.offers.length > 5) {
    return { ok:false, error:'A brand profile supports at most five factual offers.' };
  }
  const offers: BrandOffer[] = [];
  for (const offer of payload.offers) {
    if (!isRecord(offer) || !hasOnlyKeys(offer, allowedOfferKeys)) {
      return { ok:false, error:'An offer has invalid fields.' };
    }
    const title = limit(offer.title,100), details = limit(offer.details,500);
    const date = offer.validUntil === null ? null : limit(offer.validUntil,10);
    if (!title || !details || date === undefined || (date !== null &&
      (!DATE.test(date) || !Number.isFinite(Date.parse(date + 'T00:00:00Z')) ||
       new Date(date + 'T00:00:00Z').toISOString().slice(0,10) !== date))) {
      return { ok:false, error:'Offer title, conditions or expiry date is invalid.' };
    }
    offers.push({ title, details, validUntil:date });
  }
  return { ok:true, value:{
    businessId:payload.businessId,
    brandName, slogan, ...colors, audience,
    tone:payload.tone as BrandTone,
    languages:[...payload.languages] as BrandLanguage[],
    guidelines, offers,
  }};
}
