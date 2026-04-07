
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  Layers, 
  Sparkles, 
  Layout, 
  Image as ImageIcon,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Search,
  Plus,
  Upload,
  Box,
  Shapes,
  Info,
  Type,
  Sliders
} from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';
import * as fabric from 'fabric';
import PropertiesPanel from './PropertiesPanel';

export default function Sidebar() {
  const [activeTab, setActiveTab] = useState<'layers' | 'ai' | 'templates' | 'elements' | 'uploads' | 'adjust'>('layers');
  const { layers, canvas, updateLayers, saveHistory, activeObject, setActiveObject } = useEditorStore();
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-switch to adjust tab when an object is selected
  useEffect(() => {
    if (activeObject && activeTab !== 'adjust') {
      setActiveTab('adjust');
    }
  }, [activeObject, activeTab]);

  const toggleVisibility = (obj: fabric.FabricObject) => {
    obj.set('visible', !obj.visible);
    canvas?.renderAll();
    updateLayers();
  };

  const toggleLock = (obj: fabric.FabricObject) => {
    obj.set('selectable', !obj.selectable);
    obj.set('evented', !obj.evented);
    canvas?.renderAll();
    updateLayers();
  };

  const selectLayer = (obj: fabric.FabricObject) => {
    canvas?.setActiveObject(obj);
    canvas?.renderAll();
    setActiveObject(obj);
  };

  return (
    <div className="w-[340px] bg-[#0F172A] border-l border-slate-800 flex flex-row-reverse h-full text-slate-300 shadow-2xl z-10 shrink-0">
      {/* Vertical Tab Bar on the Right */}
      <div className="w-[68px] flex flex-col items-center py-4 gap-2 border-l border-slate-800 bg-[#0F172A] z-20">
        <TabButton active={activeTab === 'adjust'} onClick={() => setActiveTab('adjust')} icon={<Sliders size={20} />} label="Adjust" />
        <TabButton active={activeTab === 'layers'} onClick={() => setActiveTab('layers')} icon={<Layers size={20} />} label="Layers" />
        <TabButton active={activeTab === 'templates'} onClick={() => setActiveTab('templates')} icon={<Layout size={20} />} label="Design" />
        <TabButton active={activeTab === 'elements'} onClick={() => setActiveTab('elements')} icon={<Shapes size={20} />} label="Shapes" />
        <TabButton active={activeTab === 'uploads'} onClick={() => setActiveTab('uploads')} icon={<Upload size={20} />} label="Uploads" />
        
        <div className="mt-auto pt-4 border-t border-slate-800 w-full flex flex-col items-center gap-2">
          <TabButton active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} icon={<Sparkles size={20} />} label="AI Magic" highlight />
        </div>
      </div>

      {/* Panel Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#0F172A]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
            {activeTab === 'adjust' && <Sliders size={14} className="text-blue-400" />}
            {activeTab === 'layers' && <Layers size={14} className="text-blue-400" />}
            {activeTab === 'templates' && <Layout size={14} className="text-purple-400" />}
            {activeTab === 'elements' && <Shapes size={14} className="text-orange-400" />}
            {activeTab === 'uploads' && <Upload size={14} className="text-green-400" />}
            {activeTab === 'ai' && <Sparkles size={14} className="text-pink-400" />}
            {activeTab}
          </h2>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500/40 animate-pulse" />
            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Active</span>
          </div>
        </div>

        {/* Search Bar (Optional for some tabs) */}
        {activeTab !== 'layers' && activeTab !== 'adjust' && (
          <div className="px-4 py-3 border-b border-slate-800/50">
            <div className="relative group">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
              <input 
                type="text" 
                placeholder={`Search ${activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-900/60 border border-slate-800 rounded-lg text-[11px] focus:ring-1 focus:ring-blue-500 outline-none placeholder:text-slate-600 transition-all font-medium"
              />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {activeTab === 'layers' && (
            <div className="space-y-1.5">
              {layers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                  <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mb-4 border border-slate-800 shadow-inner">
                     <Box size={24} className="text-slate-700" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-300 mb-1">Canvas is empty</h3>
                  <p className="text-[10px] text-slate-500 font-medium leading-relaxed">Add elements from the sidebar to start designing your project.</p>
                </div>
              ) : (
                layers.map((obj, i) => (
                  <LayerItem 
                    key={i}
                    obj={obj}
                    index={layers.length - i}
                    isActive={activeObject === obj}
                    onClick={() => selectLayer(obj)}
                    onToggleVisibility={() => toggleVisibility(obj)}
                    onToggleLock={() => toggleLock(obj)}
                  />
                ))
              )}
            </div>
          )}

          {activeTab === 'adjust' && <PropertiesPanel />}

          {activeTab === 'elements' && <ElementsPanel />}
          {activeTab === 'ai' && <AIMagicPanel />}
          {activeTab === 'templates' && <TemplatesPanel />}
          {activeTab === 'uploads' && <UploadsPanel />}
        </div>
      </div>
    </div>
  );
}

function LayerItem({ obj, index, isActive, onClick, onToggleVisibility, onToggleLock }: { 
  obj: fabric.FabricObject, 
  index: number, 
  isActive: boolean, 
  onClick: () => void, 
  onToggleVisibility: () => void, 
  onToggleLock: () => void 
}) {
  const isText = obj.type === 'i-text';
  const isImage = obj.type === 'image' || obj.type === 'FabricImage';
  
  return (
    <div 
      className={`flex items-center gap-3 p-2 rounded-xl border transition-all cursor-pointer group ${isActive ? 'bg-blue-600/10 border-blue-500/30 shadow-sm' : 'bg-transparent border-transparent hover:bg-slate-800/40'}`}
      onClick={onClick}
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-colors ${isActive ? 'bg-blue-600/20 border-blue-500/40 text-blue-400' : 'bg-slate-900/80 border-slate-800 text-slate-500'}`}>
        {isText ? <Type size={14} /> : isImage ? <ImageIcon size={14} /> : <Shapes size={14} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-[11px] font-bold truncate ${isActive ? 'text-blue-300' : 'text-slate-300'}`}>
          {isText ? (obj as fabric.IText).text : obj.type.charAt(0).toUpperCase() + obj.type.slice(1)}
        </div>
        <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">L{index}</div>
      </div>
      <div className={`flex items-center gap-0.5 transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        <button onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }} className={`p-1.5 rounded-md hover:bg-slate-800 transition-colors ${!obj.visible ? 'text-blue-400' : 'text-slate-500 hover:text-white'}`}>
          {obj.visible ? <Eye size={13} /> : <EyeOff size={13} />}
        </button>
        <button onClick={(e) => { e.stopPropagation(); onToggleLock(); }} className={`p-1.5 rounded-md hover:bg-slate-800 transition-colors ${!obj.selectable ? 'text-orange-400' : 'text-slate-500 hover:text-white'}`}>
          {obj.selectable ? <Unlock size={13} /> : <Lock size={13} />}
        </button>
      </div>
    </div>
  );
}

function UploadsPanel() {
  const { canvas, saveHistory } = useEditorStore();

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (f) => {
      const data = f.target?.result as string;
      const img = await fabric.FabricImage.fromURL(data);
      img.scaleToWidth(400);
      canvas?.add(img);
      canvas?.centerObject(img);
      canvas?.setActiveObject(img);
      saveHistory();
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      <label className="w-full aspect-[4/3] border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-slate-900/40 hover:border-blue-500/50 transition-all group shadow-inner">
        <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-400 group-hover:scale-110 group-hover:bg-blue-500/20 transition-all shadow-sm">
          <Upload size={20} />
        </div>
        <div className="text-center">
           <p className="text-[11px] font-black uppercase tracking-widest text-slate-300">Drop files or click</p>
           <p className="text-[9px] text-slate-600 font-bold uppercase tracking-tight mt-1">SVG, PNG, JPG (Max 10MB)</p>
        </div>
        <input type="file" className="hidden" onChange={handleUpload} accept="image/*" />
      </label>

      <div className="pt-4 border-t border-slate-800/50">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">Your Library</h3>
        <div className="grid grid-cols-3 gap-2">
           {[1, 2, 3].map(i => (
             <div key={i} className="aspect-square bg-slate-900/60 rounded-xl border border-slate-800 hover:border-blue-500/50 transition-all cursor-pointer group relative overflow-hidden">
                <div className="absolute inset-0 bg-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <Plus size={14} className="text-blue-400" />
                </div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
}

function AIMagicPanel() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const { canvas, saveHistory } = useEditorStore();

  const generateImage = async () => {
    if (!prompt) return;
    setLoading(true);
    try {
      const puter = (window as any).puter;
      if (!puter) {
        toast.error('Puter.js is still initializing. Please wait 2-3 seconds and try again.');
        setLoading(false);
        return;
      }

      // Use Puter.js AI to generate an image
      const result = await puter.ai.txt2img(prompt);
      
      const imageUrl = URL.createObjectURL(result);
      
      const img = await fabric.FabricImage.fromURL(imageUrl);
      img.scaleToWidth(500);
      canvas?.add(img);
      canvas?.centerObject(img);
      canvas?.setActiveObject(img);
      saveHistory();
      setLoading(false);
      setPrompt('');
      toast.success('AI Magic completed!');
    } catch (e) {
      console.error(e);
      toast.error('AI Generation failed. Try again.');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-5 bg-gradient-to-br from-blue-600/10 via-indigo-600/5 to-transparent rounded-2xl border border-blue-500/20 shadow-xl overflow-hidden relative group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
           <Sparkles size={60} className="text-blue-400" />
        </div>
        
        <div className="flex items-center gap-2 mb-4">
           <div className="bg-[#0F172A] p-2 rounded-xl shadow-lg border border-slate-800">
              <Sparkles size={16} className="text-blue-400" />
           </div>
           <div>
              <span className="text-[10px] font-black text-blue-300 uppercase tracking-[0.2em]">Puter AI Engine</span>
              <div className="flex items-center gap-1">
                 <div className="w-1 h-1 rounded-full bg-blue-400 animate-pulse" />
                 <span className="text-[8px] font-bold text-blue-400/60 uppercase tracking-widest">Powered by Puter.js</span>
              </div>
           </div>
        </div>

        <textarea 
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe what you want to create..."
          className="w-full bg-slate-900/80 border border-slate-800 rounded-xl p-4 text-[11px] focus:ring-2 focus:ring-blue-500/50 outline-none min-h-[140px] shadow-inner transition-all placeholder:text-slate-600 text-slate-200 font-medium resize-none"
        />

        <div className="mt-5 grid grid-cols-2 gap-2">
          <StyleOption label="Photorealistic" active />
          <StyleOption label="High-End 3D" />
          <StyleOption label="Corporate" />
          <StyleOption label="Vector Art" />
        </div>

        <button 
          onClick={generateImage}
          disabled={loading || !prompt}
          className="w-full mt-5 bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? (
            <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          ) : (
            <Sparkles size={16} />
          )}
          {loading ? 'Processing...' : 'Generate Magic'}
        </button>
      </div>

      <div className="flex items-start gap-3 p-4 bg-slate-900/40 rounded-xl border border-slate-800/60">
         <Info size={14} className="text-slate-600 mt-0.5" />
         <p className="text-[9px] text-slate-500 font-medium leading-relaxed uppercase tracking-wider">AI generated images are optimized for 300 DPI print quality.</p>
      </div>
    </div>
  );
}

function ElementsPanel() {
  const { canvas, saveHistory } = useEditorStore();

  const addElement = (type: 'rect' | 'circle' | 'triangle' | 'star') => {
    let obj: fabric.FabricObject;
    if (type === 'rect') {
      obj = new fabric.Rect({ width: 200, height: 200, fill: '#3b82f6', rx: 12, ry: 12 });
    } else if (type === 'circle') {
      obj = new fabric.Circle({ radius: 100, fill: '#ef4444' });
    } else if (type === 'triangle') {
      obj = new fabric.Triangle({ width: 200, height: 200, fill: '#10b981' });
    } else {
      obj = new fabric.Polygon([
        { x: 100, y: 0 }, { x: 121, y: 70 }, { x: 196, y: 70 },
        { x: 136, y: 114 }, { x: 158, y: 182 }, { x: 100, y: 140 },
        { x: 42, y: 182 }, { x: 64, y: 114 }, { x: 4, y: 70 }, { x: 79, y: 70 },
      ], { fill: '#f59e0b', left: 100, top: 100 });
    }
    canvas?.add(obj);
    canvas?.centerObject(obj);
    canvas?.setActiveObject(obj);
    saveHistory();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 px-1">Geometric Primatives</h3>
        <div className="grid grid-cols-3 gap-2.5">
          <ShapeBtn onClick={() => addElement('rect')} icon={<div className="w-7 h-7 border-2 border-slate-500 rounded-md" />} label="Square" />
          <ShapeBtn onClick={() => addElement('circle')} icon={<div className="w-7 h-7 border-2 border-slate-500 rounded-full" />} label="Circle" />
          <ShapeBtn onClick={() => addElement('triangle')} icon={<div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-b-[24px] border-b-slate-500" />} label="Triangle" />
        </div>
      </div>
      
      <div>
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 px-1">Utility Icons</h3>
        <div className="grid grid-cols-4 gap-2">
           {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
             <div key={i} className="aspect-square bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-center text-slate-600 hover:text-blue-400 hover:border-blue-500/50 cursor-pointer transition-all shadow-inner">
                <Box size={18} />
             </div>
           ))}
        </div>
      </div>
    </div>
  );
}

function ShapeBtn({ onClick, icon, label }: { onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick} 
      className="flex flex-col items-center gap-2 group"
    >
      <div className="w-full aspect-square bg-slate-900/60 border border-slate-800 rounded-2xl flex items-center justify-center group-hover:bg-slate-800 transition-all group-hover:border-blue-500/40 shadow-inner">
        <div className="group-hover:scale-110 transition-transform group-hover:text-blue-400">
          {icon}
        </div>
      </div>
      <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest group-hover:text-slate-400">{label}</span>
    </button>
  );
}

