'use client';

import { useState } from 'react';
import Toolbar from './Toolbar';
import Sidebar from './Sidebar';
import EditorCanvas from './EditorCanvas';
import PropertiesPanel from './PropertiesPanel';
import { useEditorStore } from '../store/useEditorStore';
import { 
  Download, 
  ChevronLeft,
  Settings,
  Maximize2,
  Undo,
  Redo,
  Play,
  Layers,
  Image as ImageIcon
} from 'lucide-react';
import jsPDF from 'jspdf';

export default function MarketingDesignEditor({ onBackAction }: { onBackAction: () => void }) {
  const { canvas, undo, redo, historyIndex, history, layers, projectName, setProjectName, canvasWidth, canvasHeight } = useEditorStore();
  const [isSaving, setIsSaving] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);

  const exportAsImage = (format: 'png' | 'jpeg', transparent: boolean = false) => {
    if (!canvas) return;
    
    // For transparent PNG, we might need to temporarily hide the background color
    const originalBg = canvas.backgroundColor;
    if (transparent && format === 'png') {
      canvas.backgroundColor = 'transparent';
      canvas.requestRenderAll();
    }

    const dataURL = canvas.toDataURL({
      format: format,
      quality: 1,
      multiplier: 3 // High Res for 300 DPI like quality
    });

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
    const dataURL = canvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 3
    });
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
    setIsSaving(true);
    // Simulate Supabase Publish
    try {
      if (!canvas) return;
      const dataURL = canvas.toDataURL({ format: 'png', multiplier: 2 });
      
      // In a real app: 
      // 1. Upload dataURL to Supabase Storage
      // 2. Insert record into marketing_feed table
      
      setTimeout(() => {
        setIsSaving(false);
        alert('Published to Business Marketing Feed successfully!');
      }, 2000);
    } catch (error) {
      console.error(error);
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col overflow-hidden text-gray-900 font-sans selection:bg-blue-100">
      {/* Top Header */}
      <header className="h-14 border-b border-gray-300 flex items-center justify-between px-4 bg-white shadow-sm z-20">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBackAction}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="h-6 w-[1px] bg-gray-200" />
          <div className="flex flex-col">
            <input 
              type="text" 
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="text-sm font-bold tracking-tight bg-transparent border-none focus:ring-1 focus:ring-blue-500 rounded px-1 -ml-1 w-48 outline-none"
            />
            <span className="text-[10px] text-gray-400 font-medium">{canvasWidth} x {canvasHeight} px • Pro Design</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1 mr-2">
            <button onClick={undo} disabled={historyIndex <= 0} className="p-1.5 hover:bg-white hover:shadow-sm rounded text-gray-500 disabled:opacity-20"><Undo size={16} /></button>
            <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-1.5 hover:bg-white hover:shadow-sm rounded text-gray-500 disabled:opacity-20"><Redo size={16} /></button>
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setShowExportOptions(!showExportOptions)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center gap-2 rounded-lg transition-all shadow-md shadow-blue-500/20"
            >
              <Download size={16} /> Export
            </button>
            
            {showExportOptions && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 mb-1">Professional Formats</div>
                <button onClick={() => exportAsImage('png')} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center justify-between">
                  <span>PNG (High Quality)</span>
                  <span className="text-[10px] bg-gray-100 px-1 rounded text-gray-500">HD</span>
                </button>
                <button onClick={() => exportAsImage('png', true)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center justify-between">
                  <span>PNG (Transparent)</span>
                  <ImageIcon size={14} className="text-gray-400" />
                </button>
                <button onClick={() => exportAsImage('jpeg')} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center justify-between">
                  <span>JPG (Best for Web)</span>
                </button>
                <button onClick={exportAsPDF} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center justify-between">
                  <span>PDF (Print Ready)</span>
                  <span className="text-[10px] bg-blue-50 text-blue-600 px-1 rounded font-bold">300 DPI</span>
                </button>
              </div>
            )}
          </div>

          <button 
            onClick={publishToFeed}
            disabled={isSaving}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-90 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            {isSaving ? <span className="animate-spin rounded-full h-3 w-3 border-2 border-white/20 border-t-white" /> : <Play size={16} />}
            {isSaving ? 'Publishing...' : 'Publish to Feed'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <Toolbar />
        <div className="flex-1 flex flex-col bg-gray-900">
          <PropertiesPanel />
          <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-gray-900">
             <div className="bg-white shadow-2xl overflow-hidden border border-gray-300 relative" style={{ width: 'fit-content', height: 'fit-content' }}>
                <EditorCanvas />
             </div>
          </div>
        </div>
        <Sidebar />
      </div>

      {/* Footer */}
      <footer className="h-8 border-t border-gray-300 bg-white flex items-center justify-between px-4 text-[10px] text-gray-400 font-medium z-20">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5"><Layers size={12} className="text-blue-500" /> {layers.length} Active Layers</span>
          <div className="h-3 w-[1px] bg-gray-200" />
          <span>Zoom: 100%</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 hover:text-gray-900 cursor-pointer transition-colors"><Settings size={12} /> Canvas Settings</span>
          <span className="flex items-center gap-1 text-blue-600 font-bold hover:underline cursor-pointer transition-colors"><Maximize2 size={12} /> Fullscreen Mode</span>
        </div>
      </footer>
    </div>
  );
}
