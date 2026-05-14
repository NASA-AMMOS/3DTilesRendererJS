# 3d-tiles-renderer/core

Framework-agnostic core of the 3D Tiles renderer. Provides the base `TilesRendererBase` class, scheduling, parsing, and shared utilities that are extended by the Three.js and Babylon.js renderer packages.

This package is intended for use when building a custom renderer integration. For Three.js or Babylon.js usage, prefer `3d-tiles-renderer/three` or `3d-tiles-renderer/babylonjs` instead.

```js
import { TilesRendererBase } from '3d-tiles-renderer/core';
```

See the [API reference](./API.md) for full class and method documentation.
