import { BufferGeometry, BufferAttribute, Points, PointsMaterial } from 'three';

// Symbol for tagging tile objects created by this plugin
const TILE_NODE_KEY = Symbol( 'TILE_NODE_KEY' );

// Potree v1 point attribute byte layouts, keyed by attribute name string
const POTREE_V1_ATTR = {
	'POSITION_CARTESIAN': { byteSize: 12, numElements: 3, type: 'int32' },
	'COLOR_PACKED': { byteSize: 4, numElements: 4, type: 'uint8' },
	'RGB': { byteSize: 3, numElements: 3, type: 'uint8' },
	'RGBA': { byteSize: 4, numElements: 4, type: 'uint8' },
	'INTENSITY': { byteSize: 2, numElements: 1, type: 'uint16' },
	'INTENSITY_GRADIENT': { byteSize: 2, numElements: 1, type: 'uint16' },
	'CLASSIFICATION': { byteSize: 1, numElements: 1, type: 'uint8' },
	'NORMAL_FLOATS': { byteSize: 12, numElements: 3, type: 'float32' },
	'NORMAL_SPHEREMAPPED': { byteSize: 2, numElements: 2, type: 'uint8' },
	'NORMAL_OCT16': { byteSize: 2, numElements: 2, type: 'uint8' },
	'GPS_TIME': { byteSize: 8, numElements: 1, type: 'float64' },
	'RETURN_NUMBER': { byteSize: 1, numElements: 1, type: 'uint8' },
	'NUMBER_OF_RETURNS': { byteSize: 1, numElements: 1, type: 'uint8' },
	'SOURCE_ID': { byteSize: 2, numElements: 1, type: 'uint16' },
	'RGB565': { byteSize: 2, numElements: 1, type: 'uint16' },
};

// Byte size per element for Potree v2 type strings
function _v2ElementSize( type ) {

	switch ( type ) {

		case 'int8': case 'uint8': return 1;
		case 'int16': case 'uint16': return 2;
		case 'int32': case 'uint32': case 'float': return 4;
		case 'int64': case 'uint64': case 'double': return 8;
		default: return 4;

	}

}

// Build a 3D Tiles box array [cx,cy,cz, hx,0,0, 0,hy,0, 0,0,hz] from min/max
function _makeBox( min, max ) {

	const cx = ( min[ 0 ] + max[ 0 ] ) / 2;
	const cy = ( min[ 1 ] + max[ 1 ] ) / 2;
	const cz = ( min[ 2 ] + max[ 2 ] ) / 2;
	const hx = ( max[ 0 ] - min[ 0 ] ) / 2;
	const hy = ( max[ 1 ] - min[ 1 ] ) / 2;
	const hz = ( max[ 2 ] - min[ 2 ] ) / 2;
	return [ cx, cy, cz, hx, 0, 0, 0, hy, 0, 0, 0, hz ];

}

// Extract [min, max] arrays from a 3D Tiles box array
function _boxToMinMax( box ) {

	const [ cx, cy, cz, hx, , , , hy, , , , hz ] = box;
	return [
		[ cx - hx, cy - hy, cz - hz ],
		[ cx + hx, cy + hy, cz + hz ],
	];

}

// Compute the bounding box of a child octant by halving the parent bbox.
// Potree octant convention: bit2 (4)=x, bit1 (2)=y, bit0 (1)=z.
function _childBbox( parentMin, parentMax, octant ) {

	const mx = ( parentMin[ 0 ] + parentMax[ 0 ] ) / 2;
	const my = ( parentMin[ 1 ] + parentMax[ 1 ] ) / 2;
	const mz = ( parentMin[ 2 ] + parentMax[ 2 ] ) / 2;
	return [
		[
			( octant & 4 ) ? mx : parentMin[ 0 ],
			( octant & 2 ) ? my : parentMin[ 1 ],
			( octant & 1 ) ? mz : parentMin[ 2 ],
		],
		[
			( octant & 4 ) ? parentMax[ 0 ] : mx,
			( octant & 2 ) ? parentMax[ 1 ] : my,
			( octant & 1 ) ? parentMax[ 2 ] : mz,
		],
	];

}

