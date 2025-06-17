import {
	BufferAttribute,
	BufferGeometry,
	DataTexture,
	DefaultLoadingManager,
	LinearFilter,
	LinearMipMapLinearFilter,
	MathUtils,
	Mesh,
	MeshStandardMaterial,
	RGFormat,
	Triangle,
	UnsignedByteType,
	Vector3,
} from 'three';
import { QuantizedMeshLoaderBase } from '../../base/loaders/QuantizedMeshLoaderBase.js';
import { Ellipsoid } from '../../../three/math/Ellipsoid.js';

const _norm = /* @__PURE__ */ new Vector3();
const _tri = /* @__PURE__ */ new Triangle();
const _uvh = /* @__PURE__ */ new Vector3();
const _pos = /* @__PURE__ */ new Vector3();
export class QuantizedMeshLoader extends QuantizedMeshLoaderBase {

	constructor( manager = DefaultLoadingManager ) {

		super();
		this.manager = manager;
		this.ellipsoid = new Ellipsoid();
		this.skirtLength = 1000;
		this.smoothSkirtNormals = true;
		this.solid = false;

		// set the range of the tile
		this.minLat = - Math.PI / 2;
		this.maxLat = Math.PI / 2;
		this.minLon = - Math.PI;
		this.maxLon = Math.PI;

	}

