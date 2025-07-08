import { MathUtils, Triangle, BufferGeometry, BufferAttribute, Mesh, Vector4 } from 'three';

const SPLIT_VALUE = 0;
const vertNames = [ 'a', 'b', 'c' ];
const _vec = /* @__PURE__ */ new Vector4();
const _v0 = /* @__PURE__ */ new Vector4();
const _v1 = /* @__PURE__ */ new Vector4();
const _v2 = /* @__PURE__ */ new Vector4();

// Class for clipping geometry using the results from a "split operation"
export class GeometryClipper {

	constructor() {

		// the list of attributes to use in the geometry being clipped, such as
		// [ 'position', 'normal', 'uv' ]
		this.attributeList = null;

		// internal
		this.splitOperations = [];
		this.trianglePool = new ClipTrianglePool();

	}

	forEachSplitPermutation( callback ) {

		const { splitOperations } = this;
		const runPermutations = ( index = 0 ) => {

			if ( index >= splitOperations.length ) {

				callback();
				return;

			}

			splitOperations[ index ].keepPositive = true;
			runPermutations( index + 1 );

			splitOperations[ index ].keepPositive = false;
			runPermutations( index + 1 );

		};

		runPermutations();

	}

	// Takes an operation that returns a value for the given vertex passed to the callback. Triangles
	// are clipped along edges where the interpolated value is equal to 0. The polygons on the positive
	// side of the operation are kept if "keepPositive" is true.
	// callback( geometry, i0, i1, i2, barycoord );
	addSplitOperation( callback, keepPositive = true ) {

		this.splitOperations.push( {
			callback,
			keepPositive,
		} );

	}

	// Removes all split operations
	clearSplitOperations() {

		this.splitOperations.length = 0;

	}

	// clips an object hierarchy
	clipObject( object ) {

		const result = object.clone();
		const toRemove = [];
		result.traverse( c => {

			if ( c.isMesh ) {

				c.geometry = this.clip( c ).geometry;

				const triCount = c.geometry.index ? c.geometry.index.count / 3 : c.attributes.position.count / 3;
				if ( triCount === 0 ) {

					toRemove.push( c );

				}

			}

		} );

		toRemove.forEach( m => {

			m.removeFromParent();

		} );

		return result;

	}

	// Returns a new mesh that has been clipped by the split operations. Range indicates the range of
	// elements to include when clipping.
	clip( mesh, range = null ) {

		// TODO: support multimaterial
		const result = this.getClippedData( mesh, range );
		return this.constructMesh( result.attributes, result.index, mesh );

	}

	// Appends the clip operation data to the given "target" object so multiple ranges can be appended.
	// The "target" object is returned with an "index" field, "vertexIsClipped" field, and series of arrays
	// in "attributes".
	// attributes - set of attribute arrays
	// index - triangle indices referencing vertices in attributes
	// vertexIsClipped - array indicating whether a vertex is on a clipped edge
	getClippedData( mesh, range = null, target = {} ) {

		const { trianglePool, splitOperations, attributeList } = this;

		// source geometry
		const sourceGeometry = mesh.geometry;
		const position = sourceGeometry.attributes.position;
		const index = sourceGeometry.index;

		// vertex hash data
		let nextIndex = 0;
		const vertToNewIndexMap = {};

		// initialize the result
		target.index = target.index || [];
		target.vertexIsClipped = target.vertexIsClipped || [];
		target.attributes = target.attributes || {};

		// initialize the attributes to the set in the attribute list or all if set to null
		for ( const key in sourceGeometry.attributes ) {

			if ( attributeList !== null ) {

				if ( attributeList instanceof Function && ! attributeList( key ) ) {

					continue;

				} else if ( Array.isArray( attributeList ) && ! attributeList.includes( key ) ) {

					continue;

				}

			}

			target.attributes[ key ] = [];

		}

		// iterate over each group separately to retain the group information
		let start = 0;
		let count = index ? index.count : position.count;
		if ( range !== null ) {

			start = range.start;
			count = range.count;

		}

		// run the clip operations
		for ( let i = start, l = start + count; i < l; i += 3 ) {

			// get the indices
			let i0 = i + 0;
			let i1 = i + 1;
			let i2 = i + 2;
			if ( index ) {

				i0 = index.getX( i0 );
				i1 = index.getX( i1 );
				i2 = index.getX( i2 );

			}

			// get the original triangle
			const tri = trianglePool.get();
			tri.initFromIndices( i0, i1, i2 );

			// iterate over each triangle and clip it
			let triangles = [ tri ];
			for ( let s = 0; s < splitOperations.length; s ++ ) {

				const { keepPositive, callback } = splitOperations[ s ];
				const result = [];
				for ( let t = 0; t < triangles.length; t ++ ) {

					const tri = triangles[ t ];
					const { indices, barycoord } = tri;
					tri.clipValues.a = callback( sourceGeometry, indices.a, indices.b, indices.c, barycoord.a, mesh.matrixWorld );
					tri.clipValues.b = callback( sourceGeometry, indices.a, indices.b, indices.c, barycoord.b, mesh.matrixWorld );
					tri.clipValues.c = callback( sourceGeometry, indices.a, indices.b, indices.c, barycoord.c, mesh.matrixWorld );

					this.splitTriangle( tri, ! keepPositive, result );

				}

				triangles = result;

			}

			// append the triangles to the result
			for ( let t = 0, l = triangles.length; t < l; t ++ ) {

				const tri = triangles[ t ];
				pushTriangle( tri, sourceGeometry );

			}

			trianglePool.reset();

		}

		return target;

		function pushTriangle( tri, geometry ) {

			for ( let i = 0; i < 3; i ++ ) {

				const hash = tri.getVertexHash( i, geometry );

				if ( ! ( hash in vertToNewIndexMap ) ) {

					vertToNewIndexMap[ hash ] = nextIndex;
					nextIndex ++;

					tri.getVertexData( i, geometry, target.attributes );
					target.vertexIsClipped.push( tri.clipValues[ vertNames[ i ] ] === SPLIT_VALUE );

				}

				const index = vertToNewIndexMap[ hash ];
				target.index.push( index );

			}

		}

	}

