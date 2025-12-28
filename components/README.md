# Components

This directory contains React components that make up PrintMaster Pro.

## EditorCanvas.tsx

Main rendering engine for the canvas/design surface.

**Key Features:**
- SVG filter chain for pro photo adjustments (color matrix, curves, sharpening, noise)
- Canvas downsampling for large images (MAX_TEXTURE_SIZE = 4096)
- Layer rendering with blend modes and opacity
- Vector shape drawing (rectangles, circles, paths)
- Text layer rendering
- Grid overlay and ruler display
- Mouse handlers for layer selection and dragging

**Memoized Sub-Components:**
- `ImageLayer` – renders base image with filters
- `VectorLayerItem` – draws shapes with selection indicators
- `TextLayerItem` – renders text with editing UI
- `GridOverlay` – background grid for alignment
- `Rulers` – cm-based measurements

## ToolsPanel.tsx

Control panel for all editing tools and AI features.

**Sections:**
- **Adjustment Panel** – light, color, detail, effects controls
- **Vector Properties** – fill/stroke colors, opacity for shapes
- **Typography** – font family, size, color for text layers
- **Print Setup** – dimensions, DPI, ICC profiles
- **AI Features** – image analysis, generative editing, video generation
- **Grid Settings** – overlay customization

**Key Components:**
- `CMYKPicker` – professional CMYK color picker with hex/RGB input
- `RangeSlider` – labeled range input with unit display
- `AdjustmentSection` – collapsible section with icon
- `HistogramCanvas` – analyzes image exposure

## LayersPanel.tsx

Layer list UI with management controls.

**Features:**
- **Drag-to-reorder** – drag handle for layer ordering
- **Visibility Toggle** – eye icon to show/hide layers
- **Lock Toggle** – prevent accidental editing
- **Blend Mode Picker** – 16+ blend modes
- **Opacity Slider** – per-layer transparency
- **Delete** – remove layers with confirmation
- **Layer Display** – reverses array so top layer appears first in UI

**Key Detail:**
Layer order in DOM vs UI differs. Array is bottom-to-top but `displayLayers` reverses for UI display.

---

## Component Patterns

### Using `memo()`
Components that receive large objects or render frequently are wrapped with `React.memo()` to prevent unnecessary re-renders.

Example:
```typescript
const MyComponent = memo(({ layer, filters }: Props) => {
  return <div>...</div>;
}, (prev, next) => {
  // Custom comparison logic
  return prev.layer === next.layer && prev.filters === next.filters;
});
```

### State Management
- **Local state** for UI toggles (isOpen, isLoading, etc.)
- **Lifted state** in `App.tsx` for image, layers, filters (shared across components)
- **Props drilling** to pass handlers and state down the component tree

### Styling
All components use Tailwind CSS utility classes. No separate CSS files.

Common patterns:
- `className={`${baseClass} ${condition ? 'text-blue-400' : 'text-gray-400'}`}`
- Responsive classes: `hidden md:inline` for mobile optimization
- Group hover effects: `group hover:bg-gray-700` with `group-hover:`

---

## Development Tips

1. **Adding a new layer type?**
   - Extend `Layer` union type in `types.ts`
   - Add case in `EditorCanvas` rendering logic
   - Add UI section in `ToolsPanel` for properties

2. **Adding a new filter?**
   - Add to `FilterState` interface in `types.ts`
   - Implement SVG filter primitive in `EditorCanvas.svgFilterPrimitives` (or CSS if simple)
   - Add slider in `ToolsPanel` adjustment sections

3. **Debugging canvas rendering?**
   - Check filter string with browser DevTools Inspector
   - Verify layer visibility and z-order
   - Inspect SVG filter definitions in DOM

---

Happy editing! 🎨
