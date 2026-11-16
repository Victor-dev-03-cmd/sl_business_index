/**
 * Original, SLBI-authored reference artwork and non-public prompt directions.
 * No Google scraping, vendor-owned image reuse, external tracker or API key.
 * Select a campaign to guide composition; no third-party image is copied.
 */
export type PosterStyleId=
  |'christmas'|'newyear'|'pongal'|'avurudu'|'deepavali'
  |'halloween'|'flash'|'tech'|'luxury';
export type PosterReferenceStyle={
  id:PosterStyleId;
  name:string;
  thumbnail:string;
  months:readonly number[]; // Sri Lanka calendar months; approximate marketing seasons
  category:'Festive'|'Promotion'|'Evergreen';
  /** Not shown in the mini-card: internal, style-only art direction. */
  artDirection:string;
};
export const POSTER_REFERENCE_STYLES:readonly PosterReferenceStyle[]=[
  {id:'christmas',name:'Christmas Glow',thumbnail:'/poster-references/christmas.svg',months:[11,12],category:'Festive',
    artDirection:'Premium Christmas campaign visual language: emerald forest green, champagne gold, subtle evergreen silhouettes, warm hanging ornaments and twinkling bokeh. Elegant soft photographic lighting, clean modern commercial framing, generous readable copy-safe zone. No festive greeting text inside the artwork.'},
  {id:'newyear',name:'New Year Spark',thumbnail:'/poster-references/newyear.svg',months:[12,1],category:'Festive',
    artDirection:'Contemporary New Year celebration aesthetic: midnight indigo, electric violet, champagne gold fireworks, elegant city lights and dramatic depth. Confident high-end editorial campaign composition, quiet dark copy-safe area, no digits, dates, words, brand marks or lettering in the art.'},
  {id:'pongal',name:'Thai Pongal',thumbnail:'/poster-references/pongal.svg',months:[1],category:'Festive',
    artDirection:'Tamil Thai Pongal harvest inspiration: warm turmeric gold, terracotta, paddy stalks, sunlight, a traditional clay Pongal pot, authentic South Asian agrarian ambience. Sophisticated festive still-life photograph, restrained rich details, spacious typography area, no words.'},
  {id:'avurudu',name:'Avurudu Fest',thumbnail:'/poster-references/avurudu.svg',months:[4],category:'Festive',
    artDirection:'Sri Lankan Sinhala and Tamil New Year Avurudu atmosphere: golden sunrise, warm saffron and deep green, culturally respectful oil lamps, seasonal flowers and handcrafted festive decorations. Elegant modern advertising photography, art-only composition without text.'},
  {id:'deepavali',name:'Deepavali Gold',thumbnail:'/poster-references/deepavali.svg',months:[10,11],category:'Festive',
    artDirection:'Luxurious Deepavali glow: royal navy, subtle purple and warm metallic gold, beautifully composed traditional diyas, delicate rangoli ornament and celebratory warm light. Premium cinematic product-ad aesthetic, uncluttered dark area for typography, no words.'},
  {id:'halloween',name:'Halloween Neon',thumbnail:'/poster-references/halloween.svg',months:[10],category:'Festive',
    artDirection:'Modern Halloween promotional art: deep violet and charcoal palette with glowing pumpkin orange, tasteful jack-o-lantern silhouette, subtle moonlight, smoky neon gradients. Stylish rather than frightening, deliberate room for a clean headline overlay, no typography.'},
  {id:'flash',name:'Year-End Deals',thumbnail:'/poster-references/flash.svg',months:[11,12],category:'Promotion',
    artDirection:'High-energy year-end promotional campaign: ruby magenta, burnt orange, expressive glossy ribbon forms, diagonal movement and bold high-contrast advertising layout. Keep one clear spacious area for a separate verified offer and price text; no fake percentages or labels in art.'},
  {id:'tech',name:'Modern Tech',thumbnail:'/poster-references/tech.svg',months:[],category:'Evergreen',
    artDirection:'Premium software and AI technology branding: dark navy and electric cyan, subtle glassmorphism, soft-lit circuit patterns and plausible modern laptop or cloud computing scene. Editorial corporate photography, realistic depth and restrained bright highlights, spacious copy-safe area; no invented UI lettering.'},
  {id:'luxury',name:'Minimal Luxury',thumbnail:'/poster-references/luxury.svg',months:[],category:'Evergreen',
    artDirection:'Minimal luxury brand art direction: deep charcoal, espresso and muted metallic champagne, delicate art-deco geometry, soft spotlight and elegant tactile materials. Airy sophisticated editorial composition with generous negative space for separate typesetting; no product logos or lettering.'},
] as const;
export function monthInSriLanka(date:Date):number{
  return Number(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Colombo',month:'numeric'}).format(date));
}
export function suggestedPosterStyles(date:Date,max=6):PosterReferenceStyle[]{
  const month=monthInSriLanka(date);
  const next=(month%12)+1;
  return [...POSTER_REFERENCE_STYLES]
    .sort((a,b)=>{
      const rank=(v:PosterReferenceStyle)=>
        v.months.includes(month)?0:v.months.includes(next)?1:v.category==='Evergreen'?2:3;
      return rank(a)-rank(b);
    }).slice(0,max);
}
export function getPosterReferenceStyle(id:PosterStyleId|null):PosterReferenceStyle|undefined{
  return id?POSTER_REFERENCE_STYLES.find(item=>item.id===id):undefined;
}
/**
 * Convert an original same-origin SVG thumbnail into a modest PNG Blob,
 * because Puter input_images accepts PNG/WebP/JPEG, not SVG.
 * Called only after the owner has opted into using a visual reference.
 */
export async function originalReferencePng(thumbnail:string):Promise<Blob>{
  if(!/^\/poster-references\/[a-z-]+\.svg$/.test(thumbnail))
    throw Error('Only SLBI original reference templates can be uploaded.');
  const source=await fetch(thumbnail,{mode:'same-origin',cache:'force-cache'});
  if(!source.ok)throw Error('The selected SLBI reference image is unavailable.');
  const svg=await source.text();
  if(svg.length>25_000||!svg.startsWith('<svg'))
    throw Error('Invalid reference artwork.');
  const image=new Image();
  const objectUrl=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
  try{
    image.src=objectUrl;
    await image.decode();
    const canvas=document.createElement('canvas');
    canvas.width=640;canvas.height=512;
    const ctx=canvas.getContext('2d');
    if(!ctx)throw Error('Cannot prepare a PNG reference.');
    ctx.drawImage(image,0,0,640,512);
    return await new Promise<Blob>((resolve,reject)=>
      canvas.toBlob(value=>value?resolve(value):reject(Error('PNG reference conversion failed.')),'image/png'));
  }finally{URL.revokeObjectURL(objectUrl);}
}