// Parse a Potree v1 .hrc hierarchy file.
// Format: BFS-ordered 5-byte entries — childMask(uint8) + numPoints(uint32 LE).
// chunkRoot identifies the subtree directory where this chunk's data files live
// (e.g. 'r' for the root chunk → all data at octreeDir/r/{nodeKey}.bin).
function _parseHierarchyV1( buffer, chunkRoot ) {

	const view = new DataView( buffer );
	const hierarchy = new Map();
	const queue = [ 'r' ];
	let offset = 0;

	for ( let i = 0; offset + 5 <= buffer.byteLength; i ++, offset += 5 ) {

		const childMask = view.getUint8( offset );
		const numPoints = view.getUint32( offset + 1, true );
		const key = queue[ i ];
		if ( key === undefined ) break;

		hierarchy.set( key, { childMask, numPoints, chunkRoot } );

		for ( let octant = 0; octant < 8; octant ++ ) {

			if ( childMask & ( 1 << octant ) ) {

				queue.push( key + octant );

			}

		}

	}

	return hierarchy;

}

// Parse a Potree v2 hierarchy.bin file.
// Format: BFS-ordered 22-byte entries —
//   type(uint8) + childMask(uint8) + numPoints(uint32 LE) +
//   byteOffset(int64 LE) + byteSize(int64 LE).
// type 4 = proxy node pointing to a sub-hierarchy file; treated as leaf here.
function _parseHierarchyV2( buffer ) {

	const view = new DataView( buffer );
	const hierarchy = new Map();
	const queue = [ 'r' ];
	let offset = 0;

	for ( let i = 0; offset + 22 <= buffer.byteLength; i ++, offset += 22 ) {

		const type = view.getUint8( offset );
		const childMask = view.getUint8( offset + 1 );
		const numPoints = view.getUint32( offset + 2, true );
		const byteOffset = view.getBigInt64( offset + 6, true );
		const byteSize = view.getBigInt64( offset + 14, true );
		const key = queue[ i ];
		if ( key === undefined ) break;

		// Proxy nodes (type 4) reference a separate hierarchy file; treat as leaves
		const effectiveChildMask = ( type === 4 ) ? 0 : childMask;
		hierarchy.set( key, { childMask: effectiveChildMask, numPoints, byteOffset, byteSize } );

		for ( let octant = 0; octant < 8; octant ++ ) {

			if ( effectiveChildMask & ( 1 << octant ) ) {

				queue.push( key + octant );

			}

		}

	}

	return hierarchy;

}

/**
 * Plugin that adds support for Potree point cloud datasets (v1.x and v2.0).
 *
 * Auto-detects the version by probing for `metadata.json` (v2) or `cloud.js` (v1)
 * relative to `tiles.rootURL`. Builds a synthetic 3D Tiles tileset and streams
 * point cloud nodes on demand using the same lazy-expansion / disposal pattern as
 * `QuantizedMeshPlugin`.
 *
 * Potree uses additive LOD (`refine: 'ADD'`): parent nodes remain visible while
 * higher-density children load in.
 *
 * @param {Object} [options]
 * @param {boolean} [options.useRecommendedSettings=true] Lower `errorTarget` to 2 for tighter LOD.
 */
export class PotreePlugin {

	constructor( options = {} ) {

		const {
			useRecommendedSettings = true,
		} = options;

		this.name = 'POTREE_PLUGIN';
		this.priority = - 1000;

		this.tiles = null;
		this.useRecommendedSettings = useRecommendedSettings;

		this._version = null;
		this._metadata = null;
		this._hierarchy = null;
		this._dataBaseUrl = null;
		this._octreeUrl = null;

	}

	// Plugin lifecycle

	init( tiles ) {

		if ( this.useRecommendedSettings ) {

			tiles.errorTarget = 2;

		}

		this.tiles = tiles;

	}

	dispose() {

		this.tiles = null;
		this._hierarchy = null;
		this._metadata = null;

	}

	// Plugin hooks

