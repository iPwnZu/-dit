import React, { useState } from 'react';
import { Upload, Download, ZoomIn, ZoomOut, Sliders, Type, Printer, Sparkles, Square, Circle, PenTool, MousePointer2, X, Grid, Layers, Wand2, Film, Ruler, Eye, Loader2 } from 'lucide-react';
import ToolsPanel from './components/ToolsPanel';
import LayersPanel from './components/LayersPanel';
import EditorCanvas from './components/EditorCanvas';
import { FilterState, PrintSettings, ImageMetaData, Layer, ActiveTool, VectorStyle, GridSettings, ViewSettings, IccProfile } from './types';
import { analyzeImageForPrint, upscaleImage } from './services/geminiService';

const App: React.FC = () => {
  // State
  const [image, setImage] = useState<ImageMetaData | null>(null);
  const [scale, setScale] = useState(1);
  const [activeTool, setActiveTool] = useState<ActiveTool>(ActiveTool.NONE);
  
  const [filters, setFilters] = useState<FilterState>({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    grayscale: 0,
    blur: 0,
    sepia: 0,
    // Pro defaults
    exposure: 0,
    highlights: 0,
    shadows: 0,
    temperature: 0,
    tint: 0,
    vibrance: 0,
    sharpen: 0,
    clarity: 0,
    noise: 0,
    vignette: 0
  });

  // Default ICC Profiles
  const [iccProfiles, setIccProfiles] = useState<IccProfile[]>([
    { id: 'swop-coated', name: 'U.S. Web Coated (SWOP) v2', type: 'cmyk', isBuiltIn: true },
    { id: 'fogra39', name: 'Coated FOGRA39 (ISO 12647-2:2004)', type: 'cmyk', isBuiltIn: true },
    { id: 'gra-col', name: 'GRACoL 2006 Coated1v2', type: 'cmyk', isBuiltIn: true },
    { id: 'uncoated', name: 'Uncoated FOGRA29', type: 'cmyk', isBuiltIn: true },
  ]);

  const [printSettings, setPrintSettings] = useState<PrintSettings>({
    dpi: 300,
    widthCm: 21.0, // A4 default
    heightCm: 29.7,
    paperType: 'glossy',
    bleedMm: 3,
    selectedProfileId: 'swop-coated',
    renderingIntent: 'relative-colorimetric'
  });

  const [gridSettings, setGridSettings] = useState<GridSettings>({
    enabled: false,
    spacing: 50,
    color: '#ffffff',
    opacity: 0.2
  });

  const [viewSettings, setViewSettings] = useState<ViewSettings>({
    showRulers: true,
    cmykPreview: false
  });

  // Unified Layer State
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

  // Default styles for new vectors
  const [currentVectorStyle, setCurrentVectorStyle] = useState<VectorStyle>({
    fillColor: 'transparent',
    strokeColor: '#ef4444',
    strokeWidth: 4,
    opacity: 1,
    strokeOpacity: 1
  });
  
  // AI State
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);

  // Upscale State
  const [showUpscalePrompt, setShowUpscalePrompt] = useState(false);
  const [pendingImage, setPendingImage] = useState<ImageMetaData | null>(null);
  const [isUpscaling, setIsUpscaling] = useState(false);

  // --- Handlers ---

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const metaData = {
            name: file.name,
            width: img.width,
            height: img.height,
            src: event.target?.result as string,
            originalSize: file.size
          };

          // Check if image is low resolution (e.g., width or height < 1200)
          if (img.width < 1200 || img.height < 1200) {
            setPendingImage(metaData);
            setShowUpscalePrompt(true);
          } else {
            setImage(metaData);
            // Reset state for new image
            setFilters({ 
              brightness: 100, contrast: 100, saturation: 100, grayscale: 0, blur: 0, sepia: 0,
              exposure: 0, highlights: 0, shadows: 0, temperature: 0, tint: 0, vibrance: 0, sharpen: 0, clarity: 0, noise: 0, vignette: 0
            });
            setLayers([]);
            setAiAnalysis(null);
            setScale(0.8);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const updateImageSource = (newSrc: string) => {
    if (image) {
      const img = new Image();
      img.onload = () => {
        setImage({
          ...image,
          src: newSrc,
          width: img.width,
          height: img.height
        });
      };
      img.src = newSrc;
    }
  };

  const handleUpscaleConfirm = async () => {
    if (!pendingImage) return;
    setIsUpscaling(true);
    try {
        const upscaledSrc = await upscaleImage(pendingImage.src);
        
        // Load the new upscaled image to get dimensions
        const img = new Image();
        img.onload = () => {
            setImage({
                ...pendingImage,
                src: upscaledSrc,
                width: img.width,
                height: img.height
            });
            
            // Reset state
            setFilters({ 
              brightness: 100, contrast: 100, saturation: 100, grayscale: 0, blur: 0, sepia: 0,
              exposure: 0, highlights: 0, shadows: 0, temperature: 0, tint: 0, vibrance: 0, sharpen: 0, clarity: 0, noise: 0, vignette: 0
            });
            setLayers([]);
            setAiAnalysis(null);
            setScale(0.8);

            setIsUpscaling(false);
            setShowUpscalePrompt(false);
            setPendingImage(null);
        };
        img.src = upscaledSrc;

    } catch (e) {
        alert("Upscaling failed. Loading original image.");
        setImage(pendingImage);
        
        // Reset state
        setFilters({ 
            brightness: 100, contrast: 100, saturation: 100, grayscale: 0, blur: 0, sepia: 0,
            exposure: 0, highlights: 0, shadows: 0, temperature: 0, tint: 0, vibrance: 0, sharpen: 0, clarity: 0, noise: 0, vignette: 0
        });
        setLayers([]);
        setAiAnalysis(null);
        setScale(0.8);
        
        setIsUpscaling(false);
        setShowUpscalePrompt(false);
        setPendingImage(null);
    }
  }

  const handleUpscaleDecline = () => {
    if (pendingImage) {
        setImage(pendingImage);
        
        // Reset state
        setFilters({ 
            brightness: 100, contrast: 100, saturation: 100, grayscale: 0, blur: 0, sepia: 0,
            exposure: 0, highlights: 0, shadows: 0, temperature: 0, tint: 0, vibrance: 0, sharpen: 0, clarity: 0, noise: 0, vignette: 0
        });
        setLayers([]);
        setAiAnalysis(null);
        setScale(0.8);
    }
    setShowUpscalePrompt(false);
    setPendingImage(null);
  }

  // --- ICC Profile Handling ---
  const handleProfileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        
        // Basic Basic parsing to find ASCII desc tag
        // Note: Real ICC parsing is complex. We try to find 'desc' tag or just use filename.
        let name = file.name.replace(/\.(icc|icm)$/i, '');
        
        try {
            const dataView = new DataView(arrayBuffer);
            // Very naive scan for ASCII descriptions if proper parser not available
            // In a real app we'd use 'lcms-wasm' or similar
        } catch (e) {
            console.warn("Could not parse ICC header, using filename");
        }

        const newProfile: IccProfile = {
            id: Date.now().toString(),
            name: name,
            type: 'cmyk', // Assume CMYK for uploaded print profiles usually
            data: arrayBuffer,
            isBuiltIn: false
        };

        setIccProfiles(prev => [...prev, newProfile]);
        setPrintSettings(prev => ({ ...prev, selectedProfileId: newProfile.id }));
    };
    reader.readAsArrayBuffer(file);
  };

  const handleAddText = () => {
    const newLayer: Layer = {
      id: Date.now().toString(),
      name: `Text Layer ${layers.filter(l => l.type === 'text').length + 1}`,
      type: 'text',
      text: 'Double click to edit',
      x: image ? image.width / 2 - 100 : window.innerWidth / 2 - 100,
      y: image ? image.height / 2 : window.innerHeight / 2,
      fontSize: 32,
      color: '#ffffff',
      fontFamily: 'Inter',
      rotation: 0,
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal'
    };
    setLayers([...layers, newLayer]);
    setSelectedLayerId(newLayer.id);
    setActiveTool(ActiveTool.TEXT);
  };

  const handleAiAnalysis = async () => {
    if (!image) return;
    setIsAiLoading(true);
    setAiAnalysis(null);
    try {
      const result = await analyzeImageForPrint(image.src, printSettings.widthCm, printSettings.heightCm, printSettings.dpi);
      // Clean JSON string if markdown is present
      const jsonString = result.replace(/```json|```/g, '').trim();
      setAiAnalysis(JSON.parse(jsonString));
    } catch (error) {
      console.error("AI Error", error);
      alert("Failed to analyze image. Please check API Key configuration.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const toggleTool = (tool: ActiveTool) => {
    setActiveTool(current => current === tool ? ActiveTool.NONE : tool);
    // Note: We don't clear selected layer here anymore to allow layer properties editing
  };

  const handleExport = async () => {
    if (!image) return;
    
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      alert("No canvas found. Please ensure an image is loaded.");
      return;
    }

    try {
      // Create a link and download canvas as PNG
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `printmaster-export-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export image. Please try again.");
    }
  };

  const updateLayer = (updates: any) => {
    if (selectedLayerId) {
      setLayers(prev => prev.map(l => {
        if (l.id === selectedLayerId) {
          return { ...l, ...updates };
        }
        return l;
      }));
    } else {
      // Update defaults for vector tools if applicable
      if ('fillColor' in updates || 'strokeColor' in updates || 'strokeWidth' in updates || 'opacity' in updates || 'strokeOpacity' in updates) {
         setCurrentVectorStyle(prev => ({ ...prev, ...updates }));
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100 overflow-hidden font-inter relative">
      
      {/* Upscale Modal */}
      {showUpscalePrompt && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-blue-600/20 text-blue-400 rounded-full flex items-center justify-center mb-2">
                <Sparkles size={32} />
              </div>
              <h2 className="text-xl font-bold text-white">Low Resolution Detected</h2>
              <p className="text-gray-400 text-sm">
                The uploaded image is smaller than recommended for high-quality printing. 
                Would you like to use AI to upscale it to 4K resolution?
              </p>
              
              {isUpscaling ? (
                  <div className="flex flex-col items-center justify-center py-4 space-y-3">
                     <Loader2 size={32} className="animate-spin text-blue-500" />
                     <span className="text-xs text-gray-500 animate-pulse">Enhancing image details... (this may take a moment)</span>
                  </div>
              ) : (
                  <div className="flex gap-3 w-full pt-2">
                    <button 
                      onClick={handleUpscaleDecline}
                      className="flex-1 py-2.5 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition"
                    >
                      Keep Original
                    </button>
                    <button 
                      onClick={handleUpscaleConfirm}
                      className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition shadow-lg shadow-blue-900/20"
                    >
                      Upscale (AI)
                    </button>
                  </div>
              )}
              
               <div className="text-[10px] text-gray-500 mt-2">
                   Note: Upscaling requires a paid API key selection.
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Header / Toolbar */}
      <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 z-50 shrink-0 shadow-md">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 select-none">
             <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/50">
                <Printer size={18} className="text-white" />
             </div>
             <div>
                <h1 className="font-bold text-sm leading-tight tracking-tight text-white">PrintMaster <span className="text-blue-500">Pro</span></h1>
             </div>
          </div>
          <div className="h-6 w-px bg-gray-700 mx-2 hidden md:block"></div>
          
          {/* File Upload */}
          <label className="cursor-pointer hover:bg-gray-800 px-3 py-1.5 rounded transition flex items-center gap-2 text-xs font-medium text-gray-300 hover:text-white">
            <Upload size={14} />
            <span className="hidden sm:inline">Open File</span>
            <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>

        {/* Center Tools */}
        <div className="flex items-center gap-0.5 bg-gray-800/50 p-1 rounded-lg border border-gray-700">
          <button 
            onClick={() => toggleTool(ActiveTool.ADJUST)}
            className={`p-2 rounded transition relative group ${activeTool === ActiveTool.ADJUST ? 'bg-gray-700 text-blue-400' : 'hover:bg-gray-700 text-gray-400'}`}
          >
            <Sliders size={18} />
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50">Pro Adjust</span>
          </button>
          
          <div className="w-px h-5 bg-gray-700 mx-1"></div>

          <button 
             onClick={() => toggleTool(ActiveTool.VECTOR_RECT)}
             className={`p-2 rounded transition relative group ${activeTool === ActiveTool.VECTOR_RECT ? 'bg-gray-700 text-blue-400' : 'hover:bg-gray-700 text-gray-400'}`}
          >
            <Square size={18} />
             <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50">Rectangle</span>
          </button>
           <button 
             onClick={() => toggleTool(ActiveTool.VECTOR_CIRCLE)}
             className={`p-2 rounded transition relative group ${activeTool === ActiveTool.VECTOR_CIRCLE ? 'bg-gray-700 text-blue-400' : 'hover:bg-gray-700 text-gray-400'}`}
          >
            <Circle size={18} />
             <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50">Circle</span>
          </button>
          <button 
             onClick={() => toggleTool(ActiveTool.VECTOR_PEN)}
             className={`p-2 rounded transition relative group ${activeTool === ActiveTool.VECTOR_PEN ? 'bg-gray-700 text-blue-400' : 'hover:bg-gray-700 text-gray-400'}`}
          >
            <PenTool size={18} />
             <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50">Pen Tool</span>
          </button>
           <button 
             onClick={() => toggleTool(ActiveTool.TEXT)}
             className={`p-2 rounded transition relative group ${activeTool === ActiveTool.TEXT ? 'bg-gray-700 text-blue-400' : 'hover:bg-gray-700 text-gray-400'}`}
          >
            <Type size={18} />
             <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50">Text</span>
          </button>

          <div className="w-px h-5 bg-gray-700 mx-1"></div>
          
           <button 
             onClick={() => toggleTool(ActiveTool.AI_EDIT)}
             className={`p-2 rounded transition relative group ${activeTool === ActiveTool.AI_EDIT ? 'bg-blue-900/50 text-blue-400' : 'hover:bg-gray-700 text-blue-400'}`}
          >
            <Wand2 size={18} />
             <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50">AI Edit</span>
          </button>
          
           <button 
             onClick={() => toggleTool(ActiveTool.VEO)}
             className={`p-2 rounded transition relative group ${activeTool === ActiveTool.VEO ? 'bg-pink-900/50 text-pink-400' : 'hover:bg-gray-700 text-pink-400'}`}
          >
            <Film size={18} />
             <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50">Veo Video</span>
          </button>

          <div className="w-px h-5 bg-gray-700 mx-1"></div>

          <button 
             onClick={() => toggleTool(ActiveTool.GRID)}
             className={`p-2 rounded transition relative group ${activeTool === ActiveTool.GRID ? 'bg-gray-700 text-blue-400' : 'hover:bg-gray-700 text-gray-400'}`}
          >
            <Grid size={18} />
             <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50">Grid</span>
          </button>

          <button 
             onClick={() => toggleTool(ActiveTool.PRINT)}
             className={`p-2 rounded transition relative group ${activeTool === ActiveTool.PRINT ? 'bg-gray-700 text-blue-400' : 'hover:bg-gray-700 text-gray-400'}`}
          >
            <Printer size={18} />
             <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50">Print Setup</span>
          </button>
           <button 
             onClick={() => toggleTool(ActiveTool.AI)}
             className={`p-2 rounded transition relative group ${activeTool === ActiveTool.AI ? 'bg-purple-900/50 text-purple-400' : 'hover:bg-gray-700 text-purple-400'}`}
          >
            <Sparkles size={18} />
             <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50">AI Assistant</span>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
           {/* View Toggles */}
           <div className="flex items-center bg-gray-800 rounded-lg overflow-hidden border border-gray-700 mr-2">
             <button 
               onClick={() => setViewSettings(p => ({...p, showRulers: !p.showRulers}))}
               className={`p-1.5 hover:bg-gray-700 ${viewSettings.showRulers ? 'text-blue-400' : 'text-gray-400'}`}
               title="Toggle Rulers"
             >
               <Ruler size={14} />
             </button>
             <button 
               onClick={() => setViewSettings(p => ({...p, cmykPreview: !p.cmykPreview}))}
               className={`p-1.5 hover:bg-gray-700 ${viewSettings.cmykPreview ? 'text-cyan-400' : 'text-gray-400'}`}
               title="Soft Proofing (ICC)"
             >
               <Eye size={14} />
             </button>
           </div>

           <div className="flex items-center bg-gray-800 rounded-lg overflow-hidden hidden sm:flex border border-gray-700">
             <button onClick={() => setScale(s => Math.max(0.1, s - 0.1))} className="p-1.5 hover:bg-gray-700 text-gray-400 hover:text-white"><ZoomOut size={14} /></button>
             <span className="px-2 text-[10px] w-10 text-center text-gray-300 font-mono">{Math.round(scale * 100)}%</span>
             <button onClick={() => setScale(s => Math.min(3, s + 0.1))} className="p-1.5 hover:bg-gray-700 text-gray-400 hover:text-white"><ZoomIn size={14} /></button>
           </div>
           
           <button 
             onClick={handleExport}
             className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-2 transition shadow-lg shadow-blue-900/20"
             disabled={!image}
           >
             <Download size={14} /> <span className="hidden md:inline">Export PNG</span>
           </button>
        </div>
      </header>

      {/* Main Content Area - Docked Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Canvas Area */}
        <div className="flex-1 relative bg-[#0a0a0a] overflow-hidden flex items-center justify-center p-8">
           <EditorCanvas 
            image={image}
            filters={filters}
            layers={layers}
            setLayers={setLayers}
            selectedLayerId={selectedLayerId}
            setSelectedLayerId={setSelectedLayerId}
            scale={scale}
            activeTool={activeTool}
            currentVectorStyle={currentVectorStyle}
            gridSettings={gridSettings}
            printSettings={printSettings}
            viewSettings={viewSettings}
          />
        </div>

        {/* Right Sidebar - Fixed Dock */}
        <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col shadow-2xl z-20">
          
          {/* Top Half: Tool Properties */}
          <ToolsPanel 
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            filters={filters}
            setFilters={setFilters}
            printSettings={printSettings}
            setPrintSettings={setPrintSettings}
            addTextLayer={handleAddText}
            isAiLoading={isAiLoading}
            aiAnalysis={aiAnalysis}
            onAnalyze={handleAiAnalysis}
            currentVectorStyle={currentVectorStyle}
            updateLayer={updateLayer}
            selectedLayer={layers.find(l => l.id === selectedLayerId)}
            gridSettings={gridSettings}
            setGridSettings={setGridSettings}
            viewSettings={viewSettings}
            setViewSettings={setViewSettings}
            currentImageSrc={image?.src}
            onImageUpdate={updateImageSource}
            iccProfiles={iccProfiles}
            onProfileUpload={handleProfileUpload}
          />

          {/* Bottom Half: Layers Panel */}
          <LayersPanel 
            layers={layers}
            setLayers={setLayers}
            selectedLayerId={selectedLayerId}
            setSelectedLayerId={setSelectedLayerId}
          />
        </div>

      </div>

       {/* Mobile Zoom Controls (Floating) */}
       <div className="sm:hidden fixed bottom-4 left-4 right-4 bg-gray-800/90 backdrop-blur p-2 rounded-lg flex justify-between items-center z-30 shadow-lg border border-gray-700">
           <button onClick={() => setScale(s => Math.max(0.1, s - 0.1))} className="p-2 hover:bg-gray-700"><ZoomOut size={20} /></button>
           <span className="text-sm font-mono text-gray-300">{Math.round(scale * 100)}%</span>
           <button onClick={() => setScale(s => Math.min(3, s + 0.1))} className="p-2 hover:bg-gray-700"><ZoomIn size={20} /></button>
       </div>
    </div>
  );
};

export default App;