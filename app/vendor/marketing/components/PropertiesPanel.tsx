
import { useEditorStore } from '../store/useEditorStore';
import {
  Type, 
  AlignCenter, 
  AlignLeft, 
  AlignRight, 
  Bold, 
  Italic, 
  ArrowUp, 
  ArrowDown,
  Crop,
  Sparkles,
  ChevronDown,
  Trash2,
  Layout,
  Image as ImageIcon,
  Maximize2,
  Minimize2,
  Palette,
  Layers,
  Settings2,
  Move
} from 'lucide-react';
import { useState, useEffect } from 'react';

const PRESET_COLORS = ['#000000', '#FFFFFF', '#FF5733', '#33FF57', '#3357FF', '#FF33A1', '#A133FF'];
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
      canvas.backgroundColor = color;
      canvas.renderAll();
      saveHistory();
    }
  };

  const updateProperty = (key: string, value: any) => {
    if (!activeObject) return;
    activeObject.set(key, value);
    activeObject.setCoords();
    canvas?.renderAll();
    saveHistory();
    // Update local state to reflect change immediately
    setLocalProps(prev => ({ ...prev, [key]: value }));
  };

  if (!activeObject) {
    return (
      <div className="h-12 bg-[#0F172A]/80 backdrop-blur-md border-b border-slate-800 flex items-center px-4 gap-6 z-10 overflow-x-auto no-scrollbar shrink-0">
        <div className="flex items-center gap-2.5 pr-4 border-r border-slate-800/60">
           <div className="bg-blue-500/15 p-1.5 rounded-lg border border-blue-500/20 shadow-sm shadow-blue-500/5">
              <Settings2 size={13} className="text-blue-400" />
           </div>
           <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-300">Editor Settings</span>
        </div>

        {/* Paper Size Controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-slate-900/60 border border-slate-800 rounded-lg p-0.5 shadow-inner">
            <button
              onClick={() => setCanvasSize(canvasWidth - 100, canvasHeight - 100)}
              className="p-1.5 hover:bg-slate-800/80 rounded-md text-slate-400 hover:text-white transition-all"
              title="Decrease Canvas Size"
            >
              <Minimize2 size={13} />
            </button>
            <div className="px-3 flex items-center gap-2 min-w-[120px] justify-center">
               <span className="text-[10px] font-black text-slate-200 tracking-tight">{canvasWidth} <span className="text-slate-600 px-0.5">×</span> {canvasHeight}</span>
               <div className="h-2 w-px bg-slate-800" />
               <span className="text-[8px] text-slate-500 uppercase font-bold tracking-widest">PX</span>
            </div>
            <button
              onClick={() => setCanvasSize(canvasWidth + 100, canvasHeight + 100)}
              className="p-1.5 hover:bg-slate-800/80 rounded-md text-slate-400 hover:text-white transition-all"
              title="Increase Canvas Size"
            >
              <Maximize2 size={13} />
            </button>
          </div>

          <div className="h-4 w-px bg-slate-800/60" />

          {/* Background Color Picker */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mr-1">Background</span>
            <div className="flex items-center gap-1.5">
              {CANVAS_BG_COLORS.slice(0, 4).map(color => (
                <ColorButton
                  key={color}
                  color={color}
                  onClick={() => setCanvasBg(color)}
                  isActive={canvas?.backgroundColor === color}
                />
              ))}
              <div className="relative w-6 h-6 rounded-md overflow-hidden border border-slate-700/50 hover:border-slate-500 transition-colors shadow-sm">
                <div className="w-full h-full" style={{ backgroundColor: canvas?.backgroundColor as string || '#0F172A' }} />
                <input
                  type="color"
                  value={canvas?.backgroundColor as string || '#0F172A'}
                  onChange={(e) => setCanvasBg(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="ml-auto hidden md:flex items-center gap-2">
           <span className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em] italic">Pro Creative Canvas</span>
        </div>
      </div>
    );
  }

  const isText = activeObject.type === 'i-text';
  const isImage = activeObject.type === 'image' || activeObject.type === 'FabricImage';

  return (
    <div className="h-12 bg-[#0F172A]/80 backdrop-blur-md border-b border-slate-800 flex items-center px-4 gap-4 overflow-x-auto no-scrollbar shadow-xl z-10 shrink-0">
      {/* Object Type Indicator */}
      <div className="flex items-center gap-2.5 pr-3 border-r border-slate-800/60">
         <div className="w-7 h-7 bg-slate-800/50 rounded-lg flex items-center justify-center text-blue-400 border border-slate-700 shadow-inner">
            {isText ? <Type size={14} /> : isImage ? <ImageIcon size={14} /> : <Layout size={14} />}
         </div>
         <span className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-400">
            {activeObject.type?.replace('i-text', 'Text')}
         </span>
      </div>

      {/* Transform Properties */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-800 rounded-lg px-2 py-0.5">
          <Move size={11} className="text-slate-600" />
          <PropertyInput 
            value={localProps.left} 
            onChange={(v) => updateProperty('left', v)} 
            label="X" 
          />
          <PropertyInput 
            value={localProps.top} 
            onChange={(v) => updateProperty('top', v)} 
            label="Y" 
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-800 rounded-lg px-2 py-0.5">
          <Maximize2 size={11} className="text-slate-600" />
          <PropertyInput 
            value={localProps.width} 
            onChange={(v) => {
              const scale = v / (activeObject.width || 1);
              updateProperty('scaleX', scale);
            }} 
            label="W" 
          />
          <PropertyInput 
            value={localProps.height} 
            onChange={(v) => {
              const scale = v / (activeObject.height || 1);
              updateProperty('scaleY', scale);
            }} 
            label="H" 
          />
        </div>
      </div>

      <div className="h-4 w-px bg-slate-800" />

      {/* Style Properties */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center gap-1.5 p-1 bg-slate-900/60 rounded-lg border border-slate-800">
          <div className="relative w-5 h-5 rounded-md overflow-hidden border border-slate-700 shadow-sm">
            <div className="w-full h-full" style={{ backgroundColor: activeObject.fill as string || '#ffffff' }} />
            <input
              type="color"
              value={activeObject.fill as string || '#ffffff'}
              onChange={(e) => updateProperty('fill', e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
          <div className="flex gap-1">
            {PRESET_COLORS.slice(0, 3).map(color => (
              <ColorButton
                key={color}
                color={color}
                onClick={() => updateProperty('fill', color)}
                isActive={(activeObject.fill as string)?.toLowerCase() === color.toLowerCase()}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Text Specific Properties */}
      {isText && (
        <>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <div className="relative group">
              <select
                className="appearance-none bg-slate-900/60 border border-slate-800 rounded-lg text-[10px] font-bold px-3 py-1.5 pr-8 outline-none focus:ring-1 focus:ring-blue-500 text-slate-300 hover:bg-slate-800 transition-all cursor-pointer min-w-[120px]"
                value={(activeObject as any).fontFamily}
                onChange={(e) => updateProperty('fontFamily', e.target.value)}
              >
                <option value="Inter">Inter</option>
                <option value="Playfair Display">Playfair</option>
                <option value="Fira Code">Fira Code</option>
                <option value="Montserrat">Montserrat</option>
              </select>
              <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>

            <input
              type="number"
              className="w-12 bg-slate-900/60 border border-slate-800 rounded-lg text-[10px] font-bold px-2 py-1.5 outline-none focus:ring-1 focus:ring-blue-500 text-slate-300 text-center"
              value={Math.round((activeObject as any).fontSize)}
              onChange={(e) => updateProperty('fontSize', parseInt(e.target.value))}
            />
          </div>

          <div className="flex bg-slate-900/60 rounded-lg p-0.5 border border-slate-800">
            <PropertyButton
              active={(activeObject as any).fontWeight === 'bold'}
              onClick={() => updateProperty('fontWeight', (activeObject as any).fontWeight === 'bold' ? 'normal' : 'bold')}
              icon={<Bold size={13} />}
            />
            <PropertyButton
              active={(activeObject as any).fontStyle === 'italic'}
              onClick={() => updateProperty('fontStyle', (activeObject as any).fontStyle === 'italic' ? 'normal' : 'italic')}
              icon={<Italic size={13} />}
            />
          </div>

          <div className="flex bg-slate-900/60 rounded-lg p-0.5 border border-slate-800">
            <PropertyButton
              active={(activeObject as any).textAlign === 'left'}
              onClick={() => updateProperty('textAlign', 'left')}
              icon={<AlignLeft size={13} />}
            />
            <PropertyButton
              active={(activeObject as any).textAlign === 'center'}
              onClick={() => updateProperty('textAlign', 'center')}
              icon={<AlignCenter size={13} />}
            />
            <PropertyButton
              active={(activeObject as any).textAlign === 'right'}
              onClick={() => updateProperty('textAlign', 'right')}
              icon={<AlignRight size={13} />}
            />
          </div>
        </>
      )}

      {isImage && (
        <>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <button
              onClick={() => alert('Cropping functionality initialized...')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/60 hover:bg-slate-800 border border-slate-800 rounded-lg text-[9px] font-bold uppercase tracking-wider text-slate-300 transition-all shadow-sm"
            >
              <Crop size={13} className="text-blue-400" /> Crop
            </button>
            <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-900/60 border border-slate-800 rounded-lg">
               <span className="text-[9px] font-bold text-slate-500 uppercase">Opacity</span>
               <input
                  type="range"
                  min="0" max="1" step="0.1"
                  value={activeObject.opacity}
                  onChange={(e) => updateProperty('opacity', parseFloat(e.target.value))}
                  className="w-16 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
               />
            </div>
          </div>
        </>
      )}

      <div className="h-4 w-px bg-slate-800 ml-auto" />

      {/* Layer Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => { canvas?.bringObjectForward(activeObject); canvas?.renderAll(); updateLayers(); saveHistory(); }}
          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          title="Bring Forward"
        >
          <ArrowUp size={14} />
        </button>
        <button
          onClick={() => { canvas?.sendObjectBackwards(activeObject); canvas?.renderAll(); updateLayers(); saveHistory(); }}
          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          title="Send Backward"
        >
          <ArrowDown size={14} />
        </button>
      </div>
    </div>
  );
}

function PropertyInput({ value, onChange, label }: { value: number, onChange: (v: number) => void, label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[8px] font-black text-slate-600 select-none">{label}</span>
      <input
        type="number"
        className="w-10 bg-transparent text-[10px] font-bold text-slate-300 outline-none focus:text-blue-400 text-center"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
      />
    </div>
  );
}

function ColorButton({ color, onClick, isActive }: { color: string, onClick: () => void, isActive?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-4 h-4 rounded-full border border-slate-700 transition-all ${isActive ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#0F172A] scale-110' : 'hover:scale-110'}`}
      style={{ backgroundColor: color }}
    />
  );
}

function PropertyButton({ active, onClick, icon }: { active: boolean, onClick: () => void, icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`p-1.5 rounded-md transition-all ${active ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
    >
      {icon}
    </button>
  );
}
