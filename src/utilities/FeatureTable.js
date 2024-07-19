import { arrayToString } from './arrayToString.js';

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

export class FeatureTable {

	constructor( buffer, start, headerLength, binLength ) {

		this.buffer = buffer;
		this.binOffset = start + headerLength;
		this.binLength = binLength;

		let header = null;
		if ( headerLength !== 0 ) {

			const headerData = new Uint8Array( buffer, start, headerLength );
			header = JSON.parse( arrayToString( headerData ) );

		} else {

			header = {};

		}
		this.header = header;

	}

	getKeys() {

		return Object.keys( this.header );

	}

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

	getBuffer( byteOffset, byteLength ) {

		const { buffer, binOffset } = this;
		return buffer.slice( binOffset + byteOffset, binOffset + byteOffset + byteLength );

	}

}
