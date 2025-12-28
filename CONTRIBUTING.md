# Contributing to PrintMaster Pro

Thank you for interest in contributing! This guide helps you get started.

## Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-repo/printmaster-pro.git
   cd printmaster-pro
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create `.env.local`:**
   ```
   GEMINI_API_KEY=your-key-here
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

## Code Style

- **TypeScript** – strict mode enabled
- **React** – functional components with hooks
- **Tailwind CSS** – utility-first styling (no CSS files)
- **Naming** – camelCase for functions/variables, PascalCase for components

## Project Structure

- `App.tsx` – main application state and handlers
- `components/` – React components (EditorCanvas, ToolsPanel, LayersPanel)
- `services/` – API calls (geminiService.ts for Gemini integration)
- `utils/` – helper functions (colorUtils.ts)
- `types.ts` – TypeScript interfaces

## Key Patterns

### Adding a New AI Feature

1. Create service function in `services/geminiService.ts`:
   ```typescript
   export const myNewFeature = async (imageBase64: string, prompt: string): Promise<string> => {
     const ai = getAiClient();
     const cleanData = cleanBase64(imageBase64);
     // Call Gemini API
     // Extract response and return data:image/png;base64,...
   };
   ```

2. Add tool case in `App.tsx` or `ToolsPanel.tsx`

3. Integrate UI in ToolsPanel component

### Adding a New Layer Type

1. Extend `Layer` union type in `types.ts`
2. Add rendering logic in `EditorCanvas.tsx` (memoized component)
3. Add property UI in `ToolsPanel.tsx`

## Testing

- No automated tests yet – manual testing recommended
- Test in development: `npm run dev`
- Test production build: `npm run build && npm run preview`

## Common Issues

- **API Key not found** – ensure `.env.local` is in root and `npm run dev` restarted
- **Build fails** – check TypeScript errors: `npx tsc --noEmit`
- **Changes not reflecting** – HMR works but sometimes restart needed: stop and restart `npm run dev`

## Submitting Changes

1. Create feature branch: `git checkout -b feature/my-feature`
2. Commit with clear messages: `git commit -m "feat: add new feature"`
3. Push and create Pull Request
4. Describe changes and why they're needed

## Questions?

Check [`.github/copilot-instructions.md`](.github/copilot-instructions.md) for architecture details and AI agent guidance.

---

Happy coding! 🎨
