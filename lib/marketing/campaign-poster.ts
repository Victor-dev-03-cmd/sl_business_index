import { FORMATS,type CampaignFormat,type CampaignPalette,type CampaignLanguage } from './campaign-language';

type Palette={dark:string;light:string;ink:string;accent:string;soft:string};
const palette:Record<CampaignPalette,Palette>={
  forest:{dark:'#163F30',light:'#245944',ink:'#FAFFF9',accent:'#B6DDC0',soft:'#133729'},
  navy:{dark:'#142538',light:'#234563',ink:'#FAFCFF',accent:'#C1DEF7',soft:'#0E1F31'},
  cream:{dark:'#F7F2E9',light:'#F0E6D4',ink:'#213D31',accent:'#315D43',soft:'#E5D6C1'},
};
type PosterInput={business:string;offer:string;cta:string;terms:string;language:CampaignLanguage;format:CampaignFormat;palette:CampaignPalette};
export type PosterResult={ok:true;dataUrl:string;filename:string}|{ok:false;error:'canvas_unavailable'|'text_overflow'};
const fontStack='"Noto Sans Tamil","Noto Sans Sinhala","Noto Sans",system-ui,sans-serif';
function drawRounded(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number,fill:string){
  ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();
}
// Measure exact width; never truncate with an ellipsis. Mixed Tamil/Sinhala/emoji
// text falls back to grapheme segmentation when whitespace-only words cannot fit.
function wrapExact(ctx:CanvasRenderingContext2D,text:string,width:number):string[]{
  const lines:string[]=[];let line='';
  const segment=(value:string):string[]=>{
    if(typeof Intl.Segmenter!=='undefined'){
      return [...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(value)].map(x=>x.segment);
    }
    return Array.from(value);
  };
  const fitWord=(word:string)=>{
    for(const cluster of segment(word)){
      if(line&&ctx.measureText(line+cluster).width>width){
        lines.push(line);line='';
      }
      if(ctx.measureText(cluster).width>width)return false;
      line+=cluster;
    }
    return true;
  };
  for(const paragraph of text.replace(/\r/g,'').split('\n')){
    if(!paragraph.trim()){if(line){lines.push(line);line='';}continue;}
    for(const token of paragraph.trim().split(/(\s+)/).filter(Boolean)){
      const test=line+token;
      if(ctx.measureText(test).width<=width){line=test;continue;}
      if(line.trim()){lines.push(line.trimEnd());line='';}
      if(ctx.measureText(token).width<=width){line=token.trimStart();continue;}
      if(!fitWord(token.trim()))return [];
    }
    if(line.trim()){lines.push(line.trim());line='';}
  }
  if(line.trim())lines.push(line.trim());
  return lines;
}
function fit(ctx:CanvasRenderingContext2D,text:string,width:number,height:number,maximum:number,minimum:number,weight=700){
  for(let px=maximum;px>=minimum;px-=2){
    ctx.font=weight+' '+px+'px '+fontStack;
    const lines=wrapExact(ctx,text,width);
    const lineHeight=Math.ceil(px*1.32);
    if(lines.length&&lines.length*lineHeight<=height&&lines.every(v=>ctx.measureText(v).width<=width)){
      return {px,lines,lineHeight};
    }
  }
  return null;
}
function lineBlock(ctx:CanvasRenderingContext2D,info:NonNullable<ReturnType<typeof fit>>,x:number,y:number,color:string,weight=700){
  ctx.fillStyle=color;ctx.font=weight+' '+info.px+'px '+fontStack;
  info.lines.forEach((line,i)=>ctx.fillText(line,x,y+i*info.lineHeight));
}
export async function renderCampaignPoster(input:PosterInput):Promise<PosterResult>{
  if(typeof document==='undefined')return {ok:false,error:'canvas_unavailable'};
  await document.fonts?.ready;
  const size=FORMATS[input.format],W=size.w,H=size.h;
  const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext('2d');
  if(!ctx)return {ok:false,error:'canvas_unavailable'};
  const p=palette[input.palette],pad=input.format==='landscape'?58:74,wide=W-2*pad;
  ctx.textBaseline='top';ctx.textAlign='left';
  const titleY=input.format==='landscape'?100:155;
  const messageY=input.format==='landscape'?230:input.format==='square'?345:input.format==='portrait'?385:480;
  const ctaY=H-(input.format==='landscape'?126:input.format==='square'?215:255);
  const termsY=ctaY-88;
  const messageH=termsY-messageY-30;
  const business=fit(ctx,input.business||'Your business',wide,118,input.format==='landscape'?54:70,26,800);
  const offer=fit(ctx,input.offer.trim(),wide,messageH,input.format==='landscape'?44:input.format==='story'?72:64,22,750);
  const action=fit(ctx,input.cta.trim()||'Contact us',wide-50,input.format==='landscape'?40:82,30,16,700);
  const conditions=input.terms.trim()?fit(ctx,input.terms.trim(),wide,75,27,16,500):null;
  if(!business||!offer||!action||(input.terms.trim()&&!conditions))return {ok:false,error:'text_overflow'};
  // Only draw after all text was measured. Prevents partial/truncated images.
  ctx.fillStyle=p.dark;ctx.fillRect(0,0,W,H);
  ctx.fillStyle=p.light;ctx.fillRect(W*.72,0,W*.28,H);
  ctx.fillStyle=p.accent;ctx.fillRect(0,0,12,H);
  ctx.fillStyle=p.accent;ctx.font='700 22px '+fontStack;ctx.fillText('SLBI   /   BUSINESS CAMPAIGN',pad,55);
  lineBlock(ctx,business,pad,titleY,p.ink,800);
  ctx.fillStyle=p.accent;ctx.fillRect(pad,messageY-38,92,5);
  lineBlock(ctx,offer,pad,messageY,p.ink,750);
  if(conditions)lineBlock(ctx,conditions,pad,termsY,p.accent,500);
  drawRounded(ctx,pad,ctaY,wide, input.format==='landscape'?60:106,17,p.accent);
  lineBlock(ctx,action,pad+25,ctaY+(input.format==='landscape'?15:22),p.dark,700);
  ctx.fillStyle=p.accent;ctx.font='500 18px '+fontStack;
  ctx.fillText('SLBUSINESSINDEX.COM  ·  DRAFT — REVIEW BEFORE PUBLISHING',pad,H-47);
  return {ok:true,dataUrl:canvas.toDataURL('image/png'),filename:'slbi-'+input.format+'-'+input.language+'.png'};
}
