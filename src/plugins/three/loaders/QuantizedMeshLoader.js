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
	clipToQuadrant( mesh, left, top ) {

		const triPool = new TrianglePool();
		const tri = new Triangle();

		let nextIndex = 0;
		const vertToNewIndexMap = {};
		const newPos = [];
		const newNorm = [];
		const newUvs = [];
		const newInd = [];

		const {
			position,
			normal,
			uv,
		} = mesh.geometry.attributes;
		const index = mesh.geometry.index;

		const trisToClip = [];
		for ( let i = 0; i < index.count / 3; i ++ ) {

			// TODO: use while loop to iterate
			const i0 = index.getX( i * 3 + 0 );
			const i1 = index.getX( i * 3 + 0 );
			const i2 = index.getX( i * 3 + 0 );
			tri.setFromAttributeAndIndices( uv, i0, i1, i2 );

			const minX = Math.min( tri.a.x, tri.b.x, tri.c.x );
			const maxX = Math.max( tri.a.x, tri.b.x, tri.c.x );

			const minY = Math.min( tri.a.y, tri.b.y, tri.c.y );
			const maxY = Math.max( tri.a.y, tri.b.y, tri.c.y );

			const crossesX = ( minX < 0.5 ) !== ( maxX < 0.5 );
			const crossesY = ( minY < 0.5 ) !== ( maxY < 0.5 );

			if ( crossesX || crossesY ) {

				// TODO: clip triangles here
				trisToClip.push( i );

			} else if ( ( minX < 0.5 ) === left && ( minY < 0.5 ) === top ) {

				pushVertexByIndex( i0 );
				pushVertexByIndex( i1 );
				pushVertexByIndex( i2 );

			}

		}

		// new geometry
		const geometry = new BufferGeometry();
		const indexBuffer = newPos.length / 3 > 65535 ? new Uint32Array( newInd ) : new Uint16Array( newInd );
		geometry.setIndex( new BufferAttribute( indexBuffer, 1, false ) );
		geometry.setAttribute( 'position', new BufferAttribute( new Float32Array( newPos ), 3, false ) );
		geometry.setAttribute( 'uv', new BufferAttribute( new Float32Array( newUvs ), 2, false ) );
		if ( normal ) {

			geometry.setAttribute( 'normal', new BufferAttribute( new Float32Array( newNorm ), 3, false ) );

		}

		// new mesh
		const result = new Mesh( geometry, mesh.material.clone() );
		result.position.copy( mesh.position );
		result.quaternion.copy( mesh.quaternion );
		result.scale.copy( mesh.scale );
		result.userData.minHeight = mesh.userData.minHeight;
		result.userData.maxHeight = mesh.userData.maxHeight;

		return result;

		function hashVertex( v, edge = false ) {

			const scalar = 1e5;
			const additive = 0.5;
			const x = ~ ~ ( x * scalar + additive );
			const y = ~ ~ ( y * scalar + additive );
			const z = ~ ~ ( z * scalar + additive );
			return `${ x }_${ y }_${ z }_${ Number( edge ) }`;

		}

		function pushVertexByIndex( i ) {

			if ( ! ( i in vertToNewIndexMap ) ) {

				vertToNewIndexMap[ i ] = nextIndex;
				nextIndex ++;

				// TODO: remap the uvs
				newPos.push( position[ 3 * i + 0 ], position[ 3 * i + 1 ], position[ 3 * i + 2 ] );
				newUvs.push( uv[ 3 * i + 0 ], uv[ 3 * i + 1 ], uv[ 3 * i + 2 ] );

				if ( normal ) {

					newNorm.push( normal[ 3 * i + 0 ], normal[ 3 * i + 1 ], normal[ 3 * i + 2 ] );

				}

			}

			newInd.push( vertToNewIndexMap[ i ] );

		}

	}

}

class TrianglePool {

	constructor() {

		this.pool = [];
		this.index = 0;

	}

	get() {

		if ( this.index >= this.pool.length ) {

			const tri = new Triangle();
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
