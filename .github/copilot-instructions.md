# Copilot / AI Agent Instructions for PrintMaster Pro

## Quick start ✅
- Install and run locally: `npm install` then `npm run dev` (Vite).  Build: `npm run build`, Preview: `npm run preview`.
- The app is a client-side React + TypeScript app (no backend in this repo).

---

## Big picture / architecture 🔧
- Single-page React app (entry: `index.tsx`, UI: `App.tsx`).
- Key responsibilities split across:
  - `App.tsx` — global app state, file upload, layer management, high-level handlers.
  - `components/EditorCanvas.tsx` — rendering, canvas/SVG filters, performance optimizations, layer drawing logic.
  - `components/ToolsPanel.tsx` — UI for image adjustments, CMYK tools, AI editing & video generation triggers.
  - `components/LayersPanel.tsx` — layer list UI and drag/drop re-ordering.
  - `services/geminiService.ts` — all calls to Google GenAI (Gemini / Veo) and image ops (analyze, edit, upscale, video)
  - `types.ts` — canonical types (Layer, PrintSettings, FilterState, ActiveTool, IccProfile, etc.)
  - `utils/colorUtils.ts` — color conversions (hex↔rgb↔cmyk) used across UI.

Note: UI uses Tailwind-style classes (utility-first classes in JSX). Components are functional React + TypeScript and rely on local state rather than global stores.

---

## Developer workflows & environment ⚙️
- Local dev: `npm run dev` (Vite dev server).
- Environment keys: the app expects an API key available at runtime. The code references `process.env.API_KEY` in `services/geminiService.ts`.
  - README mentions `GEMINI_API_KEY` in `.env.local` — this mismatch is important: verify which env var your environment provides, or set `API_KEY` to match the code.
  - In AI Studio / hosted environment, the app also uses `window.aistudio` helper to prompt the user to select a key (see `upscaleImage` and a few other functions).
- No tests included; debugging is done via Vite dev server console and browser DevTools.

### Sample `.env.local`
```
GEMINI_API_KEY=sk-proj-abc123xyz...
```
Restart `npm run dev` after adding/changing the file.

---

## Important implementation & patterns to preserve 🧭
- Image data format: images are stored as data URLs in `ImageMetaData.src`. `services/geminiService.ts` expects data URLs and strips the header with `cleanBase64()`.
- AI responses: `analyzeImageForPrint` returns a JSON string. App code is defensive: it strips triple-backtick markdown fences and calls `JSON.parse` (see `App.tsx` around AI analysis handling).
- Upscale flow: low-res image uploads prompt an Upscale modal (App detects width/height < 1200px). Upscaling uses `gemini-3-pro-image-preview` with `imageConfig.imageSize: '4K'` and requires a key that may be selected via `window.aistudio`.
- Image rendering optimizations: `EditorCanvas` downscales very large images for display (`MAX_TEXTURE_SIZE = 4096`) to limit GPU memory. Keep this if changing rendering pipeline.
- ICC profiles: uploaded profiles are stored as raw `ArrayBuffer` on `IccProfile.data`. Parsing is intentionally naive—don't assume presence of robust ICC parsing.
- Layer ordering: UI reverses the layers array for display so the top layer appears at the top of the list (see `LayersPanel.tsx` `displayLayers` computation).
- Blend / opacity: many components rely on CSS blend modes and opacity values in the `Layer` types; avoid changing their semantics without auditing UI and export behavior.

---

## AI / Gemini specifics (exact patterns) 🤖
- Library: `@google/genai` is used (`services/geminiService.ts`).
- Model names used in this codebase:
  - Image analysis/edit: `gemini-2.5-flash-image` (analysis + edits)
  - Upscale: `gemini-3-pro-image-preview` (4K upscale)
  - Video generation: Veo via `veo-3.1-fast-generate-preview` (see `generateVeoVideo`)
- Response handling patterns:
  - Image edit/upscale functions expect binary `inlineData` in the response's `candidates[0].content.parts` and reconstruct `data:image/png;base64,...` URIs.
  - `analyzeImageForPrint` composes a text prompt requesting a JSON object and caller code expects a clean JSON string (App strips triple backticks before parsing).
- Key selection pattern: some functions check `window.aistudio` and call `hasSelectedApiKey()` / `openSelectKey()`. Tests or changes that affect key flow should keep these interactions.

### Code example: safe image editing flow
```typescript
// In ToolsPanel.tsx handleAiEdit():
const handleAiEdit = async () => {
  if (!currentImageSrc || !editPrompt) return;
  setIsEditing(true);
  try {
    const newImage = await editImageWithGemini(currentImageSrc, editPrompt);
    onImageUpdate(newImage);  // Passes data:image/png;base64,... to parent
    setEditPrompt("");
  } catch (e) {
    alert("Failed to edit image. Check API key & model access.");
  } finally {
    setIsEditing(false);
  }
};
```
Key: always extract base64 from `candidates[0].content.parts[].inlineData.data` and reconstruct `data:image/png;base64,${data}`.

---

## Common pitfalls & tests for safety ⚠️
- Env var mismatch: README suggests `GEMINI_API_KEY` but code looks for `API_KEY`. Confirm which variable the runtime provides; update both README and code if you standardize it.
- Changing image src format (from data URLs to blobs or server URLs) requires updating `cleanBase64()` and all places that call Gemini clients.
- Don't remove the `cleanBase64` step — GenAI calls assume raw base64 data for `inlineData` parts.
- Be conservative when changing filter math in `EditorCanvas` — several UI elements and histogram code rely on the same filter semantics.

## Troubleshooting 🔧

| Problem | Root Cause | Fix |
|---------|-----------|-----|
| "API Key is missing" error | `process.env.GEMINI_API_KEY` undefined | Check `.env.local` exists with `GEMINI_API_KEY=...` in root, restart `npm run dev` |
| Image edit returns blank/invalid | Model name outdated or wrong request format | Verify `gemini-2.5-flash-image` in `editImageWithGemini`, check base64 header stripping |
| Upscale modal doesn't appear | Image already ≥1200px | Test with small image (800×600); threshold check in `App.tsx` `handleFileUpload` |
| Layers invisible on canvas | Layer `visible: false` or z-order issue | Check `EditorCanvas` reversal logic; ensure `visible: true` in layer state |
| CMYK color sync broken | Stale state in color picker or bad conversion | Verify `colorUtils.ts` formulas use correct CMYK standards (K=black channel, not composite) |
| Export button doesn't download PNG | Canvas not found or missing permissions | Ensure image is loaded; check browser console for detailed error |

### Recent fixes ✨
- Fixed env var mismatch: All code now uses `GEMINI_API_KEY` consistently (fixed in `services/geminiService.ts`, `vite.config.ts`, and `.env.local`)
- Implemented real PNG export: `handleExport()` in `App.tsx` now downloads rendered canvas as PNG
- Improved error messages: `getAiClient()` has clearer feedback about missing API key

---

## Quick file reference (where to look) 📁
- App state & UX flows: `App.tsx`
- Rendering & filters: `components/EditorCanvas.tsx`
- Tools (AI, CMYK UI, prompts): `components/ToolsPanel.tsx`
- Layer list / drag reorder: `components/LayersPanel.tsx`
- AI / Gemini API wrappers: `services/geminiService.ts`
- Types & domain model: `types.ts`
- Color conversion helpers: `utils/colorUtils.ts`

---

If anything in these sections looks incomplete or you'd like me to add examples (e.g., sample env files, a short troubleshooting subsection for API keys, or a short guide for adding a new Gemini-based feature), tell me which part to expand and I will iterate. 🙌
