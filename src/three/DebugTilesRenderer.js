import { TilesRenderer } from './TilesRenderer.js';
import { DebugTilesPlugin } from './plugins/DebugTilesPlugin.js';

export * from './plugins/DebugTilesPlugin.js';

const DEBUG_PLUGIN = Symbol( 'DEBUG_PLUGIN' );
export class DebugTilesRenderer extends TilesRenderer {

	constructor( ...args ) {

		super( ...args );

		console.warn( 'DebugTilesRenderer: "DebugTilesRenderer" has been deprecated in favor of "DebugTilesPlugin".' );

		this[ DEBUG_PLUGIN ] = new DebugTilesPlugin();
		this.registerPlugin( this[ DEBUG_PLUGIN ] );

	}

}

[
	'displayBoxBounds',
	'displaySphereBounds',
	'displayRegionBounds',
	'colorMode',
	'customColorCallback',
	'boxGroup',
	'sphereGroup',
	'regionGroup',
	'maxDebugDepth',
	'maxDebugDistance',
	'maxDebugError',
	'getDebugColor',
	'extremeDebugDepth',
	'extremeDebugError',
].forEach( key => {

	Object.defineProperty(
		DebugTilesRenderer.prototype,
		key,
		{
			get() {

				return this[ DEBUG_PLUGIN ][ key ];

			},

			set( v ) {

				this[ DEBUG_PLUGIN ][ key ] = v;

			}

		}
	);

} );
