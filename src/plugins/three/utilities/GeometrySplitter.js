import { Vector3, MathUtils, Triangle, BufferGeometry, BufferAttribute, Mesh } from 'three';

export class GeometrySplitter {

	constructor() {

		this.splitOperations = [];

	}

	addSplitOperation( callback, keepPositive = true ) {

		this.splitOperations.push( {
			callback,
			keepPositive,
		} );

	}

	// generates a child mesh in the given quadrant using the same settings as the loader
	run( mesh, left, bottom ) {

		// scratch vectors
		const _uv0 = new Vector3();
		const _uv1 = new Vector3();

		const _pos0 = new Vector3();
		const _pos1 = new Vector3();
		const _pos2 = new Vector3();
		const _pos3 = new Vector3();

		const _temp = new Vector3();
		const _temp2 = new Vector3();
		const _cart = {};

		// helper variables
		const SPLIT_VALUE = 0.5;
		const triPool = new TrianglePool();
		const vertNames = [ 'a', 'b', 'c' ];
		const { ellipsoid, skirtLength, solid, smoothSkirtNormals } = this;

		// source geometry
		const sourceGeometry = mesh.geometry;
		const normal = sourceGeometry.attributes.normal;
		const index = sourceGeometry.index;

		// geometry data
		let nextIndex = 0;
		const vertToNewIndexMap = {};
		const newPosition = [];
		const newNormal = normal ? [] : null;
		const newUv = [];
		const newIndex = [];

		// uv offsets
		const xUvOffset = left ? 0 : - 0.5;
		const yUvOffset = bottom ? 0 : - 0.5;

		// iterate over each group separately to retain the group information
		const geometry = new BufferGeometry();
		const capGroup = sourceGeometry.groups[ 0 ];

		// construct the cap geometry
		let newStart = newIndex.length;
		let materialIndex = 0;
		for ( let i = capGroup.start / 3; i < ( capGroup.start + capGroup.count ) / 3; i ++ ) {

			const i0 = index.getX( i * 3 + 0 );
			const i1 = index.getX( i * 3 + 1 );
			const i2 = index.getX( i * 3 + 2 );
			const tri = triPool.get();
			tri.setFromAttributeAndIndices( sourceGeometry, i0, i1, i2 );

			// split the triangle by the first axis
			const xResult = [];
			splitTriangle( tri, 'x', left, xResult );

			// split the triangles by the second axis
			const yResult = [];
			for ( let t = 0, l = xResult.length; t < l; t ++ ) {

				splitTriangle( xResult[ t ], 'y', bottom, yResult );

			}

			// save the geometry
			const { minLat, maxLat, minLon, maxLon, ellipsoid } = this;
			for ( let t = 0, l = yResult.length; t < l; t ++ ) {

				const tri = yResult[ t ];
				vertNames.forEach( n => {

					const uv = tri.uv[ n ];
					if ( uv.x !== SPLIT_VALUE && uv.y !== SPLIT_VALUE ) {

						return;

					}

					const point = tri.position[ n ];
					const lat = MathUtils.lerp( minLat, maxLat, uv.y );
					const lon = MathUtils.lerp( minLon, maxLon, uv.x );

					point.add( mesh.position );
					ellipsoid.getPositionToCartographic( point, _cart );
					ellipsoid.getCartographicToPosition( lat, lon, _cart.height, point );
					point.sub( mesh.position );

				} );

				pushVertex( tri.position.a, tri.uv.a, tri.normal.a, false );
				pushVertex( tri.position.b, tri.uv.b, tri.normal.b, false );
				pushVertex( tri.position.c, tri.uv.c, tri.normal.c, false );

			}

			triPool.reset();

		}

		geometry.addGroup( newStart, newIndex.length - newStart, materialIndex );
		materialIndex ++;

		// new geometry
		const indexBuffer = newPosition.length / 3 > 65535 ? new Uint32Array( newIndex ) : new Uint16Array( newIndex );
		geometry.setIndex( new BufferAttribute( indexBuffer, 1, false ) );
		geometry.setAttribute( 'position', new BufferAttribute( new Float32Array( newPosition ), 3, false ) );
		geometry.setAttribute( 'uv', new BufferAttribute( new Float32Array( newUv ), 2, false ) );
		if ( normal ) {

			geometry.setAttribute( 'normal', new BufferAttribute( new Float32Array( newNormal ), 3, false ) );

		}

		// TODO: add remaining values

		// new mesh
		const result = new Mesh( geometry, mesh.material.clone() );
		result.position.copy( mesh.position );
		result.quaternion.copy( mesh.quaternion );
		result.scale.copy( mesh.scale );
		result.userData.minHeight = mesh.userData.minHeight;
		result.userData.maxHeight = mesh.userData.maxHeight;

		return result;

		function splitTriangle( tri, axis, negativeSide, target ) {

			// TODO: clean up, add scratch variables, optimize
			const edgeIndices = [];
			const edges = [];
			const lerpValues = [];

			for ( let i = 0; i < 3; i ++ ) {

				const v = vertNames[ i ];
				const nv = vertNames[ ( i + 1 ) % 3 ];

				const p = tri.uv[ v ];
				const np = tri.uv[ nv ];

				const pValue = p[ axis ];
				const npValue = np[ axis ];

				// if the uv values span across the halfway divide
				if ( ( pValue < SPLIT_VALUE ) !== ( npValue < SPLIT_VALUE ) || pValue === SPLIT_VALUE ) {

					edgeIndices.push( i );
					edges.push( [ v, nv ] );
					lerpValues.push( MathUtils.mapLinear( SPLIT_VALUE, pValue, npValue, 0, 1 ) );

				}

			}

			if ( edgeIndices.length !== 2 ) {

				const minBound = Math.min(
					tri.uv.a[ axis ],
					tri.uv.b[ axis ],
					tri.uv.c[ axis ],
				);

				if ( ( minBound < SPLIT_VALUE ) === negativeSide ) {

					target.push( tri );

				}

			} else if ( edgeIndices.length === 2 ) {

				// TODO: how can we determine which triangles actually need to be added here ahead of time
				const tri0 = triPool.get();
				const tri1 = triPool.get();
				const tri2 = triPool.get();

				const sequential = ( ( edgeIndices[ 0 ] + 1 ) % 3 ) === edgeIndices[ 1 ];
				if ( sequential ) {

					tri0.lerpVertex( tri, edges[ 0 ][ 0 ], edges[ 0 ][ 1 ], lerpValues[ 0 ], 'a' );
					tri0.copyVertex( tri, edges[ 0 ][ 1 ], 'b' );
					tri0.lerpVertex( tri, edges[ 1 ][ 0 ], edges[ 1 ][ 1 ], lerpValues[ 1 ], 'c' );
					tri0.uv.a[ axis ] = SPLIT_VALUE;
					tri0.uv.c[ axis ] = SPLIT_VALUE;

					tri1.lerpVertex( tri, edges[ 0 ][ 0 ], edges[ 0 ][ 1 ], lerpValues[ 0 ], 'a' );
					tri1.copyVertex( tri, edges[ 1 ][ 1 ], 'b' );
					tri1.copyVertex( tri, edges[ 0 ][ 0 ], 'c' );
					tri1.uv.a[ axis ] = SPLIT_VALUE;

					tri2.lerpVertex( tri, edges[ 0 ][ 0 ], edges[ 0 ][ 1 ], lerpValues[ 0 ], 'a' );
					tri2.lerpVertex( tri, edges[ 1 ][ 0 ], edges[ 1 ][ 1 ], lerpValues[ 1 ], 'b' );
					tri2.copyVertex( tri, edges[ 1 ][ 1 ], 'c' );
					tri2.uv.a[ axis ] = SPLIT_VALUE;
					tri2.uv.b[ axis ] = SPLIT_VALUE;

				} else {

					tri0.lerpVertex( tri, edges[ 0 ][ 0 ], edges[ 0 ][ 1 ], lerpValues[ 0 ], 'a' );
					tri0.lerpVertex( tri, edges[ 1 ][ 0 ], edges[ 1 ][ 1 ], lerpValues[ 1 ], 'b' );
					tri0.copyVertex( tri, edges[ 0 ][ 0 ], 'c' );
					tri0.uv.a[ axis ] = SPLIT_VALUE;
					tri0.uv.b[ axis ] = SPLIT_VALUE;

					tri1.lerpVertex( tri, edges[ 0 ][ 0 ], edges[ 0 ][ 1 ], lerpValues[ 0 ], 'a' );
					tri1.copyVertex( tri, edges[ 0 ][ 1 ], 'b' );
					tri1.lerpVertex( tri, edges[ 1 ][ 0 ], edges[ 1 ][ 1 ], lerpValues[ 1 ], 'c' );
					tri1.uv.a[ axis ] = SPLIT_VALUE;
					tri1.uv.c[ axis ] = SPLIT_VALUE;

					tri2.copyVertex( tri, edges[ 0 ][ 1 ], 'a' );
					tri2.copyVertex( tri, edges[ 1 ][ 0 ], 'b' );
					tri2.lerpVertex( tri, edges[ 1 ][ 0 ], edges[ 1 ][ 1 ], lerpValues[ 1 ], 'c' );
					tri2.uv.c[ axis ] = SPLIT_VALUE;

				}

				let minBound;
				minBound = Math.min( tri0.uv.a[ axis ], tri0.uv.b[ axis ], tri0.uv.c[ axis ] );
				if ( ( minBound < SPLIT_VALUE ) === negativeSide ) {

					target.push( tri0 );

				}

				minBound = Math.min( tri1.uv.a[ axis ], tri1.uv.b[ axis ], tri1.uv.c[ axis ] );
				if ( ( minBound < SPLIT_VALUE ) === negativeSide ) {

					target.push( tri1 );

				}

				minBound = Math.min( tri2.uv.a[ axis ], tri2.uv.b[ axis ], tri2.uv.c[ axis ] );
				if ( ( minBound < SPLIT_VALUE ) === negativeSide ) {

					target.push( tri2 );

				}

			}

		}

		// hash the vertex for index generation
		function hashVertex( x, y, z ) {

			const scalar = 1e5;
			const additive = 0.5;
			const hx = ~ ~ ( x * scalar + additive );
			const hy = ~ ~ ( y * scalar + additive );
			const hz = ~ ~ ( z * scalar + additive );
			return `${ hx }_${ hy }_${ hz }`;

		}

		// add the vertex to the geometry
		function pushVertex( pos, uv, norm ) {

			let hash = hashVertex( pos.x, pos.y, pos.z );
			if ( newNormal ) {

				hash += `_${ hashVertex( norm.x, norm.y, norm.z ) }`;

			}

			if ( ! ( hash in vertToNewIndexMap ) ) {

				vertToNewIndexMap[ hash ] = nextIndex;
				nextIndex ++;

				newPosition.push( pos.x, pos.y, pos.z );
				newUv.push( uv.x, uv.y );
				if ( newNormal ) {

					newNormal.push( norm.x, norm.y, norm.z );

				}

			}

			const index = vertToNewIndexMap[ hash ];
			newIndex.push( index );
			return index;

		}

	}

}


