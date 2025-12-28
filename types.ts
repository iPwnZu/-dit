
export interface FilterState {
  brightness: number; // 0-200, default 100
  contrast: number;   // 0-200, default 100
  saturation: number; // 0-200, default 100
  grayscale: number;  // 0-100, default 0
  blur: number;       // 0-20, default 0
  sepia: number;      // 0-100, default 0
  
  // Pro Adjustments
  exposure?: number;
  highlights?: number;
  shadows?: number;
  temperature?: number;
  tint?: number;
  vibrance?: number;
  sharpen?: number;
  clarity?: number;
  noise?: number;
  vignette?: number;
}

export type LayerType = 'text' | 'rect' | 'circle' | 'path';

export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten' | 'color-dodge' | 'color-burn' | 'hard-light' | 'soft-light' | 'difference' | 'exclusion' | 'hue' | 'saturation' | 'color' | 'luminosity';

export interface CMYK {
  c: number;
  m: number;
  y: number;
  k: number;
}

export interface BaseLayer {
  id: string;
  name: string; // User friendly name
  type: LayerType;
  x: number;
  y: number;
  rotation: number;
  visible: boolean; // Toggle visibility
  locked: boolean;  // Prevent editing
  opacity: number;  // 0-1
  blendMode: BlendMode;
}

export interface TextLayer extends BaseLayer {
  type: 'text';
  text: string;
  fontSize: number;
  color: string;
  fontFamily: string;
}

export interface VectorStyle {
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
  strokeOpacity?: number;
  fillCMYK?: CMYK;
  strokeCMYK?: CMYK;
}

export interface ShapeLayer extends BaseLayer, VectorStyle {
  type: 'rect' | 'circle';
  width: number;
  height: number;
}

export interface PathLayer extends BaseLayer, VectorStyle {
  type: 'path';
  points: {x: number, y: number}[]; 
}

export type Layer = TextLayer | ShapeLayer | PathLayer;

export interface IccProfile {
  id: string;
  name: string;
  type: 'cmyk' | 'rgb' | 'grayscale';
  data?: ArrayBuffer; // Raw binary data
  isBuiltIn: boolean;
}

export type RenderingIntent = 'perceptual' | 'relative-colorimetric' | 'saturation' | 'absolute-colorimetric';

export interface PrintSettings {
  dpi: number;
  widthCm: number;
  heightCm: number;
  paperType: 'glossy' | 'matte' | 'canvas' | 'vinyl';
  bleedMm: number;
  selectedProfileId: string; // ID of the active ICC profile
  renderingIntent: RenderingIntent;
}

export interface ViewSettings {
  showRulers: boolean;
  cmykPreview: boolean; // Soft proofing toggle
}

export interface GridSettings {
  enabled: boolean;
  spacing: number;
  color: string;
  opacity: number;
}

export interface ImageMetaData {
  name: string;
  width: number;
  height: number;
  src: string;
  originalSize: number; // in bytes
}

export enum ActiveTool {
  NONE = 'NONE',
  ADJUST = 'ADJUST',
  TEXT = 'TEXT',
  VECTOR_RECT = 'VECTOR_RECT',
  VECTOR_CIRCLE = 'VECTOR_CIRCLE',
  VECTOR_PEN = 'VECTOR_PEN',
  GRID = 'GRID',
  PRINT = 'PRINT',
  AI = 'AI',
  AI_EDIT = 'AI_EDIT',
  VEO = 'VEO'
}
