import { LoaderBase } from '3d-tiles-renderer/core';

/**
 * @classdesc
 * Authentication helper for Cesium Ion. Fetches and caches a bearer token from the
 * Cesium Ion endpoint and injects it into outgoing requests. Supports optional
 * automatic token refresh on 4xx responses.
 */
declare class CesiumIonAuth {
    /**
     * @param {Object} [options={}]
     * @param {string} options.apiToken
     * @param {boolean} [options.autoRefreshToken=false]
     */
    constructor(options?: {
        apiToken: string;
        autoRefreshToken?: boolean;
    });
    /**
     * The Cesium Ion access token.
     * @type {string}
     */
    apiToken: string;
    /**
     * Whether to automatically refresh the token on 4xx errors.
     * @type {boolean}
     */
    autoRefreshToken: boolean;
    /**
     * The endpoint URL used to fetch the bearer token.
     * @type {string|null}
     */
    authURL: string | null;
    fetch(url: any, options: any): Promise<Response>;
    refreshToken(options: any): any;
}

import type { TilesRendererBase } from "3d-tiles-renderer/core";
/**
 * @typedef {TilesRendererBase} TilesRendererBase
 */
/**
 * @callback AssetTypeHandlerCallback
 * @param {string} type - The Cesium Ion asset type (e.g. `'TERRAIN'`, `'GLTF'`, `'CZML'`).
 * @param {TilesRendererBase} tiles - The tiles renderer instance.
 * @param {Object} asset - The full asset endpoint JSON response.
 */
/**
 * @classdesc
 * Plugin for authenticating requests to Cesium Ion. Handles token refresh, asset endpoint
 * resolution, and attribution collection. Automatically registers a GoogleCloudAuthPlugin
 * when the resolved asset is an external Google photorealistic tileset.
 */
declare class CesiumIonAuthPlugin {
    /**
     * @param {Object} options
     * @param {string} options.apiToken
     * @param {number|null} [options.assetId=null]
     * @param {boolean} [options.autoRefreshToken=false]
     * @param {boolean} [options.useRecommendedSettings=true]
     * @param {AssetTypeHandlerCallback} [options.assetTypeHandler]
     */
    constructor(options?: {
        apiToken: string;
        assetId?: number | null;
        autoRefreshToken?: boolean;
        useRecommendedSettings?: boolean;
        assetTypeHandler?: AssetTypeHandlerCallback;
    });
    set apiToken(v: string);
    get apiToken(): string;
    set autoRefreshToken(v: boolean);
    get autoRefreshToken(): boolean;
    name: string;
    auth: CesiumIonAuth;
    /**
     * The Cesium Ion asset ID to load, or null if using an explicit root URL.
     * @type {number|null}
     */
    assetId: number | null;
    /**
     * Whether to apply recommended renderer settings for Cesium Ion assets.
     * @type {boolean}
     */
    useRecommendedSettings: boolean;
    /**
     * Callback invoked when the resolved Cesium Ion asset type is not `3DTILES`.
     * @type {AssetTypeHandlerCallback}
     */
    assetTypeHandler: AssetTypeHandlerCallback;
    /**
     * The TilesRenderer instance this plugin is registered with.
     * @type {Object|null}
     */
    tiles: any | null;
    init(tiles: any): void;
    loadRootTileset(): any;
    preprocessURL(uri: any): any;
    fetchData(uri: any, options: any): Promise<Response>;
    getAttributions(target: any): void;
}
import type { TilesRendererBase } from "3d-tiles-renderer/core";
type AssetTypeHandlerCallback = (type: string, tiles: TilesRendererBase, asset: any) => any;

/**
 * @classdesc
 * Authentication helper for Google Cloud Maps APIs. Manages session-token creation and
 * renewal for both the Photorealistic 3D Tiles API and the 2D Map Tiles API, injecting
 * the API key and session token into outgoing requests.
 */
declare class GoogleCloudAuth {
    /**
     * @param {Object} [options={}]
     * @param {string} options.apiToken
     * @param {{ mapType?: string, language?: string, region?: string, [key: string]: any }|null} [options.sessionOptions=null]
     * @param {boolean} [options.autoRefreshToken=false]
     */
    constructor(options?: {
        apiToken: string;
        sessionOptions?: {
            mapType?: string;
            language?: string;
            region?: string;
            [key: string]: any;
        } | null;
        autoRefreshToken?: boolean;
    });
    get isMapTilesSession(): boolean;
    /**
     * The Google Cloud API key.
     * @type {string}
     */
    apiToken: string;
    /**
     * Whether to automatically refresh the session token on 4xx errors.
     * @type {boolean}
     */
    autoRefreshToken: boolean;
    /**
     * The endpoint URL used to create or refresh the session token.
     * @type {string}
     */
    authURL: string;
    /**
     * The current session token, or null if not yet established.
     * @type {string|null}
     */
    sessionToken: string | null;
    /**
     * Session options passed as the POST body when creating a Map Tiles session.
     * @type {{ mapType?: string, language?: string, region?: string, [key: string]: any }|null}
     */
    sessionOptions: {
        mapType?: string;
        language?: string;
        region?: string;
        [key: string]: any;
    } | null;
    fetch(url: any, options: any): Promise<any>;
    refreshToken(options: any): any;
}

declare class GoogleAttributionsManager {
    creditsCount: {};
    addAttributions(line: any): void;
    removeAttributions(line: any): void;
    toString(): string;
}

/**
 * @classdesc
 * Plugin for authenticating requests to the Google Cloud Maps APIs, including the
 * Photorealistic 3D Tiles and 2D Map Tiles APIs. Handles session-token management,
 * per-tile attribution collection, and optional logo attribution.
 */
declare class GoogleCloudAuthPlugin {
    /**
     * @param {Object} options
     * @param {string} options.apiToken
     * @param {Object|null} [options.sessionOptions=null]
     * @param {boolean} [options.autoRefreshToken=false]
     * @param {string|null} [options.logoUrl=null]
     * @param {boolean} [options.useRecommendedSettings=true]
     */
    constructor({ apiToken, sessionOptions, autoRefreshToken, logoUrl, useRecommendedSettings, }: {
        apiToken: string;
        sessionOptions?: any | null;
        autoRefreshToken?: boolean;
        logoUrl?: string | null;
        useRecommendedSettings?: boolean;
    });
    name: string;
    /**
     * The Google Cloud API key.
     * @type {string}
     */
    apiToken: string;
    /**
     * Whether to apply recommended renderer settings for photorealistic tiles.
     * @type {boolean}
     */
    useRecommendedSettings: boolean;
    /**
     * URL of a logo image to include in attribution output, or null if not set.
     * @type {string|null}
     */
    logoUrl: string | null;
    auth: GoogleCloudAuth;
    /**
     * The TilesRenderer instance this plugin is registered with.
     * @type {Object|null}
     */
    tiles: any | null;
    init(tiles: any): void;
    getAttributions(target: any): void;
    dispose(): void;
    fetchData(uri: any, options: any): Promise<any>;
}

/**
 * @classdesc
 * Plugin that adds support for 3D Tiles 1.1 implicit tiling. Intercepts tiles that carry
 * an `implicitTiling` field and expands them by loading and parsing `.subtree` files,
 * generating child tiles according to the implicit subdivision scheme.
 */
declare class ImplicitTilingPlugin {
    name: string;
    init(tiles: any): void;
    tiles: any;
    preprocessNode(tile: any, tilesetDir: any, parentTile: any): void;
    parseTile(buffer: any, tile: any, extension: any): Promise<void>;
    preprocessURL(url: any, tile: any): any;
    disposeTile(tile: any): void;
}

/**
 * @classdesc
 * Plugin that ensures every tile has a non-zero geometric error. Tiles with a geometric
 * error of zero are assigned a derived value based on the nearest ancestor with a non-zero
 * error, halved once per level of depth below that ancestor.
 */
declare class EnforceNonZeroErrorPlugin {
    name: string;
    priority: number;
    originalError: Map<any, any>;
    preprocessNode(tile: any): void;
}

/**
 * @classdesc
 * Base loader for quantized-mesh terrain tiles. Parses the binary quantized-mesh format
 * into structured vertex, index, edge, and extension data. Sets the required `Accept`
 * header automatically. Subclasses should implement geometry construction from the
 * parsed result.
 * @augments LoaderBase
 */
declare class QuantizedMeshLoaderBase extends LoaderBase {
    constructor(...args: any[]);
    loadAsync(...args: any[]): Promise<any>;
    parse(buffer: any): {
        header: {
            center: number[];
            minHeight: number;
            maxHeight: number;
            sphereCenter: number[];
            sphereRadius: number;
            horizonOcclusionPoint: number[];
        };
        indices: any;
        vertexData: {
            u: Float32Array<ArrayBuffer>;
            v: Float32Array<ArrayBuffer>;
            height: Float32Array<ArrayBuffer>;
        };
        edgeIndices: {
            westIndices: any;
            southIndices: any;
            eastIndices: any;
            northIndices: any;
        };
        extensions: {
            octvertexnormals: {
                extensionId: number;
                normals: Float32Array<ArrayBuffer>;
            };
            watermask: {
                extensionId: number;
                mask: any;
                size: number;
            };
            metadata: {
                extensionId: number;
                json: any;
            };
        };
    };
}

export { CesiumIonAuth, CesiumIonAuthPlugin, EnforceNonZeroErrorPlugin, GoogleCloudAuth, GoogleCloudAuthPlugin, ImplicitTilingPlugin, QuantizedMeshLoaderBase };
export type { AssetTypeHandlerCallback };
