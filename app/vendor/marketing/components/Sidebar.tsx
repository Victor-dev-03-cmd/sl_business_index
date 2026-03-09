'use client';

import { useState } from 'react';
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
  MousePointer2
} from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';
import * as fabric from 'fabric';

export default function Sidebar() {
  const [activeTab, setActiveTab] = useState<'layers' | 'ai' | 'templates' | 'elements' | 'uploads'>('layers');
  const { layers, canvas, updateLayers, saveHistory } = useEditorStore();
  const [searchQuery, setSearchQuery] = useState('');

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
  };

  return (
    <div className="w-96 bg-white border-l border-gray-300 flex h-full text-gray-900 shadow-sm z-10">
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col">
        <div className="mb-4 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder={`Search ${activeTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'layers' && (
            <div className="space-y-1">
              {layers.length === 0 ? (
                <div className="text-center py-12">
                  <div className="bg-blue-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                     <MousePointer2 size={20} className="text-blue-500" />
                  </div>
                  <p className="text-gray-400 text-xs font-medium">No objects on canvas yet</p>
                </div>
              ) : (
                layers.map((obj, i) => (
                  <div 
                    key={i}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer group ${canvas?.getActiveObject() === obj ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-white border-transparent hover:bg-gray-50'}`}
                    onClick={() => selectLayer(obj)}
                  >
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-[10px] overflow-hidden border border-gray-100">
                      {obj.type === 'i-text' ? <span className="font-bold">Ag</span> : obj.type === 'rect' ? <div className="w-4 h-4 border border-gray-400" /> : obj.type}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold truncate block">
                        {obj.type === 'i-text' ? (obj as any).text : obj.type.charAt(0).toUpperCase() + obj.type.slice(1)}
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium">Layer {layers.length - i}</span>
                    </div>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); toggleVisibility(obj); }} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500">
                        {obj.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); toggleLock(obj); }} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500">
                        {obj.selectable ? <Unlock size={14} /> : <Lock size={14} />}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'elements' && <ElementsPanel />}
          {activeTab === 'ai' && <AIMagicPanel />}
          {activeTab === 'templates' && <TemplatesPanel />}
          {activeTab === 'uploads' && <UploadsPanel />}
        </div>
      </div>

      {/* Vertical Tab Bar on the Right */}
      <div className="w-16 flex flex-col border-l border-gray-300 bg-gray-50">
        <TabButton active={activeTab === 'layers'} onClick={() => setActiveTab('layers')} icon={<Layers size={20} />} label="Layers" />
        <TabButton active={activeTab === 'templates'} onClick={() => setActiveTab('templates')} icon={<Layout size={20} />} label="Design" />
        <TabButton active={activeTab === 'elements'} onClick={() => setActiveTab('elements')} icon={<Plus size={20} />} label="Elements" />
        <TabButton active={activeTab === 'uploads'} onClick={() => setActiveTab('uploads')} icon={<Upload size={20} />} label="Uploads" />
        <TabButton active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} icon={<Sparkles size={20} />} label="AI Magic" />
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
      <label className="w-full aspect-video border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-gray-50 hover:border-blue-400 transition-all group">
        <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
          <Upload size={24} />
        </div>
        <div className="text-center">
           <p className="text-sm font-bold">Click to upload</p>
           <p className="text-[10px] text-gray-400">PNG, JPG up to 10MB</p>
        </div>
        <input type="file" className="hidden" onChange={handleUpload} accept="image/*" />
      </label>

      <div className="grid grid-cols-2 gap-2">
         {[1, 2, 3].map(i => (
           <div key={i} className="aspect-square bg-gray-100 rounded-xl overflow-hidden border border-gray-200 hover:border-blue-500 transition-all cursor-pointer" />
         ))}
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
    // Mocking Gemini Nano Banana 2
    try {
      const img = await fabric.FabricImage.fromURL('https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1000&auto=format&fit=crop');
      img.scaleToWidth(500);
      canvas?.add(img);
      canvas?.centerObject(img);
      canvas?.setActiveObject(img);
      saveHistory();
      setLoading(false);
      setPrompt('');
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
           <div className="bg-white p-1.5 rounded-lg shadow-sm">
              <Sparkles size={16} className="text-blue-600" />
           </div>
           <span className="text-xs font-bold text-blue-900 uppercase tracking-widest">Nano Banana 2</span>
        </div>
        <p className="text-[11px] text-blue-700/70 font-medium mb-4 leading-relaxed">Describe your vision and Gemini AI will create a professional marketing image for you.</p>
        
        <textarea 
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. A luxury gold watch on a silk background..."
          className="w-full bg-white border border-blue-100 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-400 outline-none min-h-[120px] shadow-inner transition-all placeholder:text-gray-300"
        />

        <div className="mt-4 grid grid-cols-2 gap-2">
          <StyleOption label="Photorealistic" active />
          <StyleOption label="3D Render" />
          <StyleOption label="Minimalist" />
          <StyleOption label="Cinematic" />
        </div>

        <button 
          onClick={generateImage}
          disabled={loading || !prompt}
          className="w-full mt-4 bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
        >
          {loading ? <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white" /> : <Sparkles size={18} />}
          {loading ? 'Generating...' : 'Magic Generate'}
        </button>
      </div>

      <button className="w-full bg-gray-50 hover:bg-gray-100 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 text-gray-600 border border-gray-100 transition-all">
        <ImageIcon size={16} /> Remove Background (AI)
      </button>
    </div>
  );
}

function ElementsPanel() {
  const { canvas, saveHistory } = useEditorStore();

  const addElement = (type: 'rect' | 'circle' | 'triangle' | 'star') => {
    let obj: fabric.FabricObject;
    if (type === 'rect') {
      obj = new fabric.Rect({ width: 100, height: 100, fill: '#3b82f6' });
    } else if (type === 'circle') {
      obj = new fabric.Circle({ radius: 50, fill: '#ef4444' });
    } else if (type === 'triangle') {
      obj = new fabric.Triangle({ width: 100, height: 100, fill: '#10b981' });
    } else {
      obj = new fabric.Polyline([{x: 50, y: 0}, {x: 61, y: 35}, {x: 98, y: 35}, {x: 68, y: 57}, {x: 79, y: 91}, {x: 50, y: 70}, {x: 21, y: 91}, {x: 32, y: 57}, {x: 2, y: 35}, {x: 39, y: 35}], { fill: '#f59e0b', left: 100, top: 100 });
    }
    canvas?.add(obj);
    canvas?.centerObject(obj);
    canvas?.setActiveObject(obj);
    saveHistory();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">Shapes</h3>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => addElement('rect')} className="aspect-square bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center hover:bg-white hover:border-blue-400 hover:shadow-sm transition-all group">
            <div className="w-8 h-8 border-2 border-gray-300 rounded group-hover:border-blue-500 transition-colors" />
          </button>
          <button onClick={() => addElement('circle')} className="aspect-square bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center hover:bg-white hover:border-blue-400 hover:shadow-sm transition-all group">
            <div className="w-8 h-8 border-2 border-gray-300 rounded-full group-hover:border-blue-500 transition-colors" />
          </button>
          <button onClick={() => addElement('triangle')} className="aspect-square bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center hover:bg-white hover:border-blue-400 hover:shadow-sm transition-all group">
            <div className="w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-b-[28px] border-b-gray-300 group-hover:border-b-blue-500 transition-colors" />
          </button>
        </div>
      </div>
      
      <div>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">Icons</h3>
        <div className="grid grid-cols-4 gap-2">
           {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
             <div key={i} className="aspect-square bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-center text-gray-300 hover:text-blue-500 hover:border-blue-200 cursor-pointer transition-all">
                <Layout size={20} />
             </div>
           ))}
        </div>
      </div>
    </div>
  );
}

function TemplatesPanel() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="aspect-[3/4] bg-gray-100 rounded-xl border border-gray-100 hover:border-blue-400 cursor-pointer overflow-hidden group relative transition-all hover:-translate-y-0.5 shadow-sm">
          <div className="absolute inset-0 bg-blue-600/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <div className="bg-white p-2 rounded-full shadow-lg scale-0 group-hover:scale-100 transition-transform">
               <Plus size={20} className="text-blue-600" />
            </div>
          </div>
          <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/20 to-transparent">
             <div className="text-[9px] text-white font-bold uppercase tracking-wider">Flash Sale {i}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StyleOption({ label, active }: { label: string, active?: boolean }) {
  return (
    <button className={`px-2 py-2 border rounded-lg text-[10px] font-bold transition-all ${active ? 'bg-white border-blue-400 text-blue-600 shadow-sm' : 'bg-white/50 border-blue-100 text-blue-700/60 hover:bg-white'}`}>
      {label}
    </button>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full py-4 flex flex-col items-center gap-1.5 transition-all border-r-2 ${active ? 'text-blue-600 border-blue-600 bg-white font-bold' : 'text-gray-400 border-transparent hover:text-gray-600 hover:bg-gray-100'}`}
    >
      <div className={`${active ? 'scale-110' : 'scale-100'} transition-transform`}>
        {icon}
      </div>
      <span className="text-[10px] uppercase font-bold tracking-widest text-center px-1 leading-tight">{label}</span>
    </button>
  );
}
