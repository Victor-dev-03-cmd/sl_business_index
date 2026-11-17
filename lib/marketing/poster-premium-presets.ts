/**
 * SLBI Premium Poster Design System v1.
 *
 * The Halloween tokens below come from the owner's exact approved reference
 * specifications. No AI model is asked to spell the brand, headline or offer.
 * Other palettes are color adaptations, sharing the controlled layout grammar.
 */
import type {PosterStyleId} from '@/lib/marketing/poster-reference-library';
import type {VerifiedPosterDesign} from '@/lib/marketing/poster-design-blueprint';
import {POSTER_FONT_PAIRS} from '@/lib/marketing/poster-design-blueprint';
import type {PosterCopyLanguage} from '@/lib/marketing/puter-poster-composer';
export type PremiumPosterStyle=PosterStyleId|'modern';
export type PosterPalette={
  obsidian:string;ambient:string;accent:string;glow:string;violet:string;
  white:string;muted:string;glass:string;glassBorder:string;
};
export type PremiumPosterPreset={
  id:PremiumPosterStyle;label:string;palette:PosterPalette;
  font:{
    display:string;displayAlt:string;brand:string;
    offer:string;body:string;footer:string;
    scriptHeadline?:string;scriptBody?:string;
  };
  overlayGradient?:'dark_bottom_top'|'subtle_vignette';
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
    'Leave only the UPPER 25% clean for a compact bold two-line',
    'condensed display text composited later (NOT inside AI pixels).',
    'Position the HERO SUBJECT across MIDDLE 27%-77% without obscuring',
    'the upper headline zone; preserve the artistically lit subject clearly.',
    'Leave LOWER 71%-95% suitable for a COMPACT dynamically sized glass card',
    'with the approved offer, immediately adjacent CTA and verified contacts.',
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
    'Contemporary premium editorial commercial design with compact two-line typography, prominent central 3D hero and tightly composed glass info card, restrained color and no unnecessary dead space.'),
};
export function resolvePremiumPosterPreset(id:PremiumPosterStyle|null|undefined):PremiumPosterPreset{
  return PREMIUM_POSTER_PRESETS[id||'modern']||PREMIUM_POSTER_PRESETS.modern;
}


/**
 * AI-selected fonts/colors never directly become arbitrary CSS or a remote
 * font URL. Selected pair must match known language-specific OFL families.
 * Existing preset remains the fallback when there is no reviewed blueprint.
 */
export function withVerifiedPosterDesign(
  base:PremiumPosterPreset,design:VerifiedPosterDesign|null|undefined,
  language:PosterCopyLanguage,
):PremiumPosterPreset{
  if(!design)return base;
  const allowed=POSTER_FONT_PAIRS[language].some(pair=>
    pair.headlineFont===design.styling.headlineFont&&
    pair.bodyFont===design.styling.bodyFont);
  if(!allowed)return base;
  const safeHex=(v:string,fallback:string)=>
    /^#[0-9a-f]{6}$/i.test(v)?v:fallback;
  const primary=safeHex(design.styling.primaryColor,base.palette.obsidian);
  const accent=safeHex(design.styling.accentColor,base.palette.accent);
  const requestedText=safeHex(design.styling.textColor,base.palette.white);
  // The information card is dark translucent glass. Reject dark-on-dark
  // text: use white rather than trusting arbitrary AI text color blindly.
  const rgb=(hex:string)=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
  const luminance=(hex:string)=>{
    const v=rgb(hex).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);
    return .2126*v[0]+.7152*v[1]+.0722*v[2];
  };
  const foreground=luminance(requestedText)<.45?'#FFFFFF':requestedText;
  return {
    ...base,
    font:{
      ...base.font,
      ...(language==='en'?{
        display:design.styling.headlineFont,
        body:design.styling.bodyFont,
      }:{
        scriptHeadline:design.styling.headlineFont,
        scriptBody:design.styling.bodyFont,
      }),
    },
    palette:{
      ...base.palette,obsidian:primary,ambient:primary,
      accent,glow:accent,white:foreground,
    },
    overlayGradient:design.styling.overlayGradient,
  };
}
