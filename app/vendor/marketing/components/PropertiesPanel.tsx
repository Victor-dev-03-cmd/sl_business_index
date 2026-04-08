
import { useEditorStore } from '../store/useEditorStore';
import { toast } from 'sonner';
import {
  Type, 
  AlignCenter, 
  AlignLeft, 
  AlignRight, 
  Bold, 
  Italic, 
  ArrowUp, 
  ArrowDown,
  Info,
  Sparkles,
  ChevronDown,
  Trash2,
  Layout,
  Image as ImageIcon,
  Maximize2,
  Minimize2,
  Move,
  RotateCw
} from 'lucide-react';
import { useState, useEffect } from 'react';
import * as fabric from 'fabric';

const PRESET_COLORS = ['#000000', '#FFFFFF', '#FF5733', '#33FF57', '#3357FF', '#FF33A1', '#A133FF', '#FACC15', '#2DD4BF'];
const CANVAS_BG_COLORS = ['#0F172A', '#1E293B', '#334155', '#FFFFFF', '#FCA5A5', '#FDE68A', '#86EFAC'];

export default function PropertiesPanel() {
  const { 
    activeObject, 
    canvas, 
    saveHistory, 
    updateLayers, 
    canvasWidth, 
    canvasHeight, 
    setCanvasSize 
  } = useEditorStore();

  const [localProps, setLocalProps] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    angle: 0,
    opacity: 1
  });

  useEffect(() => {
    if (activeObject) {
      setLocalProps({
        left: Math.round(activeObject.left || 0),
        top: Math.round(activeObject.top || 0),
        width: Math.round((activeObject.width || 0) * (activeObject.scaleX || 1)),
        height: Math.round((activeObject.height || 0) * (activeObject.scaleY || 1)),
        angle: Math.round(activeObject.angle || 0),
        opacity: activeObject.opacity || 1
      });
    }
  }, [activeObject]);

  const setCanvasBg = (color: string) => {
    if (canvas) {
      // eslint-disable-next-line react-hooks/immutability
      canvas.backgroundColor = color;
      canvas.renderAll();
      saveHistory();
    }
  };

  const updateProperty = (key: string, value: string | number) => {
    if (!activeObject) return;
    // eslint-disable-next-line react-hooks/immutability
    activeObject.set(key as any, value);
    activeObject.setCoords();
    canvas.renderAll();
    saveHistory();
    setLocalProps(prev => ({ ...prev, [key]: value }));
  };

  if (!activeObject) {
    return (
      <div className="flex flex-col gap-6 p-4">
        <section>
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">Canvas Settings</h3>
          <div className="bg-slate-900/40 rounded-2xl border border-slate-800 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400">Dimensions</span>
              <span className="text-[10px] font-black text-slate-200 bg-slate-800 px-2 py-1 rounded-md">{canvasWidth} × {canvasHeight}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setCanvasSize(canvasWidth + 100, canvasHeight + 100)}
                className="flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-[10px] font-bold text-slate-300 transition-all"
              >
                <Maximize2 size={12} /> Larger
              </button>
              <button
                onClick={() => setCanvasSize(Math.max(100, canvasWidth - 100), Math.max(100, canvasHeight - 100))}
                className="flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-[10px] font-bold text-slate-300 transition-all"
              >
                <Minimize2 size={12} /> Smaller
              </button>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">Background Color</h3>
          <div className="grid grid-cols-5 gap-2">
            {CANVAS_BG_COLORS.map(color => (
              <button
                key={color}
                onClick={() => setCanvasBg(color)}
                className={`aspect-square rounded-lg border-2 transition-all ${canvas.backgroundColor === color ? 'border-blue-500 scale-110' : 'border-slate-800 hover:border-slate-600'}`}
                style={{ backgroundColor: color }}
              />
            ))}
            <div className="relative aspect-square rounded-lg border-2 border-slate-800 hover:border-slate-600 overflow-hidden">
               <div className="w-full h-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 opacity-50" />
               <input
                  type="color"
                  value={canvas.backgroundColor as string || '#0F172A'}
                  onChange={(e) => setCanvasBg(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
            </div>
          </div>
        </section>

        <div className="mt-8 p-4 bg-blue-600/5 border border-blue-500/10 rounded-2xl flex items-center gap-3">
           <Info size={16} className="text-blue-400" />
           <p className="text-[10px] text-slate-500 font-medium leading-relaxed">Select an object on the canvas to see its properties and adjustments.</p>
        </div>
      </div>
    );
  }

  const isText = activeObject.type === 'i-text';
  const isImage = activeObject.type === 'image' || activeObject.type === 'FabricImage';

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Object Header */}
      <div className="flex items-center gap-3 p-3 bg-slate-900/60 border border-slate-800 rounded-2xl">
         <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-400 border border-blue-500/20 shadow-inner">
            {isText ? <Type size={18} /> : isImage ? <ImageIcon size={18} /> : <Layout size={18} />}
         </div>
         <div>
            <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-200">
               {activeObject.type.replace('i-text', 'Text Element').replace('FabricImage', 'Image')}
            </h4>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight mt-0.5">Active Layer Adjustment</p>
         </div>
         <button 
           onClick={() => { canvas.remove(activeObject); canvas.discardActiveObject(); canvas.renderAll(); updateLayers(); saveHistory(); }}
           className="ml-auto p-2 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
         >
           <Trash2 size={16} />
         </button>
      </div>

      {/* Transform Section */}
      <section>
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">Position & Size</h3>
        <div className="bg-slate-900/40 rounded-2xl border border-slate-800 p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <VerticalPropertyInput label="Position X" value={localProps.left} onChange={(v) => updateProperty('left', v)} icon={<Move size={12} />} />
            <VerticalPropertyInput label="Position Y" value={localProps.top} onChange={(v) => updateProperty('top', v)} icon={<Move size={12} />} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <VerticalPropertyInput label="Width" value={localProps.width} onChange={(v) => {
              const scale = v / (activeObject.width || 1);
              updateProperty('scaleX', scale);
            }} icon={<Maximize2 size={12} />} />
            <VerticalPropertyInput label="Height" value={localProps.height} onChange={(v) => {
              const scale = v / (activeObject.height || 1);
              updateProperty('scaleY', scale);
            }} icon={<Maximize2 size={12} />} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <VerticalPropertyInput label="Rotation" value={localProps.angle} onChange={(v) => updateProperty('angle', v)} icon={<RotateCw size={12} />} />
            <div className="flex flex-col gap-1.5">
               <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-1">Opacity</label>
               <div className="flex items-center gap-3 bg-slate-800/50 px-3 py-2 rounded-xl border border-slate-700/50">
                  <input
                    type="range"
                    min="0" max="1" step="0.1"
                    value={activeObject.opacity}
                    onChange={(e) => updateProperty('opacity', parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Style Section */}
      <section>
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">Appearance</h3>
        <div className="bg-slate-900/40 rounded-2xl border border-slate-800 p-4 space-y-5">
          <div className="space-y-3">
             <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-1">Fill Color</label>
             <div className="grid grid-cols-6 gap-2">
                <div className="relative aspect-square rounded-lg border border-slate-700 shadow-sm overflow-hidden">
                  <div className="w-full h-full" style={{ backgroundColor: activeObject.fill as string || '#ffffff' }} />
                  <input
                    type="color"
                    value={activeObject.fill as string || '#ffffff'}
                    onChange={(e) => updateProperty('fill', e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => updateProperty('fill', color)}
                    className={`aspect-square rounded-lg border transition-all ${ (activeObject.fill as string).toLowerCase() === color.toLowerCase() ? 'border-blue-500 scale-110 shadow-lg shadow-blue-500/20' : 'border-slate-800 hover:border-slate-600' }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
             </div>
          </div>

          {isText && (
            <div className="space-y-4 pt-2">
               <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-1">Typography</label>
                  <div className="relative group">
                    <select
                      className="w-full appearance-none bg-slate-800/50 border border-slate-700/50 rounded-xl text-[11px] font-bold px-4 py-2.5 pr-10 outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-200 hover:bg-slate-800 transition-all cursor-pointer"
                      value={(activeObject as fabric.IText).fontFamily}
                      onChange={(e) => updateProperty('fontFamily', e.target.value)}
                    >
                      <option value="Inter">Inter (Sans)</option>
                      <option value="Playfair Display">Playfair (Serif)</option>
                      <option value="Fira Code">Fira Code (Mono)</option>
                      <option value="Montserrat">Montserrat</option>
                      <option value="Bebas Neue">Bebas Neue</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-3">
                  <div className="flex bg-slate-800/50 rounded-xl p-1 border border-slate-700/50">
                    <PropertyButton
                      active={(activeObject as fabric.IText).fontWeight === 'bold'}
                      onClick={() => updateProperty('fontWeight', (activeObject as fabric.IText).fontWeight === 'bold' ? 'normal' : 'bold')}
                      icon={<Bold size={14} />}
                    />
                    <PropertyButton
                      active={(activeObject as fabric.IText).fontStyle === 'italic'}
                      onClick={() => updateProperty('fontStyle', (activeObject as fabric.IText).fontStyle === 'italic' ? 'normal' : 'italic')}
                      icon={<Italic size={14} />}
                    />
                  </div>
                  <div className="flex bg-slate-800/50 rounded-xl p-1 border border-slate-700/50">
                    <PropertyButton
                      active={(activeObject as fabric.IText).textAlign === 'left'}
                      onClick={() => updateProperty('textAlign', 'left')}
                      icon={<AlignLeft size={14} />}
                    />
                    <PropertyButton
                      active={(activeObject as fabric.IText).textAlign === 'center'}
                      onClick={() => updateProperty('textAlign', 'center')}
                      icon={<AlignCenter size={14} />}
                    />
                    <PropertyButton
                      active={(activeObject as fabric.IText).textAlign === 'right'}
                      onClick={() => updateProperty('textAlign', 'right')}
                      icon={<AlignRight size={14} />}
                    />
                  </div>
               </div>
            </div>
          )}

          {isImage && (
            <div className="pt-2">
               <button
                  onClick={() => toast.info('AI Enhancement starting...')}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-lg shadow-blue-500/20"
                >
                  <Sparkles size={14} /> AI Enhance Image
                </button>
            </div>
          )}
        </div>
      </section>

      {/* Layer Depth Section */}
      <section>
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">Arrangement</h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => { canvas.bringObjectForward(activeObject); canvas.renderAll(); updateLayers(); saveHistory(); }}
            className="flex items-center justify-center gap-2 py-3 bg-slate-900/60 hover:bg-slate-800 border border-slate-800 rounded-xl text-[10px] font-bold text-slate-300 transition-all"
          >
            <ArrowUp size={14} /> Bring Forward
          </button>
          <button
            onClick={() => { canvas.sendObjectBackwards(activeObject); canvas.renderAll(); updateLayers(); saveHistory(); }}
            className="flex items-center justify-center gap-2 py-3 bg-slate-900/60 hover:bg-slate-800 border border-slate-800 rounded-xl text-[10px] font-bold text-slate-300 transition-all"
          >
            <ArrowDown size={14} /> Send Backward
          </button>
        </div>
      </section>
    </div>
  );
}

function VerticalPropertyInput({ label, value, onChange, icon }: { label: string, value: number, onChange: (v: number) => void, icon: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-1">{label}</label>
      <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-2 rounded-xl border border-slate-700/50 group focus-within:border-blue-500/50 transition-all">
        <span className="text-slate-500 group-focus-within:text-blue-400 transition-colors">{icon}</span>
        <input
          type="number"
          className="w-full bg-transparent text-[11px] font-bold text-slate-200 outline-none"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        />
      </div>
    </div>
  );
}

function PropertyButton({ active, onClick, icon }: { active: boolean, onClick: () => void, icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center py-1.5 rounded-lg transition-all ${active ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-200 hover:bg-slate-700/50'}`}
    >
      {icon}
    </button>
  );
}
