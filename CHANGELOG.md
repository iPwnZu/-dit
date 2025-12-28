# Changelog

All notable changes to PrintMaster Pro will be documented in this file.

## [0.1.0] – 2025-12-28

### ✨ Features
- Complete print design studio with React + TypeScript + Vite
- Image upload with automatic upscaling (< 1200px)
- Pro adjustments – exposure, highlights, shadows, temperature, vibrance, sharpen, clarity
- Smart filters – blur, sepia, grayscale, noise, vignette
- Real-time histogram analysis
- Layer system with text, rectangles, circles, freehand paths
- 16+ blend modes (multiply, screen, overlay, soft-light, color-dodge, etc.)
- CMYK color picker with professional color management
- Drag-to-reorder layers with visibility/lock toggles
- AI image analysis – Gemini evaluates print suitability
- Generative editing – natural language image modifications
- 4K upscaling – AI enhancement for low-res images
- Veo video generation – animate static images
- Print tools – custom dimensions, DPI presets, ICC profiles
- Grid overlay and rulers for precise alignment
- PNG export with all layers flattened

### 🐛 Fixed
- Fixed env var mismatch: all references now use `GEMINI_API_KEY` consistently
- Implemented real PNG export functionality (was only a mock alert)
- Improved error messages in Gemini API client initialization

### 📚 Documentation
- Comprehensive `.github/copilot-instructions.md` for AI agents
- Detailed README with feature overview and troubleshooting
- CONTRIBUTING guide for developers
- Issue templates (bug reports, feature requests)

---

## Future Roadmap

- [ ] Undo/redo system
- [ ] Layer groups/hierarchies
- [ ] SVG export
- [ ] PDF export with print marks
- [ ] Batch processing
- [ ] Cloud save/load
- [ ] Collaborative editing
- [ ] Mobile app support
- [ ] Automated tests (unit, integration, e2e)
- [ ] Performance optimizations for large images