	parse( buffer ) {

		const {
			ellipsoid,
			solid,
			skirtLength,
			smoothSkirtNormals,

			minLat,
			maxLat,
			minLon,
			maxLon,
		} = this;

		const {
			header,
			indices,
			vertexData,
			edgeIndices,
			extensions,
		} = super.parse( buffer );

		const geometry = new BufferGeometry();
		const material = new MeshStandardMaterial();
		const mesh = new Mesh( geometry, material );
		mesh.position.set( ...header.center );

		const includeNormals = 'octvertexnormals' in extensions;
		const vertexCount = vertexData.u.length;
		const positions = [];
		const uvs = [];
		const indexArr = [];
		const normals = [];
		let groupOffset = 0;
		let materialIndex = 0;

		// construct terrain
		for ( let i = 0; i < vertexCount; i ++ ) {

			readUVHeight( i, _uvh );
			readPosition( _uvh.x, _uvh.y, _uvh.z, _pos );

			uvs.push( _uvh.x, _uvh.y );
			positions.push( ..._pos );

		}

		for ( let i = 0, l = indices.length; i < l; i ++ ) {

			indexArr.push( indices[ i ] );

		}

		if ( includeNormals ) {

			const extNormals = extensions[ 'octvertexnormals' ].normals;
			for ( let i = 0, l = extNormals.length; i < l; i ++ ) {

				normals.push( extNormals[ i ] );

			}

		}

		// add material group
		geometry.addGroup( groupOffset, indices.length, materialIndex );
		groupOffset += indices.length;
		materialIndex ++;

		// create a lower cap
		if ( solid ) {

			const indexOffset = positions.length / 3;
			for ( let i = 0; i < vertexCount; i ++ ) {

				readUVHeight( i, _uvh );
				readPosition( _uvh.x, _uvh.y, _uvh.z, _pos, - skirtLength );

				uvs.push( _uvh.x, _uvh.y );
				positions.push( ..._pos );

			}

			for ( let i = indices.length - 1; i >= 0; i -- ) {

				indexArr.push( indices[ i ] + indexOffset );

			}

			if ( includeNormals ) {

				const extNormals = extensions[ 'octvertexnormals' ].normals;
				for ( let i = 0, l = extNormals.length; i < l; i ++ ) {

					normals.push( - extNormals[ i ] );

				}

			}


			// add material group
			geometry.addGroup( groupOffset, indices.length, materialIndex );
			groupOffset += indices.length;
			materialIndex ++;

		}

		// construct skirts
		if ( skirtLength > 0 ) {

			const {
				westIndices,
				eastIndices,
				southIndices,
				northIndices,
			} = edgeIndices;

			// construct the indices
			let offset;

			// west
			const westStrip = constructEdgeStrip( westIndices );
			offset = positions.length / 3;
			uvs.push( ...westStrip.uv );
			positions.push( ...westStrip.positions );
			for ( let i = 0, l = westStrip.indices.length; i < l; i ++ ) {

				indexArr.push( westStrip.indices[ i ] + offset );

			}

			// east
			const eastStrip = constructEdgeStrip( eastIndices );
			offset = positions.length / 3;
			uvs.push( ...eastStrip.uv );
			positions.push( ...eastStrip.positions );
			for ( let i = 0, l = eastStrip.indices.length; i < l; i ++ ) {

				indexArr.push( eastStrip.indices[ i ] + offset );

			}

			// south
			const southStrip = constructEdgeStrip( southIndices );
			offset = positions.length / 3;
			uvs.push( ...southStrip.uv );
			positions.push( ...southStrip.positions );
			for ( let i = 0, l = southStrip.indices.length; i < l; i ++ ) {

				indexArr.push( southStrip.indices[ i ] + offset );

			}

			// north
			const northStrip = constructEdgeStrip( northIndices );
			offset = positions.length / 3;
			uvs.push( ...northStrip.uv );
			positions.push( ...northStrip.positions );
			for ( let i = 0, l = northStrip.indices.length; i < l; i ++ ) {

				indexArr.push( northStrip.indices[ i ] + offset );

			}

			// add the normals
			if ( includeNormals ) {

				normals.push( ...westStrip.normals );
				normals.push( ...eastStrip.normals );
				normals.push( ...southStrip.normals );
				normals.push( ...northStrip.normals );

			}

			// add material group
			geometry.addGroup( groupOffset, indices.length, materialIndex );
			groupOffset += indices.length;
			materialIndex ++;

		}

		// shift the positions by the center of the tile
		for ( let i = 0, l = positions.length; i < l; i += 3 ) {

			positions[ i + 0 ] -= header.center[ 0 ];
			positions[ i + 1 ] -= header.center[ 1 ];
			positions[ i + 2 ] -= header.center[ 2 ];

		}

		// generate geometry and mesh
		const indexBuffer = positions.length / 3 > 65535 ? new Uint32Array( indexArr ) : new Uint16Array( indexArr );
		geometry.setIndex( new BufferAttribute( indexBuffer, 1, false ) );
		geometry.setAttribute( 'position', new BufferAttribute( new Float32Array( positions ), 3, false ) );
		geometry.setAttribute( 'uv', new BufferAttribute( new Float32Array( uvs ), 2, false ) );
		if ( includeNormals ) {

			geometry.setAttribute( 'normal', new BufferAttribute( new Float32Array( normals ), 3, false ) );

		}

		// generate the water texture
		if ( 'watermask' in extensions ) {

			// invert the mask data
			// TODO: this inversion step can be a bit slow
			const { mask, size } = extensions[ 'watermask' ];
			const maskBuffer = new Uint8Array( 2 * size * size );
			for ( let i = 0, l = mask.length; i < l; i ++ ) {

				const v = mask[ i ] === 255 ? 0 : 255;
				maskBuffer[ 2 * i + 0 ] = v;
				maskBuffer[ 2 * i + 1 ] = v;

			}

			// TODO: Luminance format is not supported - eventually node materials will
			// make it possible to map the texture to the appropriate buffer input.
			const map = new DataTexture( maskBuffer, size, size, RGFormat, UnsignedByteType );
			map.flipY = true;
			map.minFilter = LinearMipMapLinearFilter;
			map.magFilter = LinearFilter;
			map.needsUpdate = true;

			material.roughnessMap = map;

		}

		// set metadata
		mesh.userData.minHeight = header.minHeight;
		mesh.userData.maxHeight = header.maxHeight;

		if ( 'metadata' in extensions ) {

			mesh.userData.metadata = extensions[ 'metadata' ].json;

		}

		return mesh;

		function readUVHeight( index, target ) {

			target.x = vertexData.u[ index ];
			target.y = vertexData.v[ index ];
			target.z = vertexData.height[ index ];
			return target;

		}

		function readPosition( u, v, h, target, heightOffset = 0 ) {

			const height = MathUtils.lerp( header.minHeight, header.maxHeight, h );
			const lon = MathUtils.lerp( minLon, maxLon, u );
			const lat = MathUtils.lerp( minLat, maxLat, v );

			ellipsoid.getCartographicToPosition( lat, lon, height + heightOffset, target );

			return target;

		}

		function constructEdgeStrip( indices ) {

			const topUvs = [];
			const topPos = [];
			const botUvs = [];
			const botPos = [];
			const sideIndices = [];
			for ( let i = 0, l = indices.length; i < l; i ++ ) {

				readUVHeight( indices[ i ], _uvh );
				topUvs.push( _uvh.x, _uvh.y );
				botUvs.push( _uvh.x, _uvh.y );

				readPosition( _uvh.x, _uvh.y, _uvh.z, _pos );
				topPos.push( ..._pos );

				readPosition( _uvh.x, _uvh.y, _uvh.z, _pos, - skirtLength );
				botPos.push( ..._pos );

			}

			const triCount = ( indices.length - 1 );
			for ( let i = 0; i < triCount; i ++ ) {

				const t0 = i;
				const t1 = i + 1;
				const b0 = i + indices.length;
				const b1 = i + indices.length + 1;

				sideIndices.push( t0, b0, t1 );
				sideIndices.push( t1, b0, b1 );

			}

			let normals = null;
			if ( includeNormals ) {

				const total = ( topPos.length + botPos.length ) / 3;

				if ( smoothSkirtNormals ) {

					normals = new Array( total * 3 );

					const extNormals = extensions[ 'octvertexnormals' ].normals;
					const botOffset = normals.length / 2;
					for ( let i = 0, l = total / 2; i < l; i ++ ) {

						const index = indices[ i ];
						const i3 = 3 * i;
						const nx = extNormals[ 3 * index + 0 ];
						const ny = extNormals[ 3 * index + 1 ];
						const nz = extNormals[ 3 * index + 2 ];

						normals[ i3 + 0 ] = nx;
						normals[ i3 + 1 ] = ny;
						normals[ i3 + 2 ] = nz;

						normals[ botOffset + i3 + 0 ] = nx;
						normals[ botOffset + i3 + 1 ] = ny;
						normals[ botOffset + i3 + 2 ] = nz;

					}

				} else {

					normals = [];
					_tri.a.fromArray( topPos, 0 );
					_tri.b.fromArray( botPos, 0 );
					_tri.c.fromArray( topPos, 3 );
					_tri.getNormal( _norm );

					for ( let i = 0; i < total; i ++ ) {

						normals.push( ..._norm );

					}

				}

			}

			return {
				uv: [ ...topUvs, ...botUvs ],
				positions: [ ...topPos, ...botPos ],
				indices: sideIndices,
				normals,
			};

		}

	}

