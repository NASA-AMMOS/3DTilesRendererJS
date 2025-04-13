import { BufferAttribute, BufferGeometry, ByteType, DataTexture, DefaultLoadingManager, MathUtils, Mesh, MeshBasicMaterial, MeshStandardMaterial, RedFormat, TorusGeometry, Triangle, Vector3, } from 'three';
import { QuantizedMeshLoaderBase } from '../../base/loaders/QuantizedMeshLoaderBase.js';
import { Ellipsoid } from '../../../three/math/Ellipsoid.js';

const _tri = new Triangle();
const _uvh = new Vector3();
const _pos = new Vector3();
export class QuantizedMeshLoader extends QuantizedMeshLoaderBase {

	constructor( manager = DefaultLoadingManager ) {

		super();
		this.manager = manager;
		this.ellipsoid = new Ellipsoid();
		this.skirtLength = 10;
		this.solid = false;

	}

	parse( buffer, options ) {

		const {
			ellipsoid,
			solid,
			skirtLength,
		} = this;

		const {
			header,
			indices,
			vertexData,
			edgeIndices,
			extensions,
		} = super.parse( buffer );

		const {
			minLat = - Math.PI / 2,
			maxLat = Math.PI / 2,
			minLon = - Math.PI,
			maxLon = Math.PI,
		} = options;

		const includeNormals = 'octvertexnormals' in extensions;
		const geometry = new BufferGeometry();
		const material = new MeshStandardMaterial();

		const vertexCount = vertexData.u.length;
		const positions = [];
		const uvs = [];
		const indexArr = [];
		const normals = [];

		// construct terrain
		const MAX_UINT16 = 2 ** 16 - 1;
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

			for ( let i = 0; i < vertexCount; i ++ ) {

				readUVHeight( i, _uvh );
				readPosition( _uvh.x, _uvh.y, _uvh.z - skirtLength, _pos );

				uvs.push( _uvh.x, _uvh.y );
				positions.push( ..._pos );

			}

			for ( let i = indices.length - 1; i >= 0; i -- ) {

				indexArr.push( indices[ i ] );

			}

			if ( includeNormals ) {

				const extNormals = extensions[ 'octvertexnormals' ].normals;
				for ( let i = 0, l = extNormals.length; i < l; i ++ ) {

					normals.push( - extNormals[ i ] );

				}

			}

		}

		// TODO: construct skirts
		if ( skirtLength > 0 ) {

			const {
				westIndices,
				eastIndices,
				southIndices,
				northIndices,
			} = edgeIndices;

			// construct the strip information
			const startIndex = positions.length / 3;
			const westStrip = constructEdgeStrip( westIndices );
			const eastStrip = constructEdgeStrip( eastIndices );
			const southStrip = constructEdgeStrip( southIndices );
			const northStrip = constructEdgeStrip( northIndices );

			// add all the vertex attributes
			uvs.concat( westStrip.uv, eastStrip.uv, southStrip.uv, northStrip.uv );
			positions.concat( westStrip.position, eastStrip.position, southStrip.position, northStrip.position );

			// construct the indices
			let offset;
			offset = startIndex;
			for ( let i = 0, l = westIndices.length; i < l; i ++ ) {

				positions.push( westStrip.indices[ i ] + offset );

			}

			offset += westIndices.length;
			for ( let i = 0, l = eastIndices.length; i < l; i ++ ) {

				positions.push( eastStrip.indices[ i ] + offset );

			}

			offset += eastIndices.length;
			for ( let i = 0, l = southIndices.length; i < l; i ++ ) {

				positions.push( southStrip.indices[ i ] + offset );

			}

			offset += southIndices.length;
			for ( let i = 0, l = northIndices.length; i < l; i ++ ) {

				positions.push( northStrip.indices[ i ] + offset );

			}

			// add the normals
			if ( includeNormals ) {

				for ( let i = 0, l = westIndices.length * 2; i ++ ) {

					normals.push( ...westStrip.normal );

				}

				for ( let i = 0, l = eastIndices.length * 2; i ++ ) {

					normals.push( ...eastStrip.normal );

				}

				for ( let i = 0, l = southIndices.length * 2; i ++ ) {

					normals.push( ...southStrip.normal );

				}

				for ( let i = 0, l = northIndices.length * 2; i ++ ) {

					normals.push( ...northStrip.normal );

				}

			}

		}

		// TODO: shift the positions by the center of the tile ahead of time

		// generate geometry and data
		geometry.setAttribute( 'position', new BufferAttribute( new Float32Array( positions ), 3, false ) );
		geometry.setAttribute( 'uv', new BufferAttribute( new Float32Array( uvs ), 2, false ) );
		if ( includeNormals ) {

			geometry.setAttribute( 'normal', new BufferAttribute( new Float32Array( normals ), 2, false ) );

		}

		const mesh = new Mesh( geometry, material );
		mesh.position.set( ...header.center );

		// generate the water texture
		if ( 'watermask' in extensions ) {

			// invert the mask data
			const mask = extensions[ 'watermask' ].mask;
			for ( let i = 0, l = mask.length; i < l; i ++ ) {

				mask[ i ] = mask[ i ] === 255 ? 0 : 255;

			}

			material.roughnessMap = new DataTexture( mask, 256, 256, RedFormat, ByteType );

		}

		// read metadata
		if ( 'metadata' in extensions ) {

			mesh.userData.metadata = extensions[ 'metadata' ].json;

		}

		return mesh;

		function readUVHeight( index, target ) {

			target.x = vertexData.u[ index ] / MAX_UINT16;
			target.y = vertexData.v[ index ] / MAX_UINT16;
			target.z = ( vertexData.height[ index ] / MAX_UINT16 ) - skirtLength;
			return target;

		}

		function readPosition( u, v, h, target ) {

			const height = MathUtils.lerp( header.minHeight, header.maxHeight, h );
			const lon = MathUtils.lerp( minLon, maxLon, u );
			const lat = MathUtils.lerp( minLat, maxLat, v );
			ellipsoid.getCartographicToPosition( lat, lon, height, target );

			return target;

		}

		function constructEdgeStrip( indices ) {

			const topUvs = [];
			const topPos = [];
			const botUvs = [];
			const botPos = [];
			const sideIndices = [];
			for ( let i = 0, l = indices; i < l; i ++ ) {

				readUVHeight( i, _uvh );
				topUvs.push( _uvh.x, _uvh.y );
				botUvs.push( _uvh.x, _uvh.y );

				readPosition( _uvh.x, _uvh.y, _uvh.z, _pos );
				topPos.push( ..._pos );

				readPosition( _uvh.x, _uvh.y, _uvh.z - skirtLength, _pos );
				botPos.push( ..._pos );

			}

			const triCount = ( indices.length - 1 ) * 2;
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
				uv: [ ...topUvs, botUvs ],
				position: [ ...topPos, botPos ],
				indices: sideIndices,
				normal: normal,
			};

		}

	}

}
