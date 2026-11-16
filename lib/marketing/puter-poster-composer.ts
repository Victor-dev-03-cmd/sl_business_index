import {POSTER_FORMATS,type PosterFormat} from '@/lib/marketing/poster-design';
import {renderPremiumPoster} from '@/lib/marketing/puter-premium-poster-renderer';
import type {PremiumPosterStyle} from '@/lib/marketing/poster-premium-presets';

export type PosterCopyLanguage='ta'|'si'|'en';
export type ExactPosterCopy={
  businessName:string;
  headline:string;
  offer:string;
  service:string;
  cta:string;
  phone:string;
  website:string;
  email?:string;
  language:PosterCopyLanguage;
  accentColor:string;
};

/**
 * The image provider draws ART ONLY. Text is drawn by the browser's Unicode
 * typography engine, with no LLM rendering letters or silently editing names,
 * numerals, website domains, offer percentages or selected-business facts.
 */
const fonts:Record<PosterCopyLanguage,string>={
  ta:'"Noto Sans Tamil", "Nirmala UI", sans-serif',
  si:'"Noto Sans Sinhala", "Nirmala UI", sans-serif',
  en:'"Inter", "Segoe UI", Arial, sans-serif',
};
const locale:Record<PosterCopyLanguage,string>={ta:'ta-LK',si:'si-LK',en:'en-LK'};

export function extractExplicitPercentage(text:string):string{
  // Only explicit percentage digits supplied by the vendor can become a badge.
  // Never infer an amount or append a second percent sign to user text.
  const match=text.match(/(?:^|[^\d])(\d{1,3}(?:\.\d{1,2})?)\s*(?:%|percent\b|percentage\b|சதவீதம்|ප්‍රතිශතයක්)/iu);
  if(!match)return '';
  const amount=Number(match[1]);
  return amount>0&&amount<=100?match[1]+'%':'';
}
export function buildArtOnlyPrompt(input:{
  request:string;creativeDirection?:string;styleDirection?:string;businessCategory:string;
  city:string;brandColor:string;format:PosterFormat;
}):string{
  const short=(v:string,max:number)=>v.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max);
  const dimensions=POSTER_FORMATS[input.format];
  // Explicit user instructions outrank chosen reference and optional Gemini brief.
  // A phrase like "neon podium with no pumpkins" must not silently turn into
  // an unrelated pumpkin illustration simply because Halloween was selected.
  return [
    'CREATE ONE PREMIUM COMMERCIAL BACKGROUND ARTWORK ONLY. The user is the art director.',
    'HIGHEST PRIORITY — USER REQUIREMENTS. Obey the concrete objects, subject, materials, colors, camera, composition and exclusions stated here. Do not replace their subject with a generic festive scene:',
    short(input.request,1200),
    'SECOND PRIORITY — OUTPUT COMPOSITION. Final frame ratio '+dimensions.width+':'+dimensions.height+'. The SLBI image is rendered behind separately typeset business text.',
    input.format==='landscape'?
      'Keep hero on RIGHT and a usable dark, uncluttered content area on LEFT.':
      'Reserve clean visual space in the UPPER 30% for huge display typography. Put the main requested hero through MIDDLE 30–58%. Reserve the LOWER 59–94% for a frosted-glass information card, CTA and contact details. Do NOT bake that text or card lettering into AI pixels.',
    'THIRD PRIORITY — STYLE INSPIRATION ONLY (ignore any conflicting subjects/objects): '+short(input.styleDirection||'',700),
    'FOURTH PRIORITY — OPTIONAL GEMINI CREATIVE SUGGESTION (only if it does not conflict): '+short(input.creativeDirection||'',420),
    'ACTUAL VERIFIED BUSINESS SECTOR: '+short(input.businessCategory,120),
    input.city?'Location context: '+short(input.city,75):'',
    input.brandColor?'Brand accent palette hint: '+short(input.brandColor,14):'',
    'Polished premium editorial graphic design, sharp commercial studio lighting, high-end realistic 3D depth, clean layout, uncluttered typography-safe spaces.',
    'STRICT: no AI-generated words, letters, numerals, prices, slogans, watermarks, logos, pseudo-glyphs, fake UI labels, invented brand names, contact details or offer percentages. They will be composited exactly by the web typography engine.',
    'When a seasonal reference and the user request disagree, ALWAYS honor the user request. No extra pumpkins, moons, trees, fireworks, people or objects unless requested.',
  ].filter(Boolean).join('\n').slice(0,3900);
}

