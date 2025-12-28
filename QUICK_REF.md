# Quick Reference Card

## ⚡ Common Commands

```bash
# Start development
npm run dev              # http://localhost:3000/

# Production
npm run build            # Create dist/ folder
npm run preview          # Preview production build

# Validation
npm run type-check       # Check TypeScript errors
npm run lint             # Same as type-check

# First time setup
npm install              # Install dependencies
```

## 🔧 Environment Setup

```bash
# Create .env.local in project root:
GEMINI_API_KEY=sk-proj-your-key-here
```

## 📁 Key Files

| File | Purpose |
|------|---------|
| `App.tsx` | Main state & handlers |
| `components/EditorCanvas.tsx` | Canvas rendering |
| `components/ToolsPanel.tsx` | Controls UI |
| `services/geminiService.ts` | AI API calls |
| `types.ts` | TypeScript interfaces |
| `utils/colorUtils.ts` | Color conversions |

## 🎨 Adding Features

### New Filter
1. Add to `FilterState` in `types.ts`
2. Add slider in `ToolsPanel.tsx` (ADJUST section)
3. Implement in `EditorCanvas.tsx` (SVG filter or CSS)

### New AI Feature
1. Create function in `services/geminiService.ts`
2. Add tool case in `ToolsPanel.tsx` (switch statement)
3. Add handler in `App.tsx`

### New Layer Type
1. Extend `Layer` union in `types.ts`
2. Add rendering in `EditorCanvas.tsx` (memoized component)
3. Add properties UI in `ToolsPanel.tsx`

## 🐛 Debugging

```bash
# Check TypeScript errors
npm run type-check

# View in browser
http://localhost:3000/
# Open DevTools: F12
# Check Console tab for errors
# Network tab shows API calls
```

## 🤖 Gemini Models

- **Image Edit/Analysis:** `gemini-2.5-flash-image`
- **Upscaling:** `gemini-3-pro-image-preview` (paid)
- **Video:** `veo-3.1-fast-generate-preview` (paid)

## 📊 State Flow

```
App.tsx (state)
  ↓
  ├→ EditorCanvas (render image + layers)
  ├→ ToolsPanel (edit controls)
  └→ LayersPanel (layer management)
```

## ⚠️ Common Issues

| Problem | Fix |
|---------|-----|
| API key missing | Add to `.env.local`, restart dev server |
| Build fails | Run `npm run type-check` to see errors |
| Changes not showing | Restart dev server: `npm run dev` |
| Export doesn't work | Ensure image is loaded and canvas exists |

## 🔗 Documentation Links

- **Architecture:** `.github/copilot-instructions.md`
- **Contributing:** `CONTRIBUTING.md`
- **Components:** `components/README.md`
- **User Guide:** `README.md`
- **Changelog:** `CHANGELOG.md`

## 💡 Pro Tips

1. **Use memo()** for components that re-render frequently
2. **Keep state in App.tsx** for shared data
3. **Use Tailwind utilities** – no separate CSS files
4. **Check browser DevTools** – network tab shows API calls
5. **Read copilot-instructions.md** – comprehensive architectural guide

---

**Happy coding!** 🚀
