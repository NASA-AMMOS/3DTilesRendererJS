/**
 * Structure almost identical to Cesium, also the comments and the names are kept
 * https://github.com/CesiumGS/cesium/blob/0a69f67b393ba194eefb7254600811c4b712ddc0/packages/engine/Source/Scene/Implicit3DTileContent.js
 */
import { LoaderBase } from '../../base/loaders/LoaderBase.js';
import { readMagicBytes } from '../../utilities/readMagicBytes.js';
import { arrayToString } from '../../utilities/arrayToString.js';



function isOctreeSubdivision( tile ) {

	return tile.__implicitRoot.implicitTiling.subdivisionScheme === 'OCTREE';

}

function getBoundsDivider( tile ) {

	return isOctreeSubdivision( tile ) ? 8 : 4;

}


function getSubtreeCoordinates( tile, parentTile ) {

	if ( ! parentTile ) {

		return [ 0, 0, 0 ];

	}

	const x = 2 * parentTile.__x + ( tile.__subtreeIdx % 2 );
	const y = 2 * parentTile.__y + ( Math.floor( tile.__subtreeIdx / 2 ) % 2 );
	const z = isOctreeSubdivision( tile ) ?
		2 * parentTile.__z + ( Math.floor( tile.__subtreeIdx / 4 ) % 2 ) : 0;

	return [ x, y, z ];

}

class SubtreeTile {

	constructor( parentTile, childMortonIndex ) {

		this.parent = parentTile;
		this.children = [];
		this.__level = parentTile.__level + 1;
		this.__implicitRoot = parentTile.__implicitRoot;

		// Index inside the tree
		this.__subtreeIdx = childMortonIndex;
		[ this.__x, this.__y, this.__z ] = getSubtreeCoordinates( this, parentTile );

	}

	static copy( tile ) {

		const copyTile = {};
		copyTile.children = [];
		copyTile.__level = tile.__level;
		copyTile.__implicitRoot = tile.__implicitRoot;

		// Index inside the tree
		copyTile.__subtreeIdx = tile.__subtreeIdx;
		[ copyTile.__x, copyTile.__y, copyTile.__z ] = [ tile.__x, tile.__y, tile.__z ];

		copyTile.boundingVolume = tile.boundingVolume;
		copyTile.geometricError = tile.geometricError;
		return copyTile;

	}

}

export class SUBTREELoader extends LoaderBase {

	constructor( tile ) {

		super();
		this.tile = tile;
		this.rootTile = tile.__implicitRoot;	// The implicit root tile

	}

	/**
	 * A helper object for storing the two parts of the subtree binary
	 *
	 * @typedef {object} Subtree
	 * @property {number} version
	 * @property {JSON} subtreeJson
	 * @property {ArrayBuffer} subtreeByte
	 * @private
	 */

	/**
	 *
	 * @param buffer
	 * @return {Subtree}
	 */

	parseBuffer( buffer ) {

		const dataView = new DataView( buffer );
		let offset = 0;

		// 16-byte header

		// 4 bytes
		const magic = readMagicBytes( dataView );
		console.assert( magic === 'subt', 'SUBTREELoader: The magic bytes equal "subt".' );
		offset += 4;

		// 4 bytes
		const version = dataView.getUint32( offset, true );
		console.assert( version === 1, 'SUBTREELoader: The version listed in the header is "1".' );
		offset += 4;

		// From Cesium
		// Read the bottom 32 bits of the 64-bit byte length.
		// This is ok for now because:
		// 1) not all browsers have native 64-bit operations
		// 2) the data is well under 4GB

		// 8 bytes
		const jsonLength = dataView.getUint32( offset, true );
		offset += 8;

		// 8 bytes
		const byteLength = dataView.getUint32( offset, true );
		offset += 8;

		const subtreeJson = JSON.parse( arrayToString( new Uint8Array( buffer, offset, jsonLength ) ) );
		offset += jsonLength;

		const subtreeByte = buffer.slice( offset, offset + byteLength );

		return {
			version,
			subtreeJson,
			subtreeByte
		};

	}


	parse( buffer ) {

		// todo here : handle json
		const subtree = this.parseBuffer( buffer );
		const subtreeJson = subtree.subtreeJson;

		// TODO Handle metadata
		/*
		 const subtreeMetadata = subtreeJson.subtreeMetadata;
		subtree._metadata = subtreeMetadata;
		 */


		/*
			Tile availability indicates which tiles exist within the subtree

			Content availability indicates which tiles have associated content resources

			Child subtree availability indicates what subtrees are reachable from this subtree

		 */


		// After identifying how availability is stored, put the results in this new array for consistent processing later
		subtreeJson.contentAvailabilityHeaders = [].concat( subtreeJson.contentAvailability );

		const bufferHeaders = this.preprocessBuffers( subtreeJson.buffers );
		const bufferViewHeaders = this.preprocessBufferViews(
			subtreeJson.bufferViews,
			bufferHeaders
		);

		// Buffers and buffer views are inactive until explicitly marked active.
		// This way we can avoid fetching buffers that will not be used.
		this.markActiveBufferViews( subtreeJson, bufferViewHeaders );

		const buffersU8 = this.requestActiveBuffers(
			bufferHeaders,
			subtree.subtreeByte
		);

		const bufferViewsU8 = this.parseActiveBufferViews( bufferViewHeaders, buffersU8 );
		this.parseAvailability( subtree, subtreeJson, bufferViewsU8 );
		this.expandSubtree( this.tile, subtree );

	}


	/**
	 * Determine which buffer views need to be loaded into memory. This includes:
	 *
	 * <ul>
	 * <li>The tile availability bitstream (if a bitstream is defined)</li>
	 * <li>The content availability bitstream(s) (if a bitstream is defined)</li>
	 * <li>The child subtree availability bitstream (if a bitstream is defined)</li>
	 * </ul>
	 *
	 * <p>
	 * This function modifies the buffer view headers' isActive flags in place.
	 * </p>
	 *
	 * @param {JSON} subtreeJson The JSON chunk from the subtree
	 * @param {BufferViewHeader[]} bufferViewHeaders The preprocessed buffer view headers
	 * @private
	 */
	markActiveBufferViews( subtreeJson, bufferViewHeaders ) {

		let header;
		const tileAvailabilityHeader = subtreeJson.tileAvailability;

		// Check for bitstream first, which is part of the current schema.
		// bufferView is the name of the bitstream from an older schema.
		if ( ! isNaN( tileAvailabilityHeader.bitstream ) ) {

			header = bufferViewHeaders[ tileAvailabilityHeader.bitstream ];

		} else if ( ! isNaN( tileAvailabilityHeader.bufferView ) ) {

			header = bufferViewHeaders[ tileAvailabilityHeader.bufferView ];

		}

		if ( header ) {

			header.isActive = true;
			header.bufferHeader.isActive = true;

		}

		const contentAvailabilityHeaders = subtreeJson.contentAvailabilityHeaders;
		for ( let i = 0; i < contentAvailabilityHeaders.length; i ++ ) {

			header = undefined;
			if ( ! isNaN( contentAvailabilityHeaders[ i ].bitstream ) ) {

				header = bufferViewHeaders[ contentAvailabilityHeaders[ i ].bitstream ];

			} else if ( ! isNaN( contentAvailabilityHeaders[ i ].bufferView ) ) {

				header = bufferViewHeaders[ contentAvailabilityHeaders[ i ].bufferView ];

			}
			if ( header ) {

				header.isActive = true;
				header.bufferHeader.isActive = true;

			}

		}
		header = undefined;
		const childSubtreeAvailabilityHeader = subtreeJson.childSubtreeAvailability;
		if ( ! isNaN( childSubtreeAvailabilityHeader.bitstream ) ) {

			header = bufferViewHeaders[ childSubtreeAvailabilityHeader.bitstream ];

		} else if ( ! isNaN( childSubtreeAvailabilityHeader.bufferView ) ) {

			header = bufferViewHeaders[ childSubtreeAvailabilityHeader.bufferView ];

		}
		if ( header ) {

			header.isActive = true;
			header.bufferHeader.isActive = true;

		}

	}


