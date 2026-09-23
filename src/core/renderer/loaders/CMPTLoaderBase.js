// CMPT File Format
// https://github.com/CesiumGS/3d-tiles/blob/master/specification/TileFormats/Composite/README.md
import { LoaderBase } from './LoaderBase.js';
import { readMagicBytes } from '../utilities/LoaderUtils.js';

/**
 * Base loader for the CMPT (Composite) tile format. Parses the CMPT binary structure
 * and returns the individual inner tile buffers with their format types. Extend this
 * class to integrate CMPT loading into a specific rendering engine.
 *
 * @extends LoaderBase
 */
export class CMPTLoaderBase extends LoaderBase {

	/**
	 * Parses a CMPT buffer and returns an object containing each inner tile's type and raw buffer.
	 * @param {ArrayBuffer} buffer
	 * @returns {{ version: string, tiles: Array<{ type: string, buffer: Uint8Array, version: number }> }}
	 */
	parse( buffer ) {

		const dataView = new DataView( buffer );

		// 16-byte header

		// 4 bytes
		const magic = readMagicBytes( dataView );

		console.assert( magic === 'cmpt', 'CMPTLoader: The magic bytes equal "cmpt".' );

		// 4 bytes
		const version = dataView.getUint32( 4, true );

		console.assert( version === 1, 'CMPTLoader: The version listed in the header is "1".' );

		// 4 bytes
		const byteLength = dataView.getUint32( 8, true );

		console.assert( byteLength === buffer.byteLength, 'CMPTLoader: The contents buffer length listed in the header matches the file.' );

		// 4 bytes
		const tilesLength = dataView.getUint32( 12, true );

		const tiles = [];
		let offset = 16;
		for ( let i = 0; i < tilesLength; i ++ ) {

			if ( offset + 12 > buffer.byteLength ) {

				throw new Error( 'CMPTLoader: Inner tile header extends past the end of the buffer.' );

			}

			const tileView = new DataView( buffer, offset, 12 );
			const tileMagic = readMagicBytes( tileView );
			const tileVersion = tileView.getUint32( 4, true );
			const byteLength = tileView.getUint32( 8, true );

			// An inner tile has to be at least as long as its own 12 byte header, or
			// the offset below never advances and the loop runs for every one of the
			// uint32 tiles the header claims.
			if ( byteLength < 12 || offset + byteLength > buffer.byteLength ) {

				throw new Error( 'CMPTLoader: Inner tile byte length does not fit in the buffer.' );

			}

			const tileBuffer = new Uint8Array( buffer, offset, byteLength );
			tiles.push( {

				type: tileMagic,
				buffer: tileBuffer,
				version: tileVersion,

			} );
			offset += byteLength;

		}

		return {
			version,
			tiles,
		};

	}

}

