import type {PosterFormat} from '@/lib/marketing/poster-design';
import {planStackedCard} from '@/lib/marketing/puter-adaptive-card-layout';
import type {ExactPosterCopy,PosterCopyLanguage} from '@/lib/marketing/puter-poster-composer';
import {
  resolvePremiumPosterPreset,withVerifiedPosterDesign,
  type PremiumPosterStyle,
  type PremiumPosterPreset,
} from '@/lib/marketing/poster-premium-presets';
import {
  DEFAULT_CONTENT_PANEL_STYLE,
  type ContentPanelStyle,type VerifiedPosterDesign,type SafeZoneLayout,
} from '@/lib/marketing/poster-design-blueprint';
import {
  paintLowerContentPanel,paintLowerCta,paintLowerOfferHighlight,
} from '@/lib/marketing/puter-content-panel-styles';

type Ctx=CanvasRenderingContext2D;
type Role='display'|'brand'|'offer'|'body'|'button'|'footer';
function scriptOf(value:string,preferred:PosterCopyLanguage):PosterCopyLanguage{
  // A Tamil-selected UI can print an English headline in Anton while keeping
  // actual Tamil/Sinhala copy in properly shaped Unicode fonts.
  if(/[\u0B80-\u0BFF]/u.test(value))return 'ta';
  if(/[\u0D80-\u0DFF]/u.test(value))return 'si';
  if(/[A-Za-z]/.test(value))return 'en';
  return preferred;
}
const unicodeFace:Record<PosterCopyLanguage,string>={
  ta:'"Pavanam",sans-serif',
  si:'"Maname",sans-serif',
  en:'"Inter",Arial,sans-serif',
};
function family(language:PosterCopyLanguage,role:Role,p:PremiumPosterPreset):string{
  // Owner-selected typography is invariant even when Gemini suggests a
  // legacy valid font. Tamil intentionally uses the SAME Pavanam face for all
  // script text; Sinhala uses Gemunu Libre display and Maname supporting text.
  if(language==='ta')return '"Pavanam",'+unicodeFace.ta;
  if(language==='si')return role==='display'?
    '"Gemunu Libre",'+unicodeFace.si:'"Maname",'+unicodeFace.si;
  const key=role==='display'?'display':role==='button'?'offer':role==='footer'?'footer':
    role==='brand'?'brand':role;
  return '"'+p.font[key]+'",Arial,sans-serif';
}
function weight(language:PosterCopyLanguage,role:Role):number{
  if(role==='display')return language==='en'?400:700; // Anton is a 400-weight display face
  return role==='offer'?800:role==='footer'?400:role==='body'?500:role==='brand'?600:700;
}
function setFont(ctx:Ctx,size:number,role:Role,language:PosterCopyLanguage,p:PremiumPosterPreset){
  const value=Math.max(12,Math.round(size));
  const selectedFamily=role==='display'?
    (language==='en'?p.font.display:p.font.scriptHeadline):
    (language==='en'&&role==='body'?p.font.body:
      language!=='en'?p.font.scriptBody:'');
  const resolvedWeight=language==='ta'?400:
    (language==='si'&&role!=='display')?400:
    selectedFamily==='Kavivanar'||selectedFamily==='Anton'||
    selectedFamily==='Bebas Neue'?400:weight(language,role);
  ctx.font=resolvedWeight+' '+value+'px '+family(language,role,p);
  const tracked=ctx as Ctx & {letterSpacing?:string};
  tracked.letterSpacing=role==='display'&&language==='en'?
    Math.round(-0.02*value)+'px':'0px';
}
function clean(v:string):string{
  if(v.length>300)throw Error('Approved poster copy is too long. Please shorten it before exporting.');
  return v.replace(/[\u0000-\u001f\u007f]/g,' ').trim();
}
function clusters(input:string,lang:PosterCopyLanguage):string[]{
  if(typeof Intl.Segmenter==='function')
    return Array.from(new Intl.Segmenter(lang==='ta'?'ta-LK':lang==='si'?'si-LK':'en-LK',{granularity:'grapheme'}).segment(input),v=>v.segment);
  return Array.from(input);
}
function wrap(ctx:Ctx,text:string,maxWidth:number,lang:PosterCopyLanguage):string[]{
  const words=text.split(/\s+/u).filter(Boolean),result:string[]=[];
  let part='';
  for(const word of words){
    const test=part?part+' '+word:word;
    if(ctx.measureText(test).width<=maxWidth){part=test;continue;}
    if(part){result.push(part);part='';}
    if(ctx.measureText(word).width<=maxWidth){part=word;continue;}
    let chunk='';
    for(const glyph of clusters(word,lang)){
      if(chunk&&ctx.measureText(chunk+glyph).width>maxWidth){
        result.push(chunk);chunk=glyph;
      }else chunk+=glyph;
    }
    part=chunk;
  }
  if(part)result.push(part);
  return result;
}
type Fitted={lines:string[];size:number;step:number;height:number};
function fit(ctx:Ctx,params:{
  value:string;width:number;height:number;maxLines:number;
  start:number;min:number;lineHeight:number;role:Role;
  lang:PosterCopyLanguage;preset:PremiumPosterPreset;label:string;
}):Fitted{
  const value=clean(params.value);
  if(!value)return {lines:[],size:0,step:0,height:0};
  for(let size=params.start;size>=params.min;size-=2){
    setFont(ctx,size,params.role,params.lang,params.preset);
    const lines=wrap(ctx,value,params.width,params.lang);
    const step=size*params.lineHeight;
    if(lines.length<=params.maxLines&&lines.length*step<=params.height)
      return {lines,size,step,height:lines.length*step};
  }
  throw Error(params.label+' will not fit the selected poster size. Shorten that copy; spelling and content were not changed.');
}
function renderFitted(ctx:Ctx,p:{
  fit:Fitted;x:number;y:number;width:number;color:string;
  role:Role;language:PosterCopyLanguage;preset:PremiumPosterPreset;
  center?:boolean;glow?:number;glowColor?:string;emphasizeFinalLine?:boolean;
}):number{
  ctx.save();
  setFont(ctx,p.fit.size,p.role,p.language,p.preset);
  ctx.textBaseline='top';ctx.textAlign=p.center?'center':'left';
  ctx.shadowColor=p.glowColor||p.color;ctx.shadowBlur=p.glow||0;
  p.fit.lines.forEach((line,i)=>{
    ctx.fillStyle=p.emphasizeFinalLine&&i===p.fit.lines.length-1?p.preset.palette.glow:p.color;
    const x=p.center?p.x+p.width/2:p.x,y=p.y+i*p.fit.step;
    if(p.language==='ta'&&p.role==='display'){
      // Pavanam has a real Regular face only. A subtle same-family outline
      // creates strong display weight WITHOUT substituting another Tamil font.
      ctx.lineJoin='round';ctx.lineWidth=Math.min(2.8,Math.max(.9,p.fit.size*.012));
      ctx.strokeStyle=ctx.fillStyle;ctx.strokeText(line,x,y);
    }
    ctx.fillText(line,x,y);
  });
  ctx.restore();
  return p.y+p.fit.height;
}
function roundedPath(ctx:Ctx,x:number,y:number,w:number,h:number,r:number){
  const radius=Math.max(0,Math.min(r,w/2,h/2));
  ctx.beginPath();ctx.moveTo(x+radius,y);ctx.lineTo(x+w-radius,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+radius);
  ctx.lineTo(x+w,y+h-radius);ctx.quadraticCurveTo(x+w,y+h,x+w-radius,y+h);
  ctx.lineTo(x+radius,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-radius);
  ctx.lineTo(x,y+radius);ctx.quadraticCurveTo(x,y,x+radius,y);
  ctx.closePath();
}
function glassPanel(ctx:Ctx,x:number,y:number,w:number,h:number,p:PremiumPosterPreset,scale:number){
  // Canvas does not persist CSS backdrop-filter into PNG.
  // Blur a snapshot of the image under a clipped panel, then layer glass tint.
  // Snapshot only exists in browser memory; no added image API call.
  const snapshot=document.createElement('canvas');
  snapshot.width=ctx.canvas.width;snapshot.height=ctx.canvas.height;
  const sc=snapshot.getContext('2d');
  if(sc)sc.drawImage(ctx.canvas,0,0);
  ctx.save();
  roundedPath(ctx,x,y,w,h,p.tokens.glassRadius*scale);ctx.clip();
  if(sc){
    ctx.filter='blur('+Math.max(8,Math.round(p.tokens.glassBlur*scale))+'px)';
    ctx.drawImage(snapshot,0,0);
    ctx.filter='none';
  }
  ctx.fillStyle=p.palette.glass;
  ctx.fillRect(x,y,w,h);
  ctx.restore();
  ctx.save();
  roundedPath(ctx,x,y,w,h,p.tokens.glassRadius*scale);
  ctx.strokeStyle=p.palette.glassBorder;
  ctx.lineWidth=Math.max(1,p.tokens.glassBorderWidth*scale);
  ctx.stroke();
  ctx.restore();
}
function drawBackdrop(ctx:Ctx,image:HTMLImageElement,mode:'stacked'|'wide',p:PremiumPosterPreset){
  const w=ctx.canvas.width,h=ctx.canvas.height;
  ctx.fillStyle=p.palette.obsidian;ctx.fillRect(0,0,w,h);
  // Source photography is drawn first; we add actual gradients and glass in PNG,
  // not CSS-only decorations that would be missing from Download.
  const factor=Math.max(w/image.naturalWidth,h/image.naturalHeight);
  ctx.drawImage(image,(w-image.naturalWidth*factor)/2,
    (h-image.naturalHeight*factor)/2,image.naturalWidth*factor,image.naturalHeight*factor);
  const ambient=ctx.createRadialGradient(w*.5,h*.25,10,w*.5,h*.25,Math.max(w,h)*.62);
  ambient.addColorStop(0,'rgba(36,11,66,0.18)');ambient.addColorStop(1,'rgba(7,7,12,0.10)');
  ctx.fillStyle=ambient;ctx.fillRect(0,0,w,h);
  const shade=ctx.createLinearGradient(mode==='wide'?0:0,mode==='wide'?0:0,
    mode==='wide'?w:0,mode==='wide'?0:h);
  if(mode==='wide'){
    shade.addColorStop(0,'rgba(7,7,12,.93)');shade.addColorStop(.56,'rgba(7,7,12,.72)');
    shade.addColorStop(1,'rgba(7,7,12,.10)');
  }else{
    if(p.overlayGradient==='subtle_vignette'){
      shade.addColorStop(0,'rgba(7,7,12,.54)');
      shade.addColorStop(.26,'rgba(7,7,12,.10)');
      shade.addColorStop(.52,'rgba(7,7,12,.04)');
      shade.addColorStop(.68,'rgba(7,7,12,.28)');
      shade.addColorStop(1,'rgba(7,7,12,.72)');
    }else{
      shade.addColorStop(0,'rgba(7,7,12,.78)');
      shade.addColorStop(.26,'rgba(7,7,12,.26)');
      shade.addColorStop(.52,'rgba(7,7,12,.05)');
      shade.addColorStop(.68,'rgba(7,7,12,.53)');
      shade.addColorStop(1,'rgba(7,7,12,.88)');
    }
  }
  ctx.fillStyle=shade;ctx.fillRect(0,0,w,h);
}
function drawPill(ctx:Ctx,p:{
  text:string;x:number;y:number;w:number;h:number;scale:number;
  language:PosterCopyLanguage;preset:PremiumPosterPreset;panelStyle:ContentPanelStyle;
}){
  if(!p.text)return;
  const pal=p.preset.palette;
  ctx.save();
  const buttonTextColor=paintLowerCta({
    ctx,style:p.panelStyle,x:p.x,y:p.y,w:p.w,h:p.h,
    scale:p.scale,colors:pal,
  });
  const label=fit(ctx,{value:p.text,width:p.w-28*p.scale,height:p.h*.7,maxLines:1,
    start:28*p.scale,min:14*p.scale,lineHeight:1.2,role:'button',
    lang:p.language,preset:p.preset,label:'Call-to-action button'});
  renderFitted(ctx,{fit:label,x:p.x,y:p.y+(p.h-label.height)/2,
    width:p.w,color:buttonTextColor,role:'button',language:p.language,preset:p.preset,center:true});
  ctx.restore();
}
function contactIcon(ctx:Ctx,type:'globe'|'phone'|'mail',x:number,y:number,s:number,color:string){
  ctx.save();ctx.strokeStyle=color;ctx.lineWidth=Math.max(1.5,s*.1);
  ctx.lineCap='round';ctx.lineJoin='round';
  if(type==='globe'){
    ctx.beginPath();ctx.arc(x+s/2,y+s/2,s*.42,0,Math.PI*2);
    ctx.moveTo(x+s*.08,y+s*.5);ctx.lineTo(x+s*.92,y+s*.5);
    ctx.moveTo(x+s*.5,y+s*.08);
    ctx.bezierCurveTo(x+s*.22,y+s*.3,x+s*.22,y+s*.7,x+s*.5,y+s*.92);
    ctx.bezierCurveTo(x+s*.78,y+s*.7,x+s*.78,y+s*.3,x+s*.5,y+s*.08);
    ctx.stroke();
  }else if(type==='mail'){
    ctx.strokeRect(x+s*.1,y+s*.22,s*.8,s*.56);
    ctx.beginPath();ctx.moveTo(x+s*.1,y+s*.24);ctx.lineTo(x+s*.5,y+s*.55);
    ctx.lineTo(x+s*.9,y+s*.24);ctx.stroke();
  }else{
    ctx.beginPath();ctx.moveTo(x+s*.28,y+s*.14);
    ctx.bezierCurveTo(x+s*.12,y+s*.19,x+s*.22,y+s*.63,x+s*.56,y+s*.82);
    ctx.bezierCurveTo(x+s*.75,y+s*.97,x+s*.89,y+s*.76,x+s*.83,y+s*.65);
    ctx.lineTo(x+s*.69,y+s*.54);ctx.lineTo(x+s*.59,y+s*.64);
    ctx.bezierCurveTo(x+s*.47,y+s*.55,x+s*.38,y+s*.45,x+s*.36,y+s*.34);
    ctx.lineTo(x+s*.45,y+s*.26);ctx.lineTo(x+s*.33,y+s*.14);ctx.closePath();ctx.stroke();
  }
  ctx.restore();
}
function drawContacts(ctx:Ctx,p:{
  copy:ExactPosterCopy;x:number;y:number;width:number;height:number;
  scale:number;preset:PremiumPosterPreset;lang:PosterCopyLanguage;
}){
  const contacts=[
    {kind:'globe' as const,text:p.copy.website.trim()},
    {kind:'phone' as const,text:p.copy.phone.trim()},
    {kind:'mail' as const,text:p.copy.email?.trim()||''},
  ].filter(item=>item.text);
  if(!contacts.length)return;
  // Do not clip or silently truncate long verified URLs: fit or warn.
  const size=Math.max(13,Math.round(p.preset.tokens.storyFooterSize*p.scale));
  const gap=size*1.65;
  if(contacts.length*gap>p.height+4)
    throw Error('All selected contacts cannot fit this poster. Disable one contact option.');
  contacts.forEach((item,i)=>{
    const y=p.y+i*gap;
    const iconSize=size*.95;
    contactIcon(ctx,item.kind,p.x,y+2,iconSize,p.preset.palette.glow);
    const tx=p.x+iconSize+size*.55;
    const line=fit(ctx,{
      value:item.text,width:p.width-(tx-p.x),height:gap,maxLines:1,
      start:size,min:Math.max(11,size*.69),lineHeight:1.2,
      role:'footer',lang:scriptOf(item.text,p.lang),preset:p.preset,label:'Verified '+item.kind,
    });
    renderFitted(ctx,{fit:line,x:tx,y:y,width:p.width-(tx-p.x),
      color:p.preset.palette.muted,role:'footer',language:scriptOf(item.text,p.lang),preset:p.preset});
  });
}
function renderStacked(ctx:Ctx,copy:ExactPosterCopy,p:PremiumPosterPreset,format:PosterFormat,layoutMode:SafeZoneLayout='top_center_hero',panelStyle:ContentPanelStyle=DEFAULT_CONTENT_PANEL_STYLE){
  const w=ctx.canvas.width,h=ctx.canvas.height;
  const scale=h/1920;
  const side=Math.round(w*.047);
  const inset=35*scale;
  const inner=side+inset;
  const displayLanguage=scriptOf(copy.headline,copy.language);
  const brandLanguage=scriptOf(copy.businessName,copy.language);
  const offerLanguage=scriptOf(copy.offer,copy.language);
  const serviceLanguage=scriptOf(copy.service,copy.language);
  const title=displayLanguage==='en'?copy.headline.toUpperCase():copy.headline;
  // Language-specific headline budget: compact 2-line display leaves a
  // continuous visual hero instead of a huge 3-line glyph wall.
  const titleMax=h*(format==='square'?.26:.27);
  const titleFit=fit(ctx,{
    value:title,width:w-2*side,height:titleMax-16*scale,maxLines:2,
    start:(displayLanguage==='ta'?150:displayLanguage==='si'?167:190)*scale,
    min:Math.max(30,(displayLanguage==='ta'?61:displayLanguage==='si'?70:74)*scale),
    lineHeight:displayLanguage==='en'?.98:displayLanguage==='ta'?1.18:1.19,
    role:'display',lang:displayLanguage,preset:p,label:'Display headline',
  });
  renderFitted(ctx,{fit:titleFit,x:side,
    y:layoutMode==='bottom_left_editorial'?73*scale:45*scale,width:w-2*side,
    color:p.palette.white,role:'display',language:displayLanguage,preset:p,
    center:layoutMode!=='bottom_left_editorial',glow:18*scale,glowColor:'rgba(0,0,0,.82)',
    emphasizeFinalLine:displayLanguage==='en'&&titleFit.lines.length>1,
  });

  // Measure approved text BEFORE painting the glass. The card fits its actual
  // content, rather than spanning a fixed 59%-94% region and pinning the CTA
  // far from the offer. Short copy => a compact card and more visible hero.
  const panelW=layoutMode==='top_center_hero'?w-2*side:
    w*(format==='square'?.82:.84);
  const insideWidth=panelW-2*inset;
  const brand=fit(ctx,{value:copy.businessName,width:insideWidth,height:60*scale,maxLines:1,
    start:p.tokens.storyBrandSize*scale,min:22*scale,lineHeight:1.2,
    role:'brand',lang:brandLanguage,preset:p,label:'Business name'});
  const offer=copy.offer.trim()?fit(ctx,{
    value:copy.offer,width:insideWidth,height:172*scale,maxLines:2,
    start:p.tokens.storyOfferSize*scale,min:28*scale,lineHeight:1.12,
    role:'offer',lang:offerLanguage,preset:p,label:'Approved offer'}):null;
  const service=copy.service.trim()?fit(ctx,{
    value:copy.service,width:insideWidth,height:88*scale,maxLines:2,
    start:p.tokens.storyServiceSize*scale,min:18*scale,lineHeight:1.32,
    role:'body',lang:serviceLanguage,preset:p,label:'Service line'}):null;
  const contactRows=Number(Boolean(copy.website))+Number(Boolean(copy.phone))+Number(Boolean(copy.email));
  const layout=planStackedCard({
    format:format as 'square'|'portrait'|'story',canvasHeight:h,scale,
    brandHeight:brand.height,offerHeight:offer?.height||0,
    serviceHeight:service?.height||0,hasCta:Boolean(copy.cta.trim()),contactRows,
  });
  if(panelStyle==='frosted_glass_modern')
    glassPanel(ctx,side,layout.top,panelW,layout.height,p,scale);
  else paintLowerContentPanel({
    ctx,style:panelStyle,x:side,y:layout.top,w:panelW,h:layout.height,
    scale,colors:p.palette,radius:p.tokens.glassRadius,
    blur:p.tokens.glassBlur,borderWidth:p.tokens.glassBorderWidth,
  });
  const centerText=layoutMode==='top_center_hero';
  renderFitted(ctx,{fit:brand,x:inner,y:layout.brandY,width:insideWidth,
    color:p.palette.glow,role:'brand',language:brandLanguage,preset:p,center:centerText});
  if(offer&&layout.offerY!==null){
    paintLowerOfferHighlight({ctx,style:panelStyle,x:inner-7*scale,
      y:layout.offerY-5*scale,w:insideWidth+14*scale,h:offer.height+10*scale,
      scale,colors:p.palette});
    renderFitted(ctx,{fit:offer,x:inner,y:layout.offerY,width:insideWidth,
      color:p.palette.accent,role:'offer',language:offerLanguage,preset:p,center:centerText,
      glow:p.tokens.neonTextBlur*scale,glowColor:'rgba(255,94,0,.6)'});
  }
  if(service&&layout.serviceY!==null)
    renderFitted(ctx,{fit:service,x:inner,y:layout.serviceY,width:insideWidth,
      color:p.palette.white,role:'body',language:serviceLanguage,preset:p,center:centerText});
  if(copy.cta.trim()&&layout.ctaY!==null){
    const buttonW=Math.min(panelW*.6,490*scale);
    drawPill(ctx,{text:copy.cta,
      x:centerText?side+(panelW-buttonW)/2:inner,y:layout.ctaY,w:buttonW,
      h:layout.ctaHeight,scale,language:scriptOf(copy.cta,copy.language),preset:p,panelStyle});
  }
  if(contactRows&&layout.contactsY!==null&&layout.dividerY!==null){
    ctx.save();
    ctx.lineWidth=Math.max(1,scale);
    ctx.strokeStyle=p.palette.glassBorder;
    ctx.beginPath();ctx.moveTo(inner,layout.dividerY);
    ctx.lineTo(side+panelW-inset,layout.dividerY);ctx.stroke();ctx.restore();
    drawContacts(ctx,{copy,x:inner,y:layout.contactsY,width:insideWidth,
      height:layout.contactsHeight,scale,preset:p,lang:copy.language});
  }
}
function renderWide(ctx:Ctx,copy:ExactPosterCopy,p:PremiumPosterPreset,panelStyle:ContentPanelStyle){
  const w=ctx.canvas.width,h=ctx.canvas.height;
  const headlineLanguage=scriptOf(copy.headline,copy.language);
  const x=w*.035,y=h*.045,pw=w*.57,ph=h*.91;
  if(panelStyle==='frosted_glass_modern')
    glassPanel(ctx,x,y,pw,ph,p,.78);
  else paintLowerContentPanel({
    ctx,style:panelStyle,x,y,w:pw,h:ph,scale:.78,colors:p.palette,
    radius:p.tokens.glassRadius,blur:p.tokens.glassBlur,
    borderWidth:p.tokens.glassBorderWidth,
  });
  const inner=x+32,innerWidth=pw-64;
  let row=y+19;
  const brand=fit(ctx,{value:copy.businessName,width:innerWidth,height:35,maxLines:1,
    start:25,min:17,lineHeight:1.15,role:'brand',lang:scriptOf(copy.businessName,copy.language),preset:p,label:'Business name'});
  row=renderFitted(ctx,{fit:brand,x:inner,y:row,width:innerWidth,
    color:p.palette.glow,role:'brand',language:scriptOf(copy.businessName,copy.language),preset:p});
  row+=9;
  const headline=fit(ctx,{value:headlineLanguage==='en'?copy.headline.toUpperCase():copy.headline,
    width:innerWidth,height:125,maxLines:3,start:59,min:28,
    lineHeight:headlineLanguage==='en'?.95:1.3,
    role:'display',lang:headlineLanguage,preset:p,label:'Headline'});
  row=renderFitted(ctx,{fit:headline,x:inner,y:row,width:innerWidth,
    color:p.palette.white,role:'display',language:headlineLanguage,preset:p});
  row+=9;
  if(copy.offer){
    const offer=fit(ctx,{value:copy.offer,width:innerWidth,height:104,maxLines:2,
      start:58,min:26,lineHeight:1.05,role:'offer',lang:scriptOf(copy.offer,copy.language),preset:p,label:'Approved offer'});
    paintLowerOfferHighlight({
      ctx,style:panelStyle,x:inner-6,y:row-3,w:innerWidth+12,h:offer.height+6,
      scale:.78,colors:p.palette,
    });
    row=renderFitted(ctx,{fit:offer,x:inner,y:row,width:innerWidth,
      color:p.palette.accent,role:'offer',language:scriptOf(copy.offer,copy.language),preset:p,
      glow:16,glowColor:'rgba(255,94,0,.55)'});
    row+=6;
  }
  const service=fit(ctx,{value:copy.service,width:innerWidth,height:44,maxLines:2,
    start:22,min:16,lineHeight:1.15,role:'body',lang:scriptOf(copy.service,copy.language),preset:p,label:'Service'});
  row=renderFitted(ctx,{fit:service,x:inner,y:row,width:innerWidth,
    color:p.palette.white,role:'body',language:scriptOf(copy.service,copy.language),preset:p});
  const buttonY=Math.max(row+10,y+ph-147);
  if(copy.cta&&buttonY>y+ph-122)
    throw Error('Copy is too long for the landscape CTA. Shorten the headline or offer.');
  if(copy.cta)drawPill(ctx,{text:copy.cta,x:inner,y:buttonY,
    w:Math.min(260,innerWidth),h:51,scale:.7,
    language:scriptOf(copy.cta,copy.language),preset:p,panelStyle});
  const contacts=Number(Boolean(copy.website))+Number(Boolean(copy.phone))+Number(Boolean(copy.email));
  if(contacts>3)throw Error('Too many contact lines.');
  const contactsY=y+ph-79;
  if(contacts)drawContacts(ctx,{copy,x:inner,y:contactsY,width:innerWidth,
    height:76,scale:.55,preset:p,lang:copy.language});
}

export function renderPremiumPoster(input:{
  ctx:Ctx;image:HTMLImageElement;copy:ExactPosterCopy;
  format:PosterFormat;style?:PremiumPosterStyle|null;
  design?:VerifiedPosterDesign|null;language:PosterCopyLanguage;
  contentPanelStyle?:ContentPanelStyle;
}):void{
  const preset=withVerifiedPosterDesign(resolvePremiumPosterPreset(input.style),
    input.design,input.language);
  const mode=input.format==='landscape'?'wide':'stacked';
  drawBackdrop(input.ctx,input.image,mode,preset);
  const panelStyle=input.contentPanelStyle||input.design?.contentPanelStyle||DEFAULT_CONTENT_PANEL_STYLE;
  if(mode==='wide')renderWide(input.ctx,input.copy,preset,panelStyle);
  else renderStacked(input.ctx,input.copy,preset,input.format,input.design?.layout,panelStyle);
}