	// Takes the set of resultant data and constructs a mesh
	constructMesh( attributes, index, sourceMesh ) {

		const sourceGeometry = sourceMesh.geometry;

		// new geometry
		const geometry = new BufferGeometry();
		const indexBuffer = attributes.position.length / 3 > 65535 ? new Uint32Array( index ) : new Uint16Array( index );
		geometry.setIndex( new BufferAttribute( indexBuffer, 1, false ) );

		for ( const key in attributes ) {

			const attr = sourceGeometry.getAttribute( key );
			const cons = new attr.array.constructor( attributes[ key ] );
			const newAttr = new BufferAttribute( cons, attr.itemSize, attr.normalized );
			newAttr.gpuType = attr.gpuType;

			geometry.setAttribute( key, newAttr );

		}

		// new mesh
		const result = new Mesh( geometry, sourceMesh.material.clone() );
		result.position.copy( sourceMesh.position );
		result.quaternion.copy( sourceMesh.quaternion );
		result.scale.copy( sourceMesh.scale );

		return result;


	}

	// Splits the given triangle
	splitTriangle( tri, keepNegative, target ) {

		const { trianglePool } = this;

		// TODO: clean up, add scratch variables, optimize
		const edgeIndices = [];
		const edges = [];
		const lerpValues = [];

		// Find all points to clip
		for ( let i = 0; i < 3; i ++ ) {

			const v = vertNames[ i ];
			const nv = vertNames[ ( i + 1 ) % 3 ];

			const pValue = tri.clipValues[ v ];
			const npValue = tri.clipValues[ nv ];

			// if the uv values span across the halfway divide
			if ( ( pValue < SPLIT_VALUE ) !== ( npValue < SPLIT_VALUE ) || pValue === SPLIT_VALUE ) {

				edgeIndices.push( i );
				edges.push( [ v, nv ] );

				if ( pValue === npValue ) {

					// avoid NaN here which can occur with mapLinear when pValue and npValue are the same value
					lerpValues.push( 0 );

				} else {

					lerpValues.push( MathUtils.mapLinear( SPLIT_VALUE, pValue, npValue, 0, 1 ) );

				}

			}

		}

		if ( edgeIndices.length !== 2 ) {

			// if we don't have two intersection points then this triangle must fall on
			// one side of the bounds.
			const minBound = Math.min(
				tri.clipValues.a,
				tri.clipValues.b,
				tri.clipValues.c,
			);

			if ( ( minBound < SPLIT_VALUE ) === keepNegative ) {

				target.push( tri );

			}

		} else if ( edgeIndices.length === 2 ) {

			// TODO: how can we determine which triangles actually need to be added here ahead of time
			const tri0 = trianglePool.get().initFromTriangle( tri );
			const tri1 = trianglePool.get().initFromTriangle( tri );
			const tri2 = trianglePool.get().initFromTriangle( tri );

			// If the points lie on edges that are immediately after one another then we have to split the
			// triangle differently.
			const sequential = ( ( edgeIndices[ 0 ] + 1 ) % 3 ) === edgeIndices[ 1 ];
			if ( sequential ) {

				tri0.lerpVertexFromEdge( tri, edges[ 0 ][ 0 ], edges[ 0 ][ 1 ], lerpValues[ 0 ], 'a' );
				tri0.copyVertex( tri, edges[ 0 ][ 1 ], 'b' );
				tri0.lerpVertexFromEdge( tri, edges[ 1 ][ 0 ], edges[ 1 ][ 1 ], lerpValues[ 1 ], 'c' );
				tri0.clipValues.a = SPLIT_VALUE;
				tri0.clipValues.c = SPLIT_VALUE;

				tri1.lerpVertexFromEdge( tri, edges[ 0 ][ 0 ], edges[ 0 ][ 1 ], lerpValues[ 0 ], 'a' );
				tri1.copyVertex( tri, edges[ 1 ][ 1 ], 'b' );
				tri1.copyVertex( tri, edges[ 0 ][ 0 ], 'c' );
				tri1.clipValues.a = SPLIT_VALUE;

				tri2.lerpVertexFromEdge( tri, edges[ 0 ][ 0 ], edges[ 0 ][ 1 ], lerpValues[ 0 ], 'a' );
				tri2.lerpVertexFromEdge( tri, edges[ 1 ][ 0 ], edges[ 1 ][ 1 ], lerpValues[ 1 ], 'b' );
				tri2.copyVertex( tri, edges[ 1 ][ 1 ], 'c' );
				tri2.clipValues.a = SPLIT_VALUE;
				tri2.clipValues.b = SPLIT_VALUE;

			} else {

				tri0.lerpVertexFromEdge( tri, edges[ 0 ][ 0 ], edges[ 0 ][ 1 ], lerpValues[ 0 ], 'a' );
				tri0.lerpVertexFromEdge( tri, edges[ 1 ][ 0 ], edges[ 1 ][ 1 ], lerpValues[ 1 ], 'b' );
				tri0.copyVertex( tri, edges[ 0 ][ 0 ], 'c' );
				tri0.clipValues.a = SPLIT_VALUE;
				tri0.clipValues.b = SPLIT_VALUE;

				tri1.lerpVertexFromEdge( tri, edges[ 0 ][ 0 ], edges[ 0 ][ 1 ], lerpValues[ 0 ], 'a' );
				tri1.copyVertex( tri, edges[ 0 ][ 1 ], 'b' );
				tri1.lerpVertexFromEdge( tri, edges[ 1 ][ 0 ], edges[ 1 ][ 1 ], lerpValues[ 1 ], 'c' );
				tri1.clipValues.a = SPLIT_VALUE;
				tri1.clipValues.c = SPLIT_VALUE;

				tri2.copyVertex( tri, edges[ 0 ][ 1 ], 'a' );
				tri2.copyVertex( tri, edges[ 1 ][ 0 ], 'b' );
				tri2.lerpVertexFromEdge( tri, edges[ 1 ][ 0 ], edges[ 1 ][ 1 ], lerpValues[ 1 ], 'c' );
				tri2.clipValues.c = SPLIT_VALUE;

			}

			// Save the triangles that sit on the right side of the split
			let minBound, negativeSide;
			minBound = Math.min( tri0.clipValues.a, tri0.clipValues.b, tri0.clipValues.c );
			negativeSide = minBound < SPLIT_VALUE;
			if ( negativeSide === keepNegative ) {

				target.push( tri0 );

			}

			minBound = Math.min( tri1.clipValues.a, tri1.clipValues.b, tri1.clipValues.c );
			negativeSide = minBound < SPLIT_VALUE;
			if ( negativeSide === keepNegative ) {

				target.push( tri1 );

			}

			minBound = Math.min( tri2.clipValues.a, tri2.clipValues.b, tri2.clipValues.c );
			negativeSide = minBound < SPLIT_VALUE;
			if ( negativeSide === keepNegative ) {

				target.push( tri2 );

			}

		}

	}

}

