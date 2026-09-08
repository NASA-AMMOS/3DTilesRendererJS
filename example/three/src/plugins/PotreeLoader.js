import { BufferGeometry, BufferAttribute, Color, SRGBColorSpace, Vector3 } from 'three';

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

// Colors are stored as sRGB and converted to working-space values via a lookup table for the
// 8-bit values
const _color = /* @__PURE__ */ new Color();
const SRGB_LUT = /* @__PURE__ */ new Float32Array( 256 );
for ( let i = 0; i < 256; i ++ ) {

	SRGB_LUT[ i ] = _color.setRGB( i / 255, 0, 0, SRGBColorSpace ).r;

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

// Directory path of a v1 node's files, mirroring potree's "getHierarchyPath": the key digits
// grouped into subdirectories of "hierarchyStepSize" characters under the root chunk "r"
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
// Format: BFS-ordered 5-byte entries of childMask(uint8) + numPoints(uint32 LE). A chunk covers
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

}

// Parse a Potree v2 hierarchy.bin chunk into the given map, rooted at "rootKey".
// Format: BFS-ordered 22-byte entries of type(uint8) + childMask(uint8) + numPoints(uint32 LE) +
// byteOffset(int64 LE) + byteSize(int64 LE). Proxy entries (type 2) reference a sub-chunk
// elsewhere in the same file, whose first entry carries the node's real point data range, so
// they recurse rather than queue children. The whole file is fetched up front so the sub-chunks
// are parsed eagerly.
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

		// the first entry of a sub-chunk is the chunk root itself, replacing its proxy entry
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

}

/**
 * Computes the min / max bounds of a child octant by halving the parent bounds.
 * Potree octant convention: bit2 (4)=x, bit1 (2)=y, bit0 (1)=z.
 * @param {number[]} parentMin
 * @param {number[]} parentMax
 * @param {number} octant
 * @returns {[number[], number[]]}
 */
