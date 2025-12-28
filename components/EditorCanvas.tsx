import React, { useRef, useEffect, useState, useMemo, memo } from 'react';
import { FilterState, ImageMetaData, Layer, ActiveTool, VectorStyle, GridSettings, PrintSettings, ViewSettings } from '../types';

interface EditorCanvasProps {
  image: ImageMetaData | null;
  filters: FilterState;
  layers: Layer[];
  setLayers: React.Dispatch<React.SetStateAction<Layer[]>>;
  selectedLayerId: string | null;
  setSelectedLayerId: (id: string | null) => void;
  scale: number;
  activeTool: ActiveTool;
  currentVectorStyle: VectorStyle;
  gridSettings: GridSettings;
  printSettings: PrintSettings;
  viewSettings: ViewSettings;
}

// --- Memoized Sub-Components for Performance ---

// 1. Image Layer (Canvas-based for high-res optimization)
// Updated to use SVG Filter Chain for Pro editing
const ImageLayer = memo(({ image, filterString, svgFilterId, width, height }: { image: ImageMetaData | null, filterString: string, svgFilterId: string, width: number, height: number }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!image || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = image.src;
    img.onload = () => {
      // Optimization: Downsample huge images for display canvas to save GPU memory
      const MAX_TEXTURE_SIZE = 4096; 
      let renderWidth = image.width;
      let renderHeight = image.height;

      if (renderWidth > MAX_TEXTURE_SIZE || renderHeight > MAX_TEXTURE_SIZE) {
         const ratio = renderWidth / renderHeight;
         if (renderWidth > renderHeight) {
            renderWidth = MAX_TEXTURE_SIZE;
            renderHeight = MAX_TEXTURE_SIZE / ratio;
         } else {
            renderHeight = MAX_TEXTURE_SIZE;
            renderWidth = MAX_TEXTURE_SIZE * ratio;
         }
      }

      canvas.width = renderWidth;
      canvas.height = renderHeight;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, renderWidth, renderHeight);
    };
  }, [image?.src, image?.width, image?.height]);

  if (!image) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        // Combine standard CSS filters with the Pro SVG filter
        filter: `${filterString} url(#${svgFilterId})`,
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        pointerEvents: 'none',
        userSelect: 'none'
      }}
    />
  );
});

