
const TILE_X = Symbol( 'TILE_X' );
const TILE_Y = Symbol( 'TILE_Y' );
const TILE_LEVEL = Symbol( 'TILE_LEVEL' );

export class QuantizedMeshPlugin {

	constructor() {

		this.name = 'QUANTIZED_MESH_PLUGIN';

		this.tiles = null;
		this.layer = null;
		this.needsUpdate = true;

	}

	init( tiles ) {

		this.tiles = tiles;

		tiles.fetchOptions.header = tiles.fetchOptions.header || {};
		tiles.fetchOptions.header.Accept = 'application/vnd.quantized-mesh,application/octet-stream;q=0.9';

		this.processCallback = tile => {

			const level = tile[ TILE_LEVEL ];
			const x = tile[ TILE_X ];
			const y = tile[ TILE_Y ];
			for ( let cx = 0; cx < 2; cx ++ ) {

				for ( let cy = 0; cy < 2; cy ++ ) {

					const child = this.expand( level + 1, 2 * x + cx, 2 * y + cy );
					if ( child ) {

						tile.children.push( child );

					}

				}

			}

		};

	}

	loadRootTileSet() {

		const { tiles } = this;
		let url = new URL( 'layer.json', tiles.rootURL );
		tiles.invokeAllPlugins( plugin => url = plugin.preprocessURL ? plugin.preprocessURL( url, null ) : url );

		return tiles
			.invokeOnePlugin( plugin => plugin.fetchData && plugin.fetchData( url, this.tiles.fetchOptions ) )
			.then( res => res.json() )
			.then( json => {

				this.layer = json;
				return {
					asset: {
						version: '1.1'
					},
					geometricError: 1e5,
					root: {
						refine: 'REPLACE',
						geometricError: 1e5,
						boundingVolume: {},
						children: [ this.expand( 0, 0, 0 ) ],
					}
				};

			} );

	}

	expand( level, x, y ) {

		return {
			[ TILE_LEVEL ]: level,
			[ TILE_X ]: x,
			[ TILE_Y ]: y,
		};

	}

	doTilesNeedUpdate() {

		if ( this.needsUpdate ) {

			this.needsUpdate = false;
			return true;

		}

		return null;

	}


}