export function getChildBounds( parentMin, parentMax, octant ) {

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

/**
 * Loader for Potree point cloud datasets (v1.x and v2.0), separate from any rendering concerns.
 * Loads and normalizes the dataset metadata, loads the node hierarchy including its lazily
 * chunked portions, and parses raw node point buffers into buffer geometry.
 *
 * The dataset version is determined by the metadata filename: `cloud.js` for v1 and
 * `metadata.json` for v2. Network requests go through the overridable `fetchData` callback.
 */
export class PotreeLoader {

	constructor() {

		/**
		 * Options passed to `fetchData` when loading content.
		 * @type {Object}
		 * @default {}
		 */
		this.fetchOptions = {};

		/**
		 * Potree format major version, available after `load`.
		 * @type {number|null}
		 */
		this.version = null;

		/**
		 * Normalized dataset metadata with `spacing`, `boundingBox` and point `attributes`
		 * fields, available after `load`.
		 * @type {Object|null}
		 */
		this.metadata = null;

		/**
		 * Node hierarchy keyed by node name ("r", "r0", ...), each entry holding `childMask` and
		 * `numPoints`. Grows as chunked portions of the hierarchy load with the node data.
		 * @type {Map<string, Object>|null}
		 */
		this.hierarchy = null;

		this._dataUrl = null;
		this._octreeUrl = null;
		this._loadedChunks = null;

	}

	/**
	 * Fetches the given url. Can be overridden to route requests through download queues or
	 * other plugins.
	 * @param {string} url
	 * @param {Object} options
	 * @returns {Promise<Response>}
	 */
	fetchData( url, options ) {

		return fetch( url, options );

	}

	/**
	 * Loads the dataset metadata and root hierarchy from the given metadata file url.
	 * @param {string} url Full url of the `cloud.js` or `metadata.json` file.
	 * @returns {Promise}
	 */
	async load( url ) {

		const file = url.split( '/' ).pop();
		const baseUrl = url.slice( 0, url.lastIndexOf( '/' ) + 1 );
		const version = file === 'metadata.json' ? 2 : 1;

		const res = await this.fetchData( url, this.fetchOptions );
		if ( ! ( res instanceof Response ) || ! res.ok ) {

			throw new Error( `PotreeLoader: Could not fetch "${ url }" with status ${ res && res.status }` );

		}

		const json = await res.json();
		this.version = version;
		this.metadata = version === 2 ? this._normalizeV2( json ) : this._normalizeV1( json );
		this.hierarchy = new Map();

		if ( version === 2 ) {

			// The root chunk spans the first "firstChunkSize" bytes and proxy entries reference
			// the sub-chunks by byte range, all within the same file.
			this._octreeUrl = new URL( 'octree.bin', baseUrl ).href;

			const hierRes = await this.fetchData( new URL( 'hierarchy.bin', baseUrl ).href, this.fetchOptions );
			const hierBuf = await hierRes.arrayBuffer();
			const firstChunkSize = json.hierarchy ? json.hierarchy.firstChunkSize : hierBuf.byteLength;
			v2ParseHierarchy( hierBuf, 'r', 0, firstChunkSize, this.hierarchy );

		} else {

			// Each v1 hierarchy chunk and the node data files for its levels live in a directory
			// derived from the chunk root key, with the root chunk at {octreeDir}/r/r.hrc.
			const octreeDir = json.octreeDir || 'data';
			this._dataUrl = new URL( octreeDir + '/', baseUrl ).href;

			const hierRes = await this.fetchData( new URL( 'r/r.hrc', this._dataUrl ).href, this.fetchOptions );
			const hierBuf = await hierRes.arrayBuffer();
			v1ParseHierarchy( hierBuf, 'r', this.hierarchy );
			this._loadedChunks = new Set( [ 'r' ] );

		}

	}

	/**
	 * Loads the raw point buffer of the given node, transparently loading any hierarchy chunk
	 * the node roots so its children become available.
	 * @param {string} key Node name, e.g. "r012".
	 * @param {Object} [options] Additional fetch options such as an abort signal.
	 * @returns {Promise<ArrayBuffer>}
	 */
	async loadNodeData( key, options = {} ) {

		const node = this.hierarchy.get( key );
		const fetchOptions = { ...this.fetchOptions, ...options };

		if ( this.version === 2 ) {

			// nodes with no data hold no byte range to request
			if ( node.byteSize === 0n ) {

				return new ArrayBuffer( 0 );

			}

			const start = node.byteOffset;
			const end = node.byteOffset + node.byteSize - 1n;
			const res = await this.fetchData( this._octreeUrl, {
				...fetchOptions,
				headers: {
					...fetchOptions.headers,
					Range: `bytes=${ start }-${ end }`,
				},
			} );
			return res.arrayBuffer();

		} else {

			const { hierarchyStepSize } = this.metadata;
			const level = key.length - 1;
			const path = v1HierarchyPath( key, hierarchyStepSize );

			// a chunk boundary node carries the hierarchy chunk below it in its own .hrc file
			if ( level > 0 && level % hierarchyStepSize === 0 && ! this._loadedChunks.has( key ) ) {

				this._loadedChunks.add( key );
				const hierRes = await this.fetchData( `${ this._dataUrl }${ path }/${ key }.hrc`, fetchOptions );
				const hierBuf = await hierRes.arrayBuffer();
				v1ParseHierarchy( hierBuf, key, this.hierarchy );

			}

			const res = await this.fetchData( `${ this._dataUrl }${ path }/${ key }.bin`, fetchOptions );
			return res.arrayBuffer();

		}

	}

	/**
	 * Parses a raw interleaved point buffer into buffer geometry with position, and optionally
	 * color and intensity, attributes. The positions are stored relative to the center of the
	 * given node bounds for float32 precision, returned separately.
	 * @param {ArrayBuffer} buffer
	 * @param {string} key Node name the buffer belongs to.
	 * @param {number[]} min Node bounds minimum.
	 * @param {number[]} max Node bounds maximum.
	 * @returns {{ geometry: BufferGeometry, center: Vector3 }}
	 */
	parsePointData( buffer, key, min, max ) {

		const { attributes } = this.metadata;
		const numPoints = this.hierarchy.get( key ).numPoints;
		const center = new Vector3(
			( min[ 0 ] + max[ 0 ] ) / 2,
			( min[ 1 ] + max[ 1 ] ) / 2,
			( min[ 2 ] + max[ 2 ] ) / 2,
		);

		// per-attribute byte offsets within the interleaved point record
		let stride = 0;
		const attrOffsets = attributes.map( attr => {

			const off = stride;
			stride += attr.byteSize;
			return off;

		} );

		// the attributes we know how to decode
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
		const view = new DataView( buffer );

		for ( let i = 0; i < numPoints; i ++ ) {

			const base = i * stride;

			if ( posIdx !== - 1 ) {

				const attr = attributes[ posIdx ];
				const off = base + attrOffsets[ posIdx ];
				let wx, wy, wz;

				if ( attr.type === 'int32' ) {

					// v1 positions are quantized relative to each node's own bounds minimum
					// while v2 positions use the global offset from metadata.json
					const sc = attr.scale;
					const ofs = this.version === 1 ? min : attr.offset;
					wx = view.getInt32( off, true ) * sc[ 0 ] + ofs[ 0 ];
					wy = view.getInt32( off + 4, true ) * sc[ 1 ] + ofs[ 1 ];
					wz = view.getInt32( off + 8, true ) * sc[ 2 ] + ofs[ 2 ];

				} else {

					// float positions, uncommon but supported
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

				positions[ i * 3 ] = wx - center.x;
				positions[ i * 3 + 1 ] = wy - center.y;
				positions[ i * 3 + 2 ] = wz - center.z;

			}

			if ( colIdx !== - 1 ) {

				const attr = attributes[ colIdx ];
				const off = base + attrOffsets[ colIdx ];

				if ( attr.type === 'uint16' ) {

					// v2 rgb stored as sRGB uint16 per channel
					_color.setRGB(
						view.getUint16( off, true ) / 65535,
						view.getUint16( off + 2, true ) / 65535,
						view.getUint16( off + 4, true ) / 65535,
						SRGBColorSpace,
					);
					_color.toArray( colors, i * 3 );

				} else {

					// sRGB uint8 per channel: v1 COLOR_PACKED, RGB, RGBA and v2 rgb
					colors[ i * 3 ] = SRGB_LUT[ view.getUint8( off ) ];
					colors[ i * 3 + 1 ] = SRGB_LUT[ view.getUint8( off + 1 ) ];
					colors[ i * 3 + 2 ] = SRGB_LUT[ view.getUint8( off + 2 ) ];

				}

			}

			if ( intIdx !== - 1 ) {

				const off = base + attrOffsets[ intIdx ];
				intensities[ i ] = view.getUint16( off, true ) / 65535;

			}

		}

		const geometry = new BufferGeometry();
		geometry.setAttribute( 'position', new BufferAttribute( positions, 3 ) );

		if ( colors ) {

			geometry.setAttribute( 'color', new BufferAttribute( colors, 3 ) );

		}

		if ( intensities ) {

			geometry.setAttribute( 'intensity', new BufferAttribute( intensities, 1 ) );

		}

		return { geometry, center };

	}

	// Normalize cloud.js (v1) into the shared metadata format
	_normalizeV1( json ) {

		const scale = json.scale || 0.001;
		const bb = json.boundingBox;
		const min = [ bb.lx, bb.ly, bb.lz ];
		const max = [ bb.ux, bb.uy, bb.uz ];

		const attrNames = Array.isArray( json.pointAttributes )
			? json.pointAttributes
			: [ 'POSITION_CARTESIAN', 'COLOR_PACKED' ];

		const attributes = [];
		for ( let i = 0, l = attrNames.length; i < l; i ++ ) {

			const name = attrNames[ i ];
			const desc = POTREE_V1_ATTR[ name ];

			if ( ! desc ) {

				console.warn( `PotreeLoader: Unknown v1 attribute "${ name }", skipping.` );
				continue;

			}

			// position is decoded via scale + node bounds offset while other attributes are raw
			const attrScale = name === 'POSITION_CARTESIAN' ? [ scale, scale, scale ] : null;
			const attrOffset = name === 'POSITION_CARTESIAN' ? min : null;
			attributes.push( { name, ...desc, scale: attrScale, offset: attrOffset } );

		}

		return {
			spacing: json.spacing || 1,
			hierarchyStepSize: json.hierarchyStepSize || 5,
			scale: [ scale, scale, scale ],
			offset: min,
			boundingBox: { min, max },
			attributes,
		};

	}

	// Normalize metadata.json (v2) into the shared metadata format
	_normalizeV2( json ) {

		const scale = Array.isArray( json.scale )
			? json.scale
			: [ json.scale, json.scale, json.scale ];
		const offset = json.offset || [ 0, 0, 0 ];
		const bb = json.boundingBox;
		const min = Array.isArray( bb.min ) ? bb.min : [ bb.min[ 0 ], bb.min[ 1 ], bb.min[ 2 ] ];
		const max = Array.isArray( bb.max ) ? bb.max : [ bb.max[ 0 ], bb.max[ 1 ], bb.max[ 2 ] ];

		const attributes = ( json.attributes || [] ).map( attr => {

			const elementSize = attr.elementSize || v2ElementSize( attr.type );
			const byteSize = attr.size || ( elementSize * ( attr.numElements || 1 ) );

			// v2 position is decoded with the top-level scale and offset from metadata.json
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
			spacing: json.spacing || 1,
			scale,
			offset,
			boundingBox: { min, max },
			attributes,
		};

	}

}
