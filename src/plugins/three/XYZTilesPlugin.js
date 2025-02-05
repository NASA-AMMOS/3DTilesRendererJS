
// TODO: reuse functionality between DZI and this plugin
export class XYZTilesPlugin {

	constructor( options = {} ) {

		const {
			minZoom = 0,
			maxZoom = 19,
			pixelSize = 0.01,
			center = false,
		} = options;

		this.name = 'XYZ_TILES_PLUGIN';
		this.priority = - 10;
		this.tiles = null;

		this.minZoom = minZoom;
		this.maxZoom = maxZoom;
		this.pixelSize = pixelSize,
		this.center = center;

	}

	init( tiles ) {

		this.tiles = tiles;

	}

	loadRootTileSet() {

		const { center, tiles, minZoom, maxZoom, pixelSize } = this;

		// transform the url
		let url = tiles.rootURL;
		tiles.invokeAllPlugins( plugin => url = plugin.preprocessURL ? plugin.preprocessURL( url, null ) : url );

		const TILE_DIM = 256;
		const centerOffset = center ? pixelSize * - maxZoom * TILE_DIM / 2 : 0;
		const fullSize = TILE_DIM * ( 2 ** maxZoom );

		return expand( 0, 0, 0 );

		function expand( depth, x, y ) {

			const tileSize = fullSize * ( 2 ** - ( maxZoom - depth ) );
			const ratio = fullSize / tileSize;
			const centerX = tileSize * x + TILE_DIM / 2;
			const centerY = tileSize * y + TILE_DIM / 2;

			const node = {
				refine: 'REPLACE',
				geometricError: pixelSize * ( ( ( maxZoom + 1 ) / ( depth + 1 ) ) - 1 ),
				boundingVolume: {
					// DZI operates in a left handed coordinate system so we have to flip y to orient it correctly. FlipY
					// is also enabled on the image bitmap texture generation above.
					box: [
						// center
						ratio * pixelSize * centerX + centerOffset, ratio * - pixelSize * centerY - centerOffset, 0,

						// x, y, z half vectors
						pixelSize * tileSize / 2, 0.0, 0.0,
						0.0, pixelSize * tileSize / 2, 0.0,
						0.0, 0.0, 0,
					],
				},
				children: [],

			};

			if ( depth >= minZoom ) {

				node.content = { uri: url.replace( '{z}', depth ).replace( '{x}', x ).replace( '{y}', y ) };

			}

			if ( depth < maxZoom ) {

				for ( let cx = 0; cx < 2; cx ++ ) {

					for ( let cy = 0; cy < 2; cy ++ ) {

						node.children.push( expand( depth + 1, 2 * x + cx, 2 * y + cy ) );

					}

				}

			}

		}

	}

}
