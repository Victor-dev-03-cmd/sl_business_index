'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabaseClient'
import {
  ArrowLeft, ArrowRight, CheckCircle2, FileText, ImagePlus, LoaderCircle,
  Megaphone, Newspaper, ShieldCheck, Trash2, UploadCloud
} from 'lucide-react'

type Format = 'article' | 'poster' | 'brief'
const DISTRICTS = ['Ampara','Anuradhapura','Badulla','Batticaloa','Colombo','Galle','Gampaha','Hambantota','Jaffna','Kalutara','Kandy','Kegalle','Kilinochchi','Kurunegala','Mannar','Matale','Matara','Monaragala','Mullaitivu','Nuwara Eliya','Polonnaruwa','Puttalam','Ratnapura','Trincomalee','Vavuniya']
const TOPICS = [
  'Official Announcement', 'Platform Updates', 'Business Registration',
  'Business Tools', 'Business Opportunities', 'Guides & Resources', 'Industry News'
]
const field = 'mt-2 block min-h-12 w-full rounded-xl border border-[#DAE4DC] bg-white px-4 py-3 text-[14px] text-[#183C2E] outline-none transition focus:border-[#3D8462] focus:ring-4 focus:ring-[#3D8462]/10'
const fieldLabel = 'block text-[12px] font-semibold text-[#314E3D]'
const formats: { id: Format; name: string; description: string; icon: typeof Newspaper }[] = [
  { id: 'article', name: 'News article', description: 'Detailed press release', icon: FileText },
  { id: 'poster', name: 'Photo story', description: 'Image-led announcement', icon: ImagePlus },
  { id: 'brief', name: 'Quick update', description: 'Short official notice', icon: Megaphone },
]