// Pool of reusable triangles
class ClipTrianglePool {

	constructor() {

		this.pool = [];
		this.index = 0;

	}

	get() {

		if ( this.index >= this.pool.length ) {

			const tri = new ClipTriangle();
			this.pool.push( tri );

		}

		const res = this.pool[ this.index ];
		this.index ++;
		return res;

	}

	reset() {

		this.index = 0;

	}

}

// Triangle class that stores the values to clip along, barycoord values for clipping, and the
// original indices that the barycoord are interpolated between.
class ClipTriangle {

	constructor() {

		this.indices = {
			a: - 1,
			b: - 1,
			c: - 1,
		};

		this.clipValues = {
			a: - 1,
			b: - 1,
			c: - 1,
		};

		this.barycoord = new Triangle();

	}

	// returns a hash for the given [0, 2] index based on attributes of the referenced geometry
	getVertexHash( index, geometry ) {

		const { barycoord, indices } = this;
		const vn = vertNames[ index ];
		const bc = barycoord[ vn ];

		// If the barycoord value is specifying a single vertex then return a quick hash
		if ( bc.x === 1 ) {

			return indices[ vertNames[ 0 ] ];

		} else if ( bc.y === 1 ) {

			return indices[ vertNames[ 1 ] ];

		} else if ( bc.z === 1 ) {

			return indices[ vertNames[ 2 ] ];

		} else {

			// Construct a hash based on all the interpolated attributes
			const { attributes } = geometry;
			let result = '';
			for ( const name in attributes ) {

				const attr = attributes[ name ];
				readInterpolatedAttribute( attr, indices.a, indices.b, indices.c, bc, _vec );

				// normalize values if needed
				if ( name === 'normal' || name === 'tangent' || name === 'bitangent' ) {

					_vec.normalize();

				}

				// construct the hash
				switch ( attr.itemSize ) {

					case 4:
						result += hashVertex( _vec.x, _vec.y, _vec.z, _vec.w );
						break;
					case 3:
						result += hashVertex( _vec.x, _vec.y, _vec.z );
						break;
					case 2:
						result += hashVertex( _vec.x, _vec.y );
						break;
					case 1:
						result += hashVertex( _vec.x );
						break;

				}

				result += '|';

			}

			return result;

		}

	}

