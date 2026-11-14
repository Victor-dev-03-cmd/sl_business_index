import Link from 'next/link';
import IconsaxIcon from '@/app/vendor/components/IconsaxIcon';
import {ENGINE_MODULES} from '@/lib/marketing/engine-registry';

const panel='rounded-xl border border-[#E9E9ED] bg-white shadow-[0_6px_23px_rgba(20,20,25,.03)]';

export default function MarketingModuleFrame({module,description,children}:{
  module:'social'|'email'|'agent'|'connections'|'automation';
  description:string;
  children:React.ReactNode;
}){
  const info=ENGINE_MODULES.find(m=>m.slug===module)!;
  return <main className="mx-auto w-full max-w-[1480px] space-y-5 pb-12 text-[#232327]">
    <header className={panel+' p-5 sm:p-8'}>
      <Link href="/vendor/marketing" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#AA5A1A] hover:underline">
        <IconsaxIcon name="arrow-left-2" size={14}/> Marketing Studio apps
      </Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-[#B86122]">GrowthOS · {info.phase} · Pro workspace</p>
          <h1 className="mt-2 text-[26px] font-extrabold tracking-tight sm:text-[32px]">{info.title}</h1>
          <p className="mt-2 max-w-[740px] text-xs leading-6 text-[#7D7D85]">{description}</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-[#E7E7E9] bg-[#FAFAFB] px-3 py-1.5 text-[10px] font-bold text-[#72727B]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#FF7900]"/> {info.state==='catalogue'?'Connector catalogue':info.state==='foundation'?'Foundation in development':'Integration planned'}
        </span>
      </div>
    </header>
    <nav aria-label="Marketing Engine module navigation" className="flex flex-wrap gap-2">
      {ENGINE_MODULES.map(m=><Link key={m.slug} href={'/vendor/marketing-engine/'+m.slug}
        aria-current={m.slug===module?'page':undefined}
        className={'inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-[11px] font-bold transition '+(m.slug===module?'border-[#FFC58F] bg-[#FFF1E6] text-[#AA5413]':'border-[#E5E5EA] bg-white text-[#66666F] hover:bg-[#FFFBF5]')}>
        <IconsaxIcon name={m.icon} size={15}/>{m.title}
      </Link>)}
    </nav>
    {children}
    <p className="text-[11px] leading-6 text-[#8F8F97]">Provider accounts are never connected automatically. External messages and publishing require approved account permissions, cost controls, human review, and a verified provider receipt.</p>
  </main>;
}
