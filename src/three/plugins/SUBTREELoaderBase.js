import { LoaderBase } from '../../base/loaders/LoaderBase.js';
import { readMagicBytes } from '../../utilities/readMagicBytes.js';
import {arrayToString} from "../../utilities/arrayToString.js";

export class SUBTREELoaderBase extends LoaderBase {
	/**
	 * A helper object for storing the two parts of the subtree binary
	 *
	 * @typedef {object} Subtree
	 * @property {number} version
	 * @property {JSON} subtreeJson
	 * @property {ArrayBuffer} subtreeByte
	 * @private
	 */

	/**
	 *
	 * @param buffer
	 * @return {Subtree}
	 */

	parse( buffer ) {

		const dataView = new DataView( buffer );
		let offset = 0;

		// 16-byte header

		// 4 bytes
		const magic = readMagicBytes( dataView );
		console.assert( magic === 'subt', 'SUBTREELoader: The magic bytes equal "subt".' );
		offset += 4;

		// 4 bytes
		const version = dataView.getUint32( offset, true );
		console.assert( version === 1, 'SUBTREELoader: The version listed in the header is "1".' );
		offset += 4;

		// From Cesium
		// Read the bottom 32 bits of the 64-bit byte length. This is ok for now because:
		// 1) not all browsers have native 64-bit operations
		// 2) the data is well under 4GB

		// 8 bytes
		const jsonLength = dataView.getUint32( offset, true );
		offset += 8;

		// 8 bytes
		const byteLength = dataView.getUint32( offset, true );
		offset += 8;

		const subtreeJson = JSON.parse( arrayToString(  new Uint8Array( buffer, offset, jsonLength ) ) );
		offset += jsonLength;

		const subtreeByte = buffer.slice(offset, offset + byteLength);

		return {
			version,
			subtreeJson,
			subtreeByte
		};

	}

}

