import { Box3, Camera, Vector2, Matrix4, WebGLRenderer, Object3D, LoadingManager, Sphere, EventListener, EventDispatcher, BaseEvent } from 'three';
import { Tile, TilesRendererBase } from '3d-tiles-renderer/core';
import { TilesGroup } from './TilesGroup.js';
import { Ellipsoid } from '../math/Ellipsoid.js';

/**
 * Event map for TilesRenderer events.
 *
 * Use with {@link TilesRenderer.addEventListener} to listen for specific events.
 *
 * @example
 * ```js
 * renderer.addEventListener('load-model', (event) => {
 *   console.log('Model loaded:', event.scene, event.tile);
 * });
 * ```
 */
export interface TilesRendererEventMap {
	/**
	 * Fired when a camera is added via {@link TilesRenderer.setCamera}.
	 */
	'add-camera': { camera: Camera };

	/**
	 * Fired when a camera is removed via {@link TilesRenderer.deleteCamera}.
	 */
	'delete-camera': { camera: Camera };

	/**
	 * Fired when camera resolution changes.
	 */
	'camera-resolution-change': {};

	/**
	 * Fired when the root tileset.json is loaded.
	 */
	'load-root-tileset': { tileset: object, url: string };

	/**
	 * Fired when any tileset.json (including external tilesets) is loaded.
	 */
	'load-tileset': { tileset: object, /** @deprecated Use tileset instead */ tileSet?: object, url: string };

	/**
	 * @deprecated Use 'load-tileset' instead.
	 */
	'load-tile-set': { tileset: object, /** @deprecated Use tileset instead */ tileSet?: object, url: string };

	/**
	 * Fired when tile loading begins (transitioning from 0 pending tiles).
	 */
	'tiles-load-start': {};

	/**
	 * Fired when all pending tiles have finished loading.
	 */
	'tiles-load-end': {};

	/**
	 * Fired when a tile content download starts.
	 */
	'tile-download-start': { tile: Tile, url: string };

	/**
	 * Fired when tile content is loaded.
	 */
	'load-content': {};

	/**
	 * Fired when a 3D model is loaded and added to the scene.
	 */
	'load-model': { scene: Object3D; tile: Tile, url: string };

	/**
	 * Fired when a 3D model is disposed and removed from the scene.
	 */
	'dispose-model': { scene: Object3D; tile: Tile };

	/**
	 * Fired when a tile's visibility changes.
	 */
	'tile-visibility-change': { scene: Object3D; tile: Tile; visible: boolean };

	/**
	 * Fired at the beginning of the update cycle.
	 */
	'update-before': {};

	/**
	 * Fired at the end of the update cycle.
	 */
	'update-after': {};

	/**
	 * Fired when the renderer state changes and needs a re-render.
	 */
	'needs-update': {};

	/**
	 * Fired when a tile fails to load.
	 */
	'load-error': { tile: Tile | null, error: Error, url: string | URL };
}

/**
 * Three.js implementation of the 3D Tiles renderer.
 *
 * Extends {@link TilesRendererBase} with Three.js-specific functionality including
 * camera management, scene integration, and WebGL rendering support.
 *
 * @example Basic usage
 * ```js
 * import { TilesRenderer } from '3d-tiles-renderer';
 *
 * const renderer = new TilesRenderer('https://example.com/tileset.json');
 * scene.add(renderer.group);
 *
 * // Add camera for LOD calculations
 * renderer.setCamera(camera);
 * renderer.setResolutionFromRenderer(camera, webglRenderer);
 *
 * function animate() {
 *   requestAnimationFrame(animate);
 *   renderer.update();
 *   webglRenderer.render(scene, camera);
 * }
 * animate();
 * ```
 *
 * @example With Cesium Ion
 * ```js
 * import { TilesRenderer } from '3d-tiles-renderer';
 * import { CesiumIonAuthPlugin } from '3d-tiles-renderer/plugins';
 *
 * const renderer = new TilesRenderer();
 * renderer.registerPlugin(new CesiumIonAuthPlugin({
 *   apiToken: 'your-cesium-ion-token',
 *   assetId: '12345'
 * }));
 * scene.add(renderer.group);
 * ```
 *
 * @example Event handling
 * ```js
 * renderer.addEventListener('load-model', (event) => {
 *   console.log('Loaded:', event.tile);
 *   // Apply custom materials
 *   event.scene.traverse(child => {
 *     if (child.isMesh) {
 *       child.material = customMaterial;
 *     }
 *   });
 * });
 *
 * renderer.addEventListener('load-error', (event) => {
 *   console.error('Failed to load:', event.url, event.error);
 * });
 * ```
 *
 * @typeParam TEventMap - Event map type for custom event extensions
 *
 * @see {@link TilesRendererBase} for base class documentation
 * @see {@link https://github.com/NASA-AMMOS/3DTilesRendererJS | GitHub Repository}
 * @category Three.js
 */
export class TilesRenderer<TEventMap extends TilesRendererEventMap = TilesRendererEventMap> extends TilesRendererBase implements EventDispatcher<TEventMap> {

	/**
	 * The ellipsoid used for geographic calculations.
	 *
	 * Defaults to WGS84 ellipsoid. Modify for use with other planetary bodies.
	 */
	ellipsoid: Ellipsoid;

	/**
	 * Array of cameras currently registered with the renderer.
	 *
	 * @readonly
	 * @see {@link setCamera}
	 * @see {@link deleteCamera}
	 */
	cameras: Camera[];

	/**
	 * Whether to automatically disable Three.js frustum culling for tile objects.
	 *
	 * The renderer performs its own frustum culling during the update step,
	 * so Three.js culling is redundant and can be disabled for performance.
	 *
	 * @defaultValue true
	 */
	autoDisableRendererCulling: boolean;

	/**
	 * Whether to optimize raycasting by skipping invisible tiles.
	 *
	 * When `true`, raycasts will only test against currently visible tiles.
	 *
	 * @defaultValue true
	 */
	optimizeRaycast: boolean;

	/**
	 * Three.js LoadingManager for tracking asset loading.
	 *
	 * Can be used to integrate with loading indicators or track overall progress.
	 */
	manager: LoadingManager;

	/**
	 * The Three.js group containing all tile geometry.
	 *
	 * Add this to your scene to display the tileset.
	 *
	 * @example
	 * ```js
	 * scene.add(renderer.group);
	 * ```
	 */
	group: TilesGroup;

	/**
	 * Computes the axis-aligned bounding box of the tileset.
	 *
	 * @param box - Box3 to store the result
	 * @returns `true` if the bounding box was computed successfully, `false` if tileset not loaded
	 *
	 * @example
	 * ```js
	 * const box = new THREE.Box3();
	 * if (renderer.getBoundingBox(box)) {
	 *   const center = box.getCenter(new THREE.Vector3());
	 *   camera.lookAt(center);
	 * }
	 * ```
	 */
	getBoundingBox(box: Box3): boolean;

	/**
	 * Computes the oriented bounding box of the tileset.
	 *
	 * @param box - Box3 to store the box dimensions (centered at origin)
	 * @param matrix - Matrix4 to store the box orientation and position
	 * @returns `true` if computed successfully, `false` if tileset not loaded
	 */
	getOrientedBoundingBox(box: Box3, matrix: Matrix4): boolean;

	/**
	 * Computes the bounding sphere of the tileset.
	 *
	 * @param sphere - Sphere to store the result
	 * @returns `true` if computed successfully, `false` if tileset not loaded
	 */
	getBoundingSphere(sphere: Sphere): boolean;

	/**
	 * Checks if a camera is registered with the renderer.
	 *
	 * @param camera - The camera to check
	 * @returns `true` if the camera is registered
	 */
	hasCamera(camera: Camera): boolean;

	/**
	 * Registers a camera for LOD calculations.
	 *
	 * The renderer uses registered cameras to determine which tiles to load
	 * based on screen space error. Multiple cameras can be registered for
	 * split-screen or multi-view scenarios.
	 *
	 * @param camera - The camera to register
	 * @returns `true` if the camera was added, `false` if already registered
	 *
	 * @example
	 * ```js
	 * renderer.setCamera(perspectiveCamera);
	 * renderer.setResolutionFromRenderer(perspectiveCamera, webglRenderer);
	 * ```
	 *
	 * @see {@link setResolution}
	 * @see {@link setResolutionFromRenderer}
	 */
	setCamera(camera: Camera): boolean;

	/**
	 * Unregisters a camera from the renderer.
	 *
	 * @param camera - The camera to remove
	 * @returns `true` if the camera was removed, `false` if not found
	 */
	deleteCamera(camera: Camera): boolean;

	/**
	 * Sets the render resolution for a camera.
	 *
	 * Resolution is used to calculate screen space error for LOD selection.
	 * Call this when the viewport size changes.
	 *
	 * @param camera - The camera to set resolution for
	 * @param x - Width in pixels
	 * @param y - Height in pixels
	 * @returns `true` if the resolution was set, `false` if camera not found
	 */
	setResolution(camera: Camera, x: number, y: number): boolean;

	/**
	 * Sets the render resolution for a camera using a Vector2.
	 *
	 * @param camera - The camera to set resolution for
	 * @param resolution - Resolution as Vector2 (width, height)
	 * @returns `true` if the resolution was set, `false` if camera not found
	 */
	setResolution(camera: Camera, resolution: Vector2): boolean;

	/**
	 * Sets the render resolution for a camera from a WebGLRenderer.
	 *
	 * Automatically accounts for device pixel ratio.
	 *
	 * @param camera - The camera to set resolution for
	 * @param renderer - The WebGLRenderer to get resolution from
	 * @returns `true` if the resolution was set, `false` if camera not found
	 *
	 * @example
	 * ```js
	 * // Update on window resize
	 * window.addEventListener('resize', () => {
	 *   webglRenderer.setSize(window.innerWidth, window.innerHeight);
	 *   renderer.setResolutionFromRenderer(camera, webglRenderer);
	 * });
	 * ```
	 */
	setResolutionFromRenderer(camera: Camera, renderer: WebGLRenderer): boolean;

	/**
	 * Iterates over all loaded models in the tileset.
	 *
	 * @param callback - Function called for each loaded model with the scene object and tile
	 *
	 * @example
	 * ```js
	 * // Apply a material to all loaded meshes
	 * renderer.forEachLoadedModel((scene, tile) => {
	 *   scene.traverse(child => {
	 *     if (child.isMesh) {
	 *       child.material = myMaterial;
	 *     }
	 *   });
	 * });
	 * ```
	 */
	forEachLoadedModel(callback: (scene: Object3D, tile: Tile) => void): void;

	/**
	 * Adds a listener to an event type.
	 *
	 * @param type - The type of event to listen to
	 * @param listener - The function that gets called when the event is fired
	 *
	 * @example
	 * ```js
	 * renderer.addEventListener('load-model', (event) => {
	 *   console.log('Model loaded:', event.scene);
	 * });
	 * ```
	 */
	addEventListener<T extends Extract<keyof TEventMap, string>>(
		type: T,
		listener: EventListener<TEventMap[T], T, this>
	): void;
	addEventListener<T extends string>(
		type: T,
		listener: EventListener<{}, T, this>
	): void;

	/**
	 * Checks if listener is added to an event type.
	 *
	 * @param type - The type of event to listen to
	 * @param listener - The function that gets called when the event is fired
	 * @returns `true` if the listener is registered for this event type
	 */
	hasEventListener<T extends Extract<keyof TEventMap, string>>(
		type: T,
		listener: EventListener<TEventMap[T], T, this>
	): boolean;
	hasEventListener<T extends string>(
		type: T,
		listener: EventListener<{}, T, this>
	): boolean;

	/**
	 * Removes a listener from an event type.
	 *
	 * @param type - The type of the listener that gets removed
	 * @param listener - The listener function that gets removed
	 */
	removeEventListener<T extends Extract<keyof TEventMap, string>>(
		type: T,
		listener: EventListener<TEventMap[T], T, this>
	): void;
	removeEventListener<T extends string>(
		type: T,
		listener: EventListener<{}, T, this>
	): void;

	/**
	 * Fire an event type.
	 *
	 * @param event - The event that gets fired
	 */
	dispatchEvent<T extends Extract<keyof TEventMap, string>>(
		event: BaseEvent<T> & TEventMap[T]
	): void;

}
