import { Vector2 } from 'three';
import {
	PropertySetAccessor,
	adjustValue,
	getArrayConstructorFromType,
	getDataValue,
	getField,
	getTypeInstance,
	isNoDataEqual,
	resolveDefault,
} from './PropertySetAccessor.js';
import { TextureReadUtility } from '../utilities/TextureReadUtility.js';
import { getTexCoord, getTexelIndices, getTriangleIndices } from '../utilities/TexCoordUtilities.js';

const _uv = /* @__PURE__ */ new Vector2();
const _pixel = /* @__PURE__ */ new Vector2();
const _dstPixel = /* @__PURE__ */ new Vector2();

export class PropertyTextureAccessor extends PropertySetAccessor {

	constructor( ...args ) {

		super( ...args );

		this.isPropertyTextureAccessor = true;
		this._asyncRead = false;

	}

	getData( faceIndex, barycoord, geometry, target = {} ) {

		const properties = this.class.properties;
		const names = Object.keys( properties );
		const results = names.map( n => target[ n ] || null );
		this.getPropertyValuesAtTexel( names, faceIndex, barycoord, geometry, results );

		names.forEach( ( n, i ) => target[ n ] = results[ i ] );

		// remove unused fields
		for ( const key in target ) {

			if ( ! ( key in properties ) ) {

				delete target[ key ];

			}

		}

		return target;

	}

	getPropertyValuesAtTexelAsync( ...args ) {

		this._asyncRead = true;
		const result = this.getFeatures( ...args );
		this._asyncRead = false;
		return result;

	}

	getPropertyValuesAtTexel( names, faceIndex, barycoord, geometry, target = null ) {

		if ( target === null ) {

			target = [];

		}

		target.length = names.length;
		TextureReadUtility.increaseSizeTo( target.length );

		// get the attribute indices
		const textures = this.data;
		const indices = getTriangleIndices( geometry, faceIndex );
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

					readTextureSampleResults.call( this );
					return target;

				} );

		} else {

			TextureReadUtility.readData( buffer );
			readTextureSampleResults.call( this );

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

				const componentType = this._getPropertyComponentType( name );
				const valueLength = parseInt( componentType.replace( /[^0-9]/g, '' ) );
				const length = valueLength * ( classProperty.count || 1 );

				const BufferCons = getArrayConstructorFromType( componentType );
				const readBuffer = new BufferCons( length );
				new Uint8Array( readBuffer.buffer ).set( data );

				if ( target[ i ] === undefined || target[ i ] === null ) {

					if ( classProperty.array ) {

						target[ i ] = [];

					}

				}

				const normalized = getField( classProperty, 'normalized', false );
				const valueScale = getField( property, 'scale', getField( classProperty, 'scale', 1 ) );
				const valueOffset = getField( property, 'offset', getField( classProperty, 'offset', 0 ) );

				// TODO: reuse some of this value handling logic
				if ( classProperty.array ) {

					const arr = target[ i ];
					while ( classProperty.count < arr.length ) arr.push( getTypeInstance( type ) );
					arr.length = classProperty.count;

					for ( let j = 0, lj = arr.length; j < lj; lj ++ ) {

						target[ j ] = getDataValue( readBuffer, j * valueLength, type, target[ j ] );

						if ( type === 'ENUM' ) {

							target[ j ] = this._enumValueToName( classProperty.enumType, target[ j ] );

						} else {

							target[ j ] = adjustValue( target[ j ], type, componentType, valueScale, valueOffset, normalized );

						}

					}

				} else {

					target[ i ] = getDataValue( readBuffer, 0, type );

					if ( type === 'ENUM' ) {

						target[ i ] = this._enumValueToName( classProperty.enumType, target[ i ] );

					} else {

						target[ i ] = adjustValue( target[ i ], type, componentType, valueScale, valueOffset, normalized );

					}

				}

				// TODO: this enum needs to be handled before enum has been converted
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
