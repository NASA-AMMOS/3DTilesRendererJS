import type { Scene } from '@babylonjs/core/scene';
import { TilesRendererBase } from '3d-tiles-renderer/core';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Matrix } from '@babylonjs/core/Maths/math.vector';

import type { TilesRendererBaseEventMap } from "3d-tiles-renderer/core";
/**
 * @classdesc
 * Babylon.js implementation of the 3D Tiles renderer. Manages tile loading, caching, traversal,
 * and scene management using the Babylon.js scene graph and camera APIs. Dispatches all events
 * defined by TilesRendererBase via Babylon.js Observables.
 * @augments TilesRendererBase
 */
declare class TilesRenderer extends TilesRendererBase<TilesRendererBaseEventMap<unknown>> {
    /**
     * @param {string} url - URL of the root tileset JSON.
     * @param {Scene} scene - The Babylon.js scene to render tiles into.
     */
    constructor(url: string, scene: Scene);
    /**
     * The Babylon.js scene tiles are rendered into.
     * @type {Scene}
     */
    scene: Scene;
    /**
     * Root node that all loaded tile scenes are parented to.
     * @type {TransformNode}
     */
    group: TransformNode;
    /**
     * Whether to enable collision checking on loaded tile meshes.
     * @type {boolean}
     */
    checkCollisions: boolean;
    loadRootTileset(...args: any[]): any;
    preprocessNode(tile: any, tilesetDir: any, parentTile?: any): void;
    parseTile(buffer: any, tile: any, extension: any, uri: any, abortSignal: any): Promise<void>;
    disposeTile(tile: any): void;
    setTileVisible(tile: any, visible: any): void;
    calculateBytesUsed(tile: any): number;
    calculateTileViewError(tile: any, target: any): void;
}

export { TilesRenderer };