const clean=(v:string,max:number)=>v.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max);
const hex=(v:string)=>/^#[\da-f]{6}$/i.test(v)?v:'#F7B45C';
async function ensureFonts(language:PosterCopyLanguage,style?:PremiumPosterStyle,copy?:ExactPosterCopy){
  if(typeof document==='undefined')throw Error('Poster typography needs a browser.');
  const name=language==='ta'?'Noto Sans Tamil':language==='si'?'Noto Sans Sinhala':'Inter';
  const sample=language==='ta'?'தமிழ்':language==='si'?'සිංහල':'Poster';
  // These fonts are loaded through typography.css. Reject instead of exporting
  // tofu glyphs when complex-script web fonts cannot be loaded.
  const loaded=await document.fonts.load('700 48px "'+name+'"',sample);
  if(loaded.length===0&&language!=='en')
    throw Error('The '+name+' font was not loaded. Check network access and retry PNG export.');
  if(style){
    // Latin brand/contact fragments can occur inside a Tamil/Sinhala poster;
    // load the role-specific Latin fonts regardless of the UI language.
    const requires:[string,string][]=[
      ['400 190px "Anton"','HALLOWEEN'],
      ['600 36px "Space Grotesk"','Laxsan Dev'],
      ['800 84px "Plus Jakarta Sans"','30% OFF'],
      ['500 32px "Inter"','Professional Services'],
      ['700 28px "Plus Jakarta Sans"','CONTACT'],
      ['400 24px "JetBrains Mono"','example.com'],
    ];
    const allText=copy?Object.values(copy).filter(v=>typeof v==='string').join(' '):'';
    const needsTamil=language==='ta'||/[\u0B80-\u0BFF]/u.test(allText);
    const needsSinhala=language==='si'||/[\u0D80-\u0DFF]/u.test(allText);
    for(const [required,scriptSample] of [
      ...(needsTamil?[['Noto Sans Tamil','தமிழ்']]:[]),
      ...(needsSinhala?[['Noto Sans Sinhala','සිංහල']]:[]),
    ] as string[][]){
      for(const size of [500,700,800])
        requires.push([size+' 84px "'+required+'"',scriptSample]);
    }
    for(const [spec,sampleText] of requires){
      const ready=await document.fonts.load(spec,sampleText);
      if(!ready.length)
        throw Error('Premium font '+spec+' failed to load. Check connectivity and retry export.');
    }
  }
  await document.fonts.ready;
}
function graphemes(text:string,language:PosterCopyLanguage):string[]{
  if(typeof Intl.Segmenter==='function')
    return Array.from(new Intl.Segmenter(locale[language],{granularity:'grapheme'}).segment(text),x=>x.segment);
  return Array.from(text);
}
function linesFor(ctx:CanvasRenderingContext2D,text:string,maxWidth:number,language:PosterCopyLanguage):string[]{
  const words=text.split(/\s+/u).filter(Boolean);
  const out:string[]=[];let current='';
  const push=()=>{if(current){out.push(current);current='';}};
  for(const word of words){
    const candidate=current?current+' '+word:word;
    if(ctx.measureText(candidate).width<=maxWidth){current=candidate;continue;}
    push();
    if(ctx.measureText(word).width<=maxWidth){current=word;continue;}
    // Long Tamil/Sinhala words and URLs split only at full grapheme clusters.
    // This preserves the exact Unicode content; it never changes spelling.
    let segment='';
    for(const part of graphemes(word,language)){
      const next=segment+part;
      if(segment&&ctx.measureText(next).width>maxWidth){out.push(segment);segment=part;}
      else segment=next;
    }
    current=segment;
  }
  push();
  return out;
}
function textBlock(ctx:CanvasRenderingContext2D,params:{
  text:string;x:number;y:number;width:number;maxLines:number;
  font:number;minFont:number;lineHeight:number;weight:400|600|700;
  color:string;language:PosterCopyLanguage;label:string;maxHeight?:number;
}):number{
  if(!params.text.trim())return params.y;
  const content=clean(params.text,250);
  for(let size=params.font;size>=params.minFont;size-=2){
    ctx.font=params.weight+' '+size+'px '+fonts[params.language];
    const lines=linesFor(ctx,content,params.width,params.language);
    const lineH=Math.ceil(size*params.lineHeight);
    if(lines.length<=params.maxLines &&
       (!params.maxHeight||lines.length*lineH<=params.maxHeight)){
      ctx.textAlign='left';ctx.textBaseline='top';ctx.fillStyle=params.color;
      lines.forEach((line,i)=>ctx.fillText(line,params.x,params.y+i*lineH));
      return params.y+lines.length*lineH;
    }
  }
  throw Error(params.label+' is too long for '+ctx.canvas.width+'×'+ctx.canvas.height+
    '. Shorten the copy; exact words were NOT truncated or changed.');
}
function paintBackground(ctx:CanvasRenderingContext2D,image:HTMLImageElement){
  const w=ctx.canvas.width,h=ctx.canvas.height;
  const scale=Math.max(w/image.naturalWidth,h/image.naturalHeight);
  const dw=image.naturalWidth*scale,dh=image.naturalHeight*scale;
  ctx.drawImage(image,(w-dw)/2,(h-dh)/2,dw,dh);
}
async function decodedImage(src:string):Promise<HTMLImageElement>{
  if(!/^(data:image\/(?:png|jpeg|webp);base64,|blob:|https:\/\/)/i.test(src))
    throw Error('Unexpected Puter image format. The original image cannot be composed safely.');
  if(src.length>28_000_000)throw Error('Image output exceeds the browser composer limit.');
  const image=new Image();
  if(src.startsWith('https://'))image.crossOrigin='anonymous';
  image.decoding='async';
  image.src=src;
  await image.decode();
  if(!image.naturalWidth||!image.naturalHeight)throw Error('Image is empty.');
  return image;
}

