import { MathUtils, Vector3 } from 'three';
import { QuantizedMeshLoader } from './loaders/QuantizedMeshLoader.js';

const TILE_X = Symbol( 'TILE_X' );
const TILE_Y = Symbol( 'TILE_Y' );
const TILE_LEVEL = Symbol( 'TILE_LEVEL' );
const TILE_AVAILABLE = Symbol( 'TILE_AVAILABLE' );

// We don't know the height ranges for the tile set on load so assume a large range and
// adjust it once the tiles have actually loaded based on the min and max height
const INITIAL_HEIGHT_RANGE = 1e4;
const _vec = /* @__PURE__ */ new Vector3();

// Checks if the given tile is available
function isTileAvailable( available, level, x, y ) {

	if ( level < available.length ) {

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

// Calculates the max level that can be loaded.
function getMaxLevel( layer ) {

	const { available = null, maxzoom = null } = layer;
	return maxzoom === null ? available.length : maxzoom;

}

// Calculates whether metadata availability is present - returns -1 if not.
function getMetadataAvailability( layer ) {

	const { metadataAvailability = - 1 } = layer;
	return metadataAvailability;

}

// Calculates whether the given tile should have metadata availability
function getTileHasMetadata( tile, layer ) {

	const level = tile[ TILE_LEVEL ];
	const metadataAvailability = getMetadataAvailability( layer );
	const maxLevel = getMaxLevel( layer );

	return level < maxLevel && metadataAvailability !== - 1 && ( level % metadataAvailability ) === 0;

}

// Constructs the url for the given tile content
function getContentUrl( x, y, level, version, layer ) {

	return layer.tiles[ 0 ]
		.replace( /{\s*z\s*}/g, level )
		.replace( /{\s*x\s*}/g, x )
		.replace( /{\s*y\s*}/g, y )
		.replace( /{\s*version\s*}/g, version );

}

export class QuantizedMeshPlugin {

	constructor( options = {} ) {

		const {
			useRecommendedSettings = true,
			skirtLength = null,
			smoothSkirtNormals = true,
			solid = false,
		} = options;

		this.name = 'QUANTIZED_MESH_PLUGIN';

		this.tiles = null;
		this.layer = null;
		this.useRecommendedSettings = useRecommendedSettings;
		this.skirtLength = skirtLength;
		this.smoothSkirtNormals = smoothSkirtNormals;
		this.solid = solid;
		this.attribution = null;

	}

	// Plugin function
	init( tiles ) {

		tiles.fetchOptions.header = tiles.fetchOptions.header || {};
		tiles.fetchOptions.header.Accept = 'application/vnd.quantized-mesh,application/octet-stream;q=0.9';

		if ( this.useRecommendedSettings ) {

			tiles.errorTarget = 2;

		}

		this.tiles = tiles;

	}

	// NOTE: we expand children only once the mesh data is loaded to ensure the mesh
	// data is ready for clipping
	// preprocessNode( tile, dir, parentTile ) {

	// 	// generate children
	// 	const level = tile[ TILE_LEVEL ];
	// 	const maxLevel = getMaxLevel( this.layer );
	// 	const hasMetadata = getTileHasMetadata( tile, this.layer );
	// 	if ( level >= 0 && level < maxLevel && ! hasMetadata ) {

	// 		this.expandChildren( tile );

	// 	}

	// }

	loadRootTileSet() {

		const { tiles } = this;

		// initialize href to resolve the root in case it's specified as a relative url
		let url = new URL( 'layer.json', new URL( tiles.rootURL, location.href ) );
		tiles.invokeAllPlugins( plugin => url = plugin.preprocessURL ? plugin.preprocessURL( url, null ) : url );

		return tiles
			.invokeOnePlugin( plugin => plugin.fetchData && plugin.fetchData( url, this.tiles.fetchOptions ) )
			.then( res => res.json() )
			.then( json => {

				this.layer = json;
				const {
					projection = 'EPSG:4326',
					extensions = [],
					attribution = '',
					available = null,
				} = json;

				if ( attribution ) {

					this.attribution = {
						value: attribution,
						type: 'string',
						collapsible: true,
					};

				}

				if ( extensions.length > 0 ) {

					tiles.fetchOptions.header[ 'Accept' ] += `;extensions=${ extensions.join( '-' ) }`;

				}

				const west = - 180 * MathUtils.DEG2RAD;
				const south = - 90 * MathUtils.DEG2RAD;
				const east = 180 * MathUtils.DEG2RAD;
				const north = 90 * MathUtils.DEG2RAD;

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

						[ TILE_AVAILABLE ]: available,
						[ TILE_LEVEL ]: - 1,
					},
				};

				const xTiles = projection === 'EPSG:4326' ? 2 : 1;
				for ( let x = 0; x < xTiles; x ++ ) {

					const step = ( east - west ) / xTiles;
					const region = [
						west + step * x, south, west + step * x + step, north,
						- INITIAL_HEIGHT_RANGE, INITIAL_HEIGHT_RANGE,
					];
					const child = this.createChild( 0, x, 0, region, available );
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

	async parseToMesh( buffer, tile, extension, uri ) {

		const ellipsoid = this.tiles.ellipsoid;
		const loader = new QuantizedMeshLoader( this.tiles.manager );
		loader.ellipsoid.copy( ellipsoid );

		loader.solid = this.solid;
		loader.smoothSkirtNormals = this.smoothSkirtNormals;
		loader.skirtLength = this.skirtLength === null ? tile.geometricError : this.skirtLength;

		let result;
		if ( extension === 'custom_split' ) {

			// split the parent tile
			const searchParams = new URL( uri ).searchParams;
			const left = searchParams.get( 'left' ) === 'true';
			const bottom = searchParams.get( 'bottom' ) === 'true';

			const [ west, south, east, north ] = tile.parent.boundingVolume.region;
			loader.minLat = south;
			loader.maxLat = north;
			loader.minLon = west;
			loader.maxLon = east;
			result = loader.clipToQuadrant( tile.parent.cached.scene, left, bottom );

		} else {

			const [ west, south, east, north ] = tile.boundingVolume.region;
			loader.minLat = south;
			loader.maxLat = north;
			loader.minLon = west;
			loader.maxLon = east;

			// parse the tile data
			result = loader.parse( buffer );

		}

		// adjust the bounding region to be more accurate based on the contents of the terrain file
		// NOTE: The debug region bounds are only created after the tile is first shown so the debug
		// region bounding volume will have the correct dimensions.
		const { minHeight, maxHeight, metadata } = result.userData;
		tile.boundingVolume.region[ 4 ] = minHeight;
		tile.boundingVolume.region[ 5 ] = maxHeight;
		tile.cached.boundingVolume.setRegionData( ellipsoid, ...tile.boundingVolume.region );

		// use the geometric error value if it's present
		if ( metadata ) {

			if ( 'geometricerror' in metadata ) {

				tile.geometricError = metadata.geometricerror;

			}

			// if the tile hasn't been expanded yet and isn't in the queue to do so then
			// mark it for expansion again
			const hasMetadata = getTileHasMetadata( tile, this.layer );
			if ( hasMetadata && 'available' in metadata && tile.children.length === 0 ) {

				// add an offset to account for the current and previous layers
				tile[ TILE_AVAILABLE ] = [
					...new Array( tile[ TILE_LEVEL ] + 1 ).fill( null ),
					...metadata.available,
				];

			}

		}

		// NOTE: we expand children only once the parent mesh data is loaded to ensure the mesh
		// data is ready for clipping. It's possible that this child data gets to the parse stage
		// first, otherwise, while the parent is still downloading.
		// Ideally we would be able to guarantee parents are loaded first but this is an odd case.
		this.expandChildren( tile );

		return result;

	}

	getAttributions( target ) {

		if ( this.attribution ) {

			target.push( this.attribution );

		}

	}

	// Local functions
	createChild( level, x, y, region, available ) {

		const { tiles, layer } = this;
		const isAvailable = available === null || isTileAvailable( available, level, x, y );
		const url = getContentUrl( x, y, level, 1, layer );
		const ellipsoid = tiles.ellipsoid;
		const [ , south, , north, , maxHeight ] = region;
		const midLat = ( south > 0 ) !== ( north > 0 ) ? 0 : Math.min( Math.abs( south ), Math.abs( north ) );

		ellipsoid.getCartographicToPosition( midLat, 0, maxHeight, _vec );
		_vec.z = 0;

		// https://github.com/CesiumGS/cesium/blob/53889cbed2a91d38e0fae4b6f2dcf6783632fc92/packages/engine/Source/Scene/QuadtreeTileProvider.js#L24-L31
		// Implicit quantized mesh tile error halves with every layer
		const xTiles = layer.projection === 'EPSG:4326' ? 2 : 1;
		const maxRadius = Math.max( ...ellipsoid.radius );
		const rootGeometricError = maxRadius * 2 * Math.PI * 0.25 / ( 65 * xTiles );
		const geometricError = rootGeometricError / ( 2 ** level );

		const tile = {
			[ TILE_AVAILABLE ]: null,
			[ TILE_LEVEL ]: level,
			[ TILE_X ]: x,
			[ TILE_Y ]: y,
			refine: 'REPLACE',
			geometricError: geometricError,
			boundingVolume: {
				region: region,
			},
			content: isAvailable ? { uri: url } : null,
			children: []
		};

		// if we're relying on tile metadata availability then skip storing the tile metadata
		if ( ! getTileHasMetadata( tile, layer ) ) {

			tile[ TILE_AVAILABLE ] = available;

		}

		return tile;

	}

	expandChildren( tile ) {

		tile.children.length = 0;
		tile.__childrenProcessed = 0;

		const level = tile[ TILE_LEVEL ];
		const x = tile[ TILE_X ];
		const y = tile[ TILE_Y ];
		const available = tile[ TILE_AVAILABLE ];

		const [ west, south, east, north, minHeight, maxHeight ] = tile.boundingVolume.region;
		const xStep = ( east - west ) / 2;
		const yStep = ( north - south ) / 2;

		let hasChildren = false;
		for ( let cx = 0; cx < 2; cx ++ ) {

			for ( let cy = 0; cy < 2; cy ++ ) {

				const region = [
					west + xStep * cx,
					south + yStep * cy,
					west + xStep * cx + xStep,
					south + yStep * cy + yStep,
					minHeight, maxHeight,
				];
				const child = this.createChild( level + 1, 2 * x + cx, 2 * y + cy, region, available );
				if ( child.content !== null ) {

					tile.children.push( child );
					hasChildren = true;

				} else {

					tile.children.push( child );
					child.content = { uri: `tile.custom_split?bottom=${ cy === 0 }&left=${ cx === 0 }` };

				}

			}

		}

		if ( ! hasChildren ) {

			tile.children.length = 0;

		}

	}

	fetchData( uri, options ) {

		if ( /custom_split/.test( uri ) ) {

			return {
				ok: true,
				arrayBuffer: async () => null,
			};

		}

	}

	disposeTile( tile ) {

		// dispose of the generated children past the metadata layer to avoid accumulating too much
		if ( getTileHasMetadata( tile, this.layer ) ) {

			tile.children.length = 0;
			tile.__childrenProcessed = 0;
			tile[ TILE_AVAILABLE ] = null;

		}

		tile.children.length = 0;
		tile.__childrenProcessed = 0;

	}

}