	/**
	 * Go through the list of buffers and gather all the active ones into
	 * a dictionary.
	 * <p>
	 * The results are put into a dictionary object. The keys are indices of
	 * buffers, and the values are Uint8Arrays of the contents. Only buffers
	 * marked with the isActive flag are fetched.
	 * </p>
	 * <p>
	 * The internal buffer (the subtree's binary chunk) is also stored in this
	 * dictionary if it is marked active.
	 * </p>
	 * @param {BufferHeader[]} bufferHeaders The preprocessed buffer headers
	 * @param {ArrayBuffer} internalBuffer The binary chunk of the subtree file
	 * @returns {object} buffersU8 A dictionary of buffer index to a Uint8Array of its contents.
	 * @private
	 */
	requestActiveBuffers( bufferHeaders, internalBuffer ) {

		const bufferResults = [];
		for ( let i = 0; i < bufferHeaders.length; i ++ ) {

			const bufferHeader = bufferHeaders[ i ];
			if ( bufferHeader.isActive ) {

				bufferResults.push( internalBuffer );

			} else {

				bufferResults.push( undefined );

			}

		}

		const buffersU8 = {};
		for ( let i = 0; i < bufferResults.length; i ++ ) {

			const result = bufferResults[ i ];
			if ( result ) {

				buffersU8[ i ] = result;

			}

		}
		return buffersU8;

	}

	/**
	 * Go through the list of buffer views, and if they are marked as active,
	 * extract a subarray from one of the active buffers.
	 *
	 * @param {BufferViewHeader[]} bufferViewHeaders
	 * @param {object} buffersU8 A dictionary of buffer index to a Uint8Array of its contents.
	 * @returns {object} A dictionary of buffer view index to a Uint8Array of its contents.
	 * @private
	 */
	parseActiveBufferViews( bufferViewHeaders, buffersU8 ) {

		const bufferViewsU8 = {};
		for ( let i = 0; i < bufferViewHeaders.length; i ++ ) {

			const bufferViewHeader = bufferViewHeaders[ i ];
			if ( ! bufferViewHeader.isActive ) {

				continue;

			}
			const start = bufferViewHeader.byteOffset;
			const end = start + bufferViewHeader.byteLength;
			const buffer = buffersU8[ bufferViewHeader.buffer ];
			bufferViewsU8[ i ] = buffer.slice( start, end );

		}
		return bufferViewsU8;

	}

	/**
	 * A buffer header is the JSON header from the subtree JSON chunk plus
	 * a couple extra boolean flags for easy reference.
	 *
	 * Buffers are assumed inactive until explicitly marked active. This is used
	 * to avoid fetching unneeded buffers.
	 *
	 * @typedef {object} BufferHeader
	 * @property {boolean} isActive Whether this buffer is currently used.
	 * @property {string} [uri] The URI of the buffer (external buffers only)
	 * @property {number} byteLength The byte length of the buffer, including any padding contained within.
	 * @private
	 */

	/**
	 * Iterate over the list of buffers from the subtree JSON and add the isActive field for easier parsing later.
	 * This modifies the objects in place.
	 * @param {Object[]} [bufferHeaders=[]] The JSON from subtreeJson.buffers.
	 * @returns {BufferHeader[]} The same array of headers with additional fields.
	 * @private
	 */
	preprocessBuffers( bufferHeaders = [] ) {

		for ( let i = 0; i < bufferHeaders.length; i ++ ) {

			const bufferHeader = bufferHeaders[ i ];
			bufferHeader.isActive = false;

		}
		return bufferHeaders;

	}


