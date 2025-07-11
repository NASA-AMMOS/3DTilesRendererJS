import { MathUtils, Vector2, Vector3 } from 'three';
import { GeometryClipper, hashVertex } from './GeometryClipper.js';
import { Ellipsoid } from '../../../three/renderer/math/Ellipsoid.js';

const _cart = {};
const _vec = /* @__PURE__ */ new Vector3();
const _pos0 = /* @__PURE__ */ new Vector3();
const _pos1 = /* @__PURE__ */ new Vector3();
const _pos2 = /* @__PURE__ */ new Vector3();
const _pos3 = /* @__PURE__ */ new Vector3();
const _temp = /* @__PURE__ */ new Vector3();
const _temp2 = /* @__PURE__ */ new Vector3();

const _uv0 = /* @__PURE__ */ new Vector2();
const _uv1 = /* @__PURE__ */ new Vector2();
const _uv2 = /* @__PURE__ */ new Vector2();

export class QuantizedMeshClipper extends GeometryClipper {

	constructor() {

		super();
		this.ellipsoid = new Ellipsoid();
		this.skirtLength = 1000;
		this.smoothSkirtNormals = true;
		this.solid = false;

		this.minLat = - Math.PI / 2;
		this.maxLat = Math.PI / 2;
		this.minLon = - Math.PI;
		this.maxLon = Math.PI;

		this.attributeList = [ 'position', 'normal', 'uv' ];

	}

	clipToQuadrant( sourceMesh, left, bottom ) {

		const { solid, skirtLength, ellipsoid, smoothSkirtNormals } = this;

		this.clearSplitOperations();
		this.addSplitOperation( getUvSplitOperation( 'x' ), ! left );
		this.addSplitOperation( getUvSplitOperation( 'y' ), ! bottom );

		let botResult, skirtResult;
		const capGroup = sourceMesh.geometry.groups[ 0 ];
		const capResult = this.getClippedData( sourceMesh, capGroup );
		this.adjustVertices( capResult, sourceMesh.position, 0 );

		if ( solid ) {

			botResult = {
				index: capResult.index.slice().reverse(),
				attributes: {},
			};

			for ( const key in capResult.attributes ) {

				botResult.attributes[ key ] = capResult.attributes[ key ].slice();

			}

			const normal = botResult.attributes.normal;
			if ( normal ) {

				for ( let i = 0; i < normal.length; i += 3 ) {

					normal[ i + 0 ] *= - 1;
					normal[ i + 1 ] *= - 1;
					normal[ i + 2 ] *= - 1;

				}

			}

			this.adjustVertices( botResult, sourceMesh.position, - skirtLength );

		}

		if ( skirtLength > 0 ) {

			skirtResult = {
				index: [],
				attributes: {
					position: [],
					normal: [],
					uv: [],
				},
			};

			// push data onto the
			let nextIndex = 0;
			const vertToNewIndexMap = {};
			const pushVertex = ( pos, uv, norm ) => {

				const hash = hashVertex( ...pos, ...norm, ...uv );
				if ( ! ( hash in vertToNewIndexMap ) ) {

					vertToNewIndexMap[ hash ] = nextIndex;
					nextIndex ++;

					skirtResult.attributes.position.push( ...pos );
					skirtResult.attributes.normal.push( ...norm );
					skirtResult.attributes.uv.push( ...uv );

				}

				skirtResult.index.push( vertToNewIndexMap[ hash ] );

			};

			// TODO: this seems to have some problematic cases at the root tiles near the poles
			const capIndex = capResult.index;
			const capUv = capResult.attributes.uv;
			const capPosition = capResult.attributes.position;
			const capNormal = capResult.attributes.normal;
			const capTriangles = capResult.index.length / 3;
			for ( let i = 0; i < capTriangles; i ++ ) {

				const triOffset = 3 * i;
				for ( let e = 0; e < 3; e ++ ) {

					const ne = ( e + 1 ) % 3;
					const i0 = capIndex[ triOffset + e ];
					const i1 = capIndex[ triOffset + ne ];

					_uv0.fromArray( capUv, i0 * 2 );
					_uv1.fromArray( capUv, i1 * 2 );

					// find the vertices that lie on the edge
					if (
						_uv0.x === _uv1.x && ( _uv0.x === 0 || _uv0.x === 0.5 || _uv0.x === 1.0 ) ||
						_uv0.y === _uv1.y && ( _uv0.y === 0 || _uv0.y === 0.5 || _uv0.y === 1.0 )
					) {

						_pos0.fromArray( capPosition, i0 * 3 );
						_pos1.fromArray( capPosition, i1 * 3 );

						const u0 = _pos0;
						const u1 = _pos1;

						const b0 = _pos2.copy( _pos0 );
						const b1 = _pos3.copy( _pos1 );

						_temp.copy( b0 ).add( sourceMesh.position );
						ellipsoid.getPositionToNormal( _temp, _temp );
						b0.addScaledVector( _temp, - skirtLength );

						_temp.copy( b1 ).add( sourceMesh.position );
						ellipsoid.getPositionToNormal( _temp, _temp );
						b1.addScaledVector( _temp, - skirtLength );

						if ( smoothSkirtNormals && capNormal ) {

							_temp.fromArray( capNormal, i0 * 3 );
							_temp2.fromArray( capNormal, i1 * 3 );

						} else {

							_temp.subVectors( u0, u1 );
							_temp2.subVectors( u0, b0 ).cross( _temp ).normalize();
							_temp.copy( _temp2 );

						}

						pushVertex( u1, _uv1, _temp2 );
						pushVertex( u0, _uv0, _temp );
						pushVertex( b0, _uv0, _temp );

						pushVertex( u1, _uv1, _temp2 );
						pushVertex( b0, _uv0, _temp );
						pushVertex( b1, _uv1, _temp2 );

					}

				}

			}

		}

		const capLength = capResult.index.length;
		const result = capResult;
		if ( botResult ) {

			const { index, attributes } = botResult;
			const offset = result.attributes.position.length / 3;
			for ( let i = 0, l = index.length; i < l; i ++ ) {

				result.index.push( index[ i ] + offset );

			}

			for ( const key in capResult.attributes ) {

				result.attributes[ key ].push( ...attributes[ key ] );

			}

		}

		if ( skirtResult ) {

			const { index, attributes } = skirtResult;
			const offset = result.attributes.position.length / 3;
			for ( let i = 0, l = index.length; i < l; i ++ ) {

				result.index.push( index[ i ] + offset );

			}

			for ( const key in capResult.attributes ) {

				result.attributes[ key ].push( ...attributes[ key ] );

			}

		}

		// offset the uvs
		const xUvOffset = left ? 0 : - 0.5;
		const yUvOffset = bottom ? 0 : - 0.5;
		const uv = result.attributes.uv;
		for ( let i = 0, l = uv.length; i < l; i += 2 ) {

			uv[ i ] = ( uv[ i ] + xUvOffset ) * 2.0;
			uv[ i + 1 ] = ( uv[ i + 1 ] + yUvOffset ) * 2.0;

		}

		// construct the result
		const resultMesh = this.constructMesh( result.attributes, result.index, sourceMesh );
		resultMesh.userData.minHeight = sourceMesh.userData.minHeight;
		resultMesh.userData.maxHeight = sourceMesh.userData.maxHeight;

		let materialIndex = 0;
		let start = 0;
		resultMesh.geometry.addGroup( start, capLength, materialIndex );
		start += capLength;
		materialIndex ++;

		if ( botResult ) {

			resultMesh.geometry.addGroup( start, botResult.index.length, materialIndex );
			start += botResult.index.length;
			materialIndex ++;

		}

		if ( skirtResult ) {

			resultMesh.geometry.addGroup( start, skirtResult.index.length, materialIndex );
			start += skirtResult.index.length;
			materialIndex ++;

		}

		return resultMesh;

	}

