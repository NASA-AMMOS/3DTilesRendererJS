import { Vector2 } from 'three';
import { TextureReadUtility } from './TextureReadUtility';

const _uv = /* @__PURE__ */ new Vector2();
const _pixel = /* @__PURE__ */ new Vector2();
const _dstPixel = /* @__PURE__ */ new Vector2();

// retrieve the appropriate UV attribute based on the texcoord index
function getTextureCoordAttribute( geometry, index ) {

	if ( index === 0 ) {

		return geometry.getAttribute( 'uv' );

	} else {

		return geometry.getAttribute( `uv${ index }` );

	}

}

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
		let i0 = 3 * triangle;
		let i1 = 3 * triangle + 1;
		let i2 = 3 * triangle + 2;
		if ( geometry.index ) {

			i0 = geometry.index.getX( i0 );
			i1 = geometry.index.getX( i1 );
			i2 = geometry.index.getX( i2 );

		}

		const closestIndex = [ i0, i1, i2 ][ getMaxBarycoordIndex( barycoord ) ];
		for ( let i = 0, l = featureIds.length; i < l; i ++ ) {

			// the feature id from the closest point is returned
			const featureId = featureIds[ i ];
			const nullFeatureId = 'nullFeatureId' in featureId ? featureId.nullFeatureId : null;
			if ( 'texture' in featureId ) {

				// TODO: this shouldn't use the closest attribute
				const uv = getTextureCoordAttribute( geometry, featureId.texture.texCoord );
				_uv.fromBufferAttribute( uv, closestIndex );

				// draw the image
				const image = textures[ featureId.texture.index ].image;
				const { width, height } = image;

				const fx = _uv.x - Math.floor( _uv.x );
				const fy = _uv.y - Math.floor( _uv.y );
				const px = Math.floor( ( fx * width ) % width );
				const py = Math.floor( ( fy * height ) % height );

				_pixel.set( px, py );
				_dstPixel.set( i, 0 );

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
		const buffer = new Float32Array( width * 4 );
		if ( this._asyncRead ) {

			return TextureReadUtility
				.readDataAsync( buffer ).then( () => {

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
			for ( let i = 0, l = featureIds.length; i < l; i ++ ) {

				const featureId = featureIds[ i ];
				const nullFeatureId = 'nullFeatureId' in featureId ? featureId.nullFeatureId : null;
				if ( 'texture' in featureId ) {

					const { channels } = featureId.texture;
					let value = 0;

					channels.forEach( ( c, index ) => {

						const byte = Math.round( buffer[ 4 * i + c ] );
						const shift = index * 8;
						value = value | ( byte << shift );

					} );

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
