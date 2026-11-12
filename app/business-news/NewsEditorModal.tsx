"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useSession } from "@/app/components/SessionContext";
import { supabase } from "@/lib/supabaseClient";
import { ArrowUpRight, CheckCircle2, ImagePlus, LoaderCircle, PenLine, ShieldCheck, Trash2, X } from "lucide-react";

type Format = "article" | "poster" | "brief";
type Kind = "news" | "hiring" | "looking";
type Eligible = { id: string; name: string };
const CATEGORIES = ["Manpower Services","Care & Lifestyle","Professional & Finance","Construction & Industrial","Technical & Electronics","Events, Food & Leisure","Travel & Transport","Retail & Others"];
const DISTRICTS = ["Ampara","Anuradhapura","Badulla","Batticaloa","Colombo","Galle","Gampaha","Hambantota","Jaffna","Kalutara","Kandy","Kegalle","Kilinochchi","Kurunegala","Mannar","Matale","Matara","Monaragala","Mullaitivu","Nuwara Eliya","Polonnaruwa","Puttalam","Ratnapura","Trincomalee","Vavuniya"];
const input = "mt-2 min-h-11 w-full rounded-[10px] border border-[#dedbd2] bg-white px-4 py-3 text-[13px] text-[#272725] outline-none placeholder:text-[#98968f] focus:border-[#2f765c] focus:ring-2 focus:ring-[#2f765c]/15";
const label = "block text-[11px] font-bold uppercase tracking-[0.12em] text-[#67685e]";

