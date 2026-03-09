'use client';

import { useEffect, useRef } from 'react';
import * as fabric from 'fabric';
import { useEditorStore } from '../store/useEditorStore';

export default function EditorCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { 
    setCanvas, 
    setActiveObject, 
    updateLayers, 
    saveHistory, 
    canvasWidth, 
    canvasHeight 
  } = useEditorStore();

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: '#ffffff',
    });

    setCanvas(canvas);

    // Initial state
    saveHistory();
    updateLayers();

    // Event listeners
    canvas.on('selection:created', (e) => setActiveObject(e.selected ? e.selected[0] : null));
    canvas.on('selection:updated', (e) => setActiveObject(e.selected ? e.selected[0] : null));
    canvas.on('selection:cleared', () => setActiveObject(null));
    
    canvas.on('object:modified', () => {
      saveHistory();
      updateLayers();
    });
    
    canvas.on('object:added', () => updateLayers());
    canvas.on('object:removed', () => updateLayers());

    return () => {
      canvas.dispose();
    };
  }, []);

  // Sync canvas size with store
  const canvasInstance = useEditorStore(state => state.canvas);
  useEffect(() => {
    if (canvasInstance) {
      canvasInstance.setDimensions({
        width: canvasWidth,
        height: canvasHeight,
      });
      canvasInstance.renderAll();
    }
  }, [canvasWidth, canvasHeight, canvasInstance]);

  return (
    <div className="relative bg-gray-900 flex items-center justify-center p-20 overflow-auto custom-scrollbar h-full w-full">
      <div className="shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] bg-white relative">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
