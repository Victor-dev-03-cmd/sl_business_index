'use client';

import * as fabric from 'fabric';
import { 
  Type, 
  Square, 
  Circle, 
  Pencil, 
  MousePointer2, 
  Undo, 
  Redo, 
  Star,
  Trash2,
  Copy
} from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';

export default function Toolbar() {
  const { 
    canvas, 
    activeTool, 
    setActiveTool, 
    undo, 
    redo, 
    activeObject,
    saveHistory,
    updateLayers 
  } = useEditorStore();

  const addRect = () => {
    if (!canvas) return;
    const rect = new fabric.Rect({
      left: 100,
      top: 100,
      fill: '#3b82f6',
      width: 100,
      height: 100,
      cornerColor: '#3b82f6',
      cornerStyle: 'circle',
      transparentCorners: false,
    });
    canvas.add(rect);
    canvas.setActiveObject(rect);
    saveHistory();
  };

  const addCircle = () => {
    if (!canvas) return;
    const circle = new fabric.Circle({
      left: 150,
      top: 150,
      fill: '#10b981',
      radius: 50,
      cornerColor: '#3b82f6',
      cornerStyle: 'circle',
      transparentCorners: false,
    });
    canvas.add(circle);
    canvas.setActiveObject(circle);
    saveHistory();
  };

  const addText = () => {
    if (!canvas) return;
    const text = new fabric.IText('Design your brand', {
      left: 100,
      top: 100,
      fontSize: 40,
      fontFamily: 'Inter',
      fontWeight: 'bold',
      fill: '#1a1a1a',
      cornerColor: '#3b82f6',
      cornerStyle: 'circle',
      transparentCorners: false,
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    saveHistory();
  };

  const addStar = () => {
    if (!canvas) return;
    const star = new fabric.Polygon([
      { x: 50, y: 0 },
      { x: 61, y: 35 },
      { x: 98, y: 35 },
      { x: 68, y: 57 },
      { x: 79, y: 91 },
      { x: 50, y: 70 },
      { x: 21, y: 91 },
      { x: 32, y: 57 },
      { x: 2, y: 35 },
      { x: 39, y: 35 },
    ], {
      left: 200,
      top: 200,
      fill: '#fbbf24',
      cornerColor: '#3b82f6',
      cornerStyle: 'circle',
      transparentCorners: false,
    });
    canvas.add(star);
    canvas.setActiveObject(star);
    saveHistory();
  };

  const deleteActive = () => {
    if (!canvas) return;
    const activeObjects = canvas.getActiveObjects();
    canvas.remove(...activeObjects);
    canvas.discardActiveObject();
    canvas.renderAll();
    saveHistory();
    updateLayers();
  };

  const cloneActive = () => {
    if (!canvas || !activeObject) return;
    activeObject.clone().then((cloned) => {
        canvas.discardActiveObject();
        cloned.set({
          left: (cloned.left || 0) + 10,
          top: (cloned.top || 0) + 10,
          evented: true,
        });
        if (cloned instanceof fabric.ActiveSelection) {
          // active selection needs a reference to the canvas.
          cloned.canvas = canvas;
          cloned.getObjects().forEach((obj) => {
            canvas.add(obj);
          });
          // this should be fixed in fabric 5+ automatically but good to be safe
          cloned.setCoords();
        } else {
          canvas.add(cloned);
        }
        canvas.setActiveObject(cloned);
        canvas.requestRenderAll();
        saveHistory();
    });
  };

  return (
    <div className="flex flex-col gap-3 p-3 bg-white border-r border-gray-200 w-16 items-center z-10 shadow-sm">
      <ToolButton 
        icon={<MousePointer2 size={20} />} 
        active={activeTool === 'select'} 
        onClick={() => setActiveTool('select')} 
        title="Select (V)" 
      />
      <div className="h-[1px] w-full bg-gray-100" />
      <ToolButton 
        icon={<Type size={20} />} 
        active={activeTool === 'text'} 
        onClick={() => { setActiveTool('text'); addText(); }} 
        title="Add Text" 
      />
      <ToolButton 
        icon={<Square size={20} />} 
        active={activeTool === 'rect'} 
        onClick={() => { setActiveTool('rect'); addRect(); }} 
        title="Rectangle" 
      />
      <ToolButton 
        icon={<Circle size={20} />} 
        active={activeTool === 'circle'} 
        onClick={() => { setActiveTool('circle'); addCircle(); }} 
        title="Circle" 
      />
      <ToolButton 
        icon={<Star size={20} />} 
        active={activeTool === 'star'} 
        onClick={() => { setActiveTool('star'); addStar(); }} 
        title="Star" 
      />
      <ToolButton 
        icon={<Pencil size={20} />} 
        active={activeTool === 'pen'} 
        onClick={() => setActiveTool('pen')} 
        title="Draw Tool" 
      />
      
      <div className="h-[1px] w-full bg-gray-100 my-1" />

      <ToolButton 
        icon={<Undo size={20} />} 
        onClick={undo} 
        title="Undo (Ctrl+Z)" 
      />
      <ToolButton 
        icon={<Redo size={20} />} 
        onClick={redo} 
        title="Redo (Ctrl+Y)" 
      />

      {activeObject && (
        <>
          <div className="h-[1px] w-full bg-gray-100 my-1" />
          <ToolButton 
            icon={<Copy size={20} />} 
            onClick={cloneActive} 
            title="Duplicate" 
          />
          <ToolButton 
            icon={<Trash2 size={20} className="text-red-500" />} 
            onClick={deleteActive} 
            title="Delete" 
          />
        </>
      )}
    </div>
  );
}

function ToolButton({ icon, active, onClick, title }: { 
  icon: React.ReactNode, 
  active?: boolean, 
  onClick: () => void,
  title: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-2.5 rounded-xl transition-all ${
        active 
          ? 'bg-blue-50 text-blue-600 shadow-inner' 
          : 'text-gray-400 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      {icon}
    </button>
  );
}
