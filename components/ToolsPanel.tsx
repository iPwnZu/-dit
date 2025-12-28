import React, { useState, useRef, useEffect } from 'react';
import { FilterState, PrintSettings, Layer, ActiveTool, VectorStyle, GridSettings, ViewSettings, CMYK, IccProfile } from '../types';
import { Sliders, Type, Printer, Sparkles, X, Plus, Palette, Circle, Square, PenTool, Grid, AlertCircle, Wand2, Film, Loader2, BarChart3, Upload, Eye, ChevronDown, ChevronRight, Copy, Check, MousePointer2, Sun, Moon, Droplet, Zap, Gauge, FileText } from 'lucide-react';
import { editImageWithGemini, generateVeoVideo } from '../services/geminiService';
import { hexToRgb, rgbToCmyk, cmykToRgb, rgbToHex } from '../utils/colorUtils';

interface ToolsPanelProps {
  activeTool: ActiveTool;
  setActiveTool: (t: ActiveTool) => void;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  printSettings: PrintSettings;
  setPrintSettings: React.Dispatch<React.SetStateAction<PrintSettings>>;
  addTextLayer: () => void;
  isAiLoading: boolean;
  aiAnalysis: any;
  onAnalyze: () => void;
  currentVectorStyle: VectorStyle;
  updateLayer: (updates: any) => void;
  selectedLayer: Layer | undefined;
  gridSettings: GridSettings;
  setGridSettings: React.Dispatch<React.SetStateAction<GridSettings>>;
  viewSettings: ViewSettings;
  setViewSettings: React.Dispatch<React.SetStateAction<ViewSettings>>;
  currentImageSrc: string | undefined;
  onImageUpdate: (newSrc: string) => void;
  iccProfiles?: IccProfile[];
  onProfileUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const HistogramCanvas: React.FC<{ imageSrc: string | undefined, filters: FilterState }> = ({ imageSrc, filters }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!imageSrc || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageSrc;
    img.onload = () => {
      // Draw image to canvas to get pixel data
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      const r = new Array(256).fill(0);
      const g = new Array(256).fill(0);
      const b = new Array(256).fill(0);

      // Analyze pixels (with skip for performance)
      for (let i = 0; i < data.length; i += 4 * 4) {
         r[data[i]]++;
         g[data[i+1]]++;
         b[data[i+2]]++;
      }

      // Clear for drawing graph
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#0f172a'; // Match bg
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const max = Math.max(...r, ...g, ...b);
      
      // Draw Histogram
      ctx.globalCompositeOperation = 'screen';
      
      const drawChannel = (arr: number[], color: string) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height);
        for(let i=0; i<256; i++) {
           const percent = arr[i] / max;
           const h = percent * canvas.height;
           ctx.lineTo(i * (canvas.width/256), canvas.height - h);
        }
        ctx.lineTo(canvas.width, canvas.height);
        ctx.fill();
      };

      drawChannel(r, 'rgba(239, 68, 68, 0.5)'); // Red
      drawChannel(g, 'rgba(34, 197, 94, 0.5)'); // Green
      drawChannel(b, 'rgba(59, 130, 246, 0.5)'); // Blue
    };

  }, [imageSrc, filters]);

  return <canvas ref={canvasRef} width={256} height={100} className="w-full h-24 bg-gray-900 rounded border border-gray-700 mb-4" />;
};

