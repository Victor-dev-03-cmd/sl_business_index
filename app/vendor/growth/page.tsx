"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { ArrowRight, BarChart3, CalendarClock, CheckCircle2, Coins, Globe, Mail, Megaphone, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";

type Wallet = {
  plan_name: string;
  monthly_allowance: number;
  credits_remaining: number;
  credits_used: number;
  period_start: string;
  resets_at: string;
};
type LedgerEntry = {
  id: number;
  action_key: string;
  delta: number;
  balance_after: number;
  created_at: string;
};

const plannedTools = [
  { title: "Domain SEO Studio", icon: Globe, description: "Domain verification, website audits and keyword tracking.", cost: "10 credits / audit" },
  { title: "AI Social Marketing", icon: Megaphone, description: "Brand-aware content drafts and campaign scheduling.", cost: "2 credits / draft" },
  { title: "AI Email Marketing", icon: Mail, description: "Opt-in email campaigns and AI-assisted writing.", cost: "3 credits / draft" },
];

export default function VendorGrowthCenterPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [history, setHistory] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw new Error("Please sign in to view your Growth Credits.");
      const { data: snapshot, error: walletError } = await supabase.rpc("growth_wallet_status");
      if (walletError) {
        if (walletError.code === "PGRST202" || walletError.code === "42883" || walletError.code === "42P01") {
          throw new Error("Growth Credits are not configured yet. The database migration needs to be applied.");
        }
        throw new Error("Unable to load your Growth Credits. Please try again.");
      }
      const row = Array.isArray(snapshot) ? snapshot[0] : null;
      if (!row) throw new Error("Your Growth Credits wallet is currently unavailable.");
      setWallet(row as Wallet);
      const { data: entries, error: historyError } = await supabase
        .from("growth_credit_ledger")
        .select("id, action_key, delta, balance_after, created_at")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (!historyError) setHistory((entries || []) as LedgerEntry[]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load your Growth Credits.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const usedPercentage = wallet && wallet.monthly_allowance > 0
    ? Math.min(100, Math.round(wallet.credits_used / wallet.monthly_allowance * 100)) : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-7 pb-10">
      <header className="relative overflow-hidden rounded-[26px] bg-[#1B3430] px-6 py-8 text-white shadow-xl sm:px-9 sm:py-10">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#8AAD88]/15 blur-3xl" />
        <div className="relative z-10">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#D7B681]/35 bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#E9C88D]">
            <Sparkles size={14} /> SLBI Growth OS · Foundation
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Your business growth starts here.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#C8DACE]">
            Manage your Growth Credits and prepare for SEO, email and social marketing tools.
            Credit-consuming tools will be activated only after their services are fully operational.
          </p>
        </div>
      </header>

      {error ? (
        <section role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-semibold text-amber-950">Growth Center setup</h2>
          <p className="mt-1 text-sm text-amber-800">{error}</p>
          <button type="button" onClick={() => void reload()} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#1B3430] px-4 py-2 text-sm font-medium text-white">
            <RefreshCw size={15} /> Try again
          </button>
        </section>
      ) : null}

      <section aria-label="Growth Credits" className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-[#DBE4D9] bg-white p-6 shadow-sm md:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#274A3A]"><Coins size={20} className="text-[#B68C55]" /> Growth Credits</div>
            <span className="rounded-full bg-[#E7F2E9] px-3 py-1 text-xs font-semibold text-[#276145]">
              {wallet?.plan_name || "Basic"} plan
            </span>
          </div>
          <div className="mt-6 flex items-end gap-2">
            <span className="text-5xl font-semibold tracking-tight text-[#1B3430]">{loading ? "—" : wallet?.credits_remaining ?? "—"}</span>
            <span className="pb-2 text-sm text-[#84958A]">/ {wallet?.monthly_allowance ?? "—"} credits remaining</span>
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#E4EDE5]">
            <div className="h-full rounded-full bg-gradient-to-r from-[#2F765C] to-[#D8AE78] transition-[width]" style={{width: String(usedPercentage)+"%"}} />
          </div>
          <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-[#6A7D71]">
            <span>{wallet?.credits_used ?? 0} used this period</span>
            <span>{wallet ? "Resets " + new Date(wallet.resets_at).toLocaleDateString() : "Monthly reset"}</span>
          </div>
        </div>
        <div className="flex flex-col justify-between rounded-2xl border border-[#E5D9C4] bg-[#F8F3E9] p-6">
          <div>
            <ShieldCheck size={25} className="text-[#3B765A]" />
            <h2 className="mt-4 text-lg font-semibold text-[#1B3430]">Verified billing</h2>
            <p className="mt-2 text-sm leading-6 text-[#657B69]">Paid Growth Credits require a verified entitlement. An unverified browser payment cannot unlock them.</p>
          </div>
          <Link href="/vendor/billing" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#2F765C] hover:underline">
            View billing plans <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-[#1B3430]">Growth tools</h2>
          <p className="mt-1 text-sm text-[#738578]">Upcoming tools are shown for planning. They do not deduct credits yet.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {plannedTools.map(tool => {
            const Icon = tool.icon;
            return (
              <article key={tool.title} className="rounded-2xl border border-[#E0E7DC] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E7F1E9] text-[#28674C]"><Icon size={21}/></span>
                  <span className="rounded-full bg-[#F5F0E6] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#99784D]">Coming soon</span>
                </div>
                <h3 className="mt-5 font-semibold text-[#1B3430]">{tool.title}</h3>
                <p className="mt-2 min-h-[66px] text-sm leading-6 text-[#778779]">{tool.description}</p>
                <div className="mt-5 border-t border-[#EDF0E8] pt-4 text-xs font-medium text-[#53725D]">{tool.cost} · Not yet enabled</div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-[#E0E7DC] bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2"><BarChart3 className="text-[#2F765C]" size={20}/><h2 className="text-lg font-semibold text-[#1B3430]">Credit activity</h2></div>
          <div className="flex items-center gap-2 text-xs text-[#829487]"><CalendarClock size={15}/> Current and previous periods</div>
        </div>
        {loading ? <p role="status" className="py-6 text-sm text-[#7B8C80]">Loading credits…</p> :
        history.length === 0 ? <div className="py-7 text-center text-sm text-[#7B8C80]">No credit activity recorded yet.</div> :
        <div className="divide-y divide-[#EFF2EC]">
          {history.map(entry => (
            <div key={entry.id} className="flex items-center justify-between gap-4 py-3 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[#3F8665]"/>
                <div>
                  <p className="font-medium capitalize text-[#2D4B3B]">{entry.action_key.replace(/_/g," ")}</p>
                  <p className="text-xs text-[#8A9A8C]">{new Date(entry.created_at).toLocaleString()}</p>
                </div>
              </div>
              <span className={entry.delta >= 0 ? "font-semibold text-[#2C7A55]" : "font-semibold text-[#AB6A41]"}>
                {entry.delta > 0 ? "+" : ""}{entry.delta}
              </span>
            </div>
          ))}
        </div>}
      </section>
    </div>
  );
}
