import { BufferGeometry, BufferAttribute, Points, PointsMaterial, DataTexture, NearestFilter } from 'three';

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

// sRGB transfer function to linear, with a lookup table for the 8-bit values
function srgbToLinear( c ) {

	return c < 0.04045 ? c * 0.0773993808 : Math.pow( c * 0.9478672986 + 0.0521327014, 2.4 );

}

const SRGB_LUT = new Float32Array( 256 );
for ( let i = 0; i < 256; i ++ ) {

	SRGB_LUT[ i ] = srgbToLinear( i / 255 );

}

// Point spacing is the average distance between points, so points are drawn somewhat larger than
// the spacing to cover the gaps between them. Potree uses the same factor.
const SPACING_COVERAGE_FACTOR = 1.7;

// Width of the visible node hierarchy texture, matching potree
const VISIBLE_NODES_TEXTURE_SIZE = 2048;

// Vertex shader chunk performing potree's per point size lookup: starting from the point's own
// node, walk down the visible node hierarchy texture through the octant containing the point.
// The returned depth is the number of levels displayed below the node at the point's position,
// and the point is sized to the spacing of that deepest level so the points of a coarse node
// shrink to match wherever finer nodes are displayed on top of it.
const VISIBLE_DEPTH_CHUNK = /* glsl */ `
	uniform sampler2D uVisibleNodes;
	uniform float uVNStart;
	uniform float uLevel;
	uniform float uNodeSize;
	uniform vec3 uNodeMinOffset;

	// number of set bits below the given bit index
	float numberOfOnes( float number, float index ) {

		float result = 0.0;
		for ( float i = 0.0; i < 8.0; i ++ ) {

			if ( i > index ) break;
			if ( mod( floor( number / pow( 2.0, i ) ), 2.0 ) != 0.0 ) result ++;

		}

		return result;

	}

	float getVisibleDepth( vec3 posInNode ) {

		vec3 offset = vec3( 0.0 );
		float iOffset = uVNStart;
		float depth = 0.0;
		for ( float i = 0.0; i < 20.0; i ++ ) {

			float nodeSize = uNodeSize / pow( 2.0, i );
			vec3 index3d = floor( ( posInNode - offset ) / nodeSize + 0.5 );
			float index = 4.0 * index3d.x + 2.0 * index3d.y + index3d.z;

			vec4 value = texture2D( uVisibleNodes, vec2( ( iOffset + 0.5 ) / ${ VISIBLE_NODES_TEXTURE_SIZE.toFixed( 1 ) }, 0.5 ) );
			float mask = floor( value.r * 255.0 + 0.5 );
			if ( mod( floor( mask / pow( 2.0, index ) ), 2.0 ) == 0.0 ) {

				return depth;

			}

			float advance =
				floor( value.g * 255.0 + 0.5 ) * 256.0 +
				floor( value.b * 255.0 + 0.5 ) +
				numberOfOnes( mask, index - 1.0 );
			iOffset += advance;
			depth ++;
			offset += nodeSize * 0.5 * index3d;

		}

		return depth;

	}
`;

// Rewires the material to size each point by the deepest visible node at its position, clamped
// the way potree does with its "minSize" of 2 pixels so distant points do not shrink below a
// pixel and drop out. Optionally the corners of the sprite are discarded so points draw as
// circles, which read as a continuous surface where they overlap rather than as a grid of
// squares.
function patchPointsMaterial( material, uniforms, roundPoints, minPointSize ) {

	material.onBeforeCompile = shader => {

		Object.assign( shader.uniforms, uniforms );

		shader.vertexShader = shader.vertexShader
			.replace(
				'uniform float size;',
				`uniform float size;
				${ VISIBLE_DEPTH_CHUNK }`
			)
			.replace(
				'#include <logdepthbuf_vertex>',
				`float visibleDepth = getVisibleDepth( position + uNodeMinOffset );
				gl_PointSize = ( size / pow( 2.0, visibleDepth ) ) * ( scale / - mvPosition.z );
				gl_PointSize = max( gl_PointSize, ${ minPointSize.toFixed( 1 ) } );
				#include <logdepthbuf_vertex>`
			);

		if ( roundPoints ) {

			shader.fragmentShader = shader.fragmentShader.replace(
				'#include <clipping_planes_fragment>',
				`#include <clipping_planes_fragment>
				vec2 pointOffset = gl_PointCoord - 0.5;
				if ( dot( pointOffset, pointOffset ) > 0.25 ) discard;`
			);

		}

	};

	material.customProgramCacheKey = () => `potree_points_${ roundPoints }_${ minPointSize }`;

}

