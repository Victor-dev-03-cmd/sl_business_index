'use client';

import {useMemo,useState} from 'react';
import {
  ResponsiveContainer,AreaChart,Area,LineChart,Line,BarChart,Bar,
  PieChart,Pie,Cell,CartesianGrid,XAxis,YAxis,Tooltip,Legend,
} from 'recharts';
import IconsaxIcon from '../components/IconsaxIcon';

export type AnalyticsDay={key:string;label:string;views:number;calls:number;directions:number};
export type AnalyticsBusiness={id:string;name:string;listingViewEvents:number;callClickEvents:number;locationClickEvents:number;crmLeadRecords:number};
export type AnalyticsOrigin={name:string;value:number};
type Metric='all'|'views'|'actions';
const ink='#202024',orange='#FF7900',amber='#FFB56C',grey='#7E7D86';
const format=(n:number)=>new Intl.NumberFormat('en-LK').format(n);

const card='min-w-0 rounded-[20px] border border-[#ECEAEC] bg-white p-5 shadow-[0_8px_30px_rgba(28,28,33,.035)] sm:p-6';
const title='text-[16px] font-semibold tracking-[-.025em] text-[#222126]';
const description='mt-1 text-[11px] leading-[1.65] text-[#797882]';
const empty=<div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed border-[#EBE7E5] bg-[#FBFAF9] px-5 text-center text-[12px] leading-6 text-[#89848A]">No recorded activity for the selected period. Charts are not populated with example data.</div>;
const axis={fill:grey,fontSize:10};

export default function VendorAnalyticsCharts({
  daily,origins,businesses,
}:{
  daily:AnalyticsDay[];origins:AnalyticsOrigin[];businesses:AnalyticsBusiness[];
}){
  const [metric,setMetric]=useState<Metric>('all');
  const total=daily.reduce((sum,d)=>sum+d.views+d.calls+d.directions,0);
  const series=useMemo(()=>daily.map(d=>({
    ...d,actions:d.calls+d.directions,total:d.views+d.calls+d.directions,
  })),[daily]);
  const top=useMemo(()=>businesses.map(b=>({
    ...b,short:b.name.length>19?b.name.slice(0,18)+'…':b.name,
    actions:b.callClickEvents+b.locationClickEvents,
  })).sort((a,b)=>(b.listingViewEvents+b.actions+b.crmLeadRecords)-(a.listingViewEvents+a.actions+a.crmLeadRecords)).slice(0,8),[businesses]);
  const leads=origins.filter(item=>item.value>0);
  const grandLeads=leads.reduce((sum,d)=>sum+d.value,0);

  // UTC date labels: events and query windows are stored as UTC timestamps.
  // Empty cells before the first Sunday are layout only, never invented events.
  const calendar=useMemo(()=>{
    if(!daily.length)return [] as (AnalyticsDay|null)[];
    const first=new Date(daily[0].key+'T00:00:00Z').getUTCDay();
    return [...Array<null>(first).fill(null),...daily];
  },[daily]);
  const peak=Math.max(1,...daily.map(d=>d.views+d.calls+d.directions));
  const heatColor=(n:number)=>{
    if(!n)return '#F0ECE9';
    const rate=n/peak;
    return rate<=.25?'#FFD4AE':rate<=.5?'#FFAC66':rate<=.75?'#F77D18':'#B54809';
  };
  const weekdays=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const tickEvery=Math.max(1,Math.ceil(series.length/7));
  return <div className="space-y-5" data-testid="vendor-analytics-visuals">
    <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
      <section className={card} aria-label="Daily listing activity line and area chart">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className={title}>Activity over time</h2><p className={description}>Daily logged interactions · UTC dates · first/last day may be partial</p></div>
          <div role="group" aria-label="Choose activity chart metric" className="flex flex-wrap gap-1 rounded-xl bg-[#F5F4F5] p-1">
            {([['all','All'],['views','Views'],['actions','Actions']] as const).map(([value,label])=><button key={value} type="button" aria-pressed={metric===value} onClick={()=>setMetric(value)}
              className={'min-h-9 rounded-lg px-3 text-[11px] font-semibold transition '+(metric===value?'bg-[#202024] text-white shadow-sm':'text-[#77757D] hover:text-[#202024]')}>{label}</button>)}
          </div>
        </div>
        {total? <div className="mt-5 h-[275px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{top:8,right:5,left:-22,bottom:0}}>
              <defs><linearGradient id="slbiTrendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={orange} stopOpacity={.25}/><stop offset="95%" stopColor={orange} stopOpacity={.015}/></linearGradient></defs>
              <CartesianGrid stroke="#F0EDEE" strokeDasharray="3 4" vertical={false}/>
              <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} interval={tickEvery-1}/>
              <YAxis allowDecimals={false} tick={axis} axisLine={false} tickLine={false}/>
              <Tooltip formatter={(value,name)=>[format(Number(value)),name==='views'?'Listing views':name==='actions'?'Call + directions clicks':'Total interactions']} contentStyle={{borderRadius:12,border:'1px solid #EFE7E2',fontSize:12}}/>
              {(metric==='all'||metric==='views')&&<Area type="monotone" dataKey="views" name="views" stroke={orange} strokeWidth={2.5} fill="url(#slbiTrendFill)" dot={false} isAnimationActive={false}/>}
              {(metric==='all'||metric==='actions')&&<Area type="monotone" dataKey="actions" name="actions" stroke={ink} strokeWidth={2} fillOpacity={0} dot={false} isAnimationActive={false}/>}
            </AreaChart>
          </ResponsiveContainer>
        </div>:<div className="mt-5">{empty}</div>}
        <div className="mt-3 flex flex-wrap gap-4 text-[10px] text-[#817C81]"><span><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#FF7900]"/> Listing views</span><span><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#202024]"/> Customer actions</span></div>
      </section>
      <section className={card} aria-label="CRM lead origin pie and donut chart">
        <h2 className={title}>Enquiry sources</h2>
        <p className={description}>Share of saved CRM enquiries by recorded source</p>
        {grandLeads?<div className="relative mt-3 h-[245px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={leads} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={66} outerRadius={96} paddingAngle={3} stroke="#fff" strokeWidth={2} isAnimationActive={false}>
                {leads.map((item,i)=><Cell key={item.name} fill={[orange,ink,amber][i%3]}/>)}
              </Pie>
              <Tooltip formatter={value=>format(Number(value))} contentStyle={{borderRadius:12,border:'1px solid #EFE7E2',fontSize:12}}/>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <strong className="text-[27px] font-semibold tabular-nums tracking-tight text-[#232225]">{format(grandLeads)}</strong><span className="text-[10px] text-[#838089]">CRM records</span>
          </div>
        </div>:<div className="mt-5">{empty}</div>}
        <div className="mt-2 space-y-2.5">{origins.map((item,i)=><div key={item.name} className="flex items-center justify-between gap-3 text-[11px]">
          <span className="flex min-w-0 items-center gap-2 text-[#77757D]"><span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{background:[orange,ink,amber][i%3]}}/>{item.name}</span>
          <strong className="shrink-0 tabular-nums text-[#262328]">{format(item.value)} <span className="font-normal text-[#918A8E]">({grandLeads?Math.round(item.value/grandLeads*100):0}%)</span></strong>
        </div>)}</div>
      </section>
    </div>

    <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
      <section className={card} aria-label="GitHub-style activity heatmap by UTC day">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className={title}>Activity calendar</h2><p className={description}>GitHub-style heatmap · every square is a UTC day of logged interactions, not a unique user</p></div>
          <span className="rounded-full bg-[#FFF0E4] px-3 py-1.5 text-[11px] font-semibold text-[#B95910]">{daily.filter(d=>d.views+d.calls+d.directions>0).length} recorded days</span>
        </div>
        <div className="mt-6 flex min-w-0 gap-2.5">
          <div aria-hidden="true" className="grid shrink-0 grid-rows-7 gap-[5px] text-[9px] leading-4 text-[#99949B]">{weekdays.map(w=><span key={w} className="h-3.5">{w.slice(0,1)}</span>)}</div>
          <div className="min-w-0 flex-1 overflow-x-auto pb-2">
            <div className="grid w-max gap-[5px]" style={{gridAutoFlow:'column',gridTemplateRows:'repeat(7,14px)',gridAutoColumns:'14px'}}>
              {calendar.map((day,i)=><div key={day?.key??'pad-'+i} role={day?'img':undefined}
                aria-label={day?day.key+': '+(day.views+day.calls+day.directions)+' logged interactions':undefined}
                title={day?day.key+' · '+(day.views+day.calls+day.directions)+' logged interactions':undefined}
                className="min-w-[12px] rounded-[3px] border border-[#00000006]"
                style={{background:day?heatColor(day.views+day.calls+day.directions):'transparent'}}/>)}
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[10px] text-[#8B878D]">
          <span>{daily[0]?.label||'—'} — {daily[daily.length-1]?.label||'—'}</span>
          <div className="flex items-center gap-1.5"><span className="mr-1">Fewer</span>{['#F0ECE9','#FFD4AE','#FFAC66','#F77D18','#B54809'].map(c=><span key={c} className="h-3 w-3 rounded-[3px]" style={{background:c}}/>)}<span className="ml-1">More</span></div>
        </div>
      </section>
      <section className={card} aria-label="Call clicks and directions stacked bar chart">
        <h2 className={title}>Action breakdown</h2>
        <p className={description}>Daily call and directions clicks · an action is not a confirmed customer</p>
        {total?<div className="mt-5 h-[225px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series} margin={{top:8,right:5,left:-22,bottom:0}}>
              <CartesianGrid stroke="#F0EDEE" vertical={false}/>
              <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} interval={tickEvery-1}/>
              <YAxis tick={axis} tickLine={false} axisLine={false} allowDecimals={false}/>
              <Tooltip contentStyle={{borderRadius:12,border:'1px solid #EFE7E2',fontSize:12}}/>
              <Bar dataKey="calls" stackId="actions" fill={orange} name="Call clicks" isAnimationActive={false}/>
              <Bar dataKey="directions" stackId="actions" fill={ink} name="Directions clicks" radius={[3,3,0,0]} isAnimationActive={false}/>
            </BarChart>
          </ResponsiveContainer>
        </div>:<div className="mt-5">{empty}</div>}
        <p className="mt-3 text-[10px] text-[#8E888F]">Dark = directions · orange = call clicks · zero-height bars mean no recorded action</p>
      </section>
    </div>

    <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
      <section className={card} aria-label="Business performance comparison bar chart">
        <div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className={title}>Performance by business</h2><p className={description}>At most eight owned approved businesses · recorded event/CRM counts</p></div><IconsaxIcon name="chart" size={20} color="#F27A1B"/></div>
        {top.length&&top.some(b=>b.listingViewEvents+b.actions+b.crmLeadRecords>0)?
          <div className="mt-5 h-[290px] w-full"><ResponsiveContainer width="100%" height="100%">
            <BarChart data={top} layout="vertical" margin={{top:8,right:10,left:2,bottom:0}}>
              <CartesianGrid stroke="#F1ECEA" horizontal={false}/>
              <XAxis type="number" allowDecimals={false} tick={axis} axisLine={false} tickLine={false}/>
              <YAxis dataKey="short" type="category" width={107} tick={{fill:grey,fontSize:10}} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{borderRadius:12,border:'1px solid #EFE7E2',fontSize:12}}/>
              <Legend wrapperStyle={{fontSize:10}}/>
              <Bar dataKey="listingViewEvents" name="Views" fill={orange} stackId="business" isAnimationActive={false}/>
              <Bar dataKey="actions" name="Actions" fill={ink} stackId="business" isAnimationActive={false}/>
              <Bar dataKey="crmLeadRecords" name="CRM leads" fill={amber} stackId="business" isAnimationActive={false}/>
            </BarChart>
          </ResponsiveContainer></div>:<div className="mt-5">{empty}</div>}
      </section>
      <section className={card} aria-label="Daily trends comparison line chart">
        <h2 className={title}>Signals compared</h2><p className={description}>Daily changes · listing views vs recorded actions, same UTC timeline</p>
        {total?<div className="mt-5 h-[290px] w-full"><ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{top:8,right:6,left:-24,bottom:0}}>
            <CartesianGrid vertical={false} stroke="#F0EDEE" strokeDasharray="3 4"/>
            <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} interval={tickEvery-1}/>
            <YAxis allowDecimals={false} tick={axis} tickLine={false} axisLine={false}/>
            <Tooltip contentStyle={{borderRadius:12,border:'1px solid #EFE7E2',fontSize:12}}/>
            <Legend wrapperStyle={{fontSize:10}}/>
            <Line type="monotone" name="Listing views" dataKey="views" stroke={orange} strokeWidth={2.5} dot={false} isAnimationActive={false}/>
            <Line type="monotone" name="Call + direction clicks" dataKey="actions" stroke={ink} strokeWidth={2} dot={false} isAnimationActive={false}/>
          </LineChart>
        </ResponsiveContainer></div>:<div className="mt-5">{empty}</div>}
      </section>
    </div>
    <div className="flex items-start gap-2 rounded-[14px] border border-[#EDE9E6] bg-[#FCFAF8] p-4 text-[11px] leading-6 text-[#7D7473]">
      <IconsaxIcon name="info-circle" size={17} color="#C87937"/>
      <p>Activity squares and charts describe logged events only. No chart implies unique visitors, actual phone calls, verified sales, QR scans, or guaranteed attribution. Missing telemetry may also produce zero recorded activity.</p>
    </div>
  </div>;
}