export async function composeExactPoster(input:{
  backgroundSrc:string;format:PosterFormat;copy:ExactPosterCopy;style?:PremiumPosterStyle;
}):Promise<Blob>{
  await ensureFonts(input.copy.language,input.style,input.copy);
  const img=await decodedImage(input.backgroundSrc);
  const d=POSTER_FORMATS[input.format];
  const canvas=document.createElement('canvas');
  canvas.width=d.width;canvas.height=d.height;
  const ctx=canvas.getContext('2d');
  if(!ctx)throw Error('Canvas image composition is not available.');
  if(input.style){
    renderPremiumPoster({ctx,image:img,format:input.format,copy:input.copy,style:input.style});
  }else{
  const w=d.width,h=d.height,landscape=input.format==='landscape';
  ctx.fillStyle='#102039';ctx.fillRect(0,0,w,h);
  paintBackground(ctx,img);
  const shade=ctx.createLinearGradient(
    landscape?0:0,landscape?0:h*0.34,
    landscape?w*0.74:0,landscape?0:h,
  );
  if(landscape){
    shade.addColorStop(0,'rgba(8,15,29,0.98)');
    shade.addColorStop(0.63,'rgba(8,15,29,0.88)');
    shade.addColorStop(1,'rgba(8,15,29,0.02)');
  }else{
    shade.addColorStop(0,'rgba(6,14,28,0)');
    shade.addColorStop(0.27,'rgba(6,14,28,0.80)');
    shade.addColorStop(0.66,'rgba(6,14,28,0.96)');
    shade.addColorStop(1,'rgba(6,14,28,0.99)');
  }
  ctx.fillStyle=shade;ctx.fillRect(0,0,w,h);
  const copy=input.copy;
  const padding=landscape?50:Math.round(w*0.072);
  const maxWidth=landscape?590:w-2*padding;
  const accent=hex(copy.accentColor);
  const left=padding;
  const start=landscape?54:Math.round(h*(input.format==='story'?0.545:input.format==='portrait'?0.45:0.385));
  // Visual accent line, not AI generated lettering.
  ctx.fillStyle=accent;
  ctx.fillRect(left,start,landscape?72:90,6);
  let y=start+(landscape?18:30);
  y=textBlock(ctx,{text:copy.businessName,x:left,y,width:maxWidth,maxLines:2,
    font:landscape?28:36,minFont:22,lineHeight:1.34,weight:700,color:'#F8D296',
    language:copy.language,label:'Verified business name'});
  y+=landscape?12:22;
  const availableHeading=landscape?135:input.format==='square'?190:250;
  y=textBlock(ctx,{text:copy.headline,x:left,y,width:maxWidth,maxLines:3,
    font:landscape?50:input.format==='square'?56:input.format==='portrait'?68:82,minFont:landscape?26:28,
    lineHeight:1.3,weight:700,color:'#FFFFFF',
    language:copy.language,label:'Headline',maxHeight:availableHeading});
  y+=landscape?10:18;
  if(copy.offer){
    y=textBlock(ctx,{text:copy.offer,x:left,y,width:maxWidth,maxLines:2,
      font:landscape?52:input.format==='square'?65:input.format==='portrait'?76:86,minFont:landscape?24:30,lineHeight:1.24,
      weight:700,color:accent,language:copy.language,label:'Exact offer',maxHeight:landscape?120:180});
    y+=landscape?9:16;
  }
  if(copy.service){
    y=textBlock(ctx,{text:copy.service,x:left,y,width:maxWidth,maxLines:2,
      font:landscape?24:input.format==='square'?29:input.format==='portrait'?30:37,minFont:landscape?18:20,lineHeight:1.36,
      weight:400,color:'#E8EFF8',language:copy.language,label:'Verified service',maxHeight:landscape?72:120});
    y+=landscape?9:19;
  }
  if(copy.cta){
    y=textBlock(ctx,{text:copy.cta,x:left,y,width:maxWidth,maxLines:2,
      font:landscape?22:input.format==='square'?25:input.format==='portrait'?27:32,minFont:landscape?16:18,lineHeight:1.4,
      weight:600,color:'#FFFFFF',language:copy.language,label:'Call to action',maxHeight:landscape?58:100});
  }
  const contact=[clean(copy.website,180),clean(copy.phone,45)].filter(Boolean).join('   •   ');
  if(contact){
    const footY=landscape?h-65:h-(input.format==='square'?83:110);
    if(y+18>footY)throw Error('Poster copy overlaps verified contact details. Shorten headline or CTA.');
    ctx.strokeStyle='rgba(255,255,255,0.25)';
    ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(left,footY-17);ctx.lineTo(left+maxWidth,footY-17);ctx.stroke();
    textBlock(ctx,{text:contact,x:left,y:footY,width:maxWidth,maxLines:2,
      font:landscape?19:27,minFont:14,lineHeight:1.3,weight:600,color:'#E3E9F4',
      language:copy.language,label:'Published contact',maxHeight:h-footY-padding/2});
  }
  }
  try{
    const blob=await new Promise<Blob>((resolve,reject)=>{
      canvas.toBlob(v=>v?resolve(v):reject(Error('PNG export failed.')),'image/png');
    });
    if(blob.type!=='image/png'||blob.size<1000||blob.size>20_000_000)
      throw Error('Poster output did not pass PNG validation.');
    return blob;
  }catch(e){
    // Cross-origin images without a CORS-enabled data URL cannot be exported.
    if(e instanceof DOMException&&e.name==='SecurityError')
      throw Error('Puter supplied an image that cannot be exported by this browser. Try another image model.');
    throw e;
  }
}
