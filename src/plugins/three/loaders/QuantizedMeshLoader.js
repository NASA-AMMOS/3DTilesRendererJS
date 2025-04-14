import {
	BufferAttribute,
	BufferGeometry,
	ByteType,
	DataTexture,
	DefaultLoadingManager,
	MathUtils,
	Mesh,
	MeshNormalMaterial,
	MeshStandardMaterial,
	RedFormat,
	Triangle,
	Vector3,
} from 'three';
import { QuantizedMeshLoaderBase } from '../../base/loaders/QuantizedMeshLoaderBase.js';
import { Ellipsoid } from '../../../three/math/Ellipsoid.js';
import { VertexNormalsHelper } from 'three/examples/jsm/helpers/VertexNormalsHelper.js';

const _tri = new Triangle();
const _uvh = new Vector3();
const _pos = new Vector3();
export class QuantizedMeshLoader extends QuantizedMeshLoaderBase {

	constructor( manager = DefaultLoadingManager ) {

		super();
		this.manager = manager;
		this.ellipsoid = new Ellipsoid();
		this.skirtLength = 1000;
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
		const material = new MeshNormalMaterial( { flatShading: true, side: 0 } );
		const mesh = new Mesh( geometry, material );
		mesh.position.set( ...header.center );

		const includeNormals = 'octvertexnormals' in extensions;
		const vertexCount = vertexData.u.length;
		const positions = [];
		const uvs = [];
		const indexArr = [];
		const normals = [];

		// construct terrain
		const MAX_VALUE = 32767;
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
			positions.push( ...westStrip.position );
			for ( let i = 0, l = westStrip.indices.length; i < l; i ++ ) {

				indexArr.push( westStrip.indices[ i ] + offset );

			}

			// east
			const eastStrip = constructEdgeStrip( eastIndices );
			offset = positions.length / 3;
			uvs.push( ...eastStrip.uv );
			positions.push( ...eastStrip.position );
			for ( let i = 0, l = eastStrip.indices.length; i < l; i ++ ) {

				indexArr.push( eastStrip.indices[ i ] + offset );

			}

			// south
			const southStrip = constructEdgeStrip( southIndices );
			offset = positions.length / 3;
			uvs.push( ...southStrip.uv );
			positions.push( ...southStrip.position );
			for ( let i = 0, l = southStrip.indices.length; i < l; i ++ ) {

				indexArr.push( southStrip.indices[ i ] + offset );

			}

			// north
			const northStrip = constructEdgeStrip( northIndices );
			offset = positions.length / 3;
			uvs.push( ...northStrip.uv );
			positions.push( ...northStrip.position );
			for ( let i = 0, l = northStrip.indices.length; i < l; i ++ ) {

				indexArr.push( northStrip.indices[ i ] + offset );

			}

			// add the normals
			if ( includeNormals ) {

				for ( let i = 0, l = westStrip.position.length / 3; i < l; i ++ ) {

					normals.push( ...westStrip.normal );

				}

				for ( let i = 0, l = eastStrip.position.length / 3; i < l; i ++ ) {

					normals.push( ...eastStrip.normal );

				}

				for ( let i = 0, l = southStrip.position.length / 3; i < l; i ++ ) {

					normals.push( ...southStrip.normal );

				}

				for ( let i = 0, l = northStrip.position.length / 3; i < l; i ++ ) {

					normals.push( ...northStrip.normal );

				}

			}

		}

		// shift the positions by the center of the tile
		for ( let i = 0, l = positions.length; i < l; i += 3 ) {

			positions[ i + 0 ] -= header.center[ 0 ];
			positions[ i + 1 ] -= header.center[ 1 ];
			positions[ i + 2 ] -= header.center[ 2 ];

		}

		// generate geometry and mesh
		geometry.setIndex( indexArr );
		geometry.setAttribute( 'position', new BufferAttribute( new Float32Array( positions ), 3, false ) );
		geometry.setAttribute( 'uv', new BufferAttribute( new Float32Array( uvs ), 2, false ) );
		if ( includeNormals ) {

			geometry.setAttribute( 'normal', new BufferAttribute( new Float32Array( normals ), 3, false ) );

		}

		// generate the water texture
		if ( 'watermask' in extensions ) {

			// invert the mask data
			const mask = extensions[ 'watermask' ].mask;
			for ( let i = 0, l = mask.length; i < l; i ++ ) {

				mask[ i ] = mask[ i ] === 255 ? 0 : 255;

			}

			material.roughnessMap = new DataTexture( mask, 256, 256, RedFormat, ByteType );

		}

		// set metadata
		mesh.userData.minHeight = header.minHeight;
		mesh.userData.maxHeight = header.maxHeight;

		// const helper = new VertexNormalsHelper( mesh, 1000000 );
		// helper.matrixWorld.identity();
		// helper.matrixWorldAutoUpdate = false;
		// mesh.add( helper )

		if ( 'metadata' in extensions ) {

			mesh.userData.metadata = extensions[ 'metadata' ].json;

		}

		return mesh;

		function readUVHeight( index, target ) {

			target.x = vertexData.u[ index ] / MAX_VALUE;
			target.y = vertexData.v[ index ] / MAX_VALUE;
			target.z = vertexData.height[ index ] / MAX_VALUE;
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

			const normal = new Vector3();
			_tri.a.fromArray( topPos, 0 );
			_tri.b.fromArray( botPos, 0 );
			_tri.c.fromArray( topPos, 3 );
			_tri.getNormal( normal );

			return {
				uv: [ ...topUvs, ...botUvs ],
				position: [ ...topPos, ...botPos ],
				indices: sideIndices,
				normal: normal,
			};

		}

	}

}