	/**
	 * A buffer header is the JSON header from the subtree JSON chunk plus
	 * the isActive flag and a reference to the header for the underlying buffer
	 *
	 * @typedef {object} BufferViewHeader
	 * @property {BufferHeader} bufferHeader A reference to the header for the underlying buffer
	 * @property {boolean} isActive Whether this bufferView is currently used.
	 * @property {number} buffer The index of the underlying buffer.
	 * @property {number} byteOffset The start byte of the bufferView within the buffer.
	 * @property {number} byteLength The length of the bufferView. No padding is included in this length.
	 * @private
	 */

	/**
	 * Iterate the list of buffer views from the subtree JSON and add the
	 * isActive flag. Also save a reference to the bufferHeader
	 *
	 * @param {Object[]} [bufferViewHeaders=[]] The JSON from subtree.bufferViews
	 * @param {BufferHeader[]} bufferHeaders The preprocessed buffer headers
	 * @returns {BufferViewHeader[]} The same array of bufferView headers with additional fields
	 * @private
	 */
	preprocessBufferViews( bufferViewHeaders = [], bufferHeaders ) {

		for ( let i = 0; i < bufferViewHeaders.length; i ++ ) {

			const bufferViewHeader = bufferViewHeaders[ i ];
			bufferViewHeader.bufferHeader = bufferHeaders[ bufferViewHeader.buffer ];
			bufferViewHeader.isActive = false;

		}
		return bufferViewHeaders;

	}


	/**
	 * Parse the three availability bitstreams and store them in the subtree
	 *
	 * @param {Subtree} subtree The subtree to modify
	 * @param {Object} subtreeJson The subtree JSON
	 * @param {Object} bufferViewsU8 A dictionary of buffer view index to a Uint8Array of its contents.
	 * @private
	 */
	parseAvailability(
		subtree,
		subtreeJson,
		bufferViewsU8
	) {

		const branchingFactor = getBoundsDivider( this.rootTile );
		const subtreeLevels = this.rootTile.implicitTiling.subtreeLevels;
		const tileAvailabilityBits =
			( Math.pow( branchingFactor, subtreeLevels ) - 1 ) / ( branchingFactor - 1 );
		const childSubtreeBits = Math.pow( branchingFactor, subtreeLevels );

		subtree._tileAvailability = this.parseAvailabilityBitstream(
			subtreeJson.tileAvailability,
			bufferViewsU8,
			tileAvailabilityBits
		);

		subtree._contentAvailabilityBitstreams = [];
		for ( let i = 0; i < subtreeJson.contentAvailabilityHeaders.length; i ++ ) {

			const bitstream = this.parseAvailabilityBitstream(
				subtreeJson.contentAvailabilityHeaders[ i ],
				bufferViewsU8,
				// content availability has the same length as tile availability.
				tileAvailabilityBits
			);
			subtree._contentAvailabilityBitstreams.push( bitstream );

		}

		subtree._childSubtreeAvailability = this.parseAvailabilityBitstream(
			subtreeJson.childSubtreeAvailability,
			bufferViewsU8,
			childSubtreeBits
		);

	}

	/**
	 * A helper object for storing the two parts of the subtree binary
	 *
	 * @typedef {object} ParsedBitstream
	 * @property {Boolean} constant
	 * @property {ArrayBuffer} bitstream
	 * @property {number} lengthBits The length of the availability bitstream in bits
	 * @private
	 */


	/**
	 * Given the JSON describing an availability bitstream, turn it into an
	 * in-memory representation using an object. This handles bitstreams from a bufferView.
	 *
	 * @param {Object} availabilityJson A JSON object representing the availability
	 * @param {Object} bufferViewsU8 A dictionary of bufferView index to its Uint8Array contents.
	 * @param {number} lengthBits The length of the availability bitstream in bits
	 * @returns {ParsedBitstream}
	 * @private
	 */
	parseAvailabilityBitstream(
		availabilityJson,
		bufferViewsU8,
		lengthBits,
	) {

		if ( ! isNaN( availabilityJson.constant ) ) {

			return {
				constant: Boolean( availabilityJson.constant ),
				lengthBits: lengthBits,
			};

		}
		let bufferView;
		// Check for bitstream first, which is part of the current schema.
		// bufferView is the name of the bitstream from an older schema.

		if ( ! isNaN( availabilityJson.bitstream ) ) {

			bufferView = bufferViewsU8[ availabilityJson.bitstream ];

		} else if ( ! isNaN( availabilityJson.bufferView ) ) {

			bufferView = bufferViewsU8[ availabilityJson.bufferView ];

		}
		return {
			bitstream: bufferView,
			lengthBits: lengthBits
		};

	}


	/**
	 * Expand a single subtree tile. This transcodes the subtree into
	 * a tree of {@link SubtreeTile}. The root of this tree is stored in
	 * the placeholder tile's children array. This method also creates
	 * tiles for the child subtrees to be lazily expanded as needed.
	 *
	 * @param {Object | SubtreeTile} subtreeRoot The first node of the subtree
	 * @param {Subtree} subtree The parsed subtree
	 * @private
	 */
	expandSubtree( subtreeRoot, subtree ) {

		// TODO If multiple contents were supported then this tile could contain both renderable and un renderable content.
		const contentTile = SubtreeTile.copy( subtreeRoot );

		// If the subtree root tile has content, then create a placeholder child with cloned parameters
		// Todo Multiple contents not handled, keep the first content found
		for ( let i = 0; subtree && i < subtree._contentAvailabilityBitstreams.length; i ++ ) {

			if ( subtree && this.getBit( subtree._contentAvailabilityBitstreams[ i ], 0 ) ) {

				// Create a child holding the content uri, this child is similar to its parent and doesn't have any children
				contentTile.content = { uri: this.parseImplicitURI( subtreeRoot, this.rootTile.content.uri ) };
				break;

			}

		}

		subtreeRoot.children.push( contentTile );

		// Creating each leaf inside the current subtree
		const bottomRow = this.transcodeSubtreeTiles(
			contentTile,
			subtree
		);

		// For each child subtree, create a tile containing the uri of the next subtree to fetch
		const childSubtrees = this.listChildSubtrees( subtree, bottomRow );
		for ( let i = 0; i < childSubtrees.length; i ++ ) {

			const subtreeLocator = childSubtrees[ i ];
			const leafTile = subtreeLocator.tile;
			const subtreeTile = this.deriveChildTile(
				null,
				leafTile,
				null,
				subtreeLocator.childMortonIndex
			);
			// Assign subtree uri as content
			subtreeTile.content = { uri: this.parseImplicitURI( subtreeTile, this.rootTile.implicitTiling.subtrees.uri ) };
			leafTile.children.push( subtreeTile );

		}

	}

	/**
	 * Transcode the implicitly defined tiles within this subtree and generate
	 * explicit {@link SubtreeTile} objects. This function only transcode tiles,
	 * child subtrees are handled separately.
	 *
	 * @param {Object | SubtreeTile} subtreeRoot The root of the current subtree
	 * @param {Subtree} subtree The subtree to get availability information
	 * @returns {Array} The bottom row of transcoded tiles. This is helpful for processing child subtrees
	 * @private
	 */
	transcodeSubtreeTiles( subtreeRoot, subtree ) {

		// Sliding window over the levels of the tree.
		// Each row is branchingFactor * length of previous row
		// Tiles within a row are ordered by Morton index.
		let parentRow = [ subtreeRoot ];
		let currentRow = [];

		for ( let level = 1; level < this.rootTile.implicitTiling.subtreeLevels; level ++ ) {

			const branchingFactor = getBoundsDivider( this.rootTile );
			const levelOffset = ( Math.pow( branchingFactor, level ) - 1 ) / ( branchingFactor - 1 );
			const numberOfChildren = branchingFactor * parentRow.length;
			for (
				let childMortonIndex = 0;
				childMortonIndex < numberOfChildren;
				childMortonIndex ++
			) {

				const childBitIndex = levelOffset + childMortonIndex;
				const parentMortonIndex = childMortonIndex >> Math.log2( branchingFactor );
				const parentTile = parentRow[ parentMortonIndex ];

				// Check if tile is available
				if ( ! this.getBit( subtree._tileAvailability, childBitIndex ) ) {

					currentRow.push( undefined );
					continue;

				}

				// Create a tile and add it as a child
				const childTile = this.deriveChildTile(
					subtree,
					parentTile,
					childBitIndex,
					childMortonIndex
				);
				parentTile.children.push( childTile );
				currentRow.push( childTile );

			}
			parentRow = currentRow;
			currentRow = [];

		}
		return parentRow;

	}

