import { CesiumIonAuthPlugin as CesiumIonAuthPluginImpl } from '3d-tiles-renderer/core/plugins';
import { TMSTilesPlugin } from './images/EPSGTilesPlugin.js';
import { QuantizedMeshPlugin } from './QuantizedMeshPlugin.js';

/**
 * Plugin for authenticating requests to Cesium Ion. Handles token refresh, asset
 * endpoint resolution, and attribution collection. Auto-registration of terrain and
 * imagery plugins via `assetTypeHandler` is deprecated — provide a custom handler
 * instead.
 * @param {Object} [options]
 * @param {string} [options.apiToken] Cesium Ion API token.
 * @param {string|null} [options.assetId=null] Cesium Ion asset ID, or `null` when using an explicit root URL.
 * @param {boolean} [options.autoRefreshToken=false] Automatically refresh the token on 4xx errors.
 * @param {boolean} [options.useRecommendedSettings=true] Apply recommended renderer settings for Cesium Ion assets.
 * @param {Function} [options.assetTypeHandler] Callback `(type, tiles, asset)` invoked for non-3DTILES asset types.
 */
export class CesiumIonAuthPlugin extends CesiumIonAuthPluginImpl {

	constructor( options = {} ) {

		super( {
			assetTypeHandler: ( type, tiles, asset ) => {

				if ( type === 'TERRAIN' && tiles.getPluginByName( 'QUANTIZED_MESH_PLUGIN' ) === null ) {

					console.warn(
						'CesiumIonAuthPlugin: CesiumIonAuthPlugin plugin auto-registration has been deprecated. ' +
						'Please implement a custom "assetTypeHandler" for "TERRAIN" using "QuantizedMeshPlugin", instead.'
					);
					tiles.registerPlugin( new QuantizedMeshPlugin( {
						useRecommendedSettings: this.useRecommendedSettings,
					} ) );

				} else if ( type === 'IMAGERY' && tiles.getPluginByName( 'TMS_TILES_PLUGIN' ) === null ) {

					console.warn(
						'CesiumIonAuthPlugin: CesiumIonAuthPlugin plugin auto-registration has been deprecated. ' +
						'Please implement a custom "assetTypeHandler" for "IMAGERY" using "TMSTilesPlugin", instead.'
					);
					tiles.registerPlugin( new TMSTilesPlugin( {
						useRecommendedSettings: this.useRecommendedSettings,
						shape: 'ellipsoid',
					} ) );

				} else {

					console.warn( `CesiumIonAuthPlugin: Cesium Ion asset type "${ type }" unhandled.` );

				}

			},
			...options,
		} );

		if ( options.__suppress_warning__ ) {

			console.warn(
				'CesiumIonAuthPlugin: Plugin has been moved to "3d-tiles-renderer/core/plugins".'
			);

		}

	}

}
