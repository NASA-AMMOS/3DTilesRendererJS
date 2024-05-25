import { Vector2 } from 'three';
import { PropertyAccessor, getArrayConstructorFromType, getDataValue, getTypeInstance, isNoDataEqual, resolveDefault } from './PropertyAccessor.js';
import { TextureReadUtility } from '../utilities/TextureReadUtility.js';
import { getTexCoord, getTexelIndices, getTriangleIndices } from '../utilities/TexCoordUtilities.js';

const _uv = /* @__PURE__ */ new Vector2();
const _pixel = /* @__PURE__ */ new Vector2();
const _dstPixel = /* @__PURE__ */ new Vector2();

export class PropertyTextureAccessor extends PropertyAccessor {

	constructor( definition, data, classes, enums, geometry ) {

		super( definition, data, classes, enums );

		this.isPropertyTextureAccessor = true;
		this.geometry = geometry;

	}

	getPropertyValueAtTexelAsync( ...args ) {

		// TODO

	}

	getPropertyValuesAtTexelAsync( ...args ) {

		// TODO

	}

	getPropertyValueAtTexel( name, triangle, barycoord, target = null ) {

		return this.getPropertyValuesAtTexel( [ name ], triangle, barycoord, target )[ 0 ];

	}

	getPropertyValuesAtTexel( names, triangle, barycoord, target = null ) {

		if ( target = null ) {

			target = [];

		}

		target.length = names.length;
		TextureReadUtility.increaseSizeTo( target.length );

		// get the attribute indices
		const textures = this.data;
		const geometry = this.geometry;
		const indices = getTriangleIndices( geometry, triangle );
		for ( let i = 0, l = names.length; i < l; i ++ ) {

			const name = names[ i ];
			const property = this.definition.properties[ name ];
			if ( ! property ) {

				continue;

			}

			// get the attribute of the target tex coord
			const texture = textures[ property.index ];
			getTexCoord( geometry, property.texCoord, barycoord, indices, _uv );
			getTexelIndices( _uv, texture.image.width, texture.image.height, _pixel );
			_dstPixel.set( i, 0 );

			TextureReadUtility.renderPixelToTarget( texture, _pixel, _dstPixel );

		}

		const buffer = new Uint8Array( names.length * 4 );
		if ( this._asyncRead ) {

			return TextureReadUtility
				.readDataAsync( buffer )
				.then( () => {

					readTextureSampleResults();
					return target;

				} );

		} else {

			TextureReadUtility.readData( buffer );
			readTextureSampleResults();

			return target;

		}

		function readTextureSampleResults() {

			for ( let i = 0, l = names.length; i < l; i ++ ) {

				const name = names[ i ];
				const property = this.definition.properties[ name ];
				const classProperty = this.class.properties[ name ];
				const type = classProperty.type;
				if ( ! property ) {

					if ( ! classProperty ) {

						throw new Error( 'PropertyTextureAccessor: Requested property does not exist.' );

					} else {

						target[ i ] = resolveDefault( classProperty.default, type, target );
						continue;

					}

				}

				const { channels } = property;
				const data = channels.map( c => buffer[ 4 * i + c ] );

				const valueType = this._getPropertyValueType( name );
				const valueLength = parseInt( valueType.replace( /[^\d]/, '' ) );
				const length = valueLength * ( classProperty.count || 1 );

				const BufferCons = getArrayConstructorFromType( valueType );
				const readBuffer = new BufferCons( length );
				new Uint8Array( readBuffer.buffer ).set( data );

				if ( target[ i ] === undefined || target[ i ] === null ) {

					if ( classProperty.array ) {

						target[ i ] = [];

					}

				}

				if ( classProperty.array ) {

					const arr = target[ i ];
					while ( classProperty.count < arr.length ) arr.push( getTypeInstance( type ) );
					arr.length = classProperty.count;

					for ( let j = 0, lj = arr.length; j < lj; lj ++ ) {

						target[ j ] = getDataValue( readBuffer, j * valueLength, type, target[ j ] );

					}

				} else {

					target[ i ] = getDataValue( readBuffer, 0, type );

				}

				// TODO: handle scaling, normalization, and offset of values
				// TODO: handle enums

				if ( 'noData' in classProperty && isNoDataEqual( target, type, classProperty.noData ) ) {

					target[ i ] = resolveDefault( classProperty.default, type, target );

				}

			}

		}

	}

	// dispose all of the texture data used
	dispose() {

		this.data.forEach( texture => {

			if ( texture ) {

				texture.dispose();

				if ( texture.image instanceof ImageBitmap ) {

					texture.image.close();

				}

			}

		} );

	}

}