// ... CMYKPicker and other helpers remain the same ...
const CMYKPicker: React.FC<{ 
    label: string, 
    hexColor: string, 
    cmykValue: CMYK | undefined, 
    onChange: (hex: string, cmyk: CMYK) => void 
}> = ({ label, hexColor, cmykValue, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [localHex, setLocalHex] = useState(hexColor);

    useEffect(() => {
        setLocalHex(hexColor);
    }, [hexColor]);

    const currentCMYK = cmykValue || (() => {
        const rgb = hexToRgb(hexColor);
        return rgbToCmyk(rgb.r, rgb.g, rgb.b);
    })();

    const handleColorInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newHex = e.target.value;
        setLocalHex(newHex);
        const rgb = hexToRgb(newHex);
        const newCMYK = rgbToCmyk(rgb.r, rgb.g, rgb.b);
        onChange(newHex, newCMYK);
    };

    const handleTextInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        let val = e.target.value;
        if (!val.startsWith('#')) val = '#' + val;
        if (/^#[0-9A-F]{6}$/i.test(val)) {
            const rgb = hexToRgb(val);
            const newCMYK = rgbToCmyk(rgb.r, rgb.g, rgb.b);
            onChange(val, newCMYK);
        } else {
            setLocalHex(hexColor); 
        }
    };

    const handleCMYKChange = (key: keyof CMYK, val: number) => {
        const newCMYK = { ...currentCMYK, [key]: val };
        const rgb = cmykToRgb(newCMYK.c, newCMYK.m, newCMYK.y, newCMYK.k);
        const newHex = rgbToHex(rgb.r, rgb.g, rgb.b);
        setLocalHex(newHex);
        onChange(newHex, newCMYK);
    };

    const handleCopy = () => {
        const text = `C=${currentCMYK.c} M=${currentCMYK.m} Y=${currentCMYK.y} K=${currentCMYK.k}`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <label className="text-xs text-gray-400">{label}</label>
                <button onClick={() => setIsOpen(!isOpen)} className="text-gray-500 hover:text-gray-300">
                    {isOpen ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                </button>
            </div>
            
            <div className="flex gap-2 items-center">
                 <div className="relative w-8 h-8">
                    <input 
                        type="color" 
                        value={hexColor === 'transparent' ? '#ffffff' : hexColor} 
                        onChange={handleColorInput}
                        className="w-8 h-8 bg-gray-700 rounded cursor-pointer border-0 p-0 absolute inset-0 opacity-0 z-10"
                    />
                    <div 
                        className="w-8 h-8 rounded border border-gray-600 shadow-sm"
                        style={{ backgroundColor: hexColor === 'transparent' ? 'transparent' : hexColor, backgroundImage: hexColor === 'transparent' ? 'linear-gradient(45deg, #333 25%, transparent 25%), linear-gradient(-45deg, #333 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #333 75%), linear-gradient(-45deg, transparent 75%, #333 75%)' : 'none', backgroundSize: '8px 8px' }}
                    />
                 </div>
                 
                 <input 
                    type="text" 
                    value={localHex}
                    onChange={(e) => setLocalHex(e.target.value)}
                    onBlur={handleTextInputBlur}
                    className="flex-1 text-xs font-mono text-gray-400 bg-gray-800 border border-gray-700 px-2 py-1.5 rounded outline-none focus:border-blue-500"
                  />
                  
                   <button 
                    onClick={() => onChange('transparent', {c:0,m:0,y:0,k:0})} 
                    className={`text-xs px-2 h-8 rounded border ${hexColor === 'transparent' ? 'bg-red-900/50 border-red-700 text-white' : 'border-gray-600 text-gray-400'}`}
                    title="No Fill"
                  >
                    <X size={14}/>
                  </button>
            </div>

            {isOpen && hexColor !== 'transparent' && (
                <div className="bg-gray-800/50 p-2 rounded space-y-3 text-[10px]">
                    <div className="flex items-center justify-between border-b border-gray-700 pb-2">
                        <div className="flex items-center gap-2">
                             <div 
                                className="w-4 h-4 rounded-sm shadow-sm border border-gray-600"
                                style={{ backgroundColor: hexColor }}
                             />
                             <span className="font-mono text-gray-400">
                                {`c${currentCMYK.c} m${currentCMYK.m} y${currentCMYK.y} k${currentCMYK.k}`}
                             </span>
                        </div>
                        <button 
                            onClick={handleCopy}
                            className="text-gray-500 hover:text-white transition-colors"
                            title="Copy Values"
                        >
                            {copied ? <Check size={12} className="text-green-500"/> : <Copy size={12}/>}
                        </button>
                    </div>

                    {['c', 'm', 'y', 'k'].map((channel) => (
                        <div key={channel} className="flex items-center gap-2">
                            <span className="uppercase w-3 font-bold text-gray-500">{channel}</span>
                            <input 
                                type="range" 
                                min="0" max="100" 
                                value={currentCMYK[channel as keyof CMYK]} 
                                onChange={(e) => handleCMYKChange(channel as keyof CMYK, Number(e.target.value))}
                                className={`flex-1 h-1 rounded-lg appearance-none cursor-pointer ${
                                    channel === 'c' ? 'accent-cyan-400' : 
                                    channel === 'm' ? 'accent-pink-500' : 
                                    channel === 'y' ? 'accent-yellow-400' : 'accent-gray-400'
                                }`}
                            />
                            <span className="w-6 text-right">{currentCMYK[channel as keyof CMYK]}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// Collapsible Section Component
const AdjustmentSection = ({ title, icon: Icon, children, defaultOpen = false }: any) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="border-b border-gray-800 py-3">
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className="w-full flex items-center justify-between text-xs font-bold text-gray-500 uppercase tracking-wider hover:text-gray-300 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Icon size={14} /> {title}
                </div>
                {isOpen ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
            </button>
            {isOpen && <div className="mt-3 space-y-3">{children}</div>}
        </div>
    );
};

const RangeSlider = ({ label, value, min, max, onChange, unit = "" }: any) => (
    <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-gray-400 uppercase">
            <span>{label}</span>
            <span className="font-mono text-blue-400">{value > 0 ? `+${value}` : value}{unit}</span>
        </div>
        <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-600 w-3">{min}</span>
            <input
                type="range"
                min={min}
                max={max}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <span className="text-[10px] text-gray-600 w-3 text-right">{max}</span>
        </div>
    </div>
);

const ToolsPanel: React.FC<ToolsPanelProps> = ({
  activeTool,
  setActiveTool,
  filters,
  setFilters,
  printSettings,
  setPrintSettings,
  addTextLayer,
  isAiLoading,
  aiAnalysis,
  onAnalyze,
  currentVectorStyle,
  updateLayer,
  selectedLayer,
  gridSettings,
  setGridSettings,
  viewSettings,
  setViewSettings,
  currentImageSrc,
  onImageUpdate,
  iccProfiles = [],
  onProfileUpload
}) => {
  // Local state for AI prompts
  const [editPrompt, setEditPrompt] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  
  const [veoPrompt, setVeoPrompt] = useState("Cinematic slow motion pan");
  const [isVeoLoading, setIsVeoLoading] = useState(false);
  const [veoVideoUrl, setVeoVideoUrl] = useState<string | null>(null);

  // Fonts state
  const [fonts, setFonts] = useState<string[]>([
    'Inter', 
    'Roboto', 
    'Montserrat', 
    'Lato', 
    'Playfair Display', 
    'Arial', 
    'Times New Roman', 
    'Courier New'
  ]);

  const updateFilter = (key: keyof FilterState, value: number) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const updatePrint = (key: keyof PrintSettings, value: string | number) => {
    setPrintSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateGrid = (key: keyof GridSettings, value: string | number | boolean) => {
    setGridSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleAiEdit = async () => {
    if (!currentImageSrc || !editPrompt) return;
    setIsEditing(true);
    try {
      const newImage = await editImageWithGemini(currentImageSrc, editPrompt);
      onImageUpdate(newImage);
      setEditPrompt(""); // Clear prompt on success
    } catch (e) {
      alert("Failed to edit image. Ensure your API key supports Gemini 2.5 Flash Image.");
    } finally {
      setIsEditing(false);
    }
  };

  const handleVeoGenerate = async () => {
    if (!currentImageSrc) return;
    setIsVeoLoading(true);
    setVeoVideoUrl(null);
    try {
      const videoUrl = await generateVeoVideo(currentImageSrc, veoPrompt);
      setVeoVideoUrl(videoUrl);
    } catch (e) {
      alert("Video generation failed. Please check the API key selection.");
    } finally {
      setIsVeoLoading(false);
    }
  };

  const handleFontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const fontName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
        const fontUrl = event.target?.result as string;
        
        // Create font face
        const newStyle = document.createElement('style');
        newStyle.appendChild(document.createTextNode(`
            @font-face {
                font-family: "${fontName}";
                src: url("${fontUrl}");
            }
        `));
        document.head.appendChild(newStyle);
        
        setFonts(prev => [...prev, fontName]);
        
        // Apply to selected layer if it's text
        if (selectedLayer?.type === 'text') {
            updateLayer({ fontFamily: fontName });
        }
    };
    reader.readAsDataURL(file);
  };

  const isVectorTool = [ActiveTool.VECTOR_RECT, ActiveTool.VECTOR_CIRCLE, ActiveTool.VECTOR_PEN].includes(activeTool);
  const isVectorSelected = selectedLayer && (selectedLayer.type === 'rect' || selectedLayer.type === 'circle' || selectedLayer.type === 'path');
  
  const activeStyle = isVectorSelected 
    ? {
        fillColor: (selectedLayer as any).fillColor,
        strokeColor: (selectedLayer as any).strokeColor,
        strokeWidth: (selectedLayer as any).strokeWidth,
        opacity: (selectedLayer as any).opacity,
        strokeOpacity: (selectedLayer as any).strokeOpacity,
        fillCMYK: (selectedLayer as any).fillCMYK,
        strokeCMYK: (selectedLayer as any).strokeCMYK
      }
    : currentVectorStyle;

  const renderContent = () => {
    // Vector Properties
    if (isVectorTool || (activeTool === ActiveTool.NONE && isVectorSelected)) {
      return (
        <div className="space-y-6">
           <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-700 pb-2 mb-4 flex items-center gap-2">
             <Palette size={14} /> Shape Properties
           </h3>
           
           <div className="space-y-4">
             <CMYKPicker 
                label="Fill Color"
                hexColor={activeStyle.fillColor}
                cmykValue={activeStyle.fillCMYK}
                onChange={(hex, cmyk) => updateLayer({ fillColor: hex, fillCMYK: cmyk })}
             />

             <CMYKPicker 
                label="Stroke Color"
                hexColor={activeStyle.strokeColor}
                cmykValue={activeStyle.strokeCMYK}
                onChange={(hex, cmyk) => updateLayer({ strokeColor: hex, strokeCMYK: cmyk })}
             />

             <div className="space-y-2">
               <div className="flex justify-between text-xs text-gray-400">
                  <span>Stroke Opacity</span>
                  <span>{Math.round((activeStyle.strokeOpacity ?? 1) * 100)}%</span>
               </div>
               <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={activeStyle.strokeOpacity ?? 1}
                onChange={(e) => updateLayer({ strokeOpacity: Number(e.target.value) })}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
             </div>

             <div className="space-y-2">
               <div className="flex justify-between text-xs text-gray-400">
                  <span>Stroke Width</span>
                  <span>{activeStyle.strokeWidth}px</span>
               </div>
               <input
                type="range"
                min="0"
                max="50"
                value={activeStyle.strokeWidth}
                onChange={(e) => updateLayer({ strokeWidth: Number(e.target.value) })}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
             </div>
             
             <div className="space-y-2">
               <div className="flex justify-between text-xs text-gray-400">
                  <span>Opacity</span>
                  <span>{Math.round((activeStyle.opacity || 1) * 100)}%</span>
               </div>
               <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={activeStyle.opacity || 1}
                onChange={(e) => updateLayer({ opacity: Number(e.target.value) })}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
             </div>
           </div>
        </div>
      )
    }

    switch (activeTool) {
      case ActiveTool.AI_EDIT:
        return (
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-700 pb-2 mb-4 flex items-center gap-2">
              <Wand2 size={14} /> Generative Edit
            </h3>
            <p className="text-xs text-gray-400">
              Use Gemini 2.5 Flash Image to modify the image with natural language.
            </p>
            
            <div className="space-y-2">
              <label className="text-xs text-gray-300">Prompt</label>
              <textarea 
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                placeholder="E.g., 'Add a vintage filter', 'Remove the dog', 'Change background to a city park'"
                className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-sm text-white h-24 focus:border-blue-500 outline-none"
              />
            </div>

            <button
               onClick={handleAiEdit}
               disabled={isEditing || !editPrompt}
               className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded flex items-center justify-center gap-2 transition disabled:opacity-50 text-sm font-bold shadow-lg"
             >
               {isEditing ? (
                 <>
                   <Loader2 size={18} className="animate-spin" /> Generating...
                 </>
               ) : (
                 <>
                  <Wand2 size={18} /> Generate Edit
                 </>
               )}
            </button>
            <p className="text-[10px] text-gray-500 text-center">Changes will overwrite current image.</p>
          </div>
        );

      case ActiveTool.VEO:
        return (
           <div className="space-y-6">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-700 pb-2 mb-4 flex items-center gap-2">
              <Film size={14} /> Veo Video
            </h3>
            <p className="text-xs text-gray-400">
              Animate your print asset for digital signage using Veo 3.1.
            </p>
            
            <div className="space-y-2">
              <label className="text-xs text-gray-300">Motion Prompt</label>
              <textarea 
                value={veoPrompt}
                onChange={(e) => setVeoPrompt(e.target.value)}
                placeholder="Describe camera movement or subject motion..."
                className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-sm text-white h-20 focus:border-blue-500 outline-none"
              />
            </div>

            <button
               onClick={handleVeoGenerate}
               disabled={isVeoLoading}
               className="w-full py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 rounded flex items-center justify-center gap-2 transition disabled:opacity-50 text-sm font-bold shadow-lg"
             >
               {isVeoLoading ? (
                 <>
                   <Loader2 size={18} className="animate-spin" /> Creating Video...
                 </>
               ) : (
                 <>
                  <Film size={18} /> Generate 720p Video
                 </>
               )}
            </button>

            {isVeoLoading && (
              <div className="bg-gray-800/50 p-4 rounded text-center">
                 <p className="text-xs text-blue-300 animate-pulse">This process takes about 30-60 seconds.</p>
              </div>
            )}

            {veoVideoUrl && (
              <div className="space-y-2 animate-fade-in bg-black rounded p-2 border border-gray-700">
                 <video src={veoVideoUrl} controls autoPlay loop className="w-full rounded" />
                 <a 
                   href={veoVideoUrl} 
                   download="veo-generation.mp4"
                   className="block w-full py-2 bg-gray-700 hover:bg-gray-600 text-center rounded text-xs text-white transition"
                 >
                   Download MP4
                 </a>
              </div>
            )}
            
            <div className="text-[10px] text-gray-500 mt-4 border-t border-gray-800 pt-2">
               Note: Requires paid GCP project API key selection.
            </div>
          </div>
        );

      case ActiveTool.GRID:
        return (
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-700 pb-2 mb-4">
              Grid Settings
            </h3>
            
            <div className="flex items-center justify-between bg-gray-800 p-2 rounded">
               <span className="text-sm">Enable Grid</span>
               <div 
                 className={`w-10 h-5 rounded-full p-0.5 cursor-pointer transition-colors ${gridSettings.enabled ? 'bg-blue-600' : 'bg-gray-600'}`}
                 onClick={() => updateGrid('enabled', !gridSettings.enabled)}
               >
                 <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${gridSettings.enabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
               </div>
            </div>

            <div className={`space-y-4 transition-opacity ${gridSettings.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
               <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-400">
                   <span>Spacing</span>
                   <span>{gridSettings.spacing}px</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="200"
                  value={gridSettings.spacing}
                  onChange={(e) => updateGrid('spacing', Number(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
               </div>

               <div className="space-y-2">
                <label className="text-xs text-gray-400">Color</label>
                <div className="flex gap-2 items-center">
                  <input 
                      type="color" 
                      value={gridSettings.color} 
                      onChange={(e) => updateGrid('color', e.target.value)}
                      className="w-full h-8 bg-gray-700 rounded cursor-pointer border-0"
                    />
                </div>
               </div>

               <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-400">
                   <span>Opacity</span>
                   <span>{Math.round(gridSettings.opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={gridSettings.opacity}
                  onChange={(e) => updateGrid('opacity', Number(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
               </div>
            </div>
          </div>
        );

      case ActiveTool.ADJUST:
        return (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-700 pb-2 mb-4 flex items-center gap-2">
              <BarChart3 size={14} /> Pro Adjustments
            </h3>
            
            {/* Histogram Component */}
            {currentImageSrc && (
              <div>
                <label className="text-[10px] text-gray-400 uppercase mb-2 block">Histogram</label>
                <HistogramCanvas imageSrc={currentImageSrc} filters={filters} />
              </div>
            )}
            
            <div className="custom-scrollbar overflow-y-auto max-h-[calc(100vh-400px)] pr-2">
                <AdjustmentSection title="Light" icon={Sun} defaultOpen={true}>
                    <RangeSlider label="Exposure" value={filters.exposure} min={-100} max={100} onChange={(v: number) => updateFilter('exposure', v)} />
                    <RangeSlider label="Contrast" value={filters.contrast} min={0} max={200} onChange={(v: number) => updateFilter('contrast', v)} unit="%" />
                    <RangeSlider label="Highlights" value={filters.highlights} min={-100} max={100} onChange={(v: number) => updateFilter('highlights', v)} />
                    <RangeSlider label="Shadows" value={filters.shadows} min={-100} max={100} onChange={(v: number) => updateFilter('shadows', v)} />
                </AdjustmentSection>

                <AdjustmentSection title="Color" icon={Droplet}>
                     <RangeSlider label="Temp" value={filters.temperature} min={-100} max={100} onChange={(v: number) => updateFilter('temperature', v)} />
                     <RangeSlider label="Tint" value={filters.tint} min={-100} max={100} onChange={(v: number) => updateFilter('tint', v)} />
                     <RangeSlider label="Saturation" value={filters.saturation} min={0} max={200} onChange={(v: number) => updateFilter('saturation', v)} unit="%" />
                     <RangeSlider label="Vibrance" value={filters.vibrance} min={-100} max={100} onChange={(v: number) => updateFilter('vibrance', v)} />
                </AdjustmentSection>

                <AdjustmentSection title="Detail" icon={Zap}>
                    <RangeSlider label="Sharpening" value={filters.sharpen} min={0} max={100} onChange={(v: number) => updateFilter('sharpen', v)} />
                    <RangeSlider label="Clarity (Dehaze)" value={filters.clarity} min={0} max={100} onChange={(v: number) => updateFilter('clarity', v)} />
                    <RangeSlider label="Noise" value={filters.noise} min={0} max={100} onChange={(v: number) => updateFilter('noise', v)} />
                     <RangeSlider label="Blur" value={filters.blur} min={0} max={20} onChange={(v: number) => updateFilter('blur', v)} unit="px" />
                </AdjustmentSection>

                <AdjustmentSection title="Effects" icon={Gauge}>
                    <RangeSlider label="Vignette" value={filters.vignette} min={0} max={100} onChange={(v: number) => updateFilter('vignette', v)} />
                    <RangeSlider label="Sepia" value={filters.sepia} min={0} max={100} onChange={(v: number) => updateFilter('sepia', v)} unit="%" />
                    <RangeSlider label="Grayscale" value={filters.grayscale} min={0} max={100} onChange={(v: number) => updateFilter('grayscale', v)} unit="%" />
                </AdjustmentSection>
            </div>
          </div>
        );
      
      case ActiveTool.TEXT:
        const textLayer = selectedLayer?.type === 'text' ? selectedLayer : null;
        return (
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-700 pb-2 mb-4 flex items-center gap-2">
              <Type size={14} /> Typography
            </h3>
            
            <button
              onClick={addTextLayer}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded flex items-center justify-center gap-2 transition text-sm font-medium mb-4"
            >
              <Plus size={16} /> Add Text Layer
            </button>
            
            {textLayer ? (
              <div className="space-y-4">
                 <div className="space-y-2">
                    <label className="text-xs text-gray-400">Font Family</label>
                    <select 
                      value={textLayer.fontFamily} 
                      onChange={(e) => updateLayer({ fontFamily: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-sm text-white focus:border-blue-500 outline-none"
                    >
                        {fonts.map(font => (
                            <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
                        ))}
                    </select>
                 </div>

                 <div className="space-y-2">
                    <label className="text-xs text-gray-400">Custom Font</label>
                    <div className="relative">
                        <input 
                            type="file" 
                            accept=".ttf,.otf,.woff,.woff2"
                            onChange={handleFontUpload}
                            className="hidden" 
                            id="font-upload"
                        />
                        <label 
                            htmlFor="font-upload"
                            className="w-full py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded flex items-center justify-center gap-2 cursor-pointer transition text-xs text-gray-300"
                        >
                            <Upload size={12} /> Upload Font File
                        </label>
                    </div>
                 </div>

                 <div className="flex gap-2">
                    <div className="space-y-2 flex-1">
                        <label className="text-xs text-gray-400">Size</label>
                        <input 
                            type="number" 
                            value={textLayer.fontSize}
                            onChange={(e) => updateLayer({ fontSize: Number(e.target.value) })}
                            className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-sm text-white focus:border-blue-500 outline-none"
                        />
                    </div>
                    <div className="space-y-2 w-12">
                        <label className="text-xs text-gray-400">Color</label>
                        <input 
                            type="color" 
                            value={textLayer.color}
                            onChange={(e) => updateLayer({ color: e.target.value })}
                            className="w-full h-9 bg-gray-800 border border-gray-600 rounded cursor-pointer"
                        />
                    </div>
                 </div>
              </div>
            ) : (
                <p className="text-xs text-gray-500 text-center py-4 bg-gray-800/50 rounded">Select a text layer to edit properties.</p>
            )}
          </div>
        );

      case ActiveTool.PRINT:
        return (
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-700 pb-2 mb-4">
              Print Master
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 uppercase">Width (cm)</label>
                <input
                  type="number"
                  value={printSettings.widthCm}
                  onChange={(e) => updatePrint('widthCm', Number(e.target.value))}
                  className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-sm focus:border-blue-500 outline-none transition"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 uppercase">Height (cm)</label>
                <input
                  type="number"
                  value={printSettings.heightCm}
                  onChange={(e) => updatePrint('heightCm', Number(e.target.value))}
                  className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-sm focus:border-blue-500 outline-none transition"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-gray-400 uppercase">Target DPI</label>
              <select
                value={printSettings.dpi}
                onChange={(e) => updatePrint('dpi', Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-sm focus:border-blue-500 outline-none transition"
              >
                <option value={72}>72 DPI (Draft/Screen)</option>
                <option value={150}>150 DPI (Large Format)</option>
                <option value={300}>300 DPI (Photo Quality)</option>
                <option value={600}>600 DPI (Fine Art)</option>
              </select>
            </div>

             <div className="space-y-1">
              <label className="text-[10px] text-gray-400 uppercase">Paper Type</label>
              <select
                value={printSettings.paperType}
                onChange={(e) => updatePrint('paperType', e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-sm focus:border-blue-500 outline-none transition"
              >
                <option value="glossy">Glossy Photo</option>
                <option value="matte">Matte Archive</option>
                <option value="canvas">Canvas</option>
                <option value="vinyl">Large Vinyl Banner</option>
              </select>
            </div>
            
            {/* Color Management Section */}
            <div className="bg-gray-800 p-3 rounded border border-gray-700 mt-4 space-y-3">
                <h4 className="text-xs font-bold text-gray-300 mb-2 flex items-center gap-1">
                    <FileText size={12}/> Color Management (ICC)
                </h4>
                
                <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 uppercase">Active Profile</label>
                    <select
                        value={printSettings.selectedProfileId}
                        onChange={(e) => updatePrint('selectedProfileId', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-xs text-white focus:border-blue-500 outline-none"
                    >
                        {iccProfiles?.map(p => (
                            <option key={p.id} value={p.id}>{p.name} {p.isBuiltIn ? '(Built-in)' : ''}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-1">
                   <label className="text-[10px] text-gray-400 uppercase">Load Custom Profile</label>
                   <label className="flex items-center justify-center w-full py-2 bg-gray-700 hover:bg-gray-600 rounded border border-gray-600 border-dashed cursor-pointer text-xs text-gray-300 gap-2 transition">
                        <Upload size={12} />
                        <span>Upload .ICC / .ICM</span>
                        <input type="file" accept=".icc,.icm" className="hidden" onChange={onProfileUpload} />
                   </label>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 uppercase">Rendering Intent</label>
                    <select
                        value={printSettings.renderingIntent}
                        onChange={(e) => updatePrint('renderingIntent', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-xs text-white focus:border-blue-500 outline-none"
                    >
                        <option value="perceptual">Perceptual (Photo)</option>
                        <option value="relative-colorimetric">Relative Colorimetric</option>
                        <option value="absolute-colorimetric">Absolute Colorimetric</option>
                        <option value="saturation">Saturation (Graphics)</option>
                    </select>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                    <div className="flex items-center gap-2">
                        <Eye size={12} className={viewSettings.cmykPreview ? "text-cyan-400" : "text-gray-500"} />
                        <span className="text-xs text-gray-400">Soft Proofing</span>
                    </div>
                     <div 
                         className={`w-10 h-5 rounded-full p-0.5 cursor-pointer transition-colors ${viewSettings.cmykPreview ? 'bg-cyan-600' : 'bg-gray-600'}`}
                         onClick={() => setViewSettings(p => ({...p, cmykPreview: !p.cmykPreview}))}
                       >
                         <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${viewSettings.cmykPreview ? 'translate-x-5' : 'translate-x-0'}`}></div>
                       </div>
                </div>
            </div>

            <div className="bg-gray-800 p-3 rounded border border-gray-700 mt-4">
               <h4 className="text-xs font-bold text-gray-300 mb-2 flex items-center gap-1"><AlertCircle size={12}/> Output Specs</h4>
               <div className="space-y-2 text-xs">
                 <div className="flex justify-between border-b border-gray-700 pb-1">
                    <span className="text-gray-500">Dimensions (px)</span>
                    <span className="font-mono text-blue-400">
                      {Math.round(printSettings.widthCm / 2.54 * printSettings.dpi)} x {Math.round(printSettings.heightCm / 2.54 * printSettings.dpi)}
                    </span>
                 </div>
                 <div className="flex justify-between pt-1">
                    <span className="text-gray-500">Megapixels</span>
                    <span className="font-mono text-blue-400">
                      {((printSettings.widthCm / 2.54 * printSettings.dpi) * (printSettings.heightCm / 2.54 * printSettings.dpi) / 1000000).toFixed(1)} MP
                    </span>
                 </div>
               </div>
            </div>
          </div>
        );

      case ActiveTool.AI:
        return (
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-700 pb-2 mb-4 flex items-center gap-2">
              <Sparkles size={14} /> Print AI Assistant
            </h3>
            
            <p className="text-xs text-gray-400">
              Analyze your image for print suitability using Gemini 2.5 Flash.
            </p>

            <button
               onClick={onAnalyze}
               disabled={isAiLoading || !currentImageSrc}
               className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded flex items-center justify-center gap-2 transition disabled:opacity-50 text-sm font-bold shadow-lg"
             >
               {isAiLoading ? (
                 <>
                   <Loader2 size={18} className="animate-spin" /> Analyzing...
                 </>
               ) : (
                 <>
                  <Sparkles size={18} /> Analyze for Print
                 </>
               )}
            </button>

            {aiAnalysis && (
              <div className="space-y-4 animate-fade-in">
                 <div className="flex items-center gap-2">
                    <div className={`text-2xl font-bold ${aiAnalysis.qualityScore >= 8 ? 'text-green-500' : aiAnalysis.qualityScore >= 5 ? 'text-yellow-500' : 'text-red-500'}`}>
                      {aiAnalysis.qualityScore}/10
                    </div>
                    <span className="text-xs text-gray-400 uppercase tracking-wider font-bold">Quality Score</span>
                 </div>
                 
                 {aiAnalysis.issues && aiAnalysis.issues.length > 0 && (
                   <div className="space-y-1">
                      <h4 className="text-[10px] text-gray-400 uppercase font-bold flex items-center gap-1"><AlertCircle size={10} /> Potential Issues</h4>
                      <ul className="text-xs text-gray-300 list-disc pl-4 space-y-0.5">
                        {aiAnalysis.issues.map((issue: string, i: number) => <li key={i}>{issue}</li>)}
                      </ul>
                   </div>
                 )}

                 {aiAnalysis.recommendations && aiAnalysis.recommendations.length > 0 && (
                   <div className="space-y-1">
                      <h4 className="text-[10px] text-gray-400 uppercase font-bold flex items-center gap-1"><Wand2 size={10} /> Recommendations</h4>
                      <ul className="text-xs text-gray-300 list-disc pl-4 space-y-0.5">
                        {aiAnalysis.recommendations.map((rec: string, i: number) => <li key={i}>{rec}</li>)}
                      </ul>
                   </div>
                 )}
                 
                 {aiAnalysis.paperRecommendation && (
                    <div className="bg-gray-800 p-2 rounded border border-gray-700">
                       <h4 className="text-[10px] text-gray-400 uppercase font-bold mb-1">Recommended Paper</h4>
                       <p className="text-sm text-blue-300">{aiAnalysis.paperRecommendation}</p>
                    </div>
                 )}
              </div>
            )}
            {!currentImageSrc && (
                <div className="text-xs text-red-400 bg-red-900/20 p-2 rounded border border-red-900/50">
                    Please upload an image to analyze.
                </div>
            )}
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 text-center px-4">
             <MousePointer2 size={32} className="mb-4 opacity-50" />
             <p className="text-sm">Select a tool from the toolbar to edit properties.</p>
          </div>
        );
    }
  };
  
  return (
    <div className="h-1/2 overflow-y-auto custom-scrollbar p-4 bg-gray-900">
      {renderContent()}
    </div>
  );
};

export default ToolsPanel;