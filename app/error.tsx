'use client'
import {useEffect} from 'react'
import {AlertTriangle,RefreshCw} from 'lucide-react'
export default function ErrorPage({reset}:{error:Error&{digest?:string};reset:()=>void}){
  useEffect(()=>{
    void fetch('/api/notifications/critical',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:'{"event":"render_failure"}'}).catch(()=>{})
  },[])
  return <section className="mx-auto flex min-h-[45vh] max-w-xl flex-col items-center justify-center px-6 py-12 text-center">
    <span className="grid h-14 w-14 place-items-center rounded-xl bg-amber-50 text-amber-700"><AlertTriangle size={26}/></span>
    <h1 className="mt-5 text-2xl font-semibold text-slate-900">Something went wrong</h1>
    <p className="mt-3 text-sm leading-6 text-slate-600">This operation could not be completed. Please try again.</p>
    <button type="button" onClick={reset} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#1B3430] px-5 text-sm font-semibold text-white"><RefreshCw size={17}/>Try again</button>
  </section>
}