	/**
	 * Given a parent tile and information about which child to create, derive
	 * the properties of the child tile implicitly.
	 * <p>
	 * This creates a real tile for rendering.
	 * </p>
	 *
	 * @param {Subtree} subtree The subtree the child tile belongs to
	 * @param {Object | SubtreeTile} parentTile The parent of the new child tile
	 * @param {number} childBitIndex The index of the child tile within the tile's availability information.
	 * @param {number} childMortonIndex The morton index of the child tile relative to its parent
	 * @returns {SubtreeTile} The new child tile.
	 * @private
	 */
	deriveChildTile(
		subtree,
		parentTile,
		childBitIndex,
		childMortonIndex
	) {

		const subtreeTile = new SubtreeTile( parentTile, childMortonIndex );
		subtreeTile.boundingVolume = this.getTileBoundingVolume( subtreeTile );
		subtreeTile.geometricError = this.getGeometricError( subtreeTile );

		// Todo Multiple contents not handled, keep the first found content
		for ( let i = 0; subtree && i < subtree._contentAvailabilityBitstreams.length; i ++ ) {

			if ( subtree && this.getBit( subtree._contentAvailabilityBitstreams[ i ], childBitIndex ) ) {

				subtreeTile.content = { uri: this.parseImplicitURI( subtreeTile, this.rootTile.content.uri ) };
				break;

			}

		}
		return subtreeTile;

	}


	/**
	 * Get a bit from the bitstream as a Boolean. If the bitstream
	 * is a constant, the constant value is returned instead.
	 *
	 * @param {ParsedBitstream} object
	 * @param {number} index The integer index of the bit.
	 * @returns {boolean} The value of the bit
	 * @private
	 */
	getBit( object, index ) {

		if ( index < 0 || index >= object.lengthBits ) {

			throw new Error( 'Bit index out of bounds.' );

		}
		if ( object.constant !== undefined ) {

			return object.constant;

		}
		// byteIndex is floor(index / 8)
		const byteIndex = index >> 3;
		const bitIndex = index % 8;
		return ( ( new Uint8Array( object.bitstream )[ byteIndex ] >> bitIndex ) & 1 ) === 1;

	}

