/**
 * P2-04 editable poster design tokens. All important names, prices, dates,
 * and phone numbers remain text elements; they are not baked into an AI image.
 */
export const POSTER_FORMATS={
  square:{width:1080,height:1080,label:'Square post'},
  portrait:{width:1080,height:1350,label:'Portrait feed'},
  story:{width:1080,height:1920,label:'Story / WhatsApp status'},
  landscape:{width:1200,height:630,label:'Landscape / link post'},
} as const;
export type PosterFormat=keyof typeof POSTER_FORMATS;
export const DESIGN_STYLES=['editorial','spotlight','offset','minimal'] as const;
export type DesignStyle=typeof DESIGN_STYLES[number];
export type EditableTextLayer={
  id:'business'|'headline'|'price'|'date'|'cta'|'phone';
  label:string;
  value:string;
  x:number;
  y:number;
  fontSize:number;
  color:string;
  bold:boolean;
};
export type PosterBlueprint={
  version:1;
  format:PosterFormat;
  style:DesignStyle;
  background:string;
  accent:string;
  foreground:string;
  layers:EditableTextLayer[];
};
const HEX=/^#[0-9a-fA-F]{6}$/;
const MAX_TEXT=250;
export const LAYER_LABELS={
  business:'Business name',
  headline:'Headline / offer',
  price:'Price / details',
  date:'Offer dates / validity',
  cta:'Call to action',
  phone:'Contact number',
} as const;
export function newPosterBlueprint(name:string,format:PosterFormat='square'):PosterBlueprint{
  const layers:EditableTextLayer[]=[
    {id:'business',label:'Business name',value:name.slice(0,100),x:95,y:165,fontSize:59,color:'#FFFFFF',bold:true},
    {id:'headline',label:'Headline / offer',value:'Your approved offer or announcement',x:95,y:430,fontSize:77,color:'#FFFFFF',bold:true},
    {id:'price',label:'Price / details',value:'',x:95,y:690,fontSize:54,color:'#FFAF62',bold:true},
    {id:'date',label:'Offer dates / validity',value:'',x:95,y:810,fontSize:33,color:'#FFFFFF',bold:false},
    {id:'cta',label:'Call to action',value:'Contact us for details',x:95,y:920,fontSize:31,color:'#FFFFFF',bold:true},
    {id:'phone',label:'Contact number',value:'',x:95,y:995,fontSize:28,color:'#FFFFFF',bold:false},
  ];
  const square:PosterBlueprint={version:1,format:'square',style:'editorial',background:'#171719',
    accent:'#FF7900',foreground:'#FFFFFF',layers};
  return format==='square'?square:scalePosterBlueprint(square,format);
}
export function parsePosterBlueprint(v:unknown):PosterBlueprint|null{
  if(!v||typeof v!=='object'||Array.isArray(v))return null;
  const obj=v as Record<string,unknown>;
  if(obj.version!==1||typeof obj.format!=='string'||!(obj.format in POSTER_FORMATS)||
    !DESIGN_STYLES.includes(obj.style as DesignStyle))return null;
  const colors=['background','accent','foreground'] as const;
  if(colors.some(c=>typeof obj[c]!=='string'||!HEX.test(obj[c] as string)))return null;
  if(!Array.isArray(obj.layers)||obj.layers.length>6||obj.layers.length<1)return null;
  const bounds=POSTER_FORMATS[obj.format as PosterFormat];
  const ids=new Set<string>();
  const layers:EditableTextLayer[]=[];
  for(const layer of obj.layers){
    if(!layer||typeof layer!=='object'||Array.isArray(layer))return null;
    const a=layer as Record<string,unknown>;
    if(typeof a.id!=='string'||!(a.id in LAYER_LABELS)||ids.has(a.id)
      ||typeof a.value!=='string'||a.value.length>MAX_TEXT
      ||!Number.isFinite(a.x)||!Number.isFinite(a.y)
      ||(a.x as number)<0||(a.x as number)>bounds.width
      ||(a.y as number)<0||(a.y as number)>bounds.height
      ||!Number.isInteger(a.fontSize)||(a.fontSize as number)<16||(a.fontSize as number)>125
      ||typeof a.color!=='string'||!HEX.test(a.color)
      ||typeof a.bold!=='boolean')return null;
    ids.add(a.id);
    layers.push({id:a.id as EditableTextLayer['id'],
      label:LAYER_LABELS[a.id as EditableTextLayer['id']],
      value:a.value,x:a.x as number,y:a.y as number,fontSize:a.fontSize as number,
      color:a.color,bold:a.bold});
  }
  return {version:1,format:obj.format as PosterFormat,style:obj.style as DesignStyle,
    background:obj.background as string,accent:obj.accent as string,
    foreground:obj.foreground as string,layers};
}
export function scalePosterBlueprint(old:PosterBlueprint,format:PosterFormat):PosterBlueprint{
  const before=POSTER_FORMATS[old.format],after=POSTER_FORMATS[format];
  return {...old,format,
    layers:old.layers.map(l=>({...l,
      x:Math.max(0,Math.min(after.width-40,Math.round(l.x*after.width/before.width))),
      y:Math.max(0,Math.min(after.height-40,Math.round(l.y*after.height/before.height))),
    })),
  };
}