	// generates a child mesh in the given quadrant using the same settings as the loader
	clipToQuadrant( mesh, left, bottom ) {

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

		// construct bottom cap
		const capTriangles = newIndex.length / 3;
		if ( solid ) {

			newStart = newIndex.length;
			for ( let i = capTriangles * 3 - 1; i >= 0; i -- ) {

				const index = newIndex[ i ];
				_temp.fromArray( newPosition, index * 3 ).add( mesh.position );
				ellipsoid.getPositionToNormal( _temp, _temp );

				_pos0.fromArray( newPosition, index * 3 ).addScaledVector( _temp, - skirtLength );
				_uv0.fromArray( newUv, index * 2 );
				_temp.fromArray( newNormal, index * 3 );

				pushVertex( _pos0, _uv0, _temp, false );

			}

			geometry.addGroup( newStart, newIndex.length - newStart, materialIndex );
			materialIndex ++;

		}

		// construct the skirt
		if ( skirtLength > 0 ) {

			// TODO: this seems to have some problematic cases at the root tiles near the poles
			newStart = newIndex.length;
			for ( let i = 0; i < capTriangles; i ++ ) {

				const triOffset = 3 * i;
				for ( let e = 0; e < 3; e ++ ) {

					const ne = ( e + 1 ) % 3;
					const i0 = newIndex[ triOffset + e ];
					const i1 = newIndex[ triOffset + ne ];

					_uv0.fromArray( newUv, i0 * 2 );
					_uv1.fromArray( newUv, i1 * 2 );

					// find the vertices that lie on the edge
					if (
						_uv0.x === _uv1.x && ( _uv0.x === 0 || _uv0.x === SPLIT_VALUE || _uv0.x === 1.0 ) ||
						_uv0.y === _uv1.y && ( _uv0.y === 0 || _uv0.y === SPLIT_VALUE || _uv0.y === 1.0 )
					) {

						_pos0.fromArray( newPosition, i0 * 3 );
						_pos1.fromArray( newPosition, i1 * 3 );

						const u0 = _pos0;
						const u1 = _pos1;

						const b0 = _pos2.copy( _pos0 );
						const b1 = _pos3.copy( _pos1 );

						_temp.copy( b0 ).add( mesh.position );
						ellipsoid.getPositionToNormal( _temp, _temp );
						b0.addScaledVector( _temp, - skirtLength );

						_temp.copy( b1 ).add( mesh.position );
						ellipsoid.getPositionToNormal( _temp, _temp );
						b1.addScaledVector( _temp, - skirtLength );

						if ( smoothSkirtNormals && newNormal ) {

							_temp.fromArray( newNormal, i0 * 3 );
							_temp2.fromArray( newNormal, i1 * 3 );

						} else {

							_temp.subVectors( u0, u1 );
							_temp2.subVectors( u0, b0 ).cross( _temp ).normalize();
							_temp.copy( _temp2 );

						}

						pushVertex( u1, _uv1, _temp2, true );
						pushVertex( u0, _uv0, _temp, true );
						pushVertex( b0, _uv0, _temp, true );

						pushVertex( u1, _uv1, _temp2, true );
						pushVertex( b0, _uv0, _temp, true );
						pushVertex( b1, _uv1, _temp2, true );

					}

				}

			}

			geometry.addGroup( newStart, newIndex.length - newStart, materialIndex );
			materialIndex ++;

		}

		// offset the uvs
		for ( let i = 0, l = newUv.length; i < l; i += 2 ) {

			newUv[ i ] = ( newUv[ i ] + xUvOffset ) * 2.0;
			newUv[ i + 1 ] = ( newUv[ i + 1 ] + yUvOffset ) * 2.0;

		}

		// new geometry
		const indexBuffer = newPosition.length / 3 > 65535 ? new Uint32Array( newIndex ) : new Uint16Array( newIndex );
		geometry.setIndex( new BufferAttribute( indexBuffer, 1, false ) );
		geometry.setAttribute( 'position', new BufferAttribute( new Float32Array( newPosition ), 3, false ) );
		geometry.setAttribute( 'uv', new BufferAttribute( new Float32Array( newUv ), 2, false ) );
		if ( normal ) {

			geometry.setAttribute( 'normal', new BufferAttribute( new Float32Array( newNormal ), 3, false ) );

		}

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
