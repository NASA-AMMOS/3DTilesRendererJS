import { Vector2 } from 'three';
import { PropertySetAccessor } from './PropertySetAccessor.js';
import { ClassProperty } from './ClassProperty.js';
import { TextureReadUtility } from '../utilities/TextureReadUtility.js';
import { getTexCoord, getTexelIndices, getTriangleVertexIndices } from '../utilities/TexCoordUtilities.js';
import {
	initializeFromClass,
	initializeFromProperty,
	getArrayConstructorFromComponentType,
	readDataFromBufferToType,
	getField
} from '../utilities/ClassPropertyHelpers.js';

const _uv = /* @__PURE__ */ new Vector2();
const _srcPixel = /* @__PURE__ */ new Vector2();
const _dstPixel = /* @__PURE__ */ new Vector2();

class PropertyTextureClassProperty extends ClassProperty {

	constructor( enums, classProperty, textureProperty = null ) {

		super( enums, classProperty, textureProperty );

		this.channels = getField( textureProperty, 'channels', [ 0 ] );
		this.index = getField( textureProperty, 'index', null );
		this.texCoord = getField( textureProperty, 'texCoord', null );
		this.valueLength = parseInt( this.type.replace( /[^0-9]/g, '' ) ) || 1;

	}

	// takes the buffer to read from and the value index to read
	readDataFromBuffer( buffer, index, target = null ) {

		const type = this.type;
		if ( type === 'BOOLEAN' || type === 'STRING' ) {

			throw new Error( 'PropertyTextureAccessor: BOOLEAN and STRING types not supported.' );

		}

		// "readDataFromBufferToType" takes the start offset to read from so we multiply the index by the
		// final value length
		return readDataFromBufferToType( buffer, index * this.valueLength, type, target );

	}

}

// Reads and accesses data encoded to textures
export class PropertyTextureAccessor extends PropertySetAccessor {

	constructor( ...args ) {

		super( ...args );

		this.isPropertyTextureAccessor = true;
		this._asyncRead = false;

		this._initProperties( PropertyTextureClassProperty );

	}

	// Reads the full set of property data
	getData( faceIndex, barycoord, geometry, target = {} ) {

		const properties = this.properties;
		initializeFromClass( properties, target );

		const names = Object.keys( properties );
		const results = names.map( n => target[ n ] );
		this.getPropertyValuesAtTexel( names, faceIndex, barycoord, geometry, results );

		names.forEach( ( n, i ) => target[ n ] = results[ i ] );
		return target;

	}

	// Reads the full set of property data asynchronously
	async getDataAsync( faceIndex, barycoord, geometry, target = {} ) {

		const properties = this.properties;
		initializeFromClass( properties, target );

		const names = Object.keys( properties );
		const results = names.map( n => target[ n ] );
		await this.getPropertyValuesAtTexelAsync( names, faceIndex, barycoord, geometry, results );

		names.forEach( ( n, i ) => target[ n ] = results[ i ] );
		return target;

	}

	// Reads values asynchronously
	getPropertyValuesAtTexelAsync( ...args ) {

		this._asyncRead = true;
		const result = this.getPropertyValuesAtTexel( ...args );
		this._asyncRead = false;
		return result;

	}

	// Reads values from the textures synchronously
	getPropertyValuesAtTexel( names, faceIndex, barycoord, geometry, target = [] ) {

		// resize our targets appropriately
		while ( target.length < names.length ) target.push( null );
		target.length = names.length;
		TextureReadUtility.increaseSizeTo( target.length );

		// get the attribute indices
		const textures = this.data;
		const accessorProperties = this.definition.properties;
		const properties = this.properties;
		const indices = getTriangleVertexIndices( geometry, faceIndex );
		for ( let i = 0, l = names.length; i < l; i ++ ) {

			// skip any requested class schema properties that are not provided via the accessor
			const name = names[ i ];
			if ( ! accessorProperties[ name ] ) {

				continue;

			}

			// get the attribute of the target tex coord
			const property = properties[ name ];
			const texture = textures[ property.index ];
			getTexCoord( geometry, property.texCoord, barycoord, indices, _uv );
			getTexelIndices( _uv, texture.image.width, texture.image.height, _srcPixel );
			_dstPixel.set( i, 0 );

			TextureReadUtility.renderPixelToTarget( texture, _srcPixel, _dstPixel );

		}

		// read the data
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
				const property = properties[ name ];
				const type = property.type;

				// initialize the output value
				target[ i ] = initializeFromProperty( property, target[ i ] );

				// use a default of the texture accessor definition does not include the value
				if ( ! property ) {

					throw new Error( 'PropertyTextureAccessor: Requested property does not exist.' );

				} else if ( ! accessorProperties[ name ] ) {

					target[ i ] = property.resolveDefault( target );
					continue;

				}

				// get the final array length to read all data based on used buffer data
				const length = property.valueLength * ( property.count || 1 );

				// set the data read back from the texture to the target type
				const data = property.channels.map( c => buffer[ 4 * i + c ] );
				const componentType = property.componentType;
				const BufferCons = getArrayConstructorFromComponentType( componentType, type );
				const readBuffer = new BufferCons( length );
				new Uint8Array( readBuffer.buffer ).set( data );

				// read all the data
				if ( property.array ) {

					const arr = target[ i ];
					for ( let j = 0, lj = arr.length; j < lj; j ++ ) {

						arr[ j ] = property.readDataFromBuffer( readBuffer, j, arr[ j ] );

					}

				} else {

					target[ i ] = property.readDataFromBuffer( readBuffer, 0, target[ i ] );

				}

				// scale the numeric values
				target[ i ] = property.adjustValueScaleOffset( target[ i ] );

				// convert to enum strings - no data enum values are stored as strings
				target[ i ] = property.resolveEnumsToStrings( target[ i ] );

				// resolve to default values
				target[ i ] = property.resolveNoData( target[ i ] );

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
