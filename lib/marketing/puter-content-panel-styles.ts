/**
 * Lower information-panel painting only. No poster geometry, upper text,
 * artwork, user content, font choice, quota, or authentication changes.
 * Every effect is drawn into the exact exported HTML5 Canvas PNG.
 */
import type {ContentPanelStyle} from '@/lib/marketing/poster-design-blueprint';

type Ctx=CanvasRenderingContext2D;
export type ContentPanelColors={
  accent:string;glow:string;obsidian:string;white:string;
  glass:string;glassBorder:string;muted:string;
};
type SurfaceArgs={
  ctx:Ctx;style:ContentPanelStyle;x:number;y:number;w:number;h:number;
  scale:number;colors:ContentPanelColors;radius:number;blur:number;
  borderWidth:number;
};
function rounded(ctx:Ctx,x:number,y:number,w:number,h:number,r:number){
  const t=Math.max(0,Math.min(r,w/2,h/2));
  ctx.beginPath();ctx.moveTo(x+t,y);ctx.lineTo(x+w-t,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+t);
  ctx.lineTo(x+w,y+h-t);ctx.quadraticCurveTo(x+w,y+h,x+w-t,y+h);
  ctx.lineTo(x+t,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-t);
  ctx.lineTo(x,y+t);ctx.quadraticCurveTo(x,y,x+t,y);ctx.closePath();
}
function alpha(color:string,opacity:number):string{
  if(!/^#[0-9a-f]{6}$/i.test(color))return 'rgba(255,255,255,.2)';
  const n=parseInt(color.slice(1),16);
  return 'rgba('+[(n>>16)&255,(n>>8)&255,n&255].join(',')+','+opacity+')';
}
function backedBlur(ctx:Ctx,blur:number){
  const canvas=document.createElement('canvas');
  canvas.width=ctx.canvas.width;canvas.height=ctx.canvas.height;
  const context=canvas.getContext('2d');
  if(!context)return;
  context.drawImage(ctx.canvas,0,0);
  ctx.filter='blur('+Math.max(8,Math.round(blur))+'px)';
  ctx.drawImage(canvas,0,0);ctx.filter='none';
}
function edge(ctx:Ctx,args:SurfaceArgs,color:string,weight=1,glow=0){
  ctx.save();
  ctx.shadowColor=color;ctx.shadowBlur=glow*args.scale;
  ctx.strokeStyle=color;ctx.lineWidth=Math.max(.8,args.borderWidth*args.scale*weight);
  rounded(ctx,args.x,args.y,args.w,args.h,args.radius*args.scale);
  ctx.stroke();ctx.restore();
}
function gradient(ctx:Ctx,x:number,y:number,w:number,h:number,colors:readonly [string,string,string]){
  const g=ctx.createLinearGradient(x,y,x+w,y+h);
  g.addColorStop(0,colors[0]);g.addColorStop(.55,colors[1]);g.addColorStop(1,colors[2]);
  return g;
}
export function paintLowerContentPanel(args:SurfaceArgs){
  const {ctx,style,x,y,w,h,scale:s,colors:p}=args;
  // All styles render inside the existing, content-measured glass-card bounds.
  // Background blurring is used ONLY for the two glass variants.
  ctx.save();rounded(ctx,x,y,w,h,args.radius*s);ctx.clip();

  if(style==='frosted_glass_modern'||style==='soft_dark_blur_panel'){
    backedBlur(ctx,args.blur*s*(style==='soft_dark_blur_panel'?1.25:1));
    ctx.fillStyle=style==='soft_dark_blur_panel'?'rgba(5,9,15,.67)':p.glass;
    ctx.fillRect(x,y,w,h);
    if(style==='soft_dark_blur_panel'){
      ctx.fillStyle=gradient(ctx,x,y,w,h,
        ['rgba(4,7,15,.08)','rgba(4,7,15,.12)','rgba(1,5,12,.36)']);
      ctx.fillRect(x,y,w,h);
    }
  }else if(style==='black_marble_luxury'){
    ctx.fillStyle=gradient(ctx,x,y,w,h,
      ['rgba(11,13,20,.97)','rgba(20,22,30,.95)','rgba(4,5,10,.98)']);
    ctx.fillRect(x,y,w,h);
    // Deterministic fine marble veining: restrained and strictly decoration.
    ctx.lineWidth=Math.max(.8,s*.9);
    for(let i=0;i<6;i++){
      ctx.strokeStyle=i%2?alpha(p.accent,.08):'rgba(255,255,255,.095)';
      const oy=h*(.08+i*.15);
      ctx.beginPath();
      ctx.moveTo(x-w*.08,y+oy);
      ctx.bezierCurveTo(x+w*.20,y+oy-19*s,
        x+w*.49,y+oy+24*s,x+w*.70,y+oy-12*s);
      ctx.bezierCurveTo(x+w*.83,y+oy-27*s,
        x+w*.94,y+oy+5*s,x+w*1.1,y+oy-23*s);
      ctx.stroke();
    }
    const shine=ctx.createLinearGradient(x,y,x+w,y);
    shine.addColorStop(0,'rgba(255,255,255,.055)');
    shine.addColorStop(.5,'rgba(255,255,255,0)');
    shine.addColorStop(1,'rgba(255,255,255,.026)');
    ctx.fillStyle=shine;ctx.fillRect(x,y,w,h);
  }else if(style==='neon_glow_card'){
    ctx.fillStyle=gradient(ctx,x,y,w,h,
      ['rgba(10,12,28,.97)','rgba(14,12,26,.90)','rgba(2,7,18,.98)']);
    ctx.fillRect(x,y,w,h);
    const light=ctx.createRadialGradient(x+w*.78,y+h*.13,0,x+w*.78,y+h*.13,w*.8);
    light.addColorStop(0,alpha(p.accent,.22));light.addColorStop(1,alpha(p.accent,0));
    ctx.fillStyle=light;ctx.fillRect(x,y,w,h);
  }else if(style==='minimal_editorial_strip'){
    // The artwork still shows through, but content sits on a clear dark strip.
    ctx.fillStyle=gradient(ctx,x,y,w,h,
      ['rgba(5,8,14,.89)','rgba(5,8,14,.75)','rgba(2,4,9,.88)']);
    ctx.fillRect(x,y,w,h);
  }else if(style==='split_info_panel'){
    ctx.fillStyle=gradient(ctx,x,y,w,h,
      ['rgba(12,14,21,.95)','rgba(16,19,28,.95)','rgba(5,8,16,.96)']);
    ctx.fillRect(x,y,w,h);
    ctx.fillStyle=alpha(p.accent,.80);
    ctx.fillRect(x+4*s,y+args.radius*s,w*.008,h-2*args.radius*s);
  }else if(style==='premium_gradient_plate'){
    const base=gradient(ctx,x,y,w,h,[
      'rgba(6,9,20,.97)',alpha(p.accent,.29),'rgba(6,7,14,.98)',
    ]);
    ctx.fillStyle=base;ctx.fillRect(x,y,w,h);
    const ref=ctx.createRadialGradient(x+w*.82,y+h*.15,0,x+w*.82,y+h*.15,w*.75);
    ref.addColorStop(0,alpha(p.glow,.18));ref.addColorStop(1,alpha(p.glow,0));
    ctx.fillStyle=ref;ctx.fillRect(x,y,w,h);
  }else if(style==='bold_sale_badge_layout'){
    ctx.fillStyle=gradient(ctx,x,y,w,h,
      ['rgba(8,9,15,.98)','rgba(23,14,19,.95)','rgba(6,8,15,.98)']);
    ctx.fillRect(x,y,w,h);
    ctx.fillStyle=alpha(p.accent,.9);
    ctx.fillRect(x+w*.10,y+12*s,w*.80,5*s);
  }else{
    // Safety fallback even if called without the schema normalizer.
    ctx.fillStyle=p.glass;ctx.fillRect(x,y,w,h);
  }
  ctx.restore();

  // Variant-specific edges, always confined to the same original card shape.
  if(style==='black_marble_luxury'){
    edge(ctx,args,alpha(p.glow,.55),.9);
    ctx.save();ctx.strokeStyle=alpha(p.glow,.72);ctx.lineWidth=2*s;
    ctx.beginPath();ctx.moveTo(x+w*.20,y+2*s);ctx.lineTo(x+w*.80,y+2*s);ctx.stroke();ctx.restore();
  }else if(style==='neon_glow_card'){
    edge(ctx,args,alpha(p.accent,.75),1.35,19);
  }else if(style==='minimal_editorial_strip'){
    ctx.save();ctx.strokeStyle=alpha(p.accent,.8);ctx.lineWidth=3*s;
    ctx.beginPath();ctx.moveTo(x+args.radius*s,y+2*s);
    ctx.lineTo(x+w-args.radius*s,y+2*s);ctx.stroke();ctx.restore();
  }else if(style==='soft_dark_blur_panel'){
    edge(ctx,args,'rgba(255,255,255,.085)',.75);
  }else if(style==='split_info_panel'){
    edge(ctx,args,alpha(p.accent,.45),.85);
  }else if(style==='premium_gradient_plate'){
    edge(ctx,args,alpha(p.glow,.46),1.1,10);
  }else if(style==='bold_sale_badge_layout'){
    edge(ctx,args,alpha(p.accent,.57),1.1);
  }else{
    edge(ctx,args,p.glassBorder);
  }
}
/**
 * Provides visual CTA treatments but leaves button bounds, text, language,
 * accessibility, contact rows and offer content exactly as before.
 * Returns the accessible text paint color for the corresponding surface.
 */
export function paintLowerCta(args:{
  ctx:Ctx;style:ContentPanelStyle;x:number;y:number;w:number;h:number;
  scale:number;colors:ContentPanelColors;
}):string{
  const {ctx,style,x,y,w,h,scale:s,colors:p}=args;
  ctx.save();
  rounded(ctx,x,y,w,h,h/2);
  if(style==='minimal_editorial_strip'){
    ctx.fillStyle='rgba(7,9,16,.78)';ctx.fill();
    ctx.strokeStyle=p.accent;ctx.lineWidth=Math.max(2,2*s);ctx.stroke();
    ctx.restore();
    return p.accent;
  }
  if(style==='soft_dark_blur_panel'){
    ctx.fillStyle=p.accent;ctx.fill();ctx.restore();return p.obsidian;
  }
  if(style==='neon_glow_card'||style==='bold_sale_badge_layout'){
    ctx.shadowColor=alpha(p.accent,.85);ctx.shadowBlur=(style==='neon_glow_card'?28:22)*s;
  }else if(style==='black_marble_luxury'){
    ctx.shadowColor=alpha(p.glow,.42);ctx.shadowBlur=14*s;
  }else{
    ctx.shadowColor=alpha(p.accent,.52);ctx.shadowBlur=18*s;
  }
  const fill=ctx.createLinearGradient(x,y,x+w,y);
  fill.addColorStop(0,p.accent);fill.addColorStop(1,p.glow);
  ctx.fillStyle=fill;ctx.fill();
  ctx.restore();
  return p.obsidian;
}
export function paintLowerOfferHighlight(args:{
  ctx:Ctx;style:ContentPanelStyle;x:number;y:number;w:number;h:number;
  scale:number;colors:ContentPanelColors;
}){
  const {ctx,style,x,y,w,h,scale:s,colors:p}=args;
  if(style!=='bold_sale_badge_layout'&&style!=='split_info_panel')return;
  ctx.save();
  rounded(ctx,x,y,w,h,style==='bold_sale_badge_layout'?18*s:12*s);
  ctx.fillStyle=style==='bold_sale_badge_layout'?alpha(p.accent,.13):alpha(p.accent,.075);
  ctx.fill();
  ctx.lineWidth=Math.max(1,s);
  ctx.strokeStyle=alpha(p.accent,style==='bold_sale_badge_layout'?.48:.28);
  ctx.stroke();ctx.restore();
}
