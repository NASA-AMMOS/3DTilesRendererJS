import { LoaderBase } from '../../renderer/loaders/LoaderBase.js';

export function zigZagDecode( value ) {

	return ( value >> 1 ) ^ ( - ( value & 1 ) );

}

export class QuantizedMeshLoaderBase extends LoaderBase {

	constructor( ...args ) {

		super( ...args );

		this.fetchOptions.header = {
			Accept: 'application/vnd.quantized-mesh,application/octet-stream;q=0.9',
		};

	}

	loadAsync( ...args ) {

		const { fetchOptions } = this;
		fetchOptions.header = fetchOptions.header || {};
		fetchOptions.header[ 'Accept' ] = 'application/vnd.quantized-mesh,application/octet-stream;q=0.9';
		fetchOptions.header[ 'Accept' ] += ';extensions=octvertexnormals-watermask-metadata';

		return super.loadAsync( ...args );

	}

	parse( buffer ) {

		let pointer = 0;
		const view = new DataView( buffer );
		const readFloat64 = () => {

			const result = view.getFloat64( pointer, true );
			pointer += 8;
			return result;

		};

		const readFloat32 = () => {

			const result = view.getFloat32( pointer, true );
			pointer += 4;
			return result;

		};

		const readInt = () => {

			const result = view.getUint32( pointer, true );
			pointer += 4;
			return result;

		};

		const readByte = () => {

			const result = view.getUint8( pointer );
			pointer += 1;
			return result;

		};

		const readBuffer = ( count, type ) => {

			const result = new type( buffer, pointer, count );
			pointer += count * type.BYTES_PER_ELEMENT;
			return result;

		};

		// extract header
		const header = {
			center: [ readFloat64(), readFloat64(), readFloat64() ],
			minHeight: readFloat32(),
			maxHeight: readFloat32(),
			sphereCenter: [ readFloat64(), readFloat64(), readFloat64() ],
			sphereRadius: readFloat64(),
			horizonOcclusionPoint: [ readFloat64(), readFloat64(), readFloat64() ],
		};

		// extract vertex data
		const vertexCount = readInt();
		const uBuffer = readBuffer( vertexCount, Uint16Array );
		const vBuffer = readBuffer( vertexCount, Uint16Array );
		const hBuffer = readBuffer( vertexCount, Uint16Array );

		const uResult = new Float32Array( vertexCount );
		const vResult = new Float32Array( vertexCount );
		const hResult = new Float32Array( vertexCount );

		// decode vertex data
		let u = 0;
		let v = 0;
		let h = 0;
		const MAX_VALUE = 32767;
		for ( let i = 0; i < vertexCount; ++ i ) {

			u += zigZagDecode( uBuffer[ i ] );
			v += zigZagDecode( vBuffer[ i ] );
			h += zigZagDecode( hBuffer[ i ] );

			uResult[ i ] = u / MAX_VALUE;
			vResult[ i ] = v / MAX_VALUE;
			hResult[ i ] = h / MAX_VALUE;

		}

		// align pointer for index data
		const is32 = vertexCount > 65536;
		const bufferType = is32 ? Uint32Array : Uint16Array;
		if ( is32 ) {

			pointer = Math.ceil( pointer / 4 ) * 4;

		} else {

			pointer = Math.ceil( pointer / 2 ) * 2;

		}

		// extract index data
		const triangleCount = readInt();
		const indices = readBuffer( triangleCount * 3, bufferType );

		// decode the index data
		let highest = 0;
		for ( var i = 0; i < indices.length; ++ i ) {

			const code = indices[ i ];
			indices[ i ] = highest - code;
			if ( code === 0 ) {

				++ highest;

			}

		}

		// sort functions for the edges since they are not pre-sorted
		const vSort = ( a, b ) => vResult[ b ] - vResult[ a ];
		const vSortReverse = ( a, b ) => - vSort( a, b );

		const uSort = ( a, b ) => uResult[ a ] - uResult[ b ];
		const uSortReverse = ( a, b ) => - uSort( a, b );

		// get edge indices
		const westVertexCount = readInt();
		const westIndices = readBuffer( westVertexCount, bufferType );
		westIndices.sort( vSort );

		const southVertexCount = readInt();
		const southIndices = readBuffer( southVertexCount, bufferType );
		southIndices.sort( uSort );

		const eastVertexCount = readInt();
		const eastIndices = readBuffer( eastVertexCount, bufferType );
		eastIndices.sort( vSortReverse );

		const northVertexCount = readInt();
		const northIndices = readBuffer( northVertexCount, bufferType );
		northIndices.sort( uSortReverse );

		const edgeIndices = {
			westIndices,
			southIndices,
			eastIndices,
			northIndices,
		};

		// parse extensions
		const extensions = {};
		while ( pointer < view.byteLength ) {

			const extensionId = readByte();
			const extensionLength = readInt();

			if ( extensionId === 1 ) {

				// oct encoded normals
				const xy = readBuffer( vertexCount * 2, Uint8Array );
				const normals = new Float32Array( vertexCount * 3 );

				// https://github.com/CesiumGS/cesium/blob/baaabaa49058067c855ad050be73a9cdfe9b6ac7/packages/engine/Source/Core/AttributeCompression.js#L119-L140
				for ( let i = 0; i < vertexCount; i ++ ) {

					let x = ( xy[ 2 * i + 0 ] / 255 ) * 2 - 1;
					let y = ( xy[ 2 * i + 1 ] / 255 ) * 2 - 1;
					const z = 1.0 - ( Math.abs( x ) + Math.abs( y ) );

					if ( z < 0.0 ) {

						const oldVX = x;
						x = ( 1.0 - Math.abs( y ) ) * signNotZero( oldVX );
						y = ( 1.0 - Math.abs( oldVX ) ) * signNotZero( y );

					}

					const len = Math.sqrt( x * x + y * y + z * z );
					normals[ 3 * i + 0 ] = x / len;
					normals[ 3 * i + 1 ] = y / len;
					normals[ 3 * i + 2 ] = z / len;

				}

				extensions[ 'octvertexnormals' ] = {
					extensionId,
					normals,
				};

			} else if ( extensionId === 2 ) {

				// water mask
				const size = extensionLength === 1 ? 1 : 256;
				const mask = readBuffer( size * size, Uint8Array );
				extensions[ 'watermask' ] = {
					extensionId,
					mask,
					size,
				};

			} else if ( extensionId === 4 ) {

				// metadata
				const jsonLength = readInt();
				const jsonBuffer = readBuffer( jsonLength, Uint8Array );
				const json = new TextDecoder().decode( jsonBuffer );
				extensions[ 'metadata' ] = {
					extensionId,
					json: JSON.parse( json ),
				};

			}

		}

		return {
			header,
			indices,
			vertexData: {
				u: uResult,
				v: vResult,
				height: hResult,
			},
			edgeIndices,
			extensions,
		};

	}

}

function signNotZero( v ) {

	return v < 0.0 ? - 1.0 : 1.0;

}