	async loadRootTileset() {

		const { tiles } = this;

		// Resolve and normalize the base directory URL
		let baseUrl = new URL( tiles.rootURL, location.href ).href;
		tiles.invokeAllPlugins( plugin => {

			baseUrl = plugin.preprocessURL ? plugin.preprocessURL( baseUrl, null ) : baseUrl;

		} );

		if ( ! baseUrl.endsWith( '/' ) ) {

			baseUrl = baseUrl.slice( 0, baseUrl.lastIndexOf( '/' ) + 1 );

		}

		// Detect Potree version: try v2 (metadata.json) then v1 (cloud.js)
		let json = null;
		let version = null;

		const v2Url = new URL( 'metadata.json', baseUrl ).href;
		let res = await tiles.invokeOnePlugin( plugin => plugin.fetchData && plugin.fetchData( v2Url, tiles.fetchOptions ) );
		if ( res instanceof Response && res.ok ) {

			json = await res.json();
			version = 2;

		} else {

			const v1Url = new URL( 'cloud.js', baseUrl ).href;
			res = await tiles.invokeOnePlugin( plugin => plugin.fetchData && plugin.fetchData( v1Url, tiles.fetchOptions ) );
			if ( res instanceof Response && res.ok ) {

				json = await res.json();
				version = 1;

			} else {

				throw new Error( 'PotreePlugin: Could not find metadata.json or cloud.js at ' + baseUrl );

			}

		}

		this._version = version;
		this._metadata = version === 2 ? this._normalizeV2( json ) : this._normalizeV1( json );

		// Fetch and parse hierarchy
		if ( version === 2 ) {

			this._dataBaseUrl = baseUrl;
			this._octreeUrl = new URL( 'octree.bin', baseUrl ).href;

			const hierUrl = new URL( 'hierarchy.bin', baseUrl ).href;
			const hierRes = await tiles.invokeOnePlugin( plugin => plugin.fetchData && plugin.fetchData( hierUrl, tiles.fetchOptions ) );
			const hierBuf = await hierRes.arrayBuffer();
			this._hierarchy = _parseHierarchyV2( hierBuf );

		} else {

			const octreeDir = json.octreeDir || 'data';
			this._dataBaseUrl = new URL( octreeDir + '/', baseUrl ).href;

			// v1 layout: the root hierarchy and all its node data files live in
			// {octreeDir}/r/ — the chunk directory named after the chunk root key.
			const hierUrl = new URL( 'r/r.hrc', this._dataBaseUrl ).href;
			const hierRes = await tiles.invokeOnePlugin( plugin => plugin.fetchData && plugin.fetchData( hierUrl, tiles.fetchOptions ) );
			if ( ! hierRes.ok ) throw new Error( `PotreePlugin: Could not fetch hierarchy (${ hierRes.status }): ${ hierUrl }` );
			const hierBuf = await hierRes.arrayBuffer();
			this._hierarchy = _parseHierarchyV1( hierBuf, 'r' );

		}

		// Build synthetic 3D Tiles tileset
		const { spacing, boundingBox } = this._metadata;
		const { min, max } = boundingBox;

		const tileset = {
			asset: { version: '1.1' },
			geometricError: Infinity,
			root: {
				refine: 'ADD',
				geometricError: spacing,
				boundingVolume: { box: _makeBox( min, max ) },
				content: { uri: 'potree://r' },
				children: [],
				[ TILE_NODE_KEY ]: 'r',
			},
		};

		tiles.preprocessTileset( tileset, baseUrl );
		return tileset;

	}

	fetchData( uri, options ) {

		if ( ! String( uri ).startsWith( 'potree://' ) ) return null;

		const nodeKey = String( uri ).slice( 'potree://'.length );
		const node = this._hierarchy ? this._hierarchy.get( nodeKey ) : null;
		if ( ! node ) return null;

		if ( this._version === 2 ) {

			const start = node.byteOffset;
			const end = node.byteOffset + node.byteSize - 1n;
			return fetch( this._octreeUrl, {
				...options,
				headers: {
					...( options && options.headers ),
					Range: `bytes=${ start }-${ end }`,
				},
			} );

		} else {

			// v1: data files live in {octreeDir}/{chunkRoot}/{nodeKey}.bin
			return fetch( `${ this._dataBaseUrl }${ node.chunkRoot }/${ nodeKey }.bin`, options );

		}

	}

	parseToMesh( buffer, tile, extension, uri, abortSignal ) {

		if ( ! String( uri ).startsWith( 'potree://' ) ) return null;
		if ( abortSignal && abortSignal.aborted ) return null;

		const nodeKey = String( uri ).slice( 'potree://'.length );
		const node = this._hierarchy ? this._hierarchy.get( nodeKey ) : null;
		if ( ! node ) return null;

		const [ tileMin, tileMax ] = _boxToMinMax( tile.boundingVolume.box );
		const points = this._decodePointBuffer( buffer, node.numPoints, tileMin, tileMax );
		this._expandChildren( tile );
		return points;

	}

	disposeTile( tile ) {

		if ( ! ( TILE_NODE_KEY in tile ) ) return;

		const { processNodeQueue } = this.tiles;
		for ( let i = 0, l = tile.children.length; i < l; i ++ ) {

			processNodeQueue.remove( tile.children[ i ] );

		}

		tile.children.length = 0;

	}

