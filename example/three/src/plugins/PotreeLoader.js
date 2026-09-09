import { BufferGeometry, BufferAttribute, Color, SRGBColorSpace, Vector3 } from 'three';

const _color = /* @__PURE__ */ new Color();

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
		 * Dataset metadata with `spacing`, `scale`, `offset`, `boundingBox` and point
		 * `attributes` fields, available after `load`. The v2 `metadata.json` content is used
		 * as-is while v1 `cloud.js` is normalized to match it.
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
		if ( ! res.ok ) {

			throw new Error( `PotreeLoader: Could not fetch "${ url }" with status ${ res.status }` );

		}

		const json = await res.json();
		this.version = version;
		this.metadata = version === 2 ? json : this._normalizeV1( json );
		this.hierarchy = new Map();

		if ( version === 2 ) {

			// The root chunk spans the first "firstChunkSize" bytes and proxy entries reference
			// the sub-chunks by byte range, all within the same file.
			this._octreeUrl = new URL( 'octree.bin', baseUrl ).href;

			const hierRes = await this.fetchData( new URL( 'hierarchy.bin', baseUrl ).href, this.fetchOptions );
			const hierBuf = await hierRes.arrayBuffer();
			v2ParseHierarchy( hierBuf, 'r', 0, json.hierarchy.firstChunkSize, this.hierarchy );

		} else {

			// Each v1 hierarchy chunk and the node data files for its levels live in a directory
			// derived from the chunk root key, with the root chunk at {octreeDir}/r/r.hrc.
			this._dataUrl = new URL( json.octreeDir + '/', baseUrl ).href;

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
			if ( level % hierarchyStepSize === 0 && ! this._loadedChunks.has( key ) ) {

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

		const { attributes, scale, offset } = this.metadata;
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
			stride += attr.size;
			return off;

		} );

		// The attributes we know how to decode. The alpha byte of "rgba" is dropped since potree
		// itself never reads it - the format reserves it but no potree decoder or shader uses it.
		const posIdx = attributes.findIndex( a => a.name === 'position' );
		const colIdx = attributes.findIndex( a => a.name === 'rgb' || a.name === 'rgba' );
		const intIdx = attributes.findIndex( a => a.name === 'intensity' );

		const positions = new Float32Array( numPoints * 3 );
		const colors = colIdx !== - 1 ? new Float32Array( numPoints * 3 ) : null;
		const intensities = intIdx !== - 1 ? new Float32Array( numPoints ) : null;
		const view = new DataView( buffer );

		// v1 positions are quantized relative to each node's own bounds minimum while v2
		// positions use the global offset from metadata.json
		const posOffset = this.version === 1 ? min : offset;
		for ( let i = 0; i < numPoints; i ++ ) {

			const base = i * stride;
			const posOff = base + attrOffsets[ posIdx ];
			positions[ i * 3 ] = view.getInt32( posOff, true ) * scale[ 0 ] + posOffset[ 0 ] - center.x;
			positions[ i * 3 + 1 ] = view.getInt32( posOff + 4, true ) * scale[ 1 ] + posOffset[ 1 ] - center.y;
			positions[ i * 3 + 2 ] = view.getInt32( posOff + 8, true ) * scale[ 2 ] + posOffset[ 2 ] - center.z;

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

					// sRGB uint8 per channel
					_color.setRGB(
						view.getUint8( off ) / 255,
						view.getUint8( off + 1 ) / 255,
						view.getUint8( off + 2 ) / 255,
						SRGBColorSpace,
					);
					_color.toArray( colors, i * 3 );

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

	// Normalize cloud.js (v1) into the metadata.json (v2) format
	_normalizeV1( json ) {

		// v1 point attribute byte layouts keyed by the cloud.js attribute name, each mapped to
		// its v2 attribute name equivalent
		const V1_ATTRIBUTES = {
			'POSITION_CARTESIAN': { name: 'position', size: 12, type: 'int32' },
			'COLOR_PACKED': { name: 'rgba', size: 4, type: 'uint8' },
			'RGB': { name: 'rgb', size: 3, type: 'uint8' },
			'RGBA': { name: 'rgba', size: 4, type: 'uint8' },
			'INTENSITY': { name: 'intensity', size: 2, type: 'uint16' },
			'INTENSITY_GRADIENT': { name: 'intensity gradient', size: 2, type: 'uint16' },
			'CLASSIFICATION': { name: 'classification', size: 1, type: 'uint8' },
			'NORMAL_FLOATS': { name: 'normal floats', size: 12, type: 'float32' },
			'NORMAL_SPHEREMAPPED': { name: 'normal spheremapped', size: 2, type: 'uint8' },
			'NORMAL_OCT16': { name: 'normal oct16', size: 2, type: 'uint8' },
			'GPS_TIME': { name: 'gps-time', size: 8, type: 'float64' },
			'RETURN_NUMBER': { name: 'return number', size: 1, type: 'uint8' },
			'NUMBER_OF_RETURNS': { name: 'number of returns', size: 1, type: 'uint8' },
			'SOURCE_ID': { name: 'point source id', size: 2, type: 'uint16' },
			'RGB565': { name: 'rgb565', size: 2, type: 'uint16' },
		};

		const { scale } = json;
		const bb = json.boundingBox;
		const attributes = json.pointAttributes.map( name => V1_ATTRIBUTES[ name ] );

		return {
			spacing: json.spacing,
			hierarchyStepSize: json.hierarchyStepSize,
			scale: [ scale, scale, scale ],
			boundingBox: {
				min: [ bb.lx, bb.ly, bb.lz ],
				max: [ bb.ux, bb.uy, bb.uz ],
			},
			attributes,
		};

	}

}
