/**
 * SLBI Premium Poster Design System v1.
 *
 * The Halloween tokens below come from the owner's exact approved reference
 * specifications. No AI model is asked to spell the brand, headline or offer.
 * Other palettes are color adaptations, sharing the controlled layout grammar.
 */
import type {PosterStyleId} from '@/lib/marketing/poster-reference-library';
export type PremiumPosterStyle=PosterStyleId|'modern';
export type PosterPalette={
  obsidian:string;ambient:string;accent:string;glow:string;violet:string;
  white:string;muted:string;glass:string;glassBorder:string;
};
export type PremiumPosterPreset={
  id:PremiumPosterStyle;label:string;palette:PosterPalette;
  font:{
    display:'Anton';displayAlt:'Bebas Neue';brand:'Space Grotesk';
    offer:'Plus Jakarta Sans';body:'Inter';footer:'JetBrains Mono';
  };
  tokens:{
    storyDisplaySize:readonly [180,220];storyBrandSize:36;storyOfferSize:84;
    storyServiceSize:32;storyButtonSize:28;storyFooterSize:24;
    displayTracking:-0.02;displayLineHeight:0.9;
    glassBlur:24;glassRadius:32;glassBorderWidth:1.5;
    neonTextBlur:28;neonButtonBlur:24;violetGlowBlur:32;
  };
  artDirective:string;
};
export const HALLOWEEN_TECH_PALETTE:PosterPalette={
  obsidian:'#07070C',
  ambient:'#18082E',
  accent:'#FF5E00',
  glow:'#FF8A00',
  violet:'#8A2BE2',
  white:'#FFFFFF',
  muted:'#B8B8C7',
  glass:'rgba(18, 16, 28, 0.72)',
  glassBorder:'rgba(255, 255, 255, 0.14)',
};
const baseFonts={
  display:'Anton',displayAlt:'Bebas Neue',brand:'Space Grotesk',
  offer:'Plus Jakarta Sans',body:'Inter',footer:'JetBrains Mono',
} as const;
const sharedTokens={
  storyDisplaySize:[180,220],storyBrandSize:36,storyOfferSize:84,
  storyServiceSize:32,storyButtonSize:28,storyFooterSize:24,
  displayTracking:-0.02,displayLineHeight:0.9,
  glassBlur:24,glassRadius:32,glassBorderWidth:1.5,
  neonTextBlur:28,neonButtonBlur:24,violetGlowBlur:32,
} as const;

function variant(
  id:PremiumPosterStyle,label:string,
  accent:string,ambient:string,violet:string,
  artDirective:string,
):PremiumPosterPreset{
  return {
    id,label,
    palette:{
      ...HALLOWEEN_TECH_PALETTE,
      ambient,accent,glow:accent,violet,
    },
    font:baseFonts,tokens:sharedTokens,artDirective,
  };
}
const halloween:PremiumPosterPreset={
  id:'halloween',
  label:'Halloween Tech Neon',
  palette:HALLOWEEN_TECH_PALETTE,
  font:baseFonts,
  tokens:sharedTokens,
  artDirective:[
    'Premium 3D Halloween-tech commercial editorial layout. Deep obsidian',
    'black (#07070C) with violet (#8A2BE2) and pumpkin-orange (#FF5E00)',
    'glows. Floating glassmorphism technology symbols, sophisticated metallic',
    'materials, rich ambient purple (#18082E), crisp studio lighting.',
    'Leave the UPPER 30% intentionally dark/quiet for extremely large bold',
    'condensed display text composited later (NOT inside AI pixels).',
    'Position the HERO SUBJECT in the MIDDLE 30%-58% without obscuring',
    'the upper headline zone. Leave the LOWER 59%-93% suitable for a',
    'separately-rendered frosted dark-glass offer card with button and contacts.',
    'DO NOT place text, fake icons with glyphs, invented discounts, letters,',
    'numerals or decorative slogans in the background itself.',
    'If the owner requested a specific hero (such as a podium), keep that exact',
    'hero. Do not add pumpkins, moons or trees unless the owner requested them.',
  ].join(' '),
};
export const PREMIUM_POSTER_PRESETS:Readonly<Record<PremiumPosterStyle,PremiumPosterPreset>>={
  halloween,
  christmas:variant('christmas','Christmas Luxe','#E5C17E','#12362D','#659878',
    'Elegant Christmas gift-like campaign aesthetic. Rich forest green, warm champagne ornaments, glossy materials, soft seasonal bokeh. Quiet upper heading area and lower glass CTA panel.'),
  newyear:variant('newyear','New Year Spark','#FFB35C','#13143E','#865ED2',
    'Sophisticated New Year nightlife editorial mood. Violet-indigo highlights, champagne sparks, cinematic controlled fireworks, premium glass surfaces. Quiet upper heading area, lower glass information panel.'),
  pongal:variant('pongal','Pongal Heritage Premium','#EAA958','#623321','#A8663C',
    'Modern Tamil harvest festival aesthetic with respectful clay pottery, grains, rising warm sunlight, subtle premium copper materials. Composition must preserve clean headline and lower CTA panel.'),
  avurudu:variant('avurudu','Avurudu Festive Modern','#FFD080','#453020','#B27A4E',
    'Elegant Sri Lankan Sinhala and Tamil New Year art. Festive oil lamps, saffron warmth, handcrafted ornament; premium high-contrast editorial design and clean upper and lower text zones.'),
  deepavali:variant('deepavali','Deepavali Gold','#FFB65E','#14143F','#7450BD',
    'Luxurious Deepavali night in navy and warm gold, glowing traditional diyas, cinematic depth and premium materials; headline and lower glass-card zones left clear.'),
  flash:variant('flash','Year-End Deals','#FF6A46','#3B0B28','#C3327F',
    'High-contrast editorial campaign with dramatic movement, glossy ribbons, luminous warm pink-red light; accommodate oversized typography and clear offer card.'),
  tech:variant('tech','Modern Tech','#43D6F3','#0A2041','#4F8CDA',
    'Futuristic modern tech and AI brand artwork. Deep navy, cyan rim lighting, refined 3D technology motifs, premium editorial composition and clear large headline and offer zones.'),
  luxury:variant('luxury','Minimal Luxury','#E2BA7D','#1D1722','#AB86A3',
    'Minimal editorial luxury design. Charcoal, gold, subdued champagne and soft spotlight. Architectural negative space, sophisticated materials, clean header and glass card.'),
  modern:variant('modern','Modern Editorial','#FF8A00','#15233A','#607CBC',
    'Contemporary premium editorial commercial graphic design with a sophisticated large typography-safe header, polished 3D hero and glass info card, restrained colors and generous spacing.'),
};
export function resolvePremiumPosterPreset(id:PremiumPosterStyle|null|undefined):PremiumPosterPreset{
  return PREMIUM_POSTER_PRESETS[id||'modern']||PREMIUM_POSTER_PRESETS.modern;
}