	// --- Private helpers ---

	// Normalize cloud.js (v1) into the shared internal metadata format
	_normalizeV1( json ) {

		const scale = json.scale || 0.001;
		const bb = json.boundingBox;
		const min = [ bb.lx, bb.ly, bb.lz ];
		const max = [ bb.ux, bb.uy, bb.uz ];
		const spacing = json.spacing || 1;

		const attrNames = Array.isArray( json.pointAttributes )
			? json.pointAttributes
			: [ 'POSITION_CARTESIAN', 'COLOR_PACKED' ];

		const attributes = [];
		for ( let i = 0, l = attrNames.length; i < l; i ++ ) {

			const name = attrNames[ i ];
			const desc = POTREE_V1_ATTR[ name ];
			if ( ! desc ) {

				console.warn( `PotreePlugin: Unknown v1 attribute '${ name }', skipping` );
				continue;

			}

			// Position is decoded via scale + bbox-min offset; other attributes are raw
			const attrScale = name === 'POSITION_CARTESIAN' ? [ scale, scale, scale ] : null;
			const attrOffset = name === 'POSITION_CARTESIAN' ? min : null;
			attributes.push( { name, ...desc, scale: attrScale, offset: attrOffset } );

		}

		return {
			version: 1,
			spacing,
			scale: [ scale, scale, scale ],
			offset: min,
			boundingBox: { min, max },
			attributes,
		};

	}

	// Normalize metadata.json (v2) into the shared internal metadata format
	_normalizeV2( json ) {

		const scale = Array.isArray( json.scale )
			? json.scale
			: [ json.scale, json.scale, json.scale ];
		const offset = json.offset || [ 0, 0, 0 ];
		const bb = json.boundingBox;
		const min = Array.isArray( bb.min ) ? bb.min : [ bb.min[ 0 ], bb.min[ 1 ], bb.min[ 2 ] ];
		const max = Array.isArray( bb.max ) ? bb.max : [ bb.max[ 0 ], bb.max[ 1 ], bb.max[ 2 ] ];
		const spacing = json.spacing || 1;

		const attributes = ( json.attributes || [] ).map( attr => {

			const elementSize = attr.elementSize || _v2ElementSize( attr.type );
			const byteSize = attr.size || ( elementSize * ( attr.numElements || 1 ) );

			// v2 position is decoded with the top-level scale/offset from metadata
			const isPosition = attr.name === 'position';
			return {
				name: attr.name,
				type: attr.type,
				numElements: attr.numElements || 1,
				elementSize,
				byteSize,
				scale: isPosition ? scale : null,
				offset: isPosition ? offset : null,
			};

		} );

		return {
			version: 2,
			spacing,
			scale,
			offset,
			boundingBox: { min, max },
			attributes,
		};

	}