// Byte size per element for Potree v2 type strings
function v2ElementSize( type ) {

	switch ( type ) {

		case 'int8': case 'uint8': return 1;
		case 'int16': case 'uint16': return 2;
		case 'int32': case 'uint32': case 'float': return 4;
		case 'int64': case 'uint64': case 'double': return 8;
		default: return 4;

	}

}

// Build a 3D Tiles box array [cx,cy,cz, hx,0,0, 0,hy,0, 0,0,hz] from min/max
function makeBoundingBox( min, max ) {

	const cx = ( min[ 0 ] + max[ 0 ] ) / 2;
	const cy = ( min[ 1 ] + max[ 1 ] ) / 2;
	const cz = ( min[ 2 ] + max[ 2 ] ) / 2;
	const hx = ( max[ 0 ] - min[ 0 ] ) / 2;
	const hy = ( max[ 1 ] - min[ 1 ] ) / 2;
	const hz = ( max[ 2 ] - min[ 2 ] ) / 2;
	return [ cx, cy, cz, hx, 0, 0, 0, hy, 0, 0, 0, hz ];

}

// Extract [min, max] arrays from a 3D Tiles box array
function boxToMinMax( box ) {

	const [ cx, cy, cz, hx, , , , hy, , , , hz ] = box;
	return [
		[ cx - hx, cy - hy, cz - hz ],
		[ cx + hx, cy + hy, cz + hz ],
	];

}

