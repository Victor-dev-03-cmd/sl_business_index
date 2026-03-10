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
    saveHistory();
    updateLayers();

    canvas.on('selection:created', (e) => setActiveObject(e.selected ? e.selected[0] : null));
    canvas.on('selection:updated', (e) => setActiveObject(e.selected ? e.selected[0] : null));
    canvas.on('selection:cleared', () => setActiveObject(null));
    canvas.on('object:modified', () => { saveHistory(); updateLayers(); });
    canvas.on('object:added', () => updateLayers());
    canvas.on('object:removed', () => updateLayers());

    return () => {
      canvas.dispose();
      setCanvas(null);
    };
  }, []);

  const canvasInstance = useEditorStore(state => state.canvas);
  useEffect(() => {
    // Check if canvas is not disposed and has required internal elements
    if (canvasInstance && (canvasInstance as any).lowerCanvasEl) {
      try {
        canvasInstance.setDimensions({ width: canvasWidth, height: canvasHeight });
        canvasInstance.renderAll();
      } catch (err) {
        console.warn('Failed to set canvas dimensions:', err);
      }
    }
  }, [canvasWidth, canvasHeight, canvasInstance]);

  return (
    <div
      className="flex-1 flex items-center justify-center overflow-auto"
      style={{
        background: `
          radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.04) 0%, transparent 60%),
          repeating-conic-gradient(#1e2a3a 0% 25%, #1a2535 0% 50%) 0 0 / 24px 24px
        `
      }}
    >
      <div
        className="relative"
        style={{
          boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 32px 80px -10px rgba(0,0,0,0.7), 0 8px 24px -4px rgba(0,0,0,0.5)',
          margin: '48px'
        }}
      >
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
