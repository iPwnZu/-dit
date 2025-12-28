import React, { useState } from 'react';
import { Layer } from '../types';
import { Eye, EyeOff, Lock, Unlock, Trash2, ChevronUp, ChevronDown, Layers, MousePointer2, GripVertical } from 'lucide-react';

interface LayersPanelProps {
  layers: Layer[];
  setLayers: React.Dispatch<React.SetStateAction<Layer[]>>;
  selectedLayerId: string | null;
  setSelectedLayerId: (id: string | null) => void;
}

const LayersPanel: React.FC<LayersPanelProps> = ({
  layers,
  setLayers,
  selectedLayerId,
  setSelectedLayerId
}) => {
  const [draggedLayerIndex, setDraggedLayerIndex] = useState<number | null>(null);

  const toggleVisibility = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setLayers(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
  };

  const toggleLock = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setLayers(prev => prev.map(l => l.id === id ? { ...l, locked: !l.locked } : l));
  };

  const deleteLayer = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setLayers(prev => prev.filter(l => l.id !== id));
    if (selectedLayerId === id) setSelectedLayerId(null);
  };

  const moveLayer = (e: React.MouseEvent, index: number, direction: 'up' | 'down') => {
    e.stopPropagation();
    if (direction === 'up' && index < layers.length - 1) {
      const newLayers = [...layers];
      [newLayers[index], newLayers[index + 1]] = [newLayers[index + 1], newLayers[index]];
      setLayers(newLayers);
    } else if (direction === 'down' && index > 0) {
      const newLayers = [...layers];
      [newLayers[index], newLayers[index - 1]] = [newLayers[index - 1], newLayers[index]];
      setLayers(newLayers);
    }
  };

  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    e.stopPropagation();
    const val = parseFloat(e.target.value);
    setLayers(prev => prev.map(l => l.id === id ? { ...l, opacity: val } : l));
  };

  const handleBlendModeChange = (e: React.ChangeEvent<HTMLSelectElement>, id: string) => {
    e.stopPropagation();
    setLayers(prev => prev.map(l => l.id === id ? { ...l, blendMode: e.target.value as any } : l));
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedLayerIndex(index);
    // Set transparent image or rely on default browser behavior
    e.dataTransfer.effectAllowed = "move";
    // We can set a custom drag image if we want, but default is usually okay for rows
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault(); // Necessary to allow dropping
    if (draggedLayerIndex === null || draggedLayerIndex === index) return;
    // Optional: Add visual indicator logic here if not relying on CSS hover
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedLayerIndex === null || draggedLayerIndex === targetIndex) return;

    const newLayers = [...layers];
    const [movedLayer] = newLayers.splice(draggedLayerIndex, 1);
    newLayers.splice(targetIndex, 0, movedLayer);

    setLayers(newLayers);
    setDraggedLayerIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedLayerIndex(null);
  };

  // Layers are rendered bottom-to-top in DOM, but typically listed top-to-bottom in UI.
  // We reverse the array for display purposes so the "top" layer is at the top of the list.
  const displayLayers = [...layers].map((l, index) => ({ l, index })).reverse();

  return (
    <div className="flex flex-col h-1/2 bg-gray-900 border-t border-gray-700">
      <div className="flex items-center justify-between p-3 border-b border-gray-700 bg-gray-800/50">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <Layers size={14} /> Layers
        </h3>
        <span className="text-[10px] text-gray-500">{layers.length} items</span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
        {layers.length === 0 ? (
          <div className="text-center text-gray-600 py-8 text-xs">
            No layers added.<br/>Use tools to add content.
          </div>
        ) : (
          displayLayers.map(({ l, index }) => (
            <div
              key={l.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              onClick={() => setSelectedLayerId(l.id)}
              className={`group flex items-center gap-2 p-2 rounded text-sm cursor-pointer transition-colors border ${
                selectedLayerId === l.id 
                  ? 'bg-blue-900/40 border-blue-500/50' 
                  : 'hover:bg-gray-800 border-transparent'
              } ${draggedLayerIndex === index ? 'opacity-50 dashed border-gray-500' : ''}`}
            >
              {/* Drag Handle */}
              <div className="cursor-grab active:cursor-grabbing text-gray-600 hover:text-gray-400">
                 <GripVertical size={14} />
              </div>

              {/* Visibility */}
              <button 
                onClick={(e) => toggleVisibility(e, l.id)}
                className={`p-1 rounded hover:bg-gray-700 ${l.visible ? 'text-gray-400' : 'text-gray-600'}`}
              >
                {l.visible ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>

              {/* Lock */}
              <button 
                onClick={(e) => toggleLock(e, l.id)}
                className={`p-1 rounded hover:bg-gray-700 ${l.locked ? 'text-red-400' : 'text-gray-600 opacity-0 group-hover:opacity-100'}`}
              >
                {l.locked ? <Lock size={14} /> : <Unlock size={14} />}
              </button>

              {/* Icon based on Type */}
              <div className="text-gray-500">
                 {l.type === 'text' && <span className="font-serif font-bold text-xs px-1">T</span>}
                 {l.type === 'rect' && <div className="w-3 h-3 border border-current"></div>}
                 {l.type === 'circle' && <div className="w-3 h-3 border border-current rounded-full"></div>}
                 {l.type === 'path' && <MousePointer2 size={12} />}
              </div>

              {/* Name */}
              <span className={`flex-1 truncate ${!l.visible ? 'text-gray-600' : 'text-gray-200'}`}>
                {l.name}
              </span>

              {/* Blend Mode */}
              <div className="relative group/blend">
                 <select
                   value={l.blendMode || 'normal'}
                   onChange={(e) => handleBlendModeChange(e, l.id)}
                   onClick={(e) => e.stopPropagation()}
                   className="w-16 h-4 text-[9px] bg-gray-800 text-gray-300 border border-gray-600 rounded px-1 outline-none focus:border-blue-500 cursor-pointer"
                   title="Blend Mode"
                 >
                    <option value="normal">Norm</option>
                    <option value="multiply">Mult</option>
                    <option value="screen">Scrn</option>
                    <option value="overlay">Over</option>
                    <option value="darken">Dark</option>
                    <option value="lighten">Lght</option>
                    <option value="color-dodge">Dodge</option>
                    <option value="color-burn">Burn</option>
                    <option value="hard-light">Hard</option>
                    <option value="soft-light">Soft</option>
                    <option value="difference">Diff</option>
                    <option value="exclusion">Excl</option>
                    <option value="hue">Hue</option>
                    <option value="saturation">Sat</option>
                    <option value="color">Col</option>
                    <option value="luminosity">Lum</option>
                 </select>
              </div>

              {/* Opacity Slider */}
              <div className="flex items-center px-2 group/slider" title={`Opacity: ${Math.round((l.opacity || 1) * 100)}%`}>
                <input
                    type="range"
                    min="0" max="1" step="0.05"
                    value={l.opacity !== undefined ? l.opacity : 1}
                    onChange={(e) => handleOpacityChange(e, l.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-16 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:bg-gray-500 transition-colors"
                />
              </div>

              {/* Actions (Hover) - Keeping manual moves for accessibility/preference */}
              <div className="flex opacity-0 group-hover:opacity-100 items-center">
                 <button 
                   onClick={(e) => moveLayer(e, index, 'up')}
                   disabled={index === layers.length - 1}
                   className="p-1 text-gray-400 hover:text-white disabled:opacity-30"
                   title="Move Up"
                 >
                   <ChevronUp size={14} />
                 </button>
                 <button 
                   onClick={(e) => moveLayer(e, index, 'down')}
                   disabled={index === 0}
                   className="p-1 text-gray-400 hover:text-white disabled:opacity-30"
                   title="Move Down"
                 >
                   <ChevronDown size={14} />
                 </button>
                 <button 
                   onClick={(e) => deleteLayer(e, l.id)}
                   className="p-1 text-red-500 hover:bg-red-900/50 rounded ml-1"
                   title="Delete Layer"
                 >
                   <Trash2 size={14} />
                 </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LayersPanel;