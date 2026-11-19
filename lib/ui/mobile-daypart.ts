/** Local device clock: no hardcoded morning greeting or user timezone assumptions. */
export type MobileDaypart={label:string;emoji:string};
export function mobileDaypart(hour:number):MobileDaypart{
  if(!Number.isFinite(hour)||hour<0||hour>=24)return {label:'Good day',emoji:'☀️'};
  if(hour>=5&&hour<12)return {label:'Good Morning',emoji:'☀️'};
  if(hour>=12&&hour<17)return {label:'Good Afternoon',emoji:'🌤️'};
  if(hour>=17&&hour<21)return {label:'Good Evening',emoji:'🌆'};
  return {label:'Good Night',emoji:'🌙'};
}
