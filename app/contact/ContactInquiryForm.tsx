"use client";

import { useState, type FormEvent } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import { toast } from "sonner";
import { ArrowUpRight, LoaderCircle, MessageSquareText, ShieldCheck } from "lucide-react";

const DEPARTMENTS = ["General Inquiry", "Add My Business", "Report Location Error", "Advertising / Pricing", "Technical Support"];
const input = "mt-2 min-h-12 w-full rounded-[11px] border border-[#dce5db] bg-white px-4 py-3 text-[13px] font-medium text-[#284431] outline-none transition-colors placeholder:text-[#9cac9f] focus:border-[#3b9166] focus:ring-2 focus:ring-[#dceee2]";

export default function ContactInquiryForm() {
  const [form, setForm] = useState({name:"",email:"",department:DEPARTMENTS[0],subject:"",message:""});
  const [token, setToken] = useState<string | null>(null);
  const [captchaVersion, setCaptchaVersion] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    if (!token) { toast.error("Please complete the security check."); setResult("error"); return; }
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) { toast.error("Name, email and message are required."); return; }
    setSubmitting(true);
    setResult(null);
    try {
      const response = await fetch("/api/contact/send", {
        method:"POST", headers: {"Content-Type":"application/json"},
        body:JSON.stringify({
          name:form.name.trim(),
          email:form.email.trim(),
          subject:form.subject.trim(),
          message:form.message.trim(),
          department:form.department,
          location:"",
          turnstileToken:token,
        }),
      });
      const data: { success?: boolean; error?: string } = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Could not send your message.");
      setForm({name:"",email:"",department:DEPARTMENTS[0],subject:"",message:""});
      setResult("success");
      toast.success("Your inquiry was received", {description:"Thank you for contacting SL Business Index."});
    } catch (error) {
      setResult("error");
      toast.error("Message could not be sent", {
        description:error instanceof Error ? error.message : "Please try WhatsApp or email instead.",
      });
    } finally {
      setToken(null);
      setCaptchaVersion(n=>n+1);
      setSubmitting(false);
    }
  }

  return <form onSubmit={handleSubmit} className="space-y-4" aria-label="Contact SL Business Index">
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block text-[12px] font-semibold text-[#3f5b48]">Your name <span aria-hidden="true" className="text-[#9c6636]">*</span>
        <input className={input} autoComplete="name" name="name" required maxLength={120}
          value={form.name} onChange={e=>setForm(s=>({...s,name:e.target.value}))} placeholder="Full name"/>
      </label>
      <label className="block text-[12px] font-semibold text-[#3f5b48]">Email address <span aria-hidden="true" className="text-[#9c6636]">*</span>
        <input type="email" className={input} autoComplete="email" name="email" required maxLength={254}
          value={form.email} onChange={e=>setForm(s=>({...s,email:e.target.value}))} placeholder="you@example.com"/>
      </label>
    </div>
    <label className="block text-[12px] font-semibold text-[#3f5b48]">What can we help with?
      <select className={input} value={form.department} onChange={e=>setForm(s=>({...s,department:e.target.value}))}>
        {DEPARTMENTS.map(d=><option key={d}>{d}</option>)}
      </select>
    </label>
    <label className="block text-[12px] font-semibold text-[#3f5b48]">Subject
      <input className={input} value={form.subject} maxLength={160}
        onChange={e=>setForm(s=>({...s,subject:e.target.value}))} placeholder="A short summary"/>
    </label>
    <label className="block text-[12px] font-semibold text-[#3f5b48]">Message <span aria-hidden="true" className="text-[#9c6636]">*</span>
      <textarea required className={input + " min-h-[130px] resize-y leading-[1.75]"} value={form.message} maxLength={5000} rows={5}
        onChange={e=>setForm(s=>({...s,message:e.target.value}))} placeholder="Tell us how we can help…"/>
    </label>
    <div className="rounded-[11px] border border-[#e8eee7] bg-[#f9fbf8] p-3">
      {siteKey ? <Turnstile key={captchaVersion} siteKey={siteKey} onSuccess={setToken}
        onError={()=>setToken(null)} onExpire={()=>setToken(null)} options={{theme:"light",size:"flexible"}}/> :
        <p role="alert" className="text-[12px] text-[#89593c]">The inquiry form is temporarily unavailable. Please use WhatsApp or email.</p>}
    </div>
    <button type="submit" disabled={submitting || !siteKey}
      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-[#204c37] px-5 text-[13px] font-extrabold text-white transition-colors hover:bg-[#347250] disabled:cursor-not-allowed disabled:opacity-55">
      {submitting ? <LoaderCircle size={17} className="animate-spin"/> : <MessageSquareText size={17}/>}
      {submitting ? "Sending inquiry…" : "Send inquiry"}
      {!submitting && <ArrowUpRight size={16}/>}
    </button>
    <p className="flex items-start gap-2 text-[11px] leading-5 text-[#819083]">
      <ShieldCheck size={15} className="mt-0.5 shrink-0 text-[#6a9b78]"/> Your message is sent to SL Business Index support. Please don't include passwords, OTPs or bank details.
    </p>
    {result === "success" && <p role="status" className="rounded-[10px] border border-[#b9d8c1] bg-[#eff8f0] px-4 py-3 text-[12px] font-semibold text-[#286140]">Your message was received. Thank you.</p>}
    {result === "error" && <p role="alert" className="rounded-[10px] border border-[#ebd4bb] bg-[#fff8ee] px-4 py-3 text-[12px] font-semibold text-[#855e40]">Unable to send your inquiry. Check your details and try again or contact us via WhatsApp.</p>}
  </form>;
}