// Compute the bounding box of a child octant by halving the parent bbox.
// Potree octant convention: bit2 (4)=x, bit1 (2)=y, bit0 (1)=z.
function getChildBoundingBox( parentMin, parentMax, octant ) {

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

// Directory path of a v1 node's files, mirroring potree's "getHierarchyPath": the key digits
// grouped into subdirectories of "hierarchyStepSize" characters under the root chunk "r".
function v1HierarchyPath( key, stepSize ) {

	let path = 'r/';
	const indices = key.slice( 1 );
	const numParts = Math.floor( indices.length / stepSize );
	for ( let i = 0; i < numParts; i ++ ) {

		path += indices.substr( i * stepSize, stepSize ) + '/';

	}

	return path.slice( 0, - 1 );

}

// Parse a Potree v1 .hrc hierarchy chunk into the given map, rooted at "rootKey".
// Format: BFS-ordered 5-byte entries — childMask(uint8) + numPoints(uint32 LE). A chunk covers
// "hierarchyStepSize" levels below its root; nodes at the boundary carry their own .hrc file.
function v1ParseHierarchy( buffer, rootKey, hierarchy ) {

	const view = new DataView( buffer );
	const queue = [ rootKey ];
	let offset = 0;

	for ( let i = 0; offset + 5 <= buffer.byteLength; i ++, offset += 5 ) {

		const childMask = view.getUint8( offset );
		const numPoints = view.getUint32( offset + 1, true );
		const key = queue[ i ];

		if ( key === undefined ) {

			break;

		}

		hierarchy.set( key, { childMask, numPoints } );

		for ( let octant = 0; octant < 8; octant ++ ) {

			if ( childMask & ( 1 << octant ) ) {

				queue.push( key + octant );

			}

		}

	}

	return hierarchy;

}

// Parse a Potree v2 hierarchy.bin chunk into the given map, rooted at "rootKey".
// Format: BFS-ordered 22-byte entries —
//   type(uint8) + childMask(uint8) + numPoints(uint32 LE) +
//   byteOffset(int64 LE) + byteSize(int64 LE).
// Proxy entries (type 2) reference a sub-chunk elsewhere in the same file, whose first entry
// carries the node's real point data range, so they recurse rather than queue children. Since
// the whole file is fetched up front the sub-chunks are parsed eagerly.
function v2ParseHierarchy( buffer, rootKey, chunkStart, chunkSize, hierarchy ) {

	const view = new DataView( buffer, chunkStart, chunkSize );
	const queue = [ rootKey ];
	let offset = 0;

	for ( let i = 0; offset + 22 <= chunkSize; i ++, offset += 22 ) {

		const type = view.getUint8( offset );
		const childMask = view.getUint8( offset + 1 );
		let numPoints = view.getUint32( offset + 2, true );
		const byteOffset = view.getBigInt64( offset + 6, true );
		const byteSize = view.getBigInt64( offset + 14, true );
		const key = queue[ i ];

		if ( key === undefined ) {

			break;

		}

		// The first entry of a sub-chunk is the chunk root itself, replacing its proxy entry
		if ( type === 2 && i !== 0 ) {

			v2ParseHierarchy( buffer, key, Number( byteOffset ), Number( byteSize ), hierarchy );
			continue;

		}

		// nodes with no data erroneously report points (potree issue #1125)
		if ( byteSize === 0n ) {

			numPoints = 0;

		}

		hierarchy.set( key, { childMask, numPoints, byteOffset, byteSize } );

		for ( let octant = 0; octant < 8; octant ++ ) {

			if ( childMask & ( 1 << octant ) ) {

				queue.push( key + octant );

			}

		}

	}

	return hierarchy;

}

/**
 * Plugin that adds support for Potree point cloud datasets (v1.x and v2.0).
 *
 * `tiles.rootURL` must point directly to the dataset metadata file:
 * - Potree v1: `cloud.js`
 * - Potree v2: `metadata.json`
 *
 * The version is determined from the filename. Builds a synthetic 3D Tiles
 * tileset and streams point cloud nodes on demand using the same lazy-expansion
 * and disposal pattern as `QuantizedMeshPlugin`.
 *
 * Potree uses additive LOD (`refine: 'ADD'`): parent nodes remain visible while
 * higher-density children load in.
 *
 * @param {Object} [options]
 * @param {number} [options.pointScale=1] Multiplier on the point size, which is derived from the
 *   point spacing of the finest level displayed. Can be adjusted dynamically.
 * @param {boolean} [options.roundPoints=false] Clip the point sprites to a circle. Square
 *   points tile the surface with no gaps between them, matching the potree default.
 * @param {number} [options.minPointSize=2] Smallest point size in pixels, so distant points do
 *   not shrink below a pixel and drop out.
 */
export class PotreePlugin {

	get pointScale() {

		return this._pointScale;

	}

	set pointScale( value ) {

		if ( value !== this._pointScale ) {

			this._pointScale = value;
			this._updatePointScales();

		}

	}

	constructor( options = {} ) {

		const {
			pointScale = 1,
			roundPoints = false,
			minPointSize = 2,
		} = options;

		this.name = 'POTREE_PLUGIN';
		this.priority = - 1000;

		this.tiles = null;
		this.roundPoints = roundPoints;
		this.minPointSize = minPointSize;

		this._pointScale = pointScale;
		this._visibilityNeedsUpdate = false;
		this._onVisibilityChange = () => this._visibilityNeedsUpdate = true;
		this._onUpdateAfter = () => {

			if ( this._visibilityNeedsUpdate ) {

				this._visibilityNeedsUpdate = false;
				this._updateVisibleNodesTexture();

			}

		};

		// the visible node hierarchy shared by every material, encoded per texel as the octant
		// mask of the visible children (r) and the offset to the first of them (g, b)
		this._visibleNodesTexture = new DataTexture(
			new Uint8Array( VISIBLE_NODES_TEXTURE_SIZE * 4 ),
			VISIBLE_NODES_TEXTURE_SIZE,
			1,
		);
		this._visibleNodesTexture.minFilter = NearestFilter;
		this._visibleNodesTexture.magFilter = NearestFilter;

		this._version = null;
		this._metadata = null;
		this._hierarchy = null;
		this._dataBaseUrl = null;
		this._octreeUrl = null;
		this._loadedChunks = null;

	}

	// Plugin lifecycle

	init( tiles ) {

		this.tiles = tiles;

		// the displayed set of tiles determines the point sizes, so they are refreshed after the
		// traversal of any frame that changed which tiles are displayed
		tiles.addEventListener( 'tile-visibility-change', this._onVisibilityChange );
		tiles.addEventListener( 'update-after', this._onUpdateAfter );

	}

	dispose() {

		const { tiles } = this;
		tiles.removeEventListener( 'tile-visibility-change', this._onVisibilityChange );
		tiles.removeEventListener( 'update-after', this._onUpdateAfter );
		this._visibleNodesTexture.dispose();

		this.tiles = null;
		this._hierarchy = null;
		this._metadata = null;
		this._loadedChunks = null;

	}

	// Plugin hooks

	async loadRootTileset() {

		const { tiles } = this;

		// Resolve the metadata file URL (rootURL must point directly to cloud.js or metadata.json)
		let metaUrl = new URL( tiles.rootURL, location.href ).href;
		tiles.invokeAllPlugins( plugin => {

			metaUrl = plugin.preprocessURL ? plugin.preprocessURL( metaUrl, null ) : metaUrl;

		} );

		const metaFile = metaUrl.split( '/' ).pop();
		const baseUrl = metaUrl.slice( 0, metaUrl.lastIndexOf( '/' ) + 1 );

		// Version is determined by the metadata filename, not by probing
		const version = metaFile === 'metadata.json' ? 2 : 1;

		const res = await tiles.invokeOnePlugin( plugin => plugin.fetchData && plugin.fetchData( metaUrl, tiles.fetchOptions ) );
		if ( ! ( res instanceof Response ) || ! res.ok ) {

			throw new Error( `PotreePlugin: Could not fetch ${ metaUrl } (${ res && res.status })` );

		}

		const json = await res.json();

		this._version = version;
		this._metadata = version === 2 ? this._normalizeV2( json ) : this._normalizeV1( json );

		// Fetch and parse hierarchy
		if ( version === 2 ) {

			this._dataBaseUrl = baseUrl;
			this._octreeUrl = new URL( 'octree.bin', baseUrl ).href;

			// the root chunk spans the first "firstChunkSize" bytes and proxy entries reference
			// the sub-chunks by byte range, all within the same file
			const hierUrl = new URL( 'hierarchy.bin', baseUrl ).href;
			const hierRes = await tiles.invokeOnePlugin( plugin => plugin.fetchData && plugin.fetchData( hierUrl, tiles.fetchOptions ) );
			const hierBuf = await hierRes.arrayBuffer();
			const firstChunkSize = json.hierarchy ? json.hierarchy.firstChunkSize : hierBuf.byteLength;
			this._hierarchy = v2ParseHierarchy( hierBuf, 'r', 0, firstChunkSize, new Map() );

		} else {

			const octreeDir = json.octreeDir || 'data';
			this._dataBaseUrl = new URL( octreeDir + '/', baseUrl ).href;

			// v1 layout: each hierarchy chunk and the node data files for its levels live in a
			// directory derived from the chunk root key. The root chunk is at {octreeDir}/r/r.hrc.
			const hierUrl = new URL( 'r/r.hrc', this._dataBaseUrl ).href;
			const hierRes = await tiles.invokeOnePlugin( plugin => plugin.fetchData && plugin.fetchData( hierUrl, tiles.fetchOptions ) );
			const hierBuf = await hierRes.arrayBuffer();
			this._hierarchy = v1ParseHierarchy( hierBuf, 'r', new Map() );
			this._loadedChunks = new Set( [ 'r' ] );

		}

		// Build synthetic 3D Tiles tileset
		const { spacing, boundingBox } = this._metadata;
		const { min, max } = boundingBox;

		// 'r' is the Potree root node key; children are named r0, r1, … r7, r00, ...
		const tileset = {
			asset: { version: '1.1' },
			geometricError: Infinity,
			root: {
				refine: 'ADD',
				geometricError: spacing,
				boundingVolume: { box: makeBoundingBox( min, max ) },
				content: { uri: 'r.potree' },
				children: [],
			},
		};

		tiles.preprocessTileset( tileset, baseUrl );
		return tileset;

	}

	fetchData( uri, options ) {

		if ( ! /\.potree$/.test( String( uri ) ) ) {

			return null;

		}

		const nodeKey = String( uri ).split( '/' ).pop().replace( /\.potree$/, '' );
		const node = this._hierarchy.get( nodeKey );

		if ( this._version === 2 ) {

			// nodes with no data hold no byte range to request
			if ( node.byteSize === 0n ) {

				return new Response( new ArrayBuffer( 0 ) );

			}

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

			return this._fetchV1NodeData( nodeKey, options );

		}

	}

	// Fetch a v1 node's bin file, first loading the hierarchy chunk the node roots when it
	// sits at a chunk boundary so its children become expandable.
	async _fetchV1NodeData( nodeKey, options ) {

		const { hierarchyStepSize } = this._metadata;
		const level = nodeKey.length - 1;
		const path = v1HierarchyPath( nodeKey, hierarchyStepSize );

		if ( level > 0 && level % hierarchyStepSize === 0 && ! this._loadedChunks.has( nodeKey ) ) {

			this._loadedChunks.add( nodeKey );
			const hierRes = await fetch( `${ this._dataBaseUrl }${ path }/${ nodeKey }.hrc`, options );
			const hierBuf = await hierRes.arrayBuffer();
			v1ParseHierarchy( hierBuf, nodeKey, this._hierarchy );

		}

		return fetch( `${ this._dataBaseUrl }${ path }/${ nodeKey }.bin`, options );

	}

	parseToMesh( buffer, tile, extension, uri ) {

		if ( extension !== 'potree' ) {

			return null;

		}

		const nodeKey = String( uri ).split( '/' ).pop().replace( /\.potree$/, '' );
		const node = this._hierarchy.get( nodeKey );

		// the tile geometric error is the node's point spacing, which sets the point size
		const [ tileMin, tileMax ] = boxToMinMax( tile.boundingVolume.box );
		const points = this._decodePointBuffer( buffer, node.numPoints, tileMin, tileMax, tile.geometricError, nodeKey.length - 1 );
		this._expandChildren( tile );
		return points;

	}

	disposeTile( tile ) {

		if ( ! tile.content?.uri || ! /\.potree$/.test( tile.content.uri ) ) {

			return;

		}

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
		const hierarchyStepSize = json.hierarchyStepSize || 5;

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

			// Position is decoded via scale + node bbox-min offset; other attributes are raw
			const attrScale = name === 'POSITION_CARTESIAN' ? [ scale, scale, scale ] : null;
			const attrOffset = name === 'POSITION_CARTESIAN' ? min : null;
			attributes.push( { name, ...desc, scale: attrScale, offset: attrOffset } );

		}

		return {
			version: 1,
			spacing,
			hierarchyStepSize,
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

			const elementSize = attr.elementSize || v2ElementSize( attr.type );
			const byteSize = attr.size || ( elementSize * ( attr.numElements || 1 ) );

			// v2 position is decoded with the top-level scale/offset from metadata.json
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
	_decodePointBuffer( buffer, numPoints, tileMin, tileMax, spacing, level ) {

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
					colors[ i * 3 ] = srgbToLinear( view.getUint16( off, true ) / 65535 );
					colors[ i * 3 + 1 ] = srgbToLinear( view.getUint16( off + 2, true ) / 65535 );
					colors[ i * 3 + 2 ] = srgbToLinear( view.getUint16( off + 4, true ) / 65535 );

				} else {

					// uint8 per channel (0–255): v1 COLOR_PACKED, RGB, RGBA; v2 rgb uint8
					colors[ i * 3 ] = SRGB_LUT[ view.getUint8( off ) ];
					colors[ i * 3 + 1 ] = SRGB_LUT[ view.getUint8( off + 1 ) ];
					colors[ i * 3 + 2 ] = SRGB_LUT[ view.getUint8( off + 2 ) ];

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

		if ( colors ) {

			geometry.setAttribute( 'color', new BufferAttribute( colors, 3, true ) );

		}

		if ( intensities ) {

			geometry.setAttribute( 'intensity', new BufferAttribute( intensities, 1 ) );

		}

		// The material size is the point spacing of the node's own level, in world units. The
		// vertex shader divides it by two for every level of the visible node hierarchy displayed
		// below the node at the point's position.
		const material = new PointsMaterial( {
			vertexColors: !! colors,
			sizeAttenuation: true,
			size: spacing * SPACING_COVERAGE_FACTOR * this._pointScale,
		} );
		material.userData.spacing = spacing;
		material.userData.uniforms = {
			uVisibleNodes: { value: this._visibleNodesTexture },
			uVNStart: { value: 0 },
			uLevel: { value: level },
			uNodeSize: { value: ( tileMax[ 0 ] - tileMin[ 0 ] ) },
			uNodeMinOffset: { value: [ ocx - tileMin[ 0 ], ocy - tileMin[ 1 ], ocz - tileMin[ 2 ] ] },
		};

		patchPointsMaterial( material, material.userData.uniforms, this.roundPoints, this.minPointSize );

		// Offset the mesh by the tile bbox center so positions are near the origin
		const points = new Points( geometry, material );
		points.position.set( ocx, ocy, ocz );
		points.updateMatrix();
		return points;

	}

	// Encode the displayed tile hierarchy into the visible nodes texture the way potree does: one
	// texel per displayed tile in breadth-first order holding the octant mask of its displayed
	// children and the offset from the tile's texel to its first child's, and assign each tile's
	// starting texel index. The shader walks this structure per point.
	_updateVisibleNodesTexture() {

		const { tiles } = this;
		const { visibleTiles } = tiles;

		// collect the displayed tiles in breadth-first order
		const list = [];
		const indices = new Map();
		if ( tiles.root && visibleTiles.has( tiles.root ) ) {

			list.push( tiles.root );

		}

		for ( let i = 0; i < list.length && list.length < VISIBLE_NODES_TEXTURE_SIZE; i ++ ) {

			indices.set( list[ i ], i );
			const children = list[ i ].children;
			for ( let c = 0, l = children.length; c < l; c ++ ) {

				if ( visibleTiles.has( children[ c ] ) ) {

					list.push( children[ c ] );

				}

			}

		}

		// encode the mask and first child offset of every displayed tile
		const texture = this._visibleNodesTexture;
		const data = texture.image.data;
		data.fill( 0 );
		for ( let i = 0, l = Math.min( list.length, VISIBLE_NODES_TEXTURE_SIZE ); i < l; i ++ ) {

			const tile = list[ i ];
			let mask = 0;
			let firstChildIndex = 0;
			const children = tile.children;
			for ( let c = 0, cl = children.length; c < cl; c ++ ) {

				const child = children[ c ];
				const childIndex = indices.get( child );
				if ( childIndex === undefined ) {

					continue;

				}

				// the child key's last digit is its octant within the parent
				const uri = child.content.uri;
				const octant = parseInt( uri.charAt( uri.length - '.potree'.length - 1 ) );
				mask |= 1 << octant;
				firstChildIndex = firstChildIndex === 0 ? childIndex : Math.min( firstChildIndex, childIndex );

			}

			const advance = firstChildIndex === 0 ? 0 : firstChildIndex - i;
			data[ i * 4 ] = mask;
			data[ i * 4 + 1 ] = advance >> 8;
			data[ i * 4 + 2 ] = advance & 0xff;

		}

		texture.needsUpdate = true;

		// point each displayed tile's material at its texel
		tiles.forEachLoadedModel( ( scene, tile ) => {

			const index = indices.get( tile );
			if ( index === undefined ) {

				return;

			}

			scene.traverse( c => {

				if ( c.isPoints ) {

					c.material.userData.uniforms.uVNStart.value = index;

				}

			} );

		} );

	}

	// Refresh the material sizes of the loaded tiles for the current point scale
	_updatePointScales() {

		const { tiles } = this;
		if ( ! tiles ) {

			return;

		}

		tiles.forEachLoadedModel( scene => {

			scene.traverse( c => {

				if ( c.isPoints ) {

					c.material.size = c.material.userData.spacing * SPACING_COVERAGE_FACTOR * this._pointScale;

				}

			} );

		} );

	}

	// Lazily attach child tiles based on the hierarchy childMask.
	// Called from parseToMesh after a node's content has been decoded.
	_expandChildren( tile ) {

		const nodeKey = tile.content.uri.split( '/' ).pop().replace( /\.potree$/, '' );
		const node = this._hierarchy.get( nodeKey );

		if ( ! node || node.childMask === 0 ) {

			return;

		}

		const [ parentMin, parentMax ] = boxToMinMax( tile.boundingVolume.box );
		const childError = tile.geometricError / 2;

		for ( let octant = 0; octant < 8; octant ++ ) {

			if ( ! ( node.childMask & ( 1 << octant ) ) ) {

				continue;

			}

			const childKey = nodeKey + octant;

			if ( ! this._hierarchy.has( childKey ) ) {

				continue;

			}

			const [ childMin, childMax ] = getChildBoundingBox( parentMin, parentMax, octant );
			tile.children.push( {
				refine: 'ADD',
				geometricError: childError,
				boundingVolume: { box: makeBoundingBox( childMin, childMax ) },
				content: { uri: `${ childKey }.potree` },
				children: [],
			} );

		}

	}

}
