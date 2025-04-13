import { MathUtils } from 'three';
import { QuantizedMeshLoader } from './loaders/QuantizedMeshLoader.js';

const TILE_X = Symbol( 'TILE_X' );
const TILE_Y = Symbol( 'TILE_Y' );
const TILE_LEVEL = Symbol( 'TILE_LEVEL' );

// Checks if the given tile is available
function isAvailable( layer, level, x, y ) {

	const {
		minZoom,
		maxZoom,
		availability,
	} = layer;

	if ( level >= minZoom && level <= maxZoom && level < availability.length ) {

		// TODO: consider a binary search
		const availableSet = availability[ level ];
		for ( let i = 0, l = availableSet.length; i < l; i ++ ) {

			const { startX, startY, endX, endY } = availableSet[ i ];
			if ( x >= startX && x <= endX && y >= startY && y <= endY ) {

				return true;

			}

		}

	}

	return false;

}

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

	preprocessNode( tile, dir, parentTile ) {

		// generate children
		const { maxLevel } = this;
		const level = tile[ TILE_LEVEL ];
		if ( level < maxLevel ) {

			// marking the tiles as needing an update here prevents cases where we need to process children but there's a frame delay
			// meaning we may miss our chance on the next loop to perform an update if the "UpdateOnChange" plugin is being used.
			this.processQueue.add( tile, this.processCallback );
			this.needsUpdate = true;

		}

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
				window.LAYER = json;

				if ( json.extensions.length > 0 ) {

					tiles.fetchOptions.header[ 'Accept' ] += `;extensions=${ json.extensions.join( '-' ) }`;

				}

				const tileset = {
					asset: {
						version: '1.1'
					},
					geometricError: 1e5,
					root: {
						refine: 'REPLACE',
						geometricError: 1e5,
						boundingVolume: {},
						children: [],
					},
				};

				const xTiles = json.projection === 'EPSG:4326' ? 2 : 1;
				for ( let x = 0; x < xTiles; x ++ ) {

					const child = this.expand( 0, x, 0 );
					if ( child ) {

						tileset.root.children.push( child );

					}

				}

				return tileset;

			} );

	}

	expand( level, x, y ) {

		if ( ! isAvailable( this.layer, level, x, y ) ) {

			return null;

		}

		const { bounds } = this.layer;
		const west = MathUtils.DEG2RAD * bounds[ 0 ];
		const south = MathUtils.DEG2RAD * bounds[ 1 ];
		const east = MathUtils.DEG2RAD * bounds[ 2 ];
		const north = MathUtils.DEG2RAD * bounds[ 3 ];



		// TODO: how to calculate tile screen space error
		return {
			[ TILE_LEVEL ]: level,
			[ TILE_X ]: x,
			[ TILE_Y ]: y,
			geometricError: 1e5,
			boundingVolume: {
				region: [
					west, south, east, north,
					- 1000, 1000,
				],
			},
			children: []
		};

	}

	doTilesNeedUpdate() {

		if ( this.needsUpdate ) {

			this.needsUpdate = false;
			return true;

		}

		return null;

	}

	parseToMesh( buffer, tile, ...args ) {

		const [ west, south, east, north ] = tile.boundingVolume.region;

		// TODO: adjust the bounding box / region? Is it too late?
		const loader = new QuantizedMeshLoader( this.tiles.manager );
		loader.minLat = south;
		loader.maxLat = north;
		loader.minLon = west;
		loader.maxLat = east;

		const result = loader.parse( buffer );


		return result;

	}

}
