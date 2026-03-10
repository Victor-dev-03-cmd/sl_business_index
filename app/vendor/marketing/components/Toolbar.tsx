'use client';

import * as fabric from 'fabric';
import { 
  Type, 
  Square, 
  Circle, 
  Pencil, 
  MousePointer2, 
  Star,
  Trash2,
  Copy,
  Triangle
} from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';

export default function Toolbar() {
  const { canvas, activeTool, setActiveTool, activeObject, saveHistory, updateLayers } = useEditorStore();

  const addRect = () => {
    if (!canvas) return;
    const rect = new fabric.Rect({
      left: 100, top: 100,
      fill: '#3b82f6',
      width: 120, height: 120,
      cornerColor: '#3b82f6', cornerStyle: 'circle', transparentCorners: false,
    });
    canvas.add(rect); canvas.setActiveObject(rect); saveHistory();
  };

  const addCircle = () => {
    if (!canvas) return;
    const circle = new fabric.Circle({
      left: 150, top: 150,
      fill: '#10b981', radius: 60,
      cornerColor: '#3b82f6', cornerStyle: 'circle', transparentCorners: false,
    });
    canvas.add(circle); canvas.setActiveObject(circle); saveHistory();
  };

  const addTriangle = () => {
    if (!canvas) return;
    const tri = new fabric.Triangle({
      left: 100, top: 100,
      fill: '#f59e0b',
      width: 120, height: 120,
      cornerColor: '#3b82f6', cornerStyle: 'circle', transparentCorners: false,
    });
    canvas.add(tri); canvas.setActiveObject(tri); saveHistory();
  };

  const addText = () => {
    if (!canvas) return;
    const text = new fabric.IText('Your Text Here', {
      left: 100, top: 100,
      fontSize: 36, fontFamily: 'Inter', fontWeight: 'bold',
      fill: '#ffffff',
      cornerColor: '#3b82f6', cornerStyle: 'circle', transparentCorners: false,
    });
    canvas.add(text); canvas.setActiveObject(text); saveHistory();
  };

  const addStar = () => {
    if (!canvas) return;
    const star = new fabric.Polygon([
      { x: 50, y: 0 }, { x: 61, y: 35 }, { x: 98, y: 35 },
      { x: 68, y: 57 }, { x: 79, y: 91 }, { x: 50, y: 70 },
      { x: 21, y: 91 }, { x: 32, y: 57 }, { x: 2, y: 35 }, { x: 39, y: 35 },
    ], {
      left: 150, top: 150, fill: '#fbbf24',
      cornerColor: '#3b82f6', cornerStyle: 'circle', transparentCorners: false,
    });
    canvas.add(star); canvas.setActiveObject(star); saveHistory();
  };

  const deleteActive = () => {
    if (!canvas) return;
    const objs = canvas.getActiveObjects();
    canvas.remove(...objs);
    canvas.discardActiveObject();
    canvas.renderAll(); saveHistory(); updateLayers();
  };

  const cloneActive = () => {
    if (!canvas || !activeObject) return;
    activeObject.clone().then((cloned) => {
      canvas.discardActiveObject();
      cloned.set({ left: (cloned.left || 0) + 16, top: (cloned.top || 0) + 16, evented: true });
      if (cloned instanceof fabric.ActiveSelection) {
        cloned.canvas = canvas;
        cloned.getObjects().forEach((obj) => canvas.add(obj));
        cloned.setCoords();
      } else {
        canvas.add(cloned);
      }
      canvas.setActiveObject(cloned);
      canvas.requestRenderAll(); saveHistory();
    });
  };

  return (
    <div className="w-14 flex flex-col items-center py-4 gap-2 bg-[#0F172A] border-r border-slate-800 z-20 shrink-0 overflow-y-auto shadow-2xl">
      <ToolGroup>
        <ToolBtn icon={<MousePointer2 size={18} />} active={activeTool === 'select'} onClick={() => setActiveTool('select')} title="Select (V)" />
      </ToolGroup>

      <Separator />

      <ToolGroup>
        <ToolBtn icon={<Type size={18} />} active={activeTool === 'text'} onClick={() => { setActiveTool('text'); addText(); }} title="Text (T)" />
      </ToolGroup>

      <Separator />

      <ToolGroup>
        <ToolBtn icon={<Square size={18} />} active={activeTool === 'rect'} onClick={() => { setActiveTool('rect'); addRect(); }} title="Rectangle (R)" />
        <ToolBtn icon={<Circle size={18} />} active={activeTool === 'circle'} onClick={() => { setActiveTool('circle'); addCircle(); }} title="Ellipse (O)" />
        <ToolBtn icon={<Triangle size={18} />} active={activeTool === 'triangle'} onClick={() => { setActiveTool('triangle'); addTriangle(); }} title="Triangle" />
        <ToolBtn icon={<Star size={18} />} active={activeTool === 'star'} onClick={() => { setActiveTool('star'); addStar(); }} title="Star" />
      </ToolGroup>

      <Separator />

      <ToolGroup>
        <ToolBtn icon={<Pencil size={18} />} active={activeTool === 'pen'} onClick={() => setActiveTool('pen')} title="Draw (B)" />
      </ToolGroup>

      {activeObject && (
        <>
          <Separator />
          <ToolGroup>
            <ToolBtn icon={<Copy size={18} />} onClick={cloneActive} title="Duplicate (Ctrl+D)" />
            <ToolBtn icon={<Trash2 size={18} />} onClick={deleteActive} title="Delete (Del)" danger />
          </ToolGroup>
        </>
      )}
    </div>
  );
}

function ToolGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col items-center gap-1.5 w-full px-2">{children}</div>;
}

function Separator() {
  return <div className="h-px w-6 bg-slate-800/60 my-1 shrink-0" />;
}

function ToolBtn({ icon, active, onClick, title, danger }: {
  icon: React.ReactNode;
  active?: boolean;
  onClick: () => void;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all group relative border ${
        active
          ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/40 scale-105'
          : danger
            ? 'text-slate-500 border-transparent hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20'
            : 'text-slate-500 border-transparent hover:bg-slate-800 hover:text-slate-200'
      }`}
    >
      {icon}
      <div className="absolute left-full ml-3 px-2 py-1 bg-slate-900 border border-slate-800 text-white text-[9px] font-black uppercase tracking-widest rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 translate-x-[-4px] group-hover:translate-x-0 z-50 shadow-2xl whitespace-nowrap">
        {title}
      </div>
    </button>
  );
}