// 2. Vector Layer Item
const VectorLayerItem = memo(({ layer, selectedLayerId, handleLayerMouseDown }: any) => {
    if (!layer.visible) return null;

    const isSelected = selectedLayerId === layer.id;
    const style = {
      fill: layer.fillColor,
      stroke: layer.strokeColor,
      strokeWidth: layer.strokeWidth,
      opacity: layer.opacity,
      fillOpacity: layer.fillOpacity ?? 1,
      strokeOpacity: layer.strokeOpacity ?? 1,
      mixBlendMode: layer.blendMode,
      cursor: layer.locked ? 'not-allowed' : 'move',
      pointerEvents: 'auto' as const
    };

    if (layer.type === 'rect') {
      return (
        <rect 
          x={layer.x} y={layer.y} width={layer.width} height={layer.height}
          {...style}
          onMouseDown={(e) => handleLayerMouseDown(e, layer.id)}
          strokeDasharray={isSelected ? "5,5" : "none"} 
        />
      );
    } else if (layer.type === 'circle') {
       return (
         <ellipse
           cx={layer.x + layer.width/2} cy={layer.y + layer.height/2}
           rx={layer.width/2} ry={layer.height/2}
           {...style}
           onMouseDown={(e) => handleLayerMouseDown(e, layer.id)}
           strokeDasharray={isSelected ? "5,5" : "none"}
         />
       )
    } else if (layer.type === 'path') {
       const pathData = layer.points.map((p: any, i: number) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
       return (
         <path
           d={pathData}
           {...style}
           fill="none" 
           stroke={layer.strokeColor}
           onMouseDown={(e) => handleLayerMouseDown(e, layer.id)}
         />
       )
    }
    return null;
}, (prev, next) => {
    return (
        prev.selectedLayerId === next.selectedLayerId && 
        prev.layer === next.layer
    );
});

// 3. Text Layer Item
const TextLayerItem = memo(({ layer, selectedLayerId, activeTool, handleLayerMouseDown, handleFontSizeChange, handleTextChange }: any) => {
    if (!layer.visible) return null;

    return (
      <div
        style={{
          position: 'absolute',
          left: layer.x,
          top: layer.y,
          transform: `rotate(${layer.rotation}deg)`,
          fontSize: `${layer.fontSize}px`,
          color: layer.color,
          fontFamily: layer.fontFamily,
          opacity: layer.opacity,
          mixBlendMode: layer.blendMode,
          cursor: (activeTool === ActiveTool.TEXT || activeTool === ActiveTool.NONE) && !layer.locked ? 'move' : 'default',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          pointerEvents: layer.locked ? 'none' : 'auto'
        }}
        onMouseDown={(e) => handleLayerMouseDown(e, layer.id)}
        className={`p-1 ${selectedLayerId === layer.id ? 'border border-blue-500 border-dashed bg-blue-500/10' : ''}`}
      >
         {selectedLayerId === layer.id && activeTool === ActiveTool.TEXT && !layer.locked ? (
            <div className="relative group">
               <div className="absolute -top-8 left-0 bg-blue-600 text-white text-xs rounded px-2 py-1 hidden group-hover:flex gap-2 z-50">
                  <button onMouseDown={(e) => { e.stopPropagation(); handleFontSizeChange(layer.id, -2); }}>-</button>
                  <span>Size</span>
                  <button onMouseDown={(e) => { e.stopPropagation(); handleFontSizeChange(layer.id, 2); }}>+</button>
               </div>
               <input 
                value={layer.text}
                onChange={(e) => handleTextChange(layer.id, e.target.value)}
                className="bg-transparent outline-none min-w-[50px] text-center"
                style={{ color: layer.color }}
                autoFocus
               />
            </div>
          ) : (
            <span>{layer.text}</span>
          )}
      </div>
    );
});

// 4. Grid Overlay
const GridOverlay = memo(({ settings, width, height }: { settings: GridSettings, width: number, height: number }) => {
    if (!settings.enabled) return null;
    return (
       <div
         className="absolute inset-0 pointer-events-none"
         style={{
           backgroundImage: `linear-gradient(to right, ${settings.color} 1px, transparent 1px), linear-gradient(to bottom, ${settings.color} 1px, transparent 1px)`,
           backgroundSize: `${settings.spacing}px ${settings.spacing}px`,
           opacity: settings.opacity,
           zIndex: 20
         }}
       />
    );
});

// 5. Rulers
const Rulers = memo(({ show, width, widthCm, heightCm }: any) => {
    if (!show) return null;
    const pixelsPerCm = width / (widthCm || 21);
    
    // Top Ruler
    const topTicks = [];
    const cmCountX = Math.ceil(widthCm);
    for(let i=0; i<=cmCountX; i++) {
        topTicks.push(
            <div key={`t-${i}`} className="absolute top-0 h-full border-l border-gray-500 text-[8px] text-gray-400 pl-0.5" style={{ left: i * pixelsPerCm }}>
               {i}
            </div>
        );
    }

    // Left Ruler
    const leftTicks = [];
    const cmCountY = Math.ceil(heightCm);
    for(let i=0; i<=cmCountY; i++) {
        leftTicks.push(
            <div key={`l-${i}`} className="absolute left-0 w-full border-t border-gray-500 text-[8px] text-gray-400 pt-px" style={{ top: i * pixelsPerCm }}>
               {i}
            </div>
        );
    }

    return (
        <>
           <div className="absolute -top-6 left-0 w-full h-6 bg-gray-900 border-b border-gray-700 overflow-hidden select-none">
              {topTicks}
           </div>
           <div className="absolute -left-6 top-0 w-6 h-full bg-gray-900 border-r border-gray-700 overflow-hidden select-none flex flex-col">
              {leftTicks}
           </div>
           <div className="absolute -top-6 -left-6 w-6 h-6 bg-gray-800 border-r border-b border-gray-700 z-10 text-[8px] flex items-center justify-center text-gray-500">
             cm
           </div>
        </>
    );
});


const EditorCanvas: React.FC<EditorCanvasProps> = ({
  image,
  filters,
  layers,
  setLayers,
  selectedLayerId,
  setSelectedLayerId,
  scale,
  activeTool,
  currentVectorStyle,
  gridSettings,
  printSettings,
  viewSettings
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const SVG_FILTER_ID = "pro-photo-filter";
  
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    layerId: string | null;
    startX: number;
    startY: number;
    initialLayerX: number;
    initialLayerY: number;
  }>({ isDragging: false, layerId: null, startX: 0, startY: 0, initialLayerX: 0, initialLayerY: 0 });

  const [drawingState, setDrawingState] = useState<{
    isDrawing: boolean;
    startX: number;
    startY: number;
    tempId: string | null;
  }>({ isDrawing: false, startX: 0, startY: 0, tempId: null });

  const [currentPathPoints, setCurrentPathPoints] = useState<{x: number, y: number}[]>([]);

  // Memoize Filter String (Basic CSS Filters)
  const filterString = useMemo(() => {
    // Basic CSS Filters for things that are fast
    const brightness = 100 + (filters.exposure || 0) + (filters.brightness - 100);
    const contrast = filters.contrast;
    const saturation = filters.saturation;
    const grayscale = filters.grayscale;
    const blur = filters.blur;
    const sepia = filters.sepia;

    // Simulate Dehaze via Contrast+Saturation bump
    const dehazeContrast = 1 + ((filters.clarity || 0) / 200);

    let f = `
      brightness(${brightness}%) 
      contrast(${contrast * dehazeContrast}%) 
      saturate(${saturation}%) 
      grayscale(${grayscale}%) 
      blur(${blur}px)
      sepia(${sepia}%)
    `;
    
    return f;
  }, [filters]);

  // Memoize SVG Filter Primitives (Advanced processing)
  const svgFilterPrimitives = useMemo(() => {
    const primitives = [];
    
    // 1. Temperature & Tint (ColorMatrix)
    // Temp: Adjust Red/Blue. Tint: Adjust Green.
    const tempVal = (filters.temperature || 0) / 100; // -1 to 1
    const tintVal = (filters.tint || 0) / 100;

    // R channel adjusted by Temp
    const r = 1 + (tempVal > 0 ? tempVal * 0.1 : 0);
    // G channel adjusted by Tint
    const g = 1 + tintVal * 0.1;
    // B channel adjusted by Temp (Cooling)
    const b = 1 + (tempVal < 0 ? Math.abs(tempVal) * 0.1 : 0);

    primitives.push(
        <feColorMatrix 
            key="temp-tint"
            type="matrix"
            in="SourceGraphic"
            result="colorCorrected"
            values={`
                ${r} 0 0 0 0
                0 ${g} 0 0 0
                0 0 ${b} 0 0
                0 0 0 1 0
            `}
        />
    );
    
    // 2. Highlights & Shadows (ComponentTransfer)
    // Curve manipulation using table or linear slope adjustments
    if ((filters.highlights && filters.highlights !== 0) || (filters.shadows && filters.shadows !== 0)) {
         // Simple simulation: 
         // Highlights reduction -> Gamma correction on high end? 
         // Shadows boost -> Lift black point
         
         const shadowLift = (filters.shadows || 0) * 0.002; // + moves blacks up
         const highlightDim = 1 - ((filters.highlights || 0) * 0.002); // - lowers whites

         primitives.push(
             <feComponentTransfer key="light-curve" in="colorCorrected" result="lightAdjusted">
                 <feFuncR type="linear" slope={highlightDim} intercept={shadowLift} />
                 <feFuncG type="linear" slope={highlightDim} intercept={shadowLift} />
                 <feFuncB type="linear" slope={highlightDim} intercept={shadowLift} />
             </feComponentTransfer>
         );
    }

    // 3. Sharpening (ConvolveMatrix)
    if ((filters.sharpen || 0) > 0) {
        // High-pass filter kernel
        const s = (filters.sharpen || 0) / 20; // Scale down
        const center = 1 + (4 * s);
        const side = -s;
        
        primitives.push(
            <feConvolveMatrix
                key="sharpen"
                in={(filters.highlights !== 0 || filters.shadows !== 0) ? "lightAdjusted" : "colorCorrected"}
                result="sharpened"
                order="3,3"
                kernelMatrix={`
                    0 ${side} 0
                    ${side} ${center} ${side}
                    0 ${side} 0
                `}
                preserveAlpha="true"
            />
        );
    }
    
    // Determine the result coming into noise/ICC
    const preEffectResult = (filters.sharpen || 0) > 0 ? "sharpened" : 
                            ((filters.highlights || 0) !== 0 || (filters.shadows || 0) !== 0) ? "lightAdjusted" : "colorCorrected";

    // 4. Noise / Grain (Turbulence + Blend)
    let finalResult = preEffectResult;
    
    if ((filters.noise || 0) > 0) {
        const freq = 0.5 + ((filters.noise || 0) / 100); // 0.5 to 1.5
        primitives.push(
            <feTurbulence
                key="noise-gen"
                type="fractalNoise"
                baseFrequency={freq}
                numOctaves="1"
                stitchTiles="stitch"
                result="noise"
            />
        );
        primitives.push(
            <feColorMatrix
                key="noise-mono"
                type="saturate"
                values="0"
                in="noise"
                result="noiseMono"
            />
        );
        // Reduce noise opacity
        const noiseOpacity = (filters.noise || 0) / 300; // Subtle
        primitives.push(
            <feComponentTransfer key="noise-opacity" in="noiseMono" result="noiseTransparent">
                <feFuncA type="linear" slope={noiseOpacity} />
            </feComponentTransfer>
        );
        primitives.push(
            <feBlend
                key="noise-blend"
                in="noiseTransparent"
                in2={preEffectResult}
                mode="overlay"
                result="noised"
            />
        );
        finalResult = "noised";
    }

    // 5. ICC Profile Soft Proofing Simulation
    // Since we cannot use real CMM in browser efficiently, we simulate common print conditions via Matrix
    if (viewSettings.cmykPreview) {
        let matrixValues = "";
        
        // Profiles Mapping
        switch (printSettings.selectedProfileId) {
            case 'swop-coated':
                // US Web Coated SWOP v2: Slightly warm paper, standard density
                // Reduce saturation slightly, slight yellow tint for paper white
                matrixValues = `
                    0.95 0.00 0.00 0.00 0
                    0.00 0.93 0.00 0.00 0
                    0.00 0.00 0.90 0.00 0
                    0.00 0.00 0.00 1.00 0
                `;
                break;
            case 'fogra39':
                // Coated FOGRA39: Neutral, high contrast, good gamut
                // Very slight desaturation compared to sRGB
                matrixValues = `
                    0.96 0.00 0.00 0.00 0
                    0.00 0.96 0.00 0.00 0
                    0.00 0.00 0.96 0.00 0
                    0.00 0.00 0.00 1.00 0
                `;
                break;
             case 'uncoated':
                // Uncoated: Dull colors, high dot gain (darker midtones), lower contrast
                matrixValues = `
                    0.80 0.05 0.05 0.00 0
                    0.05 0.80 0.05 0.00 0
                    0.05 0.05 0.80 0.00 0
                    0.00 0.00 0.00 1.00 0
                `;
                break;
             case 'gra-col':
                // GRACoL: Similar to FOGRA but slightly different balance
                 matrixValues = `
                    0.94 0.00 0.00 0.00 0
                    0.00 0.94 0.00 0.00 0
                    0.00 0.00 0.92 0.00 0
                    0.00 0.00 0.00 1.00 0
                `;
                break;
            default:
                // Generic Custom Profile simulation (safe fallback)
                 matrixValues = `
                    0.90 0.00 0.00 0.00 0
                    0.00 0.90 0.00 0.00 0
                    0.00 0.00 0.90 0.00 0
                    0.00 0.00 0.00 1.00 0
                `;
        }

        // Adjust based on Rendering Intent
        // Absolute Colorimetric -> Simulate paper white (reduce brightness)
        if (printSettings.renderingIntent === 'absolute-colorimetric') {
            // No opacity change, but maybe darken
             // Handled by matrix values mostly, but could add intercept
        }

        primitives.push(
            <feColorMatrix
                key="icc-simulation"
                in={finalResult}
                type="matrix"
                values={matrixValues}
                result="iccProofed"
            />
        );
        finalResult = "iccProofed";
    }

    // 6. Vignette (last step)
    if ((filters.vignette || 0) > 0) {
       // We can't easily do a radial gradient filter in SVG 1.1 strictly on the image content without a mask.
       // However, we can use lighting to simulate it or a pre-defined mask.
       // For simplicity in this structure, we might skip complex vignette in SVG filter and assume CSS overlay,
       // but let's try a spot light effect (diffuse lighting) which is computationally expensive but works.
       // Alternatively, pass 'finalResult' out.
       // Let's implement Vignette as a separate CSS overlay in the parent component for performance.
    }

    return primitives;
  }, [filters, viewSettings.cmykPreview, printSettings.selectedProfileId, printSettings.renderingIntent]);


  const width = image ? image.width : 800;
  const height = image ? image.height : 600;

  const getMousePos = (e: React.MouseEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const contentRect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - contentRect.left) / scale;
    const y = (e.clientY - contentRect.top) / scale;
    return { x, y };
  };

  // --- MOUSE HANDLERS ---

  const handleMouseDown = (e: React.MouseEvent) => {
    const { x, y } = getMousePos(e);

    // 1. Tool Logic: Create Shape
    if (activeTool === ActiveTool.VECTOR_RECT || activeTool === ActiveTool.VECTOR_CIRCLE) {
      e.stopPropagation();
      const id = Date.now().toString();
      const type = activeTool === ActiveTool.VECTOR_RECT ? 'rect' : 'circle';
      const count = layers.filter(l => l.type === type).length + 1;
      
      const newLayer: Layer = {
        id,
        name: `${type === 'rect' ? 'Rectangle' : 'Circle'} ${count}`,
        type: type as any,
        x,
        y,
        rotation: 0,
        width: 1, // Start small
        height: 1,
        visible: true,
        locked: false,
        blendMode: 'normal',
        ...currentVectorStyle
      };
      
      setLayers([...layers, newLayer]);
      setDrawingState({ isDrawing: true, startX: x, startY: y, tempId: id });
      setSelectedLayerId(id);
      return;
    }

    if (activeTool === ActiveTool.VECTOR_PEN) {
       e.stopPropagation();
       return;
    }

    // Deselect if clicking empty space
    if (e.target === e.currentTarget) {
       setSelectedLayerId(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const { x, y } = getMousePos(e);

    // Drawing new shape
    if (drawingState.isDrawing && drawingState.tempId) {
      // Optimization: For drawing, state updates are frequent. 
      // React's batching usually handles this well, but we rely on memoized child components to avoid full tree checks.
      setLayers(prev => prev.map(l => {
        if (l.id === drawingState.tempId) {
          const width = x - drawingState.startX;
          const height = y - drawingState.startY;
          const newX = width < 0 ? x : drawingState.startX;
          const newY = height < 0 ? y : drawingState.startY;

          return {
            ...l,
            x: newX,
            y: newY,
            width: Math.abs(width),
            height: Math.abs(height)
          } as Layer;
        }
        return l;
      }));
      return;
    }

    // Moving existing layer
    if (dragState.isDragging && dragState.layerId) {
      const dx = x - dragState.startX;
      const dy = y - dragState.startY;

      setLayers(prev => prev.map(l => {
        if (l.id === dragState.layerId && !l.locked) { // Check lock state
          return {
            ...l,
            x: dragState.initialLayerX + dx,
            y: dragState.initialLayerY + dy
          };
        }
        return l;
      }));
    }
  };

  const handleMouseUp = () => {
    if (drawingState.isDrawing) {
      setDrawingState({ isDrawing: false, startX: 0, startY: 0, tempId: null });
    }
    setDragState({ isDragging: false, layerId: null, startX: 0, startY: 0, initialLayerX: 0, initialLayerY: 0 });
  };

  const handleLayerMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    
    // Check if layer is locked or hidden
    const layer = layers.find(l => l.id === id);
    if (!layer || layer.locked || !layer.visible) return;

    if (activeTool !== ActiveTool.NONE && activeTool !== ActiveTool.TEXT) return; 

    const { x, y } = getMousePos(e);
    
    setSelectedLayerId(id);
    setDragState({
      isDragging: true,
      layerId: id,
      startX: x,
      startY: y,
      initialLayerX: layer.x,
      initialLayerY: layer.y
    });
  };

  const handlePenClick = (e: React.MouseEvent) => {
    if (activeTool !== ActiveTool.VECTOR_PEN) return;
    const { x, y } = getMousePos(e);
    
    const newPoints = [...currentPathPoints, { x, y }];
    setCurrentPathPoints(newPoints);

    // Update or Create Path Layer
    if (selectedLayerId && layers.find(l => l.id === selectedLayerId)?.type === 'path') {
       setLayers(prev => prev.map(l => {
         if (l.id === selectedLayerId && !l.locked) {
           return { ...l, points: newPoints } as any;
         }
         return l;
       }));
    } else {
       const id = Date.now().toString();
       const count = layers.filter(l => l.type === 'path').length + 1;
       const newLayer: Layer = {
         id,
         name: `Path ${count}`,
         type: 'path',
         x: 0, y: 0,
         rotation: 0,
         points: newPoints,
         visible: true,
         locked: false,
         blendMode: 'normal',
         ...currentVectorStyle,
         fillColor: 'transparent'
       };
       setLayers([...layers, newLayer]);
       setSelectedLayerId(id);
    }
  };
  
  const handleDoubleClick = (e: React.MouseEvent) => {
     if (activeTool === ActiveTool.VECTOR_PEN) {
       setCurrentPathPoints([]);
       setSelectedLayerId(null); 
     }
  };

  const handleTextChange = (id: string, newText: string) => {
    setLayers(prev => prev.map(layer => 
      layer.id === id ? { ...layer, text: newText } : layer
    ));
  };
   const handleFontSizeChange = (id: string, delta: number) => {
     setLayers(prev => prev.map(layer => 
      layer.id === id ? { ...layer, fontSize: Math.max(12, (layer as any).fontSize + delta) } : layer
    ));
  }

  return (
    <div 
      className="flex-1 bg-[#0a0a0a] overflow-hidden relative flex items-center justify-center"
      ref={containerRef}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
        {/* Dynamic SVG Filter Definition */}
        <svg style={{ position: 'absolute', width: 0, height: 0 }}>
            <filter id={SVG_FILTER_ID} x="-20%" y="-20%" width="140%" height="140%">
                {svgFilterPrimitives}
            </filter>
        </svg>

      <div 
        style={{ 
          width: width,
          height: height,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          transition: 'transform 0.05s linear', 
          position: 'relative',
          backgroundColor: image ? 'transparent' : '#1e293b'
        }}
        className="shadow-2xl bg-checkered will-change-transform" 
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onClick={handlePenClick}
        onDoubleClick={handleDoubleClick}
      >
        {/* Rulers Overlay */}
        <Rulers 
          show={viewSettings.showRulers} 
          width={width} 
          widthCm={printSettings.widthCm} 
          heightCm={printSettings.heightCm} 
        />

        {/* Raster Image Layer (Memoized & Canvas-based with SVG Filters) */}
        <ImageLayer 
            image={image} 
            filterString={filterString} 
            svgFilterId={SVG_FILTER_ID}
            width={width}
            height={height}
        />
        
        {/* Vignette Overlay (Implemented as CSS for performance/simplicity) */}
        {filters.vignette && filters.vignette > 0 && (
            <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: `radial-gradient(circle, transparent ${100 - (filters.vignette * 0.8)}%, rgba(0,0,0,${(filters.vignette / 100)}) 100%)`,
                    zIndex: 10
                }}
            />
        )}

        {/* Vector SVG Layer */}
        <svg 
           className="absolute inset-0 w-full h-full pointer-events-none"
           viewBox={`0 0 ${width} ${height}`}
           xmlns="http://www.w3.org/2000/svg"
        >
          {layers.filter(l => l.type !== 'text').map((layer) => (
             <VectorLayerItem 
               key={layer.id} 
               layer={layer} 
               selectedLayerId={selectedLayerId} 
               handleLayerMouseDown={handleLayerMouseDown} 
             />
          ))}
        </svg>

        {/* HTML Overlay for Text */}
        {layers.filter(l => l.type === 'text').map(layer => (
             <TextLayerItem
               key={layer.id}
               layer={layer}
               selectedLayerId={selectedLayerId}
               activeTool={activeTool}
               handleLayerMouseDown={handleLayerMouseDown}
               handleFontSizeChange={handleFontSizeChange}
               handleTextChange={handleTextChange}
             />
        ))}

        {/* Selection Box Highlight (for Vectors) */}
        {selectedLayerId && layers.find(l => l.id === selectedLayerId && l.type !== 'text') && (
           <div 
             className="absolute pointer-events-none border-2 border-blue-400 opacity-50"
             style={{
               left: layers.find(l => l.id === selectedLayerId)!.x,
               top: layers.find(l => l.id === selectedLayerId)!.y,
               width: (layers.find(l => l.id === selectedLayerId) as any).width,
               height: (layers.find(l => l.id === selectedLayerId) as any).height,
               display: layers.find(l => l.id === selectedLayerId)!.type === 'path' || !layers.find(l => l.id === selectedLayerId)!.visible ? 'none' : 'block'
             }}
           />
        )}
        
        {/* Grid Overlay */}
        <GridOverlay settings={gridSettings} width={width} height={height} />
      </div>
    </div>
  );
};

export default EditorCanvas;