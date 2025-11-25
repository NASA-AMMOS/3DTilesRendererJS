import { CesiumIonAuthPlugin as CesiumIonAuthPluginImpl } from '3d-tiles-renderer/core/plugins';
import { TMSTilesPlugin } from './images/EPSGTilesPlugin.js';
import { QuantizedMeshPlugin } from './QuantizedMeshPlugin.js';

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