export default function NewsEditorModal({ onClose, onPublished }: { onClose: () => void; onPublished: () => void }) {
  const { user, loading: sessionLoading } = useSession();
  const dialog = useRef<HTMLDivElement>(null);
  const [businesses, setBusinesses] = useState<Eligible[]>([]);
  const [checking, setChecking] = useState(true);
  const [businessId, setBusinessId] = useState("");
  const [format, setFormat] = useState<Format>("article");
  const [kind, setKind] = useState<Kind>("news");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [district, setDistrict] = useState("Colombo");
  const [title, setTitle] = useState("");
  const [story, setStory] = useState("");
  const [phone, setPhone] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (sessionLoading) return;
    if (!user?.id) { setChecking(false); return; }
    let active = true;
    void (async () => {
      const { data, error } = await supabase.from("businesses").select("id,name")
        .eq("owner_id", user.id).eq("is_verified", true).eq("status", "approved").order("name");
      if (!active) return;
      if (error) toast.error("Unable to check publishing access.");
      const eligible = (data || []) as Eligible[];
      setBusinesses(eligible);
      setBusinessId(eligible[0]?.id || "");
      setChecking(false);
    })();
    return () => { active = false; };
  }, [sessionLoading, user?.id]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => dialog.current?.focus());
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
      if (event.key !== "Tab" || !dialog.current) return;
      const nodes = Array.from(dialog.current.querySelectorAll<HTMLElement>(
        "button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled])"
      )).filter(el => el.getClientRects().length > 0);
      if (!nodes.length) return;
      if (event.shiftKey && document.activeElement === nodes[0]) { event.preventDefault(); nodes[nodes.length - 1].focus(); }
      else if (!event.shiftKey && document.activeElement === nodes[nodes.length - 1]) { event.preventDefault(); nodes[0].focus(); }
    };
    document.addEventListener("keydown", handleKey);
    return () => { cancelAnimationFrame(frame); document.removeEventListener("keydown", handleKey); document.body.style.overflow = previous; focused?.focus(); };
  }, [onClose, saving]);

  useEffect(() => {
    const urls = files.map(file => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [files]);

  const chooseImages = (event: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = Array.from(event.target.files || []);
    event.target.value = "";
    const valid = chosen.filter(f => ["image/png","image/jpeg","image/webp"].includes(f.type) && f.size <= 8 * 1024 * 1024);
    if (valid.length !== chosen.length) toast.error("Use JPG, PNG or WebP images, each under 8 MB.");
    if (files.length + valid.length > 5) { toast.error("Maximum 5 images per story."); return; }
    setFiles(prev => [...prev, ...valid]);
  };

  const publish = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    if (!user?.id || !businesses.some(b => b.id === businessId)) { toast.error("A verified business is required."); return; }
    if (!title.trim() || !story.trim()) { toast.error("Add a headline and story."); return; }
    if (format === "poster" && !files.length) { toast.error("Photo posters need at least one image."); return; }
    const uploadedPaths: string[] = [];
    setSaving(true); setProgress(0);
    try {
      const images: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
        const path = "posts/" + user.id + "/" + crypto.randomUUID() + "." + ext;
        const { error } = await supabase.storage.from("news-images").upload(path, file, { contentType: file.type, upsert: false });
        if (error) throw error;
        uploadedPaths.push(path);
        images.push(supabase.storage.from("news-images").getPublicUrl(path).data.publicUrl);
        setProgress(Math.round(((i + 1) / files.length) * 100));
      }
      const { error } = await supabase.from("business_news").insert({
        business_id: businessId, owner_id: user.id, title: title.trim(), content: story.trim(),
        contact_phone: phone.trim() || null, category, district, post_type: kind, content_format: format, images,
      });
      if (error) throw error;
      toast.success("Story published successfully", { description: "Your verified business update is now in the journal." });
      onPublished(); onClose();
    } catch (error) {
      if (uploadedPaths.length) void supabase.storage.from("news-images").remove(uploadedPaths);
      toast.error(error instanceof Error ? error.message : "Could not publish this story.");
    } finally { setSaving(false); }
  };

  return <div className="fixed inset-0 z-[1500] flex items-end justify-center bg-[#101912]/75 p-0 backdrop-blur-[3px] sm:items-center sm:p-5"
    role="presentation" onMouseDown={e => { if (e.target === e.currentTarget && !saving) onClose(); }}>
    <div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="editor-title"
      className="flex max-h-[95dvh] w-full max-w-[760px] flex-col overflow-hidden rounded-t-[18px] border border-[#e2dfd6] bg-[#faf9f5] shadow-[0_25px_100px_rgba(0,0,0,.3)] outline-none sm:max-h-[90dvh] sm:rounded-[18px]">
      <header className="flex shrink-0 items-start justify-between gap-4 border-b-2 border-[#1e392d] bg-white px-5 py-5 sm:px-8">
        <div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#a48054]">The publisher&apos;s desk</p>
          <h2 id="editor-title" className="mt-1 font-serif text-[28px] font-bold leading-tight text-[#1e392d] sm:text-[34px]">Share a business story</h2>
          <p className="mt-1 text-[12px] text-[#74766f]">Articles, photo posters and brief updates by verified business owners.</p></div>
        <button aria-label="Close editor" type="button" disabled={saving} onClick={onClose}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#e5e2d9] text-[#77766d] hover:bg-[#f5f4f0]"><X size={19}/></button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8">
        {!sessionLoading && !user ? <div className="py-10 text-center"><ShieldCheck size={38} className="mx-auto text-[#46866a]"/>
          <h3 className="mt-4 font-serif text-2xl text-[#1e392d]">Sign in to contribute</h3><p className="mt-2 text-sm text-[#70776e]">News stories are published by verified business owners.</p>
          <Link href="/login?redirect=%2Fbusiness-news%3Fpost%3Dtrue" className="mt-5 inline-flex rounded-lg bg-[#1e392d] px-6 py-3 text-sm font-bold text-white">Sign in <ArrowUpRight size={15} className="ml-2"/></Link></div>
          : checking || sessionLoading ? <div role="status" className="flex min-h-[200px] items-center justify-center gap-2 text-sm text-[#687469]"><LoaderCircle className="animate-spin" size={19}/>Checking verification…</div>
          : !businesses.length ? <div className="py-10 text-center"><ShieldCheck size={38} className="mx-auto text-[#a98957]"/>
            <h3 className="mt-4 font-serif text-2xl text-[#1e392d]">Verified business required</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#70776e]">Your business must be approved and verified before publishing news.</p>
            <Link href="/vendor/settings?tab=verification" className="mt-5 inline-flex items-center rounded-lg bg-[#1e392d] px-6 py-3 text-sm font-bold text-white">Review verification <ArrowUpRight size={15} className="ml-2"/></Link></div>
          : <form id="business-news-editor" onSubmit={publish} className="space-y-6">
            <div className="flex items-center gap-2 rounded-[9px] border border-[#d7e6da] bg-[#eff6f0] px-4 py-3 text-[12px] font-semibold text-[#397553]"><ShieldCheck size={16}/>Verified business publication</div>
            <div><label className={label} htmlFor="editor-business">Published by</label>
              <select id="editor-business" value={businessId} onChange={e => setBusinessId(e.target.value)} className={input} required>
                {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
            <fieldset><legend className={label}>Story format</legend><div className="mt-2 grid grid-cols-3 gap-2">
              {([{id:"article",text:"Article / blog"},{id:"poster",text:"Photo poster"},{id:"brief",text:"Quick update"}] as const).map(opt =>
                <button type="button" aria-pressed={format === opt.id} onClick={() => setFormat(opt.id)} key={opt.id}
                  className={"flex min-h-[58px] items-center justify-center gap-2 rounded-[9px] border px-2 text-center text-[11px] font-bold " + (format === opt.id ? "border-[#2f765c] bg-[#e9f4ec] text-[#22563e]" : "border-[#e1dfd6] bg-white text-[#656a60] hover:border-[#b6cbbb]")}>
                  {opt.id === "poster" ? <ImagePlus size={16}/> : <PenLine size={16}/>} {opt.text}</button>)}
            </div></fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className={label} htmlFor="editor-type">Topic</label><select id="editor-type" value={kind} onChange={e => setKind(e.target.value as Kind)} className={input}>
                <option value="news">Business news / announcement</option><option value="hiring">Hiring &amp; opportunities</option><option value="looking">Looking for services</option>
              </select></div>
              <div><label className={label} htmlFor="editor-district">District</label><select id="editor-district" value={district} onChange={e => setDistrict(e.target.value)} className={input}>
                {DISTRICTS.map(d => <option key={d}>{d}</option>)}</select></div>
            </div>
            <div><label className={label} htmlFor="editor-category">Industry</label><select id="editor-category" value={category} onChange={e => setCategory(e.target.value)} className={input}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
            <div><label className={label} htmlFor="editor-headline">Headline</label>
              <input id="editor-headline" value={title} onChange={e => setTitle(e.target.value)} required maxLength={150}
                placeholder="Write a clear, useful headline" className={input}/><p className="mt-1 text-right text-[10px] text-[#8b8c83]">{title.length}/150</p></div>
            <div><label className={label} htmlFor="editor-story">Story / description</label>
              <textarea id="editor-story" value={story} onChange={e => setStory(e.target.value)} rows={format === "article" ? 8 : 5}
                maxLength={6000} required placeholder="Share the facts, context and useful details…" className={input + " resize-y leading-7"}/>
              <p className="mt-1 text-right text-[10px] text-[#8b8c83]">{story.length}/6000</p></div>
            <div><label className={label} htmlFor="editor-phone">Contact phone (optional)</label>
              <input id="editor-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} maxLength={30}
                placeholder="+94 77 123 4567" className={input}/></div>
            <div><label className={label} htmlFor="editor-images">Images {format === "poster" ? "(required)" : "(optional)"} · up to 5 · 8 MB each</label>
              <input id="editor-images" type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={chooseImages}
                className="mt-2 w-full cursor-pointer rounded-[9px] border border-dashed border-[#b9caba] bg-white p-3 text-[12px] text-[#697568] file:mr-3 file:rounded-lg file:border-0 file:bg-[#e6f2e7] file:px-3 file:py-2 file:font-bold file:text-[#245b40]"/>
              {previews.length > 0 && <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">{previews.map((url, idx) =>
                <div key={url} className="relative aspect-square overflow-hidden rounded-lg bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={"Selected image " + (idx + 1)} className="h-full w-full object-cover"/>
                  <button type="button" aria-label={"Remove image " + (idx + 1)} onClick={() => setFiles(curr => curr.filter((_, i) => i !== idx))}
                    className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-[#171d17]/85 text-white"><Trash2 size={14}/></button></div>)}</div>}
            </div>
            <p className="border-t border-[#e1dfd5] pt-4 text-[11px] leading-5 text-[#7c7e72]">Publish only accurate information and images you have permission to share. All stories are public.</p>
          </form>}
      </div>
      {!checking && businesses.length > 0 && <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-[#e1dfd5] bg-white px-5 py-4 sm:px-8">
        <span className="hidden items-center gap-2 text-[11px] font-bold text-[#3c785a] sm:inline-flex"><CheckCircle2 size={16}/>Verified contributor</span>
        <div className="ml-auto flex gap-3"><button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-[#e1dfd5] px-5 py-2.5 text-[12px] font-semibold text-[#69695e]">Cancel</button>
          <button type="submit" form="business-news-editor" disabled={saving}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#1f392d] px-5 py-2.5 text-[12px] font-bold text-white hover:bg-[#316249] disabled:opacity-55">
            {saving ? <><LoaderCircle size={16} className="animate-spin"/>{files.length && progress < 100 ? "Uploading " + progress + "%" : "Publishing…"}</> : <><PenLine size={16}/>Publish story</>}
          </button></div>
      </footer>}
    </div>
  </div>;
}