	/**
	 * //TODO Adapt for Sphere
	 * To maintain numerical stability during this subdivision process,
	 * the actual bounding volumes should not be computed progressively by subdividing a non-root tile volume.
	 * Instead, the exact bounding volumes are computed directly for a given level.
	 * @param {Object | SubtreeTile} tile
	 * @return {Object} object containing the bounding volume
	 */
	getTileBoundingVolume( tile ) {

		const boundingVolume = {};
		if ( this.rootTile.boundingVolume.region ) {

			const region = [ ...this.rootTile.boundingVolume.region ];
			const minX = region[ 0 ];
			const maxX = region[ 2 ];
			const minY = region[ 1 ];
			const maxY = region[ 3 ];
			const sizeX = ( maxX - minX ) / Math.pow( 2, tile.__level );
			const sizeY = ( maxY - minY ) / Math.pow( 2, tile.__level );
			region[ 0 ] = minX + sizeX * tile.__x;	//west
			region[ 2 ] = minX + sizeX * ( tile.__x + 1 );	//east
			region[ 1 ] = minY + sizeY * tile.__y;	//south
			region[ 3 ] = minY + sizeY * ( tile.__y + 1 );	//north

			for ( let k = 0; k < 4; k ++ ) {

				const coord = region[ k ];
				if ( coord < - Math.PI ) {

					region[ k ] += 2 * Math.PI;

				} else if ( coord > Math.PI ) {

					region[ k ] -= 2 * Math.PI;

				}

			}

			//Also divide the height in the case of octree.
			if ( isOctreeSubdivision( tile ) ) {

				const minZ = region[ 4 ];
				const maxZ = region[ 5 ];

				const sizeZ = ( maxZ - minZ ) / Math.pow( 2, tile.__level );

				region[ 4 ] = minZ + sizeZ * tile.__z;	//minimum height
				region[ 5 ] = minZ + sizeZ * ( tile.__z + 1 );	// maximum height

			}

			boundingVolume.region = region;

		}

		if ( this.rootTile.boundingVolume.box ) {

			// 0-2: center of the box
			// 3-5: x axis direction and half length
			// 6-8: y axis direction and half length
			// 9-11: z axis direction and half length

			const box = [ ...this.rootTile.boundingVolume.box ];
			const cellSteps = 2 ** tile.__level - 1;
			const scale = Math.pow( 2, - tile.__level );
			const axisNumber = isOctreeSubdivision( tile ) ? 3 : 2;


			for ( let i = 0; i < axisNumber; i ++ ) {

				// scale the bounds axes
				box[ 3 + i * 3 + 0 ] *= scale;
				box[ 3 + i * 3 + 1 ] *= scale;
				box[ 3 + i * 3 + 2 ] *= scale;

				// axis vector
				const x = box[ 3 + i * 3 + 0 ];
				const y = box[ 3 + i * 3 + 1 ];
				const z = box[ 3 + i * 3 + 2 ];

				// adjust the center by the x, y and z axes
				const axisOffset = i === 0 ? tile.__x : ( i === 1 ? tile.__y : tile.__z );
				box[ 0 ] += 2 * x * ( - 0.5 * cellSteps + axisOffset );
				box[ 1 ] += 2 * y * ( - 0.5 * cellSteps + axisOffset );
				box[ 2 ] += 2 * z * ( - 0.5 * cellSteps + axisOffset );

			}

			boundingVolume.box = box;

		}

		return boundingVolume;

	}

	/**
	 * Each child’s geometricError is half of its parent’s geometricError
	 * @param {Object | SubtreeTile} tile
	 * @return {number}
	 */
	getGeometricError( tile ) {

		return this.rootTile.geometricError / Math.pow( 2, tile.__level );

	}


	/**
	 * Determine what child subtrees exist and return a list of information
	 *
	 * @param {Object} subtree The subtree for looking up availability
	 * @param {Array} bottomRow The bottom row of tiles in a transcoded subtree
	 * @returns {[]} A list of identifiers for the child subtrees.
	 * @private
	 */
	listChildSubtrees( subtree, bottomRow ) {

		const results = [];
		const branchingFactor = getBoundsDivider( this.rootTile );
		for ( let i = 0; i < bottomRow.length; i ++ ) {

			const leafTile = bottomRow[ i ];
			if ( leafTile === undefined ) {

				continue;

			}
			for ( let j = 0; j < branchingFactor; j ++ ) {

				const index = i * branchingFactor + j;
				if ( this.getBit( subtree._childSubtreeAvailability, index ) ) {

					results.push( {
						tile: leafTile,
						childMortonIndex: index
					} );

				}

			}

		}
		return results;

	}


	parseImplicitURI( tile, uri ) {

		uri = uri.replace( '{level}', tile.__level );
		uri = uri.replace( '{x}', tile.__x );
		uri = uri.replace( '{y}', tile.__y );
		uri = uri.replace( '{z}', tile.__z );
		return uri;

	}

}