// Pool of reusable triangles
class TrianglePool {

	constructor() {

		this.pool = [];
		this.index = 0;

	}

	get() {

		if ( this.index >= this.pool.length ) {

			const tri = new AttributeTriangle();
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

// Set of triangle definitions for quantized mesh attributes
class AttributeTriangle {

	constructor() {

		this.position = new Triangle();
		this.uv = new Triangle();
		this.normal = new Triangle();

	}

	setFromAttributeAndIndices( geometry, i0, i1, i2 ) {

		this.position.setFromAttributeAndIndices( geometry.attributes.position, i0, i1, i2 );
		this.uv.setFromAttributeAndIndices( geometry.attributes.uv, i0, i1, i2 );
		if ( geometry.attributes.normal ) {

			this.normal.setFromAttributeAndIndices( geometry.attributes.normal, i0, i1, i2 );

		}

	}

	lerpVertex( other, e0, e1, alpha, targetVertex ) {

		this.position[ targetVertex ].lerpVectors( other.position[ e0 ], other.position[ e1 ], alpha );
		this.uv[ targetVertex ].lerpVectors( other.uv[ e0 ], other.uv[ e1 ], alpha );
		this.normal[ targetVertex ].lerpVectors( other.normal[ e0 ], other.normal[ e1 ], alpha );

	}

	copyVertex( other, fromVertex, targetVertex ) {

		this.position[ targetVertex ].copy( other.position[ fromVertex ] );
		this.uv[ targetVertex ].copy( other.uv[ fromVertex ] );
		this.normal[ targetVertex ].copy( other.normal[ fromVertex ] );

	}

}
