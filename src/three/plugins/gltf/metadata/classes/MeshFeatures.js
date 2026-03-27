/** @import { BufferGeometry, Texture, Vector3 } from 'three' */
import { Vector2 } from 'three';
import { TextureReadUtility } from '../utilities/TextureReadUtility.js';
import { getTexCoord, getTexelIndices, getTriangleVertexIndices } from '../utilities/TexCoordUtilities.js';

const _uv = /* @__PURE__ */ new Vector2();
const _pixel = /* @__PURE__ */ new Vector2();
const _dstPixel = /* @__PURE__ */ new Vector2();

// retrieve the appropriate UV attribute based on the tex coord index
function getMaxBarycoordIndex( barycoord ) {

	if ( barycoord.x > barycoord.y && barycoord.x > barycoord.z ) {

		return 0;

	} else if ( barycoord.y > barycoord.z ) {

		return 1;

	} else {

		return 2;

	}

}

/**
 * @typedef {Object} FeatureInfo
 * @property {string|null} label
 * @property {string|null} propertyTable
 * @property {number|null} nullFeatureId
 * @property {{texCoord: number, channels: Array<number>}} [texture]
 */

/**
 * Provides access to `EXT_mesh_features` feature ID data for a single mesh primitive.
 * Instances are created by `GLTFMeshFeaturesExtension` and attached to
 * `mesh.userData.meshFeatures`. Use `getFeatures()` or `getFeaturesAsync()` to read
 * feature IDs at a point on the mesh surface.
 * @param {BufferGeometry} geometry The primitive's buffer geometry.
 * @param {Array<Texture>} textures All GLTF textures (indexed by feature texture index).
 * @param {Object} data The raw `EXT_mesh_features` extension object for this primitive.
 */
export class MeshFeatures {

	constructor( geometry, textures, data ) {

		this.geometry = geometry;
		this.textures = textures;
		this.data = data;
		this._asyncRead = false;

		// fill out feature id default values
		this.featureIds = data.featureIds.map( info => {

			const { texture, ...rest } = info;
			const result = {
				label: null,
				propertyTable: null,
				nullFeatureId: null,
				...rest,
			};

			if ( texture ) {

				result.texture = {
					texCoord: 0,
					channels: [ 0 ],
					...texture,
				};

			}

			return result;

		} );

	}

	/**
	 * Returns an indexed list of all textures used by features in the extension.
	 * @returns {Array<Texture>}
	 */
	getTextures() {

		return this.textures;

	}

	/**
	 * Returns the feature ID info for each feature set defined on this primitive.
	 * @returns {Array<FeatureInfo>}
	 */
	getFeatureInfo() {

		return this.featureIds;

	}

	/**
	 * Performs the same function as `getFeatures` but reads texture data asynchronously.
	 * @param {number} triangle Triangle index from a raycast hit.
	 * @param {Vector3} barycoord Barycentric coordinate of the hit point.
	 * @returns {Promise<Array<number|null>>}
	 */
	getFeaturesAsync( ...args ) {

		this._asyncRead = true;
		const result = this.getFeatures( ...args );
		this._asyncRead = false;
		return result;

	}

	/**
	 * Returns the list of feature IDs at the given point on the mesh. Takes the triangle
	 * index from a raycast result and a barycentric coordinate. Results are indexed in the
	 * same order as the feature info returned by `getFeatureInfo()`.
	 * @param {number} triangle Triangle index from a raycast hit.
	 * @param {Vector3} barycoord Barycentric coordinate of the hit point.
	 * @returns {Array<number|null>}
	 */
	getFeatures( triangle, barycoord ) {

		const { geometry, textures, featureIds } = this;
		const result = new Array( featureIds.length ).fill( null );

		// prep the canvas width
		const width = featureIds.length;
		TextureReadUtility.increaseSizeTo( width );

		// get the attribute indices
		const indices = getTriangleVertexIndices( geometry, triangle );
		const closestIndex = indices[ getMaxBarycoordIndex( barycoord ) ];
		for ( let i = 0, l = featureIds.length; i < l; i ++ ) {

			// the feature id from the closest point is returned
			const featureId = featureIds[ i ];
			const nullFeatureId = 'nullFeatureId' in featureId ? featureId.nullFeatureId : null;
			if ( 'texture' in featureId ) {

				const texture = textures[ featureId.texture.index ];

				// get the attribute of the target tex coord and pixel
				getTexCoord( geometry, featureId.texture.texCoord, barycoord, indices, _uv );
				getTexelIndices( _uv, texture.image.width, texture.image.height, _pixel );
				_dstPixel.set( i, 0 );

				// draw the image
				TextureReadUtility.renderPixelToTarget( textures[ featureId.texture.index ], _pixel, _dstPixel );

			} else if ( 'attribute' in featureId ) {

				const attr = geometry.getAttribute( `_feature_id_${ featureId.attribute }` );
				const value = attr.getX( closestIndex );
				if ( value !== nullFeatureId ) {

					result[ i ] = value;

				}

			} else {

				// implicit id is based on vertex attributes, see 3d-tiles#763
				const value = closestIndex;
				if ( value !== nullFeatureId ) {

					result[ i ] = value;

				}

			}

		}

		// read the buffer data
		const buffer = new Uint8Array( width * 4 );
		if ( this._asyncRead ) {

			return TextureReadUtility
				.readDataAsync( buffer )
				.then( () => {

					readTextureSampleResults();
					return result;

				} );

		} else {

			TextureReadUtility.readData( buffer );
			readTextureSampleResults();

			return result;

		}

		function readTextureSampleResults() {

			// get data based on the texture information
			const readBuffer = new Uint32Array( 1 );
			for ( let i = 0, l = featureIds.length; i < l; i ++ ) {

				const featureId = featureIds[ i ];
				const nullFeatureId = 'nullFeatureId' in featureId ? featureId.nullFeatureId : null;
				if ( 'texture' in featureId ) {

					// TODO: do we need to handle big-endian here?
					const { channels } = featureId.texture;
					const data = channels.map( c => buffer[ 4 * i + c ] );
					new Uint8Array( readBuffer.buffer ).set( data );

					const value = readBuffer[ 0 ];
					if ( value !== nullFeatureId ) {

						result[ i ] = value;

					}

				}

			}

		}

	}

	/**
	 * Disposes all textures used by this instance.
	 */
	dispose() {

		this.textures.forEach( texture => {

			if ( texture ) {

				texture.dispose();

				if ( texture.image instanceof ImageBitmap ) {

					texture.image.close();

				}

			}

		} );

	}

}