	// Accumulate the vertex data in the given attribute arrays
	getVertexData( index, geometry, target ) {

		const { barycoord, indices } = this;
		const vn = vertNames[ index ];
		const bc = barycoord[ vn ];

		const { attributes } = geometry;
		for ( const name in attributes ) {

			// skip saving the data if we have no fields for it
			if ( ! target[ name ] ) {

				continue;

			}

			const attr = attributes[ name ];
			const arr = target[ name ];

			readInterpolatedAttribute( attr, indices.a, indices.b, indices.c, bc, _vec );

			// normalize values if needed
			if ( name === 'normal' || name === 'tangent' || name === 'bitangent' ) {

				_vec.normalize();

			}

			// append the data
			switch ( attr.itemSize ) {

				case 4:
					arr.push( _vec.x, _vec.y, _vec.z, _vec.w );
					break;
				case 3:
					arr.push( _vec.x, _vec.y, _vec.z );
					break;
				case 2:
					arr.push( _vec.x, _vec.y );
					break;
				case 1:
					arr.push( _vec.x );
					break;

			}

		}

	}

	// Copy the indices from a target triangle
	initFromTriangle( other ) {

		return this.initFromIndices(
			other.indices.a,
			other.indices.b,
			other.indices.c,
		);

	}

	// Set the indices for the given
	initFromIndices( i0, i1, i2 ) {

		this.indices.a = i0;
		this.indices.b = i1;
		this.indices.c = i2;

		this.clipValues.a = - 1;
		this.clipValues.b = - 1;
		this.clipValues.c = - 1;

		this.barycoord.a.set( 1, 0, 0 );
		this.barycoord.b.set( 0, 1, 0 );
		this.barycoord.c.set( 0, 0, 1 );

		return this;

	}

	// Lerp the given vertex along to the provided edge of the provided triangle
	lerpVertexFromEdge( other, e0, e1, alpha, targetVertex ) {

		this.clipValues[ targetVertex ] = MathUtils.lerp( other.clipValues[ e0 ], other.clipValues[ e1 ], alpha );
		this.barycoord[ targetVertex ].lerpVectors( other.barycoord[ e0 ], other.barycoord[ e1 ], alpha );

	}

	// Copy a vertex from the provided triangle
	copyVertex( other, fromVertex, targetVertex ) {

		this.clipValues[ targetVertex ] = other.clipValues[ fromVertex ];
		this.barycoord[ targetVertex ].copy( other.barycoord[ fromVertex ] );

	}

}

// Read a vertex from the given attribute interpolated between the indices
function readInterpolatedAttribute( attribute, i0, i1, i2, barycoord, target ) {

	_v0.fromBufferAttribute( attribute, i0 );
	_v1.fromBufferAttribute( attribute, i1 );
	_v2.fromBufferAttribute( attribute, i2 );

	target
		.set( 0, 0, 0, 0 )
		.addScaledVector( _v0, barycoord.x )
		.addScaledVector( _v1, barycoord.y )
		.addScaledVector( _v2, barycoord.z );

	switch ( attribute.itemSize ) {

		case 3:
			_vec.w = 0;
			break;
		case 2:
			_vec.w = 0;
			_vec.z = 0;
			break;
		case 1:
			_vec.w = 0;
			_vec.z = 0;
			_vec.y = 0;
			break;

	}

	return target;

}

// Hash the provided numbers
export function hashVertex( ...args ) {

	const scalar = 1e5;
	const additive = 0.5;
	let result = '';
	for ( let i = 0, l = args.length; i < l; i ++ ) {

		result += ~ ~ ( args[ i ] * scalar + additive );
		if ( i !== l - 1 ) {

			result += '_';

		}

	}
	return result;

}