export default function AdminNewsEditor() {
  const router = useRouter()
  const [format, setFormat] = useState<Format>('article')
  const [topic, setTopic] = useState(TOPICS[0])
  const [district, setDistrict] = useState('all')
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState(0)
  const previews = useMemo(() => files.map(f => ({ name: f.name, size: f.size })), [files])
  const [imageURLs, setImageURLs] = useState<string[]>([])

  useEffect(() => {
    const urls = files.map(file => URL.createObjectURL(file))
    setImageURLs(urls)
    return () => urls.forEach(url => URL.revokeObjectURL(url))
  }, [files])

  function addFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || [])
    event.target.value = ''
    const valid = selected.filter(f =>
      ['image/png','image/jpeg','image/webp'].includes(f.type) && f.size <= 8 * 1024 * 1024
    )
    if (selected.length !== valid.length) toast.error('Only JPG, PNG or WebP files under 8 MB each.')
    if (files.length + valid.length > 5) { toast.error('Use up to 5 photos per announcement.'); return }
    setFiles(prev => [...prev, ...valid])
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    if (!title.trim() || !summary.trim()) { toast.error('Add a headline and story.'); return }
    if (format === 'poster' && files.length === 0) {
      toast.error('Photo stories require at least one uploaded image.')
      return
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user || user.email?.toLowerCase() !== 'slbusinessindex@gmail.com') {
      toast.error('Official admin sign-in is required.')
      return
    }
    // Server-side RLS independently verifies admin role, owner ID, and email.
    setSaving(true)
    setProgress(0)
    const uploaded: string[] = []
    try {
      const images: string[] = []
      for (let i = 0; i < files.length; i++) {
        const image = files[i]
        const ext = image.type === 'image/png' ? 'png' : image.type === 'image/webp' ? 'webp' : 'jpg'
        const path = 'posts/' + user.id + '/' + crypto.randomUUID() + '.' + ext
        const { error } = await supabase.storage.from('news-images').upload(
          path, image, { contentType: image.type, upsert: false }
        )
        if (error) throw error
        uploaded.push(path)
        images.push(supabase.storage.from('news-images').getPublicUrl(path).data.publicUrl)
        setProgress(Math.round(((i + 1) / files.length) * 100))
      }
      const { data, error } = await supabase.from('business_news').insert({
        owner_id: user.id, business_id: null, is_official: true,
        title: title.trim(), content: summary.trim(),
        category: topic === 'Official Announcement' ? null : topic,
        district: district === 'all' ? null : district,
        post_type: 'news', content_format: format,
        contact_phone: null, images,
      }).select('id').single()
      if (error) throw error
      toast.success('Official announcement published', {
        description: 'Published by SL Business Index Admin.',
      })
      router.push('/business-news?post_id=' + data.id)
      router.refresh()
    } catch (error) {
      if (uploaded.length) void supabase.storage.from('news-images').remove(uploaded)
      toast.error(error instanceof Error ? error.message : 'Could not publish the announcement.')
    } finally { setSaving(false) }
  }

  return (
    <main className="h-full min-h-0 w-full overflow-y-auto bg-[#F7F9F6] px-4 py-5 text-[#193B2E] sm:px-7 sm:py-8 xl:px-10">
      <div className="mx-auto max-w-[1050px] pb-16">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/business-news" className="inline-flex min-h-10 items-center gap-2 text-[13px] font-semibold text-[#4E7B62] hover:text-[#214E35]">
            <ArrowLeft size={16}/> Public Business News
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#CFDFD1] bg-white px-3 py-1.5 text-[11px] font-bold text-[#367356]">
            <ShieldCheck size={15}/> Official admin publishing
          </span>
        </div>

        <div className="mt-5 border-b border-[#DDE6DE] pb-6 sm:mt-7">
          <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#A2764C]">SL Business Index · Editorial desk</p>
          <h1 className="mt-2 text-[clamp(1.9rem,4vw,2.7rem)] font-bold tracking-[-.045em]">Create an official announcement</h1>
          <p className="mt-3 max-w-[680px] text-[13px] leading-6 text-[#697F70]">
            Publish platform news, release announcements and photo posters to the Business News edition.
            These stories are credited to SL Business Index Admin, without requiring a verified business listing or service.
          </p>
        </div>

        <form onSubmit={submit} className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-6 rounded-[18px] border border-[#E1E8E1] bg-white p-5 sm:p-7">
            <div className="flex items-center gap-3 rounded-xl border border-[#D8E9DE] bg-[#F0F7F1] p-3.5">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white"><ShieldCheck size={21} className="text-[#26724F]"/></div>
              <div><p className="text-[13px] font-bold">SL Business Index Admin</p>
                <p className="text-[11px] text-[#64816A]">Official publisher · Always available for the authorized admin account</p></div>
            </div>

            <fieldset>
              <legend className={fieldLabel}>Publication format</legend>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {formats.map(item => <button key={item.id} type="button" onClick={() => setFormat(item.id)}
                  aria-pressed={format === item.id}
                  className={'flex min-h-[74px] items-center gap-3 rounded-xl border p-3 text-left transition sm:block ' +
                    (format === item.id ? 'border-[#388664] bg-[#EFF7F0] text-[#1D5738]' : 'border-[#DBE4DB] bg-white text-[#54685A] hover:border-[#A7C6AF]')}>
                  <item.icon size={20}/>
                  <span className="block"><span className="block text-[12px] font-bold sm:mt-2">{item.name}</span>
                    <span className="mt-0.5 block text-[10px] text-[#839087]">{item.description}</span></span>
                </button>)}
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className={fieldLabel}>News category
                <select className={field} value={topic} onChange={e => setTopic(e.target.value)}>
                  {TOPICS.map(item => <option value={item} key={item}>{item}</option>)}
                </select>
              </label>
              <label className={fieldLabel}>Audience / district
                <select className={field} value={district} onChange={e => setDistrict(e.target.value)}>
                  <option value="all">All Sri Lanka · All districts</option>
                  {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </label>
            </div>

            <label className={fieldLabel}>News headline <span className="text-[#B36B57]">*</span>
              <input className={field} value={title} onChange={e => setTitle(e.target.value)}
                placeholder="e.g. SL Business Index 2.0 is coming soon" maxLength={150} required/>
              <span className="mt-1 block text-right text-[10px] font-normal text-[#8A978D]">{title.length}/150</span>
            </label>

            <label className={fieldLabel}>Full story / description <span className="text-[#B36B57]">*</span>
              <textarea className={field + ' min-h-[210px] resize-y leading-7'} value={summary}
                onChange={e => setSummary(e.target.value)} maxLength={6000} rows={9} required
                placeholder="Write your announcement, what is coming, who it helps, and where readers can learn more..."/>
              <span className="mt-1 block text-right text-[10px] font-normal text-[#8A978D]">{summary.length}/6000</span>
            </label>

            <div>
              <label htmlFor="official-news-images" className={fieldLabel}>Photos or news posters {format === 'poster' ? '(required)' : '(optional)'}</label>
              <label htmlFor="official-news-images" className="mt-3 flex min-h-[110px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#B5CDB8] bg-[#F8FAF8] px-4 py-5 text-center hover:border-[#568A6A]">
                <UploadCloud size={24} className="text-[#55916F]"/>
                <span className="mt-2 text-[13px] font-bold text-[#365D46]">Choose photos or poster files</span>
                <span className="mt-1 text-[11px] text-[#819084]">JPG, PNG or WebP · up to 5 images · 8 MB each</span>
              </label>
              <input id="official-news-images" type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={addFiles} className="sr-only"/>
              {imageURLs.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {imageURLs.map((url, index) => <div key={url} className="relative overflow-hidden rounded-xl border border-[#E2E7E1] bg-[#F6F8F5]">
                    <div className="relative aspect-video"><Image src={url} alt={'Selected media ' + (index + 1)} fill unoptimized className="object-cover"/></div>
                    <div className="flex items-center justify-between gap-1 p-2">
                      <span className="truncate text-[10px] text-[#768579]">{previews[index]?.name}</span>
                      <button type="button" aria-label={'Remove image ' + (index + 1)} onClick={() => setFiles(prev => prev.filter((_,i) => i !== index))} className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[#AB5F53] hover:bg-[#F9E9E5]"><Trash2 size={15}/></button>
                    </div>
                  </div>)}
                </div>
              )}
            </div>

            <div className="border-t border-[#E2E8E1] pt-5">
              <button type="submit" disabled={saving} className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#20583E] px-5 text-[13px] font-bold text-white transition hover:bg-[#16462F] disabled:cursor-wait disabled:opacity-60">
                {saving ? <LoaderCircle size={18} className="animate-spin"/> : <Newspaper size={18}/>}
                {saving ? files.length && progress < 100 ? 'Uploading ' + progress + '%' : 'Publishing…' : 'Publish official news'}
                {!saving && <ArrowRight size={16}/>}
              </button>
              <p className="mt-3 text-center text-[11px] leading-5 text-[#89978B]">Official posts appear publicly once published. Please verify facts and image rights before publishing.</p>
            </div>
          </div>

          <aside className="rounded-[18px] border border-[#E1E8E1] bg-white p-5 sm:p-6 lg:sticky lg:top-6">
            <div className="flex items-center gap-2"><CheckCircle2 size={17} className="text-[#478865]"/><p className="text-[12px] font-bold">Publication preview</p></div>
            <div className="mt-4 overflow-hidden rounded-xl border border-[#E8EAE4]">
              <div className="flex h-[144px] items-center justify-center bg-[#F1F5EF]">
                {imageURLs[0] ? <div className="relative h-full w-full"><Image src={imageURLs[0]} alt="Article cover preview" fill unoptimized className="object-cover"/></div> :
                  <div className="flex flex-col items-center gap-2 text-[#87A38A]"><ImagePlus size={29}/><span className="text-[10px]">News cover image</span></div>}
              </div>
              <div className="p-4">
                <span className="text-[10px] font-extrabold uppercase tracking-[.13em] text-[#AF8553]">{topic}</span>
                <h3 className="mt-2 break-words font-serif text-[20px] font-bold leading-[1.2] text-[#213F2E]">{title.trim() || 'Your news headline appears here'}</h3>
                <p className="mt-2 line-clamp-3 whitespace-pre-line text-[12px] leading-5 text-[#788579]">{summary.trim() || 'A short preview of the upcoming article.'}</p>
                <div className="mt-4 border-t border-[#E6E9E2] pt-3 text-[11px] font-semibold text-[#376B4C]">SL Business Index Admin</div>
                <span className="mt-1 block text-[10px] text-[#929B92]">{district === 'all' ? 'All Sri Lanka' : district}</span>
              </div>
            </div>
            <p className="mt-4 text-[11px] leading-6 text-[#829085]">No business or service selection is required for official announcements. District defaults to nationwide visibility.</p>
          </aside>
        </form>
      </div>
    </main>
  )
}
