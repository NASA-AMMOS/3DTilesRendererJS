import { arrayToString } from './LoaderUtils.js';

export function parseBinArray( buffer, arrayStart, count, type, componentType, propertyName ) {

	let stride;
	switch ( type ) {

		case 'SCALAR':
			stride = 1;
			break;

		case 'VEC2':
			stride = 2;
			break;

		case 'VEC3':
			stride = 3;
			break;

		case 'VEC4':
			stride = 4;
			break;

		default:
			throw new Error( `FeatureTable : Feature type not provided for "${ propertyName }".` );

	}

	let data;
	const arrayLength = count * stride;

	switch ( componentType ) {

		case 'BYTE':
			data = new Int8Array( buffer, arrayStart, arrayLength );
			break;

		case 'UNSIGNED_BYTE':
			data = new Uint8Array( buffer, arrayStart, arrayLength );
			break;

		case 'SHORT':
			data = new Int16Array( buffer, arrayStart, arrayLength );
			break;

		case 'UNSIGNED_SHORT':
			data = new Uint16Array( buffer, arrayStart, arrayLength );
			break;

		case 'INT':
			data = new Int32Array( buffer, arrayStart, arrayLength );
			break;

		case 'UNSIGNED_INT':
			data = new Uint32Array( buffer, arrayStart, arrayLength );
			break;

		case 'FLOAT':
			data = new Float32Array( buffer, arrayStart, arrayLength );
			break;

		case 'DOUBLE':
			data = new Float64Array( buffer, arrayStart, arrayLength );
			break;

		default:
			throw new Error( `FeatureTable : Feature component type not provided for "${ propertyName }".` );

	}

	return data;

}

/**
 * Parses a 3D Tiles feature table from a binary buffer, providing access to
 * per-feature properties stored as JSON scalars or typed binary arrays.
 */
export class FeatureTable {

	/**
	 * @param {ArrayBuffer} buffer
	 * @param {number} start - Byte offset of the feature table within the buffer
	 * @param {number} headerLength - Byte length of the JSON header
	 * @param {number} binLength - Byte length of the binary body
	 */
	constructor( buffer, start, headerLength, binLength ) {

		/**
		 * The underlying buffer containing the feature table data.
		 * @type {ArrayBuffer}
		 */
		this.buffer = buffer;

		/**
		 * Byte offset of the binary body within the buffer.
		 * @type {number}
		 */
		this.binOffset = start + headerLength;

		/**
		 * Byte length of the binary body.
		 * @type {number}
		 */
		this.binLength = binLength;

		let header = null;
		if ( headerLength !== 0 ) {

			const headerData = new Uint8Array( buffer, start, headerLength );
			header = JSON.parse( arrayToString( headerData ) );

		} else {

			header = {};

		}

		/**
		 * Parsed JSON header object.
		 * @type {Object}
		 */
		this.header = header;

	}

	/**
	 * Returns all property key names defined in the feature table header, excluding `extensions`.
	 * @returns {Array<string>}
	 */
	getKeys() {

		return Object.keys( this.header ).filter( key => key !== 'extensions' );

	}

	/**
	 * Returns the value for the given property key. For binary properties, reads typed array data
	 * from the binary body using the provided count, component type, and vector type.
	 * @param {string} key
	 * @param {number} count - Number of elements to read for binary properties
	 * @param {string | null} [defaultComponentType] - Fallback component type (e.g. `'FLOAT'`, `'UNSIGNED_SHORT'`)
	 * @param {string | null} [defaultType] - Fallback vector type (e.g. `'SCALAR'`, `'VEC3'`)
	 * @returns {number | string | ArrayBufferView | null}
	 */
	getData( key, count, defaultComponentType = null, defaultType = null ) {

		const header = this.header;

		if ( ! ( key in header ) ) {

			return null;

		}

		const feature = header[ key ];
		if ( ! ( feature instanceof Object ) ) {

			return feature;

		} else if ( Array.isArray( feature ) ) {

			return feature;

		} else {

			const { buffer, binOffset, binLength } = this;
			const byteOffset = feature.byteOffset || 0;
			const featureType = feature.type || defaultType;
			const featureComponentType = feature.componentType || defaultComponentType;

			if ( 'type' in feature && defaultType && feature.type !== defaultType ) {

				throw new Error( 'FeatureTable: Specified type does not match expected type.' );

			}

			const arrayStart = binOffset + byteOffset;
			const data = parseBinArray( buffer, arrayStart, count, featureType, featureComponentType, key );

			const dataEnd = arrayStart + data.byteLength;
			if ( dataEnd > binOffset + binLength ) {

				throw new Error( 'FeatureTable: Feature data read outside binary body length.' );

			}

			return data;

		}

	}

	/**
	 * Returns a slice of the binary body at the given offset and length.
	 * @param {number} byteOffset
	 * @param {number} byteLength
	 * @returns {ArrayBuffer}
	 */
	getBuffer( byteOffset, byteLength ) {

		const { buffer, binOffset } = this;
		return buffer.slice( binOffset + byteOffset, binOffset + byteOffset + byteLength );

	}

}
