import { Vector2 } from 'three';
import { TextureReadUtility } from '../utilities/TextureReadUtility.js';
import { getTexCoord, getTexelIndices, getTriangleIndices } from '../utilities/TexCoordUtilities.js';

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

export class MeshFeatures {

	constructor( geometry, textures, data ) {

		this.geometry = geometry;
		this.textures = textures;
		this.data = data;
		this._asyncRead = false;

	}

	getTextures() {

		return this.textures;

	}

	// performs texture data read back asynchronously
	getFeaturesAsync( ...args ) {

		this._asyncRead = true;
		const result = this.getFeatures( ...args );
		this._asyncRead = false;
		return result;

	}

	// returns all features for the given point on the given triangle
	getFeatures( triangle, barycoord ) {

		const { geometry, textures, data } = this;
		const { featureIds } = data;
		const result = new Array( featureIds.length ).fill( null );

		// prep the canvas width
		const width = data.featureIds.length;
		TextureReadUtility.increaseSizeTo( width );

		// get the attribute indices
		const indices = getTriangleIndices( geometry, triangle );
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

					// TODO: do we nee to handle big-endian here?
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

	// returns a minimal set of info for each feature
	getFeatureInfo() {

		return this.data.featureIds.map( info => {

			return {
				label: null,
				propertyTable: null,
				...info
			};

		} );

	}

	// dispose all of the texture data used
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
