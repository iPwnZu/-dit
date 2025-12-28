<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# PrintMaster Pro – AI-Powered Print Design Studio

A modern, browser-based print design application powered by Google Gemini AI. Create, edit, and optimize images for professional printing with real-time AI analysis, upscaling, and layer-based compositing.

**Live App:** https://ai.studio/apps/drive/1xrjyW3JHXQ16dpejJWDFGPRJYMSYXXos

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v18+)
- **Gemini API Key** (free tier available)

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env.local` in root:**
   ```
   GEMINI_API_KEY=sk-proj-your-key-here
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```
   App runs on `http://localhost:3000/`

---

## ✨ Features

### Image Editing
- **Upload** JPEG/PNG with automatic upscaling
- **Pro Adjustments** – exposure, highlights, shadows, temperature, vibrance, sharpen, clarity
- **Filters** – blur, sepia, grayscale, noise, vignette
- **Histogram** – real-time exposure analysis

### Layers & Composition
- **Text Layers** – fonts, sizes, colors, rotation
- **Vector Shapes** – rectangles, circles, freehand paths
- **Blend Modes** – 16+ blend modes (multiply, screen, overlay, etc.)
- **CMYK Colors** – professional color management

### AI Features
- **Image Analysis** – Gemini evaluates print suitability
- **Generative Editing** – natural language image modifications
- **4K Upscaling** – AI enhancement for small images
- **Video Generation** – Veo animation from static images

### Print Tools
- **Dimensions** – custom width/height in cm
- **DPI** – 72, 150, 300, 600 DPI presets
- **ICC Profiles** – SWOP, FOGRA39, GRACoL, or custom
- **Grid & Rulers** – precise alignment

### Export
- **PNG Download** – high-quality composite

---

## 🛠 Development

### Build & Preview
```bash
npm run build      # Production build
npm run preview    # Preview locally
```

### Environment
- `GEMINI_API_KEY` required in `.env.local`

---

## 🤖 Models Used

- **gemini-2.5-flash-image** – edit, analysis
- **gemini-3-pro-image-preview** – upscaling
- **veo-3.1-fast-generate-preview** – video

---

## ⚠️ Troubleshooting

| Issue | Fix |
|-------|-----|
| "API Key missing" | Add `GEMINI_API_KEY` to `.env.local` |
| Upscale disabled | Upload image < 1200px |
| Export fails | Check browser permissions |

---

## 📖 For Contributors

See [`.github/copilot-instructions.md`](.github/copilot-instructions.md) for architecture & patterns.
