import { create } from 'zustand';
import * as fabric from 'fabric';

interface EditorState {
  canvas: fabric.Canvas | null;
  activeObject: fabric.FabricObject | null;
  layers: fabric.FabricObject[];
  history: string[];
  historyIndex: number;
  projectName: string;
  setProjectName: (name: string) => void;
  
  canvasWidth: number;
  canvasHeight: number;
  setCanvasSize: (width: number, height: number) => void;
  
  setCanvas: (canvas: fabric.Canvas | null) => void;
  setActiveObject: (obj: fabric.FabricObject | null) => void;
  updateLayers: () => void;
  
  saveHistory: () => void;
  undo: () => void;
  redo: () => void;
  
  // Tools
  activeTool: 'select' | 'text' | 'rect' | 'circle' | 'pen' | 'image' | 'star' | 'triangle';
  setActiveTool: (tool: 'select' | 'text' | 'rect' | 'circle' | 'pen' | 'image' | 'star' | 'triangle') => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  canvas: null,
  activeObject: null,
  layers: [],
  history: [],
  historyIndex: -1,
  activeTool: 'select',
  projectName: 'Untitled Design',
  canvasWidth: 1080,
  canvasHeight: 1080,

  setProjectName: (projectName) => set({ projectName }),
  setCanvasSize: (canvasWidth, canvasHeight) => {
    const { canvas } = get();
    if (canvas) {
      canvas.setDimensions({ width: canvasWidth, height: canvasHeight });
      canvas.renderAll();
    }
    set({ canvasWidth, canvasHeight });
  },
  setCanvas: (canvas) => set({ canvas }),
  setActiveObject: (activeObject) => set({ activeObject }),
  
  updateLayers: () => {
    const canvas = get().canvas;
    if (canvas) {
      set({ layers: [...canvas.getObjects()].reverse() });
    }
  },

  setActiveTool: (activeTool) => {
    const canvas = get().canvas;
    if (canvas) {
      canvas.isDrawingMode = activeTool === 'pen';
      if (activeTool === 'pen') {
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        canvas.freeDrawingBrush.width = 5;
      }
    }
    set({ activeTool });
  },

  saveHistory: () => {
    const { canvas, history, historyIndex } = get();
    if (canvas) {
      const json = JSON.stringify(canvas.toJSON());
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(json);
      
      // Limit history to 50 steps
      if (newHistory.length > 50) newHistory.shift();
      
      set({ 
        history: newHistory, 
        historyIndex: newHistory.length - 1 
      });
    }
  },

  undo: () => {
    const { canvas, history, historyIndex } = get();
    if (canvas && historyIndex > 0) {
      const newIndex = historyIndex - 1;
      canvas.loadFromJSON(JSON.parse(history[newIndex]), () => {
        canvas.renderAll();
        set({ historyIndex: newIndex });
      });
    }
  },

  redo: () => {
    const { canvas, history, historyIndex } = get();
    if (canvas && historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      canvas.loadFromJSON(JSON.parse(history[newIndex]), () => {
        canvas.renderAll();
        set({ historyIndex: newIndex });
      });
    }
  }
}));
