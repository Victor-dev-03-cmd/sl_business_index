'use client';

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
  Palette
} from 'lucide-react';

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

  if (!activeObject) {
    return (
      <div className="h-14 bg-white border-b border-gray-300 flex items-center px-4 gap-6 shadow-sm z-10 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-3 pr-4 border-r border-gray-200">
           <div className="bg-blue-50 p-1.5 rounded-lg border border-blue-100">
              <Sparkles size={14} className="text-blue-500" />
           </div>
           <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Canvas Settings</span>
        </div>

        {/* Paper Size Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl p-1">
            <button 
              onClick={() => setCanvasSize(canvasWidth - 100, canvasHeight - 100)}
              className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-gray-400 hover:text-gray-900 transition-all"
              title="Decrease Canvas Size"
            >
              <Minimize2 size={14} />
            </button>
            <div className="px-3 flex flex-col items-center min-w-[100px]">
               <span className="text-[10px] font-bold text-gray-700">{canvasWidth} x {canvasHeight}</span>
               <span className="text-[8px] text-gray-400 uppercase font-bold tracking-tighter">Pixels (300 DPI)</span>
            </div>
            <button 
              onClick={() => setCanvasSize(canvasWidth + 100, canvasHeight + 100)}
              className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-gray-400 hover:text-gray-900 transition-all"
              title="Increase Canvas Size"
            >
              <Maximize2 size={14} />
            </button>
          </div>

          <div className="h-6 w-[1px] bg-gray-200 mx-1" />

          {/* Background Color Picker */}
          <div className="relative flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer group">
            <Palette size={14} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
            <span className="text-[10px] uppercase font-bold text-gray-400 cursor-pointer">Canvas BG</span>
            <div 
              className="w-6 h-6 rounded-md shadow-sm border border-white" 
              style={{ backgroundColor: canvas?.backgroundColor as string || '#ffffff' }} 
            />
            <input 
              type="color" 
              value={canvas?.backgroundColor as string || '#ffffff'} 
              onChange={(e) => {
                if (canvas) {
                  canvas.backgroundColor = e.target.value;
                  canvas.renderAll();
                  saveHistory();
                }
              }}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
           <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest italic animate-pulse">Ready to Design...</span>
        </div>
      </div>
    );
  }

  const updateProperty = (key: string, value: any) => {
    activeObject.set(key, value);
    canvas?.renderAll();
    saveHistory();
  };

  const isText = activeObject.type === 'i-text';
  const isImage = activeObject.type === 'image' || activeObject.type === 'FabricImage';

  return (
    <div className="h-14 bg-white border-b border-gray-300 flex items-center px-4 gap-6 overflow-x-auto no-scrollbar shadow-sm z-10">
      {/* Object Type Indicator */}
      <div className="flex items-center gap-3 pr-4 border-r border-gray-200">
         <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-gray-500 border border-gray-200">
            {isText ? <Type size={16} /> : isImage ? <ImageIcon size={16} /> : <Layout size={16} />}
         </div>
         <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            {activeObject.type}
         </span>
      </div>

      {/* Common Properties */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer group">
          <label className="text-[10px] uppercase font-bold text-gray-400 cursor-pointer">Color</label>
          <div className="w-6 h-6 rounded-md shadow-sm border border-white" style={{ backgroundColor: activeObject.fill as string || '#000000' }} />
          <input 
            type="color" 
            value={activeObject.fill as string || '#000000'} 
            onChange={(e) => updateProperty('fill', e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </div>
      </div>

      {/* Text Specific Properties */}
      {isText && (
        <>
          <div className="h-6 w-[1px] bg-gray-100" />
          <div className="flex items-center gap-2">
            <div className="relative">
              <select 
                className="appearance-none bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold px-4 py-2 pr-8 outline-none focus:ring-1 focus:ring-blue-500 text-gray-700 hover:bg-gray-100 transition-all cursor-pointer min-w-[140px]"
                value={(activeObject as any).fontFamily}
                onChange={(e) => updateProperty('fontFamily', e.target.value)}
              >
                <option value="Inter">Inter (Sans)</option>
                <option value="Playfair Display">Playfair (Serif)</option>
                <option value="Fira Code">Fira Code (Mono)</option>
                <option value="Montserrat">Montserrat</option>
                <option value="Roboto">Roboto</option>
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            <input 
              type="number" 
              className="w-16 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500 text-gray-700"
              value={Math.round((activeObject as any).fontSize)}
              onChange={(e) => updateProperty('fontSize', parseInt(e.target.value))}
            />
          </div>

          <div className="flex bg-gray-50 rounded-xl p-1 border border-gray-100">
            <PropertyButton 
              active={(activeObject as any).fontWeight === 'bold'}
              onClick={() => updateProperty('fontWeight', (activeObject as any).fontWeight === 'bold' ? 'normal' : 'bold')}
              icon={<Bold size={14} />}
            />
            <PropertyButton 
              active={(activeObject as any).fontStyle === 'italic'}
              onClick={() => updateProperty('fontStyle', (activeObject as any).fontStyle === 'italic' ? 'normal' : 'italic')}
              icon={<Italic size={14} />}
            />
          </div>

          <div className="flex bg-gray-50 rounded-xl p-1 border border-gray-100">
            <PropertyButton 
              active={(activeObject as any).textAlign === 'left'}
              onClick={() => updateProperty('textAlign', 'left')}
              icon={<AlignLeft size={14} />}
            />
            <PropertyButton 
              active={(activeObject as any).textAlign === 'center'}
              onClick={() => updateProperty('textAlign', 'center')}
              icon={<AlignCenter size={14} />}
            />
            <PropertyButton 
              active={(activeObject as any).textAlign === 'right'}
              onClick={() => updateProperty('textAlign', 'right')}
              icon={<AlignRight size={14} />}
            />
          </div>
        </>
      )}

      {isImage && (
        <>
          <div className="h-6 w-[1px] bg-gray-100" />
          <div className="flex items-center gap-2">
            <button 
              onClick={() => alert('Cropping functionality initialized...')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-100 rounded-xl text-[10px] font-bold uppercase tracking-wider text-gray-600 transition-all shadow-sm"
            >
              <Crop size={14} className="text-blue-500" /> Crop
            </button>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl">
               <span className="text-[10px] font-bold text-gray-400 uppercase">Opacity</span>
               <input 
                  type="range" 
                  min="0" max="1" step="0.1" 
                  value={activeObject.opacity}
                  onChange={(e) => updateProperty('opacity', parseFloat(e.target.value))}
                  className="w-20 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
               />
            </div>
          </div>
        </>
      )}

      <div className="h-6 w-[1px] bg-gray-100 ml-auto" />

      {/* Layer Actions */}
      <div className="flex items-center gap-1.5">
        <button 
          onClick={() => { canvas?.bringObjectForward(activeObject); canvas?.renderAll(); updateLayers(); saveHistory(); }}
          className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-900 transition-colors"
          title="Bring Forward"
        >
          <ArrowUp size={16} />
        </button>
        <button 
          onClick={() => { canvas?.sendObjectBackwards(activeObject); canvas?.renderAll(); updateLayers(); saveHistory(); }}
          className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-900 transition-colors"
          title="Send Backward"
        >
          <ArrowDown size={16} />
        </button>
        <div className="h-6 w-[1px] bg-gray-100 mx-1" />
        <button 
          onClick={() => { canvas?.remove(activeObject); canvas?.discardActiveObject(); canvas?.renderAll(); updateLayers(); saveHistory(); }}
          className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors"
          title="Delete Object"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

function PropertyButton({ active, onClick, icon }: { active: boolean, onClick: () => void, icon: React.ReactNode }) {
  return (
    <button 
      onClick={onClick}
      className={`p-2 rounded-lg transition-all ${active ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-900 hover:bg-white/50'}`}
    >
      {icon}
    </button>
  );
}
