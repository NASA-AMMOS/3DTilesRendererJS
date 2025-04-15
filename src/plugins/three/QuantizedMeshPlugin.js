import { MathUtils, Vector3 } from 'three';
import { QuantizedMeshLoader } from './loaders/QuantizedMeshLoader.js';
import { PriorityQueue } from '../../utilities/PriorityQueue.js';

const TILE_X = Symbol( 'TILE_X' );
const TILE_Y = Symbol( 'TILE_Y' );
const TILE_LEVEL = Symbol( 'TILE_LEVEL' );

// We don't know the height ranges for the tile set on load so assume a large range and
// adjust it once the tiles have actually loaded based on the min and max height
const INITIAL_HEIGHT_RANGE = 1e5;
const _vec = /* @__PURE__ */ new Vector3();

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

	get maxLevel() {

		return this.layer.available.length;

	}

	constructor( { useRecommendedSettings = true } ) {

		this.name = 'QUANTIZED_MESH_PLUGIN';

		this.tiles = null;
		this.layer = null;
		this.processQueue = null;
		this.useRecommendedSettings = useRecommendedSettings;
		this.needsUpdate = true;

	}

	init( tiles ) {

		const processQueue = new PriorityQueue();
		processQueue.priorityCallback = tiles.downloadQueue.priorityCallback;
		processQueue.maxJobs = 20;

		tiles.fetchOptions.header = tiles.fetchOptions.header || {};
		tiles.fetchOptions.header.Accept = 'application/vnd.quantized-mesh,application/octet-stream;q=0.9';

		if ( this.useRecommendedSettings ) {

			tiles.errorTarget = 2;

		}

		this.tiles = tiles;
		this.processQueue = processQueue;
		this.processCallback = tile => {

			const level = tile[ TILE_LEVEL ];
			const x = tile[ TILE_X ];
			const y = tile[ TILE_Y ];

			const [ west, south, east, north, minHeight, maxHeight ] = tile.boundingVolume.region;
			const xStep = ( east - west ) / 2;
			const yStep = ( north - south ) / 2;
			for ( let cx = 0; cx < 2; cx ++ ) {

				for ( let cy = 0; cy < 2; cy ++ ) {

					const region = [
						west + xStep * cx,
						south + yStep * cy,
						west + xStep * cx + xStep,
						south + yStep * cy + yStep,
						minHeight, maxHeight,
					];
					const child = this.expand( level + 1, 2 * x + cx, 2 * y + cy, region );
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
					geometricError: Infinity,
					root: {
						refine: 'REPLACE',
						geometricError: Infinity,
						boundingVolume: {
							region: [
								west, south, east, north,
								- INITIAL_HEIGHT_RANGE, INITIAL_HEIGHT_RANGE,
							],
						},
						children: [],
					},
				};

				const xTiles = json.projection === 'EPSG:4326' ? 2 : 1;
				for ( let x = 0; x < xTiles; x ++ ) {

					const step = ( east - west ) / xTiles;
					const region = [
						west + step * x, south, west + step * x + step, north,
						- INITIAL_HEIGHT_RANGE, INITIAL_HEIGHT_RANGE,
					];
					const child = this.expand( 0, x, 0, region );
					if ( child ) {

						tileset.root.children.push( child );

					}

				}

				let baseUrl = tiles.rootURL;
				tiles.invokeAllPlugins( plugin => baseUrl = plugin.preprocessURL ? plugin.preprocessURL( baseUrl, null ) : baseUrl );
				this.tiles.preprocessTileSet( tileset, baseUrl );

				return tileset;

			} );

	}

	expand( level, x, y, region ) {

		if ( ! isAvailable( this.layer, level, x, y ) ) {

			return null;

		}

		const url = this.layer.tiles[ 0 ]
			.replace( /{\s*z\s*}/g, level )
			.replace( /{\s*x\s*}/g, x )
			.replace( /{\s*y\s*}/g, y )
			.replace( /{\s*version\s*}/g, 1 );

		const { tiles } = this;
		const ellipsoid = tiles.ellipsoid;
		const [ , south, , north, , maxHeight ] = region;
		const midLat = ( south > 0 ) !== ( north > 0 ) ? 0 : Math.min( Math.abs( south ), Math.abs( north ) );

		ellipsoid.getCartographicToPosition( midLat, 0, maxHeight, _vec );
		_vec.z = 0;

		// https://github.com/CesiumGS/cesium/blob/53889cbed2a91d38e0fae4b6f2dcf6783632fc92/packages/engine/Source/Scene/QuadtreeTileProvider.js#L24-L31
		// Implicit quantized mesh tile error halves with every layer
		const xTiles = this.layer.projection === 'EPSG:4326' ? 2 : 1;
		const maxRadius = Math.max( ...ellipsoid.radius );
		const rootGeometricError = maxRadius * 2 * Math.PI * 0.25 / ( 65 * xTiles );
		const geometricError = rootGeometricError / ( 2 ** level );

		return {
			[ TILE_LEVEL ]: level,
			[ TILE_X ]: x,
			[ TILE_Y ]: y,
			refine: 'REPLACE',
			geometricError: geometricError,
			boundingVolume: {
				region: region,
			},
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

		const ellipsoid = this.tiles.ellipsoid;
		const [ west, south, east, north ] = tile.boundingVolume.region;
		const loader = new QuantizedMeshLoader( this.tiles.manager );
		loader.minLat = south;
		loader.maxLat = north;
		loader.minLon = west;
		loader.maxLon = east;
		loader.ellipsoid.copy( ellipsoid );

		// parse the tile data
		const result = loader.parse( buffer );

		// adjust the bounding region to be more accurate based on the contents of the terrain file
		// NOTE: The debug region bounds are only created after the tile is first shown so the debug
		// region bounding volume will have the correct dimensions.
		const { minHeight, maxHeight, metadata } = result.userData;
		tile.boundingVolume.region[ 4 ] = minHeight;
		tile.boundingVolume.region[ 5 ] = maxHeight;
		tile.cached.boundingVolume.setRegionData( ellipsoid, ...tile.boundingVolume.region );

		// use the geometric error value if it's present
		if ( metadata && 'geometricerror' in metadata ) {

			tile.geometricError = metadata.geometricerror;


		}

		return result;

	}

}
