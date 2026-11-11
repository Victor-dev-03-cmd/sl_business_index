"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import {
  Search, ShieldCheck, Languages, CheckCircle2, Clock3, FlaskConical,
  ArrowUpRight, ChevronDown, BarChart3, AlertCircle, Database,
} from "lucide-react";

type EvalCase = {
  id: number; query_text: string; language: string; expected_intent: string;
  expected_category: string | null; expected_location: string | null;
  validation_status: string; label_source: string;
};
type Review = {id: number;case_id: number;business_id: string;relevance: number;reviewer_id: string};
type Biz = {id: string;name: string;category: string};
const languageLabels: Record<string,string> = {
  en:"English",ta:"தமிழ்",si:"සිංහල","ta-Latn":"Thanglish",
  "si-Latn":"Singlish",mixed:"Mixed-script",
};
const relevanceLabels=["0 · Irrelevant","1 · Related","2 · Relevant","3 · Exact"];

/**
 * Admin-only qualitative evaluation workspace.
 * Sensitive eval rows and labels are protected again by database RLS.
 * No visitor query log, GPS location or private browsing history is captured.
 */
export default function SearchIntelligencePage() {
  const router=useRouter();
  const qc=useQueryClient();
  const [adminId,setAdminId]=useState<string|null>(null);
  const [authChecked,setAuthChecked]=useState(false);
  const [language,setLanguage]=useState("all");
  const [filter,setFilter]=useState("");
  const [selectedId,setSelectedId]=useState<number|null>(null);
  const [businessId,setBusinessId]=useState("");
  const [grade,setGrade]=useState(2);
  const [status,setStatus]=useState("");

  useEffect(()=>{
    let active=true;
    (async()=>{
      const {data:{user}}=await supabase.auth.getUser();
      if(!active)return;
      if(!user){router.replace("/login");setAuthChecked(true);return}
      const {data,error}=await supabase.from("profiles")
        .select("role").eq("id",user.id).single();
      if(!active)return;
      if(error||!["admin","ceo"].includes(String(data?.role||"").toLowerCase())){
        router.replace("/");setAuthChecked(true);return;
      }
      setAdminId(user.id);
      setAuthChecked(true);
    })();
    return()=>{active=false};
  },[router]);

  const {data:cases=[],isLoading:loadingCases,error:casesError}=useQuery<EvalCase[]>({
    queryKey:["slbi-search-eval-v3"],
    enabled:Boolean(adminId),
    queryFn:async()=>{
      const {data,error}=await supabase.from("search_evaluation_cases")
        .select("id,query_text,language,expected_intent,expected_category,expected_location,validation_status,label_source")
        .order("id",{ascending:true}).limit(1000);
      if(error)throw error;
      return (data||[]) as EvalCase[];
    },staleTime:60000,
  });
  const {data:reviews=[],error:reviewError}=useQuery<Review[]>({
    queryKey:["slbi-search-reviews-v3"],
    enabled:Boolean(adminId),
    queryFn:async()=>{
      const {data,error}=await supabase.from("search_relevance_reviews")
        .select("id,case_id,business_id,relevance,reviewer_id").limit(5000);
      if(error)throw error;
      return (data||[]) as Review[];
    },staleTime:30000,
  });
  const {data:businesses=[],error:businessError}=useQuery<Biz[]>({
    queryKey:["slbi-search-review-approved-businesses"],
    enabled:Boolean(adminId),
    queryFn:async()=>{
      const {data,error}=await supabase.from("businesses")
        .select("id,name,category").eq("status","approved")
        .order("name").limit(1000);
      if(error)throw error;
      return (data||[]) as Biz[];
    },staleTime:300000,
  });
  const selected=cases.find(item=>item.id===selectedId)||null;
  const coverage=new Set(reviews.map(item=>item.case_id)).size;
  const breakdown=useMemo(()=>{
    const map=new Map<string,{cases:number,reviewed:number}>();
    const checked=new Set(reviews.map(item=>item.case_id));
    cases.forEach(item=>{
      const entry=map.get(item.language)||{cases:0,reviewed:0};
      entry.cases++;
      if(checked.has(item.id))entry.reviewed++;
      map.set(item.language,entry);
    });
    return [...map].sort((a,b)=>a[0].localeCompare(b[0]));
  },[cases,reviews]);
  const visible=useMemo(()=>{
    const term=filter.trim().toLocaleLowerCase();
    return cases.filter(item=>(language==="all"||item.language===language)
      &&(!term||(item.query_text+" "+item.expected_intent).toLocaleLowerCase().includes(term)));
  },[cases,language,filter]);

  const mutation=useMutation({
    mutationFn:async()=>{
      if(!adminId||!selected||!businessId)throw new Error("Select a query and business");
      const {error}=await supabase.from("search_relevance_reviews").upsert({
        case_id:selected.id,business_id:businessId,relevance:grade,reviewer_id:adminId,
        reviewed_at:new Date().toISOString(),
      },{onConflict:"case_id,business_id,reviewer_id"});
      if(error)throw error;
    },
    onSuccess:()=>{
      setStatus("Relevance judgment saved.");
      qc.invalidateQueries({queryKey:["slbi-search-reviews-v3"]});
    },
    onError:(error:Error)=>setStatus(error.message),
  });

  if(!authChecked||!adminId) return (
    <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500">
      Checking administrator access…
    </div>
  );

  return (
    <main className="min-h-full bg-[#F6F8F6] p-4 sm:p-7 text-[#213C30]">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[11px] font-semibold tracking-widest uppercase text-[#51866B]">
              <FlaskConical size={15}/> SLBI Discovery Research
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Search Intelligence</h1>
            <p className="max-w-2xl text-[13px] text-[#6A7D70]">
              Multilingual relevance review for SemanticSearch v3. Taxonomy-derived query labels
              are not a substitute for verified business-level relevance judgments.
            </p>
          </div>
          <Link href="/admin/analytics" className="inline-flex items-center gap-2 rounded-[8px] border border-[#CEDDD2] bg-white px-4 py-2.5 text-xs font-semibold hover:bg-[#EDF3EC]">
            Analytics <ArrowUpRight size={14}/>
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            {label:"Evaluation queries",value:cases.length,icon:Search},
            {label:"Judgments saved",value:reviews.length,icon:CheckCircle2},
            {label:"Queries reviewed",value:coverage,icon:Languages},
            {label:"Review completion",value:cases.length?Math.round(coverage/cases.length*100)+"%":"0%",icon:BarChart3},
          ].map(tile=>(
            <div key={tile.label} className="rounded-[10px] border border-[#DFE8DF] bg-white p-4">
              <tile.icon size={17} className="text-[#367B59]"/>
              <p className="mt-3 text-2xl font-semibold tabular-nums">{tile.value}</p>
              <p className="mt-1 text-xs text-[#728779]">{tile.label}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]">
          <section className="min-w-0 rounded-[10px] border border-[#DFE8DF] bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Query evaluation corpus</h2>
                <p className="mt-1 text-xs text-[#728779]">Curated, awaiting independent native-speaker review</p>
              </div>
              <div className="flex items-center gap-2">
                <select aria-label="Language filter" value={language} onChange={e=>setLanguage(e.target.value)}
                  className="rounded-[8px] border border-[#D7E4DA] bg-white px-3 py-2 text-xs">
                  <option value="all">All languages</option>
                  {Object.keys(languageLabels).map(key=><option key={key} value={key}>{languageLabels[key]}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-[8px] border border-[#D7E4DA] px-3">
              <Search size={16} className="text-[#789285]"/>
              <input aria-label="Search evaluation queries" value={filter} onChange={e=>setFilter(e.target.value)}
                placeholder="Filter terms and intents" className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none"/>
            </div>
            {casesError||reviewError||businessError ? (
              <p className="mt-4 rounded-[8px] border border-[#EACACA] bg-[#FFF5F5] p-3 text-xs text-red-700">
                Could not load evaluation data. Check database permissions and network.
              </p>
            ):null}
            <div className="mt-3 max-h-[520px] space-y-1 overflow-y-auto">
              {loadingCases?<p className="p-4 text-xs text-[#789285]">Loading evaluation corpus…</p>
                :visible.slice(0,280).map(item=>(
                <button key={item.id} type="button" onClick={()=>{setSelectedId(item.id);setStatus("")}}
                  className={"flex w-full items-center gap-3 rounded-[8px] border px-3 py-3 text-left text-xs transition-colors "+(selectedId===item.id?"border-[#75A889] bg-[#EFF7F0]":"border-transparent hover:border-[#E0EAE0] hover:bg-[#F8FAF7]")}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-[#253F31]">{item.query_text}</span>
                    <span className="mt-1 block text-[11px] text-[#789285]">{item.expected_intent} · {languageLabels[item.language]||item.language}</span>
                  </span>
                  <span className={reviews.some(review=>review.case_id===item.id)
                    ?"text-[#34865A]":"text-[#9AA89F]"}>
                    {reviews.some(review=>review.case_id===item.id)?<CheckCircle2 size={15}/>:<Clock3 size={15}/>}
                  </span>
                </button>
              ))}
            </div>
          </section>
          <div className="space-y-5">
            <section className="rounded-[10px] border border-[#DFE8DF] bg-white p-4">
              <h2 className="flex items-center gap-2 font-semibold"><ShieldCheck size={18} className="text-[#427E60]"/> Human relevance judgment</h2>
              <p className="mt-1 text-xs text-[#728779]">Grade whether a specific approved business satisfies the selected query.</p>
              {selected?<form onSubmit={event=>{event.preventDefault();mutation.mutate()}} className="mt-5 space-y-4">
                <div className="rounded-[8px] bg-[#F2F7F1] p-3">
                  <p className="text-xs font-semibold">{selected.query_text}</p>
                  <p className="mt-1 text-[11px] text-[#6F8876]">Expected intent: {selected.expected_intent}; taxonomy label is provisional.</p>
                </div>
                <label className="block text-xs font-semibold">
                  Approved business
                  <select value={businessId} required onChange={e=>setBusinessId(e.target.value)}
                    className="mt-2 block w-full min-w-0 rounded-[8px] border border-[#D7E4DA] bg-white p-2.5 text-xs">
                    <option value="">Choose listing…</option>
                    {businesses.map(biz=><option key={biz.id} value={biz.id}>{biz.name} — {biz.category}</option>)}
                  </select>
                </label>
                <label className="block text-xs font-semibold">
                  Relevance grade
                  <select value={grade} onChange={e=>setGrade(Number(e.target.value))}
                    className="mt-2 block w-full rounded-[8px] border border-[#D7E4DA] bg-white p-2.5 text-xs">
                    {relevanceLabels.map((value,index)=><option value={index} key={value}>{value}</option>)}
                  </select>
                </label>
                <button type="submit" disabled={mutation.isPending||!businessId}
                  className="w-full rounded-[8px] bg-[#24573F] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 hover:bg-[#2D694A]">
                  {mutation.isPending?"Saving…":"Save relevance grade"}
                </button>
                {status?<p role="status" className="text-xs text-[#577960]">{status}</p>:null}
              </form>:<p className="mt-6 text-xs text-[#83978A]">Select a query to begin reviewing.</p>}
            </section>
            <section className="rounded-[10px] border border-[#DFE8DF] bg-white p-4">
              <h2 className="flex items-center gap-2 font-semibold"><Database size={18} className="text-[#427E60]"/> Research readiness</h2>
              <div className="mt-4 space-y-3">
                <p className="flex items-start gap-2 text-xs"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[#398D61]"/> Curated multilingual query corpus is available.</p>
                <p className="flex items-start gap-2 text-xs"><AlertCircle size={15} className="mt-0.5 shrink-0 text-[#A17B36]"/> Model-backed semantic ranking remains off until validated multilingual embeddings exist.</p>
                <p className="flex items-start gap-2 text-xs"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-[#398D61]"/> Reviews are admin-only and protected by RLS.</p>
              </div>
              <div className="mt-5 space-y-2 border-t border-[#EDF1EB] pt-4">
                {breakdown.map(([lang,stat])=>(
                  <div key={lang} className="flex items-center justify-between text-xs">
                    <span>{languageLabels[lang]||lang}</span>
                    <span className="tabular-nums text-[#6B8878]">{stat.reviewed} / {stat.cases} reviewed</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
