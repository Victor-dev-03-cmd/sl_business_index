'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import PromotionUploadForm from './components/PromotionUploadForm';

const MarketingDesignEditor = dynamic(
  () => import('./components/MarketingDesignEditor'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-500 font-medium">Loading Design Editor...</p>
        </div>
      </div>
    ),
  }
)
import { 
  Megaphone,
  Calendar, 
  Download, 
  Type, 
  Palette, 
  Facebook,
  Instagram,
  Linkedin,
  Send,
  Loader2,
  CheckCircle2,
  Clock,
  Sparkles,
  Image as ImageIcon,
  ChevronRight,
  History,
  Layout,
  ExternalLink
} from 'lucide-react';

interface Business {
  id: string;
  name: string;
}

interface Campaign {
  id: string;
  business_id: string;
  banner_text?: string;
  banner_color?: string;
  image_url?: string;
  caption?: string;
  platforms?: string[];
  social_platforms?: string[];
  scheduled_at: string | null;
  status: string;
  created_at: string;
  businesses: { name: string };
  type: 'banner' | 'image';
}

export default function MarketingPage() {
  const [activeTab, setActiveTab] = useState<'create' | 'image' | 'schedule' | 'history'>('create');
  const [showEditor, setShowEditor] = useState(false);
  const [bannerText, setBannerText] = useState('Special Offer!');
  const [bannerColor, setBannerColor] = useState('bg-emerald-600');
  const [selectedPlatform, setSelectedPlatform] = useState<string[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: businessData } = await supabase
        .from('businesses')
        .select('id, name')
        .eq('owner_id', user.id);
      
      if (businessData) {
        setBusinesses(businessData);
        if (businessData.length > 0) {
          setSelectedBusinessId(businessData[0].id);
        }
      }

      const { data: campaignData } = await supabase
        .from('marketing_campaigns')
        .select('*, businesses(name)')
        .order('created_at', { ascending: false });
      
      const { data: promotionData } = await supabase
        .from('promotions')
        .select('*, businesses(name)')
        .order('created_at', { ascending: false });

      const combined: Campaign[] = [
        ...(campaignData || []).map(c => ({ ...c, type: 'banner' as const })),
        ...(promotionData || []).map(p => ({ ...p, type: 'image' as const }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setCampaigns(combined);
    } catch (error) {
      console.error('Error fetching marketing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePlatform = (platform: string) => {
    if (selectedPlatform.includes(platform)) {
      setSelectedPlatform(selectedPlatform.filter(p => p !== platform));
    } else {
      setSelectedPlatform([...selectedPlatform, platform]);
    }
  };

  const handleCampaignAction = async (isSchedule: boolean) => {
    if (!selectedBusinessId) {
      toast.warning('Please select a business');
      return;
    }

    if (isSchedule && !scheduledAt) {
      toast.warning('Please select a schedule date');
      return;
    }
    if (isSchedule && (!Number.isFinite(Date.parse(scheduledAt)) || new Date(scheduledAt).getTime() <= Date.now())) {
      toast.warning('Select a future date and time for scheduling.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('marketing_campaigns')
        .insert({
          business_id: selectedBusinessId,
          banner_text: bannerText,
          banner_color: bannerColor,
          platforms: selectedPlatform,
          scheduled_at: isSchedule ? scheduledAt : null,
          status: isSchedule ? 'scheduled' : 'posted'
        });

      if (error) throw error;

      toast.success(isSchedule ? 'Campaign schedule saved in SLBI. External posting is not automatic.' : 'Campaign saved in SLBI. External networks are not automatically published.');
      setActiveTab('history');
      fetchData();
    } catch (error) {
      console.error('Error saving campaign:', error);
      toast.error('Failed to save campaign');
    } finally {
      setSubmitting(false);
    }
  };

  if (showEditor) {
    return (
      <MarketingDesignEditor 
        onBackAction={() => setShowEditor(false)} 
        businesses={businesses}
        onPublishSuccess={() => {
          setShowEditor(false);
          setActiveTab('history');
          fetchData();
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-[1460px] space-y-5 pb-5 text-[#243D2D]">
      <Script src="https://js.puter.com/v2/" strategy="afterInteractive" />
      
      <div className="space-y-5">
        <header className="vendor-premium-header flex flex-col gap-6 px-6 py-7 sm:px-8 sm:py-9 lg:flex-row lg:items-end lg:justify-between">
          <div className="relative z-10 max-w-2xl">
            <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#BEDFAF]">Grow your presence / Marketing Studio</p>
            <h1 className="mt-2 text-[30px] font-extrabold tracking-[-.05em] text-white sm:text-[35px]">Make every campaign count.</h1>
            <p className="mt-2 text-[12px] leading-6 text-[#DCEBDD]">Plan professional business promotions, manage creative assets and review saved SLBI campaign activity from one workspace.</p>
            <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-bold text-[#D4EDD6]">
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5">Campaign workspace</span>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5">Design preview</span>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5">Scheduled records</span>
            </div>
          </div>
          <div className="relative z-10 flex flex-wrap items-center gap-2">
            <Link href="/vendor/insights" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 text-[12px] font-bold text-white transition hover:bg-white/20">
              <History size={16}/> Growth insights
            </Link>
            <button type="button" onClick={() => setShowEditor(true)}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 bg-[#F6FAEE] px-4 text-[12px] font-bold text-[#245F3F] transition hover:bg-white">
              <Sparkles size={16}/> Open design editor
            </button>
          </div>
        </header>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label:'Saved campaign records',value:campaigns.length,info:'Existing RLS-approved campaign records',icon:Megaphone },
            { label:'Scheduled records',value:campaigns.filter(c=>c.status==='scheduled').length,info:'Dates saved; external posting not automatic',icon:Calendar },
            { label:'Published or approved records',value:campaigns.filter(c=>c.status==='posted'||c.status==='approved').length,info:'Internal statuses, not verified social impressions',icon:CheckCircle2 },
          ].map(item=><div key={item.label} className="vendor-premium-card flex items-start justify-between gap-2 p-5">
            <div><p className="text-[11px] font-bold text-[#68806D]">{item.label}</p><p className="mt-2 text-[28px] font-extrabold tabular-nums tracking-[-.045em] text-[#224832]">{loading?'—':item.value}</p><p className="mt-1 text-[10px] leading-5 text-[#8C9B8D]">{item.info}</p></div>
            <span className="rounded-xl bg-[#E9F4E9] p-2.5 text-[#39774D]"><item.icon size={19}/></span>
          </div>)}
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
          
          {/* Navigation & Controls (XL: 4 cols) */}
          <div className="space-y-5 xl:col-span-4">
            
            {/* Nav Cards */}
            <div className="grid grid-cols-2 gap-3">
              <TabButton 
                active={activeTab === 'create'} 
                onClick={() => setActiveTab('create')}
                icon={<Palette size={20} />}
                label="Banner"
              />
              <TabButton 
                active={activeTab === 'image'} 
                onClick={() => setActiveTab('image')}
                icon={<ImageIcon size={20} />}
                label="Image"
              />
              <TabButton 
                active={activeTab === 'schedule'} 
                onClick={() => setActiveTab('schedule')}
                icon={<Calendar size={20} />}
                label="Schedule"
              />
              <TabButton 
                active={activeTab === 'history'} 
                onClick={() => setActiveTab('history')}
                icon={<History size={20} />}
                label="History"
              />
            </div>

            {/* Editor Forms */}
            <div className="vendor-premium-panel overflow-hidden">
              <div className="p-6">
                <AnimatePresence mode="wait">
                  {activeTab === 'create' && (
                    <motion.div 
                      key="create-form"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-6"
                    >
                      <FormSection label="Target Business" icon={<Layout size={14} />}>
                        <select 
                          value={selectedBusinessId}
                          onChange={(e) => setSelectedBusinessId(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-brand-blue/30 outline-none transition-all appearance-none"
                        >
                          {businesses.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                      </FormSection>

                      <FormSection label="Banner Message" icon={<Type size={14} />}>
                        <input 
                          type="text" 
                          value={bannerText}
                          onChange={(e) => setBannerText(e.target.value)}
                          placeholder="e.g. 50% Off Everything!"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-brand-blue/30 outline-none transition-all"
                        />
                      </FormSection>

                      <FormSection label="Visual Style" icon={<Palette size={14} />}>
                        <div className="flex gap-3 flex-wrap p-2 bg-slate-50 rounded-xl border border-slate-200">
                          {['bg-emerald-600', 'bg-blue-600', 'bg-purple-600', 'bg-rose-600', 'bg-amber-500', 'bg-slate-900'].map((color) => (
                            <button
                              key={color}
                              onClick={() => setBannerColor(color)}
                              className={`w-10 h-10 rounded-lg ${color} transition-all ${bannerColor === color ? 'ring-2 ring-brand-gold ring-offset-4 ring-offset-white scale-110' : 'opacity-60 hover:opacity-100'}`}
                            />
                          ))}
                        </div>
                      </FormSection>

                      <SocialPlatforms 
                        selected={selectedPlatform} 
                        onToggle={togglePlatform} 
                      />

                      <button 
                        onClick={() => handleCampaignAction(false)}
                        disabled={submitting}
                        className="w-full py-3.5 bg-brand-blue hover:bg-brand-blue/90 text-white rounded-xl font-bold text-sm shadow-lg shadow-brand-blue/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
                      >
                        {submitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                        Save SLBI campaign
                      </button>
                    </motion.div>
                  )}

                  {activeTab === 'image' && (
                    <motion.div 
                      key="image-form"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <PromotionUploadForm 
                        businesses={businesses} 
                        onSuccess={() => {
                          setActiveTab('history');
                          fetchData();
                        }} 
                      />
                    </motion.div>
                  )}

                  {activeTab === 'schedule' && (
                    <motion.div 
                      key="schedule-form"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-6"
                    >
                      <FormSection label="Select Business" icon={<Layout size={14} />}>
                        <select 
                          value={selectedBusinessId}
                          onChange={(e) => setSelectedBusinessId(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 outline-none"
                        >
                          {businesses.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                      </FormSection>

                      <FormSection label="Posting Date & Time" icon={<Calendar size={14} />}>
                        <input 
                          type="datetime-local" 
                          value={scheduledAt}
                          onChange={(e) => setScheduledAt(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 outline-none" 
                        />
                      </FormSection>

                      <SocialPlatforms 
                        selected={selectedPlatform} 
                        onToggle={togglePlatform} 
                      />

                      <button 
                        onClick={() => handleCampaignAction(true)}
                        disabled={submitting}
                        className="w-full py-3.5 bg-brand-gold hover:bg-brand-gold/90 text-white rounded-xl font-bold text-sm shadow-lg shadow-brand-gold/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
                      >
                        {submitting ? <Loader2 className="animate-spin" size={18} /> : <Calendar size={18} />}
                        Save planned schedule
                      </button>
                    </motion.div>
                  )}

                  {activeTab === 'history' && (
                    <motion.div 
                      key="history-list"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">Recent Activity</h3>
                        <button onClick={fetchData} className="text-[10px] text-brand-blue font-bold hover:underline">Refresh</button>
                      </div>
                      
                      <div className="space-y-3 max-h-[600px] overflow-y-auto no-scrollbar pr-1">
                        {loading ? (
                          <div className="py-20 text-center space-y-3">
                            <Loader2 className="animate-spin mx-auto text-brand-blue/40" size={32} />
                            <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">Syncing history...</p>
                          </div>
                        ) : campaigns.length === 0 ? (
                          <div className="py-20 text-center bg-slate-50 rounded-2xl border border-slate-200">
                            <p className="text-xs text-slate-500 italic">No saved campaigns yet. Create your first campaign to start a history.</p>
                          </div>
                        ) : (
                          campaigns.map((c) => (
                            <CampaignCard key={c.id} campaign={c} />
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Real-time Preview (XL: 8 cols) */}
          <div className="space-y-5 xl:col-span-8">
            <div className="vendor-premium-panel flex min-h-[600px] flex-col overflow-hidden">
              <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-rose-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  </div>
                  <span className="text-xs font-black text-slate-500 uppercase tracking-widest ml-2">Design preview · not published</span>
                </div>
                <div className="flex items-center gap-2">
                   <div className="px-2 py-1 bg-emerald-500/5 text-emerald-600 text-[10px] font-black uppercase rounded border border-emerald-500/10 flex items-center gap-1.5">
                     <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                     Visual preview
                   </div>
                </div>
              </div>
              
              <div className="flex-1 bg-slate-100/30 relative overflow-hidden flex items-center justify-center p-6 md:p-12">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
                
                {/* The Banner */}
                <motion.div 
                  layout
                  className={`relative z-10 w-full max-w-xl aspect-square ${bannerColor} rounded-3xl shadow-2xl flex flex-col items-center justify-center p-10 text-center transition-all duration-500 overflow-hidden group`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                  <div className="absolute top-0 left-0 w-full h-1 bg-white/20" />
                  
                  <div className="relative z-10 space-y-6">
                    <motion.h2 
                      key={bannerText}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="break-words text-[clamp(1.9rem,4.8vw,4.5rem)] font-extrabold leading-tight text-white drop-shadow-lg"
                    >
                      {bannerText}
                    </motion.h2>
                    <p className="text-white/80 text-lg md:text-xl font-medium tracking-wide">
                      Your promotion, visually previewed.<br/>Review before publishing.
                    </p>
                    <div className="pt-4">
                      <div className="inline-flex items-center gap-3 rounded-xl border border-white/30 bg-white/90 px-6 py-3 text-[11px] font-extrabold uppercase tracking-widest text-[#254B33] shadow-lg">
                        Sample call to action
                        <ChevronRight size={18} />
                      </div>
                    </div>
                  </div>

                  {/* Pro Badge */}
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 text-white/40 text-[10px] font-bold uppercase tracking-widest">
                    <Sparkles size={12} className="text-brand-gold" />
                    SLBI Creative Preview
                  </div>
                </motion.div>

                {/* Decorative Elements */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-brand-blue/5 blur-[120px] rounded-full pointer-events-none" />
              </div>

              <div className="p-6 bg-white border-t border-slate-200 flex items-center justify-between">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Actual reach is measured in Growth Insights, not estimated here.
                </p>
                <button 
                  onClick={() => setShowEditor(true)}
                  className="text-xs text-brand-blue font-bold flex items-center gap-2 hover:bg-brand-blue/5 px-3 py-1.5 rounded-lg transition-all"
                >
                  <Sparkles size={14} /> Open editor
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}

// Sub-components for cleaner code
function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex min-h-24 flex-col items-center justify-center gap-2 rounded-[14px] border p-4 transition-colors ${
        active 
          ? 'border-[#A8D0B1] bg-[#EAF6EC] text-[#1F6943] shadow-[0_4px_16px_rgba(38,93,50,.07)]' 
          : 'border-[#E1EAE0] bg-white text-[#738A79] hover:bg-[#F7FAF5] hover:text-[#3D7150]'
      }`}
    >
      {icon}
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );
}

function FormSection({ label, icon, children }: { label: string, icon: React.ReactNode, children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}

function SocialPlatforms({ selected, onToggle }: { selected: string[], onToggle: (p: string) => void }) {
  return (
    <div className="space-y-3">
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Network Distribution</label>
      <div className="grid grid-cols-3 gap-2">
        <PlatformBtn 
          active={selected.includes('facebook')} 
          onClick={() => onToggle('facebook')}
          icon={<Facebook size={16} />}
          label="FB"
        />
        <PlatformBtn 
          active={selected.includes('instagram')} 
          onClick={() => onToggle('instagram')}
          icon={<Instagram size={16} />}
          label="IG"
        />
        <PlatformBtn 
          active={selected.includes('linkedin')} 
          onClick={() => onToggle('linkedin')}
          icon={<Linkedin size={16} />}
          label="IN"
        />
      </div>
    </div>
  );
}

function PlatformBtn({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`py-2.5 rounded-xl border flex items-center justify-center gap-2 transition-all ${
        active 
          ? 'bg-brand-blue/5 border-brand-blue/30 text-brand-blue' 
          : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
      }`}
    >
      {icon}
      <span className="text-[10px] font-black">{label}</span>
    </button>
  );
}

function CampaignCard({ campaign }: { campaign: Campaign }) {
  const isBanner = campaign.type === 'banner';
  const isLive = campaign.status === 'posted' || campaign.status === 'approved';

  return (
    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition-all group">
      <div className="flex justify-between items-start mb-3">
        <div className="space-y-0.5">
          <h4 className="text-[11px] font-black text-slate-800 uppercase truncate max-w-[140px]">
            {campaign.businesses.name}
          </h4>
          <p className="text-[10px] text-slate-500 font-medium">
            {new Date(campaign.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter ${
            isBanner ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20' : 'bg-purple-500/10 text-purple-600 border border-purple-500/20'
          }`}>
            {campaign.type}
          </span>
          <div className="flex items-center gap-1">
             {isLive ? (
               <span className="flex items-center gap-1 text-[8px] font-black text-emerald-600 uppercase tracking-widest">
                 <CheckCircle2 size={8} /> Saved
               </span>
             ) : (
               <span className="flex items-center gap-1 text-[8px] font-black text-amber-600 uppercase tracking-widest">
                 <Clock size={8} /> {campaign.status}
               </span>
             )}
          </div>
        </div>
      </div>

      {campaign.image_url && (
        <div className="mb-3 aspect-video rounded-lg overflow-hidden border border-slate-200 bg-slate-100 relative group">
          <Image 
            src={campaign.image_url} 
            alt="Campaign" 
            fill
            className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" 
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <ExternalLink size={16} className="text-white" />
          </div>
        </div>
      )}

      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed italic mb-3">
        &quot;{isBanner ? campaign.banner_text : campaign.caption}&quot;
      </p>

      <div className="flex items-center justify-between pt-3 border-t border-slate-200">
        <div className="flex gap-2">
          {(campaign.platforms || campaign.social_platforms || []).map((p: string) => (
            <div key={p} className="text-slate-400 group-hover:text-brand-blue transition-colors">
              {p === 'facebook' && <Facebook size={12} />}
              {p === 'instagram' && <Instagram size={12} />}
              {p === 'linkedin' && <Linkedin size={12} />}
            </div>
          ))}
        </div>
        <Link href="/vendor/insights" className="text-[10px] font-extrabold uppercase tracking-widest text-[#3D7350] hover:underline">
          Recorded insights
        </Link>
      </div>
    </div>
  );
}