	adjustVertices( info, position, offset ) {

		const { ellipsoid, minLat, maxLat, minLon, maxLon } = this;
		const { attributes, vertexIsClipped } = info;
		const posArr = attributes.position;
		const uvArr = attributes.uv;

		const vertexCount = posArr.length / 3;
		for ( let i = 0; i < vertexCount; i ++ ) {

			const uv = _uv0.fromArray( uvArr, i * 2 );
			if ( vertexIsClipped && vertexIsClipped[ i ] ) {

				if ( Math.abs( uv.x - 0.5 ) < 1e-10 ) {

					uv.x = 0.5;

				}

				if ( Math.abs( uv.y - 0.5 ) < 1e-10 ) {

					uv.y = 0.5;

				}

				_uv0.toArray( uvArr, i * 2 );

			}

			const lat = MathUtils.lerp( minLat, maxLat, uv.y );
			const lon = MathUtils.lerp( minLon, maxLon, uv.x );
			const point = _vec.fromArray( posArr, i * 3 ).add( position );
			ellipsoid.getPositionToCartographic( point, _cart );
			ellipsoid.getCartographicToPosition( lat, lon, _cart.height + offset, point );
			point.sub( position );
			point.toArray( posArr, i * 3 );

		}

	}

}

function getUvSplitOperation( axis ) {

	return ( geometry, i0, i1, i2, barycoord ) => {

		const uv = geometry.attributes.uv;
		_uv0.fromBufferAttribute( uv, i0 );
		_uv1.fromBufferAttribute( uv, i1 );
		_uv2.fromBufferAttribute( uv, i2 );

		return _uv0[ axis ] * barycoord.x + _uv1[ axis ] * barycoord.y + _uv2[ axis ] * barycoord.z - 0.5;

	};

}
