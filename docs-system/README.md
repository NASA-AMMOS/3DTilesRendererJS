# 3D Tiles Renderer Documentation System

A custom documentation system with JSDoc parsing and interactive code sandbox.

## Structure

```
docs-system/
├── parser/           # JSDoc parser module
│   ├── index.ts      # Main entry point
│   ├── jsdoc-extractor.ts  # JSDoc parsing logic
│   ├── example-loader.ts   # Example file loader
│   └── types.ts      # TypeScript interfaces
├── site/             # Documentation website (React + Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/     # Layout components
│   │   │   ├── docs/       # Documentation components
│   │   │   └── sandbox/    # Code sandbox components
│   │   ├── hooks/          # React hooks
│   │   ├── pages/          # Page components
│   │   └── styles/         # CSS styles
│   └── public/             # Static assets
├── data/             # Generated documentation data
└── scripts/          # Build scripts
```

## Getting Started

### 1. Install all dependencies

```bash
cd docs-system
npm install
```

This uses npm workspaces to install dependencies for both parser and site.

### 2. Run development server

```bash
npm run dev
```

This will:
- Parse all JS files in `src/` for JSDoc comments
- Generate `api.json` and `examples.json`
- Start the dev server at `http://localhost:3000`

### 3. Build for production

```bash
npm run build
```

Output will be in `docs/api/`.

### Other Commands

```bash
npm run build:data    # Only regenerate documentation data
npm run dev:site      # Start site without rebuilding data
npm run preview       # Preview production build
```

## JSDoc Syntax

### Basic class documentation

```javascript
/**
 * Plugin for overlaying tiled image data on 3D tiles.
 *
 * @category Plugins
 *
 * @example
 * ```js
 * const overlay = new XYZTilesOverlay({ url: '...' });
 * const plugin = new ImageOverlayPlugin({ overlays: [overlay] });
 * tilesRenderer.registerPlugin(plugin);
 * ```
 */
export class ImageOverlayPlugin {
  // ...
}
```

### Constructor and method documentation

```javascript
/**
 * Creates a new overlay plugin.
 *
 * @param {Object} options - Configuration options
 * @param {Array<ImageOverlay>} [options.overlays=[]] - Overlays to add
 * @param {number} [options.resolution=256] - Texture resolution
 */
constructor(options = {}) {
  // ...
}

/**
 * Adds an overlay to the plugin.
 *
 * @param {ImageOverlay} overlay - The overlay to add
 * @param {number|null} [order=null] - Z-order (higher = on top)
 * @returns {void}
 */
addOverlay(overlay, order = null) {
  // ...
}
```

### Runnable examples

Add `[runnable]` or `[runnable=false]` to control sandbox execution:

```javascript
/**
 * @example <caption>Interactive Example</caption> [runnable] [deps: three]
 * ```js
 * const scene = new THREE.Scene();
 * console.log('Scene created!');
 * ```
 *
 * @example <caption>Static Example</caption> [runnable=false]
 * ```js
 * // This won't have a run button
 * const config = { ... };
 * ```
 */
```

## Features

- **JSDoc Parsing**: Extracts documentation from JavaScript source files
- **Code Sandbox**: Interactive code execution with Three.js support
- **Live Preview**: Real-time 3D preview canvas
- **Console Panel**: View console output from sandbox code
- **Dark Mode**: Automatic theme switching
- **Search**: Full-text search across documentation
- **Responsive**: Works on desktop and mobile

## Technology Stack

- **Parser**: @babel/parser, doctrine
- **Frontend**: React 18, Vite, TailwindCSS
- **Editor**: Monaco Editor
- **Sandbox**: Isolated iframe execution
