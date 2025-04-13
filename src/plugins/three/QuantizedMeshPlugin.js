import { MathUtils } from 'three';
import { QuantizedMeshLoader } from './loaders/QuantizedMeshLoader.js';

const TILE_X = Symbol( 'TILE_X' );
const TILE_Y = Symbol( 'TILE_Y' );
const TILE_LEVEL = Symbol( 'TILE_LEVEL' );

// Checks if the given tile is available
function isAvailable( layer, level, x, y ) {

	const {
		minzoom,
		maxzoom,
		available,
	} = layer;

	if ( level >= minzoom && level <= maxzoom && level < available.length ) {

		// TODO: consider a binary search
		const availableSet = available[ level ];
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

			const [ west, south, east, north, minHeight, maxHeight ] = tile;
			const xStep = ( east - west ) / 2;
			const yStep = ( north - south ) / 2;
			for ( let cx = 0; cx < 2; cx ++ ) {

				for ( let cy = 0; cy < 2; cy ++ ) {

					const child = this.expand( level + 1, 2 * x + cx, 2 * y + cy );
					if ( child ) {

						child.boundingVolume.region = [
							west + xStep * cx,
							south + yStep * cy,
							west + xStep * cx + xStep,
							south + yStep * cy + yStep,
							minHeight, maxHeight,
						];
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

				if ( json.extensions.length > 0 ) {

					tiles.fetchOptions.header[ 'Accept' ] += `;extensions=${ json.extensions.join( '-' ) }`;

				}

				const { bounds } = json;
				const west = MathUtils.DEG2RAD * bounds[ 0 ];
				const south = MathUtils.DEG2RAD * bounds[ 1 ];
				const east = MathUtils.DEG2RAD * bounds[ 2 ];
				const north = MathUtils.DEG2RAD * bounds[ 3 ];

				const tileset = {
					asset: {
						version: '1.1'
					},
					geometricError: 1e5,
					root: {
						refine: 'REPLACE',
						geometricError: 1e5,
						boundingVolume: {
							region: [
								west, south, east, north,
								- 1000, 1000,
							],
						},
						children: [],
					},
				};

				const xTiles = json.projection === 'EPSG:4326' ? 2 : 1;
				for ( let x = 0; x < xTiles; x ++ ) {

					const child = this.expand( 0, x, 0, tileset.root );
					if ( child ) {

						tileset.root.children.push( child );

						const w = east - west;
						const step = w / xTiles;
						child.boundingVolume.region = [
							west + step * x, south, west + step * x + step, north,
							- 1000, 1000,
						];

					}

				}

				let baseUrl = tiles.rootURL;
				tiles.invokeAllPlugins( plugin => baseUrl = plugin.preprocessURL ? plugin.preprocessURL( baseUrl, null ) : baseUrl );
				this.tiles.preprocessTileSet( tileset, baseUrl );

				return tileset;

			} );

	}

	expand( level, x, y ) {

		if ( ! isAvailable( this.layer, level, x, y ) ) {

			return null;

		}

		const url = this.layer.tiles[ 0 ]
			.replace( /{\s*z\s*}/g, level )
			.replace( /{\s*x\s*}/g, x )
			.replace( /{\s*y\s*}/g, y )
			.replace( /{\s*version\s*}/g, 1 );

		// TODO: how to calculate tile screen space error
		// TODO: we can make a guess at how much detail the lowest LoD has relative to the highest tile
		// TODO: geometric error is present in the loaded tile metadata as well
		return {
			[ TILE_LEVEL ]: level,
			[ TILE_X ]: x,
			[ TILE_Y ]: y,
			refine: 'REPLACE',
			geometricError: 1e5,
			boundingVolume: {},
			content: {
				uri: url,
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

	parseToMesh( buffer, tile ) {

		const [ west, south, east, north ] = tile.boundingVolume.region;
		const loader = new QuantizedMeshLoader( this.tiles.manager );
		loader.minLat = south;
		loader.maxLat = north;
		loader.minLon = west;
		loader.maxLat = east;
		loader.ellipsoid.copy( this.tiles.ellipsoid );

		const result = loader.parse( buffer );
		console.log('GOT')

		// TODO: adjust the bounding box / region? Is it too late?

		return result;

	}

}