	// Decode a raw point buffer into a THREE.Points scene object.
	// Positions are stored relative to the tile bbox center for float32 precision.
	_decodePointBuffer( buffer, numPoints, tileMin, tileMax ) {

		const { _metadata: metadata } = this;
		const { attributes } = metadata;

		// Compute per-attribute byte offsets within the interleaved point record
		let stride = 0;
		const attrOffsets = attributes.map( attr => {

			const off = stride;
			stride += attr.byteSize;
			return off;

		} );

		// Locate the attributes we know how to decode
		const posIdx = attributes.findIndex( a =>
			a.name === 'POSITION_CARTESIAN' || a.name === 'position'
		);
		const colIdx = attributes.findIndex( a =>
			a.name === 'COLOR_PACKED' || a.name === 'RGB' || a.name === 'RGBA' ||
			a.name === 'rgb' || a.name === 'rgba'
		);
		const intIdx = attributes.findIndex( a =>
			a.name === 'INTENSITY' || a.name === 'intensity'
		);

		const positions = new Float32Array( numPoints * 3 );
		const colors = colIdx !== - 1 ? new Float32Array( numPoints * 3 ) : null;
		const intensities = intIdx !== - 1 ? new Float32Array( numPoints ) : null;

		// Use the tile's bbox center as local origin for float32 precision.
		// Points are stored relative to this center; points.position is set to it.
		const ocx = ( tileMin[ 0 ] + tileMax[ 0 ] ) / 2;
		const ocy = ( tileMin[ 1 ] + tileMax[ 1 ] ) / 2;
		const ocz = ( tileMin[ 2 ] + tileMax[ 2 ] ) / 2;

		const view = new DataView( buffer );

		for ( let i = 0; i < numPoints; i ++ ) {

			const base = i * stride;

			// Position
			if ( posIdx !== - 1 ) {

				const attr = attributes[ posIdx ];
				const off = base + attrOffsets[ posIdx ];
				let wx, wy, wz;

				if ( attr.type === 'int32' ) {

					const sc = attr.scale;
					// v1: positions are quantized relative to each node's own bbox min.
					// v2: positions use the global offset from metadata.json.
					const ofs = this._version === 1 ? tileMin : attr.offset;
					wx = view.getInt32( off, true ) * sc[ 0 ] + ofs[ 0 ];
					wy = view.getInt32( off + 4, true ) * sc[ 1 ] + ofs[ 1 ];
					wz = view.getInt32( off + 8, true ) * sc[ 2 ] + ofs[ 2 ];

				} else {

					// float / double position (uncommon but supported)
					wx = view.getFloat32( off, true );
					wy = view.getFloat32( off + 4, true );
					wz = view.getFloat32( off + 8, true );
					if ( attr.scale ) {

						const sc = attr.scale;
						const ofs = attr.offset || [ 0, 0, 0 ];
						wx = wx * sc[ 0 ] + ofs[ 0 ];
						wy = wy * sc[ 1 ] + ofs[ 1 ];
						wz = wz * sc[ 2 ] + ofs[ 2 ];

					}

				}

				positions[ i * 3 ] = wx - ocx;
				positions[ i * 3 + 1 ] = wy - ocy;
				positions[ i * 3 + 2 ] = wz - ocz;

			}

			// Color
			if ( colIdx !== - 1 && colors ) {

				const attr = attributes[ colIdx ];
				const off = base + attrOffsets[ colIdx ];

				if ( attr.type === 'uint16' ) {

					// v2 rgb stored as uint16 per channel (0–65535)
					colors[ i * 3 ] = view.getUint16( off, true ) / 65535;
					colors[ i * 3 + 1 ] = view.getUint16( off + 2, true ) / 65535;
					colors[ i * 3 + 2 ] = view.getUint16( off + 4, true ) / 65535;

				} else {

					// uint8 per channel (0–255): v1 COLOR_PACKED, RGB, RGBA; v2 rgb uint8
					colors[ i * 3 ] = view.getUint8( off ) / 255;
					colors[ i * 3 + 1 ] = view.getUint8( off + 1 ) / 255;
					colors[ i * 3 + 2 ] = view.getUint8( off + 2 ) / 255;

				}

			}

			// Intensity
			if ( intIdx !== - 1 && intensities ) {

				const off = base + attrOffsets[ intIdx ];
				intensities[ i ] = view.getUint16( off, true ) / 65535;

			}

		}

		const geometry = new BufferGeometry();
		geometry.setAttribute( 'position', new BufferAttribute( positions, 3 ) );
		if ( colors ) geometry.setAttribute( 'color', new BufferAttribute( colors, 3, true ) );
		if ( intensities ) geometry.setAttribute( 'intensity', new BufferAttribute( intensities, 1 ) );

		const material = new PointsMaterial( {
			vertexColors: !! colors,
			sizeAttenuation: false,
		} );

		// Offset the scene by the bbox center so positions are near the origin
		const points = new Points( geometry, material );
		points.position.set( ocx, ocy, ocz );
		points.updateMatrix();
		return points;

	}

	// Lazily attach child tiles based on the hierarchy childMask.
	// Called from parseToMesh after a node's content has been decoded.
	_expandChildren( tile ) {

		const nodeKey = tile[ TILE_NODE_KEY ];
		if ( nodeKey === undefined ) return;

		const node = this._hierarchy.get( nodeKey );
		if ( ! node || node.childMask === 0 ) return;

		const [ parentMin, parentMax ] = _boxToMinMax( tile.boundingVolume.box );
		const childError = tile.geometricError / 2;

		for ( let octant = 0; octant < 8; octant ++ ) {

			if ( ! ( node.childMask & ( 1 << octant ) ) ) continue;

			const childKey = nodeKey + octant;
			if ( ! this._hierarchy.has( childKey ) ) continue;

			const [ childMin, childMax ] = _childBbox( parentMin, parentMax, octant );
			tile.children.push( {
				refine: 'ADD',
				geometricError: childError,
				boundingVolume: { box: _makeBox( childMin, childMax ) },
				content: { uri: `potree://${ childKey }` },
				children: [],
				[ TILE_NODE_KEY ]: childKey,
			} );

		}

	}

}