function TemplatesPanel() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="aspect-[3/4] bg-slate-900/60 rounded-2xl border border-slate-800 hover:border-blue-500/50 cursor-pointer overflow-hidden group relative transition-all hover:-translate-y-1 shadow-lg">
          <div className="absolute inset-0 bg-blue-600/15 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-10">
            <div className="bg-white p-2.5 rounded-full shadow-2xl scale-0 group-hover:scale-100 transition-all duration-300">
               <Plus size={18} className="text-blue-600" />
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-transparent to-transparent opacity-60" />
          <div className="absolute bottom-0 inset-x-0 p-3 z-10">
             <div className="text-[9px] text-white font-black uppercase tracking-[0.15em] drop-shadow-md">Template {i}</div>
             <div className="text-[7px] text-slate-400 font-bold uppercase mt-0.5">Marketing Kit</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StyleOption({ label, active }: { label: string, active?: boolean }) {
  return (
    <button className={`px-2 py-2 border rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${active ? 'bg-blue-600/20 border-blue-500/40 text-blue-300 shadow-sm' : 'bg-slate-900/60 border-slate-800 text-slate-600 hover:bg-slate-800 hover:text-slate-400'}`}>
      {label}
    </button>
  );
}

function TabButton({ active, onClick, icon, label, highlight }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, highlight?: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full py-4 flex flex-col items-center gap-2 transition-all relative group ${active ? 'text-blue-400 font-bold' : highlight ? 'text-blue-500/60 hover:text-blue-400' : 'text-slate-600 hover:text-slate-300'}`}
    >
      {active && (
        <div className="absolute right-0 top-2 bottom-2 w-0.5 bg-blue-500 rounded-l-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
      )}
      <div className={`${active ? 'scale-110 shadow-blue-500/20' : 'scale-100'} transition-transform duration-300`}>
        {icon}
      </div>
      <span className="text-[8px] uppercase font-black tracking-[0.2em] text-center px-1 leading-tight">{label}</span>
      
      {!active && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 border border-slate-800 rounded text-[9px] font-bold uppercase tracking-widest text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none shadow-2xl">
          {label}
        </div>
      )}
    </button>
  );
}
