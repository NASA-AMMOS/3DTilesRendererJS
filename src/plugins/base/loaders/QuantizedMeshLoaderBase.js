import { LoaderBase } from '../../../base/loaders/LoaderBase.js';

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
		const vertexData = {
			u: readBuffer( vertexCount, Uint16Array ).slice(),
			v: readBuffer( vertexCount, Uint16Array ).slice(),
			height: readBuffer( vertexCount, Uint16Array ).slice(),
		};

		// decode vertex data
		let u = 0;
		let v = 0;
		let height = 0;
		for ( let i = 0; i < vertexCount; ++ i ) {

			u += zigZagDecode( vertexData.u[ i ] );
			v += zigZagDecode( vertexData.v[ i ] );
			height += zigZagDecode( vertexData.height[ i ] );

			vertexData.u[ i ] = u;
			vertexData.v[ i ] = v;
			vertexData.height[ i ] = height;

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

		// get edge indices
		const westVertexCount = readInt();
		const westIndices = readBuffer( westVertexCount, bufferType );

		const southVertexCount = readInt();
		const southIndices = readBuffer( southVertexCount, bufferType );

		const eastVertexCount = readInt();
		const eastIndices = readBuffer( eastVertexCount, bufferType );

		const northVertexCount = readInt();
		const northIndices = readBuffer( northVertexCount, bufferType );

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
				for ( let i = 0; i < vertexCount; i ++ ) {

					const x = xy[ 2 * i + 0 ] / 255;
					const y = xy[ 2 * i + 1 ] / 255;
					normals[ 3 * i + 0 ] = x;
					normals[ 3 * i + 1 ] = y;
					normals[ 3 * i + 2 ] = 1.0 - ( Math.abs( x ) + Math.abs( y ) );

				}

				extensions[ 'octvertexnormals' ] = {
					extensionId,
					normals,
				};

			} else if ( extensionId === 2 ) {

				// water mask
				let mask;
				if ( extensionLength === 1 ) {

					mask = new Uint8Array( 256 * 256 ).fill( readByte() );

				} else {

					mask = readBuffer( 256 * 256, Uint8Array );

				}

				extensions[ 'watermask' ] = {
					extensionId,
					mask,
				};

			} else if ( extensionId === 4 ) {

				// metadata
				const jsonLength = readInt();
				const json = readBuffer( jsonLength, Uint8Array );

				let str = '';
				for ( let i = 0; i < jsonLength; i ++ ) {

					str += String.fromCharCode( json[ i ] );

				}

				extensions[ 'metadata' ] = {
					extensionId,
					json: JSON.parse( str ),
				};

			}

		}

		return {
			header,
			indices,
			vertexData,
			edgeIndices,
			extensions,
		};

	}

}
