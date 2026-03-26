'use client';

import { useState } from 'react';
import Toolbar from './Toolbar';
import Sidebar from './Sidebar';
import EditorCanvas from './EditorCanvas';
import { toast } from 'sonner';
import { useEditorStore } from '../store/useEditorStore';
import { supabase } from '@/lib/supabaseClient';
import { 
  Download, 
  ChevronLeft,
  Layers,
  Undo,
  Redo,
  Send,
  Image as ImageIcon,
  FileText,
  ChevronDown,
  Zap,
  X,
  Loader2,
  Building
} from 'lucide-react';
import jsPDF from 'jspdf';

interface Business {
  id: string;
  name: string;
}

interface EditorProps {
  onBackAction: () => void;
  businesses: Business[];
  onPublishSuccess: () => void;
}

export default function MarketingDesignEditor({ onBackAction, businesses, onPublishSuccess }: EditorProps) {
  const { canvas, undo, redo, historyIndex, history, layers, projectName, setProjectName, canvasWidth, canvasHeight } = useEditorStore();
  const [isSaving, setIsSaving] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>(businesses[0]?.id || '');
  const [caption, setCaption] = useState('Check out our new design!');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['facebook', 'instagram']);

  const exportAsImage = (format: 'png' | 'jpeg', transparent: boolean = false) => {
    if (!canvas) return;
    const originalBg = canvas.backgroundColor;
    if (transparent && format === 'png') {
      canvas.backgroundColor = 'transparent';
      canvas.requestRenderAll();
    }
    const dataURL = canvas.toDataURL({ format, quality: 1, multiplier: 3 });
    if (transparent && format === 'png') {
      canvas.backgroundColor = originalBg;
      canvas.requestRenderAll();
    }
    const link = document.createElement('a');
    link.download = `${projectName}.${format}`;
    link.href = dataURL;
    link.click();
    setShowExportOptions(false);
  };

  const exportAsPDF = () => {
    if (!canvas) return;
    const dataURL = canvas.toDataURL({ format: 'png', quality: 1, multiplier: 3 });
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [canvas.width, canvas.height]
    });
    pdf.addImage(dataURL, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(`${projectName}.pdf`);
    setShowExportOptions(false);
  };

  const publishToFeed = async () => {
    if (!canvas) return;
    if (!selectedBusinessId) {
      toast.error('Please select a business first');
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // 1. Capture Canvas as Blob
      const dataURL = canvas.toDataURL({ format: 'png', quality: 1, multiplier: 2 });
      const blob = await (await fetch(dataURL)).blob();
      const file = new File([blob], `${projectName || 'design'}.png`, { type: 'image/png' });

      // 2. Upload to Storage
      const fileName = `${selectedBusinessId}-${Date.now()}.png`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('promotions')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 3. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('promotions')
        .getPublicUrl(filePath);

      // 4. Insert into promotions table
      const { error: insertError } = await supabase
        .from('promotions')
        .insert({
          vendor_id: user.id,
          business_id: selectedBusinessId,
          image_url: publicUrl,
          caption: caption,
          social_platforms: selectedPlatforms,
          status: 'pending' // Design editor items usually need review
        });

      if (insertError) throw insertError;

      toast.success('Design published and submitted for approval!');
      setIsSaving(false);
      setShowPublishDialog(false);
      onPublishSuccess();
    } catch (error) {
      console.error('Error publishing design:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to publish design');
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#0F172A] to-[#1E293B] z-50 flex flex-col overflow-hidden font-sans">
      {/* Top Header Bar */}
      <header className="h-12 border-b border-slate-700 flex items-center justify-between px-3 bg-[#0F172A]/80 backdrop-blur-sm z-20 shrink-0">
        {/* Left: Back + File Name */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onBackAction}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all text-xs font-medium shrink-0"
          >
            <ChevronLeft size={16} />
            <span className="hidden sm:block">Back</span>
          </button>

          <div className="h-5 w-px bg-slate-700 shrink-0" />

          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-1.5 bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700 rounded-md px-2 py-1 transition-all min-w-0">
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="bg-transparent text-slate-200 text-xs font-semibold outline-none w-36 min-w-0 placeholder:text-slate-500"
                placeholder="Untitled Design"
              />
            </div>
            <span className="text-slate-500 text-[10px] font-medium hidden md:block shrink-0">
              {canvasWidth} × {canvasHeight}px
            </span>
          </div>
        </div>

        {/* Center: Undo / Redo */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 bg-slate-800/50 border border-slate-700 rounded-lg p-1">
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            title="Undo (Ctrl+Z)"
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700/50 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
          >
            <Undo size={15} />
          </button>
          <div className="h-4 w-px bg-slate-700" />
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            title="Redo (Ctrl+Y)"
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700/50 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
          >
            <Redo size={15} />
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <button
              onClick={() => setShowExportOptions(!showExportOptions)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700/50 border border-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-all"
            >
              <Download size={14} />
              <span>Export</span>
              <ChevronDown size={12} className="text-slate-500" />
            </button>

            {showExportOptions && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowExportOptions(false)} />
                <div className="absolute right-0 mt-2 w-52 bg-[#1E293B]/90 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden py-1.5">
                  <div className="px-3 py-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 mb-1">
                    Export Format
                  </div>
                  <button onClick={() => exportAsImage('png')} className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-700/50 hover:text-white flex items-center justify-between transition-colors">
                    <span className="flex items-center gap-2"><ImageIcon size={13} className="text-blue-400" /> PNG — High Quality</span>
                    <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-bold">HD</span>
                  </button>
                  <button onClick={() => exportAsImage('png', true)} className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-700/50 hover:text-white flex items-center justify-between transition-colors">
                    <span className="flex items-center gap-2"><ImageIcon size={13} className="text-purple-400" /> PNG — Transparent</span>
                  </button>
                  <button onClick={() => exportAsImage('jpeg')} className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-700/50 hover:text-white flex items-center gap-2 transition-colors">
                    <ImageIcon size={13} className="text-orange-400" /> JPG — Web Optimized
                  </button>
                  <div className="h-px bg-slate-800 my-1" />
                  <button onClick={exportAsPDF} className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-700/50 hover:text-white flex items-center justify-between transition-colors">
                    <span className="flex items-center gap-2"><FileText size={13} className="text-red-400" /> PDF — Print Ready</span>
                    <span className="text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold">300 DPI</span>
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => setShowPublishDialog(true)}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-all disabled:opacity-60 shadow-lg shadow-blue-500/40 hover:shadow-blue-500/60"
          >
            {isSaving ? (
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            ) : (
              <Send size={14} />
            )}
            {isSaving ? 'Publishing...' : 'Publish'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <Toolbar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <EditorCanvas />
        </div>
        <Sidebar />
      </div>

      {/* Status Bar */}
      <footer className="h-7 border-t border-slate-800 bg-[#0F172A]/80 backdrop-blur-sm flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4 text-[10px] text-slate-400 font-medium">
          <span className="flex items-center gap-1.5">
            <Layers size={11} className="text-blue-400/60" />
            {layers.length} {layers.length === 1 ? 'Layer' : 'Layers'}
          </span>
          <div className="h-3 w-px bg-slate-700" />
          <span>{canvasWidth} × {canvasHeight}px</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium">
          <Zap size={10} className="text-blue-500/50" />
          <span>SL Business Pro Design</span>
        </div>
      </footer>

      {/* Publish Dialog */}
      {showPublishDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <Send size={16} className="text-blue-400" />
                </div>
                <h3 className="text-sm font-bold text-slate-200">Publish Design</h3>
              </div>
              <button onClick={() => setShowPublishDialog(false)} className="p-1 text-slate-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-1.5">
                  <Building size={12} /> Target Business
                </label>
                <select 
                  value={selectedBusinessId}
                  onChange={(e) => setSelectedBusinessId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                >
                  {businesses.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Promotion Caption</label>
                <textarea 
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Write something about this promotion..."
                  rows={3}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all resize-none"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Social Platforms</label>
                <div className="grid grid-cols-2 gap-2">
                  <PlatformBtn 
                    label="Facebook" 
                    active={selectedPlatforms.includes('facebook')} 
                    onClick={() => setSelectedPlatforms(prev => prev.includes('facebook') ? prev.filter(p => p !== 'facebook') : [...prev, 'facebook'])} 
                  />
                  <PlatformBtn 
                    label="Instagram" 
                    active={selectedPlatforms.includes('instagram')} 
                    onClick={() => setSelectedPlatforms(prev => prev.includes('instagram') ? prev.filter(p => p !== 'instagram') : [...prev, 'instagram'])} 
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-800/30 border-t border-slate-800 flex gap-3">
              <button 
                onClick={() => setShowPublishDialog(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={publishToFeed}
                disabled={isSaving || selectedPlatforms.length === 0}
                className="flex-[2] py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                {isSaving ? 'Publishing...' : 'Confirm & Publish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PlatformBtn({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`py-2 rounded-lg border text-[10px] font-bold transition-all ${active ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-600'}`}
    >
      {label}
    </button>
  );
}
