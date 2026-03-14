// I3DM File Format
// https://github.com/CesiumGS/3d-tiles/blob/master/specification/TileFormats/Instanced3DModel/README.md

import { BatchTable } from '../utilities/BatchTable.js';
import { FeatureTable } from '../utilities/FeatureTable.js';
import { LoaderBase } from './LoaderBase.js';
import { readMagicBytes, arrayToString, getWorkingPath } from '../utilities/LoaderUtils.js';

/**
 * Base loader for the I3DM (Instanced 3D Model) tile format. Parses the I3DM binary
 * structure and extracts the embedded GLB bytes (or fetches an external GLTF) along
 * with batch and feature tables. Extend this class to integrate I3DM loading into a
 * specific rendering engine.
 *
 * @extends LoaderBase
 */
export class I3DMLoaderBase extends LoaderBase {

	/**
	 * Parses an I3DM buffer and returns the raw tile data.
	 * @param {ArrayBuffer} buffer
	 * @returns {Promise<{ version: string, featureTable: FeatureTable, batchTable: BatchTable, glbBytes: Uint8Array, gltfWorkingPath: string }>}
	 */
	parse( buffer ) {

		const dataView = new DataView( buffer );

		// 32-byte header

		// 4 bytes
		const magic = readMagicBytes( dataView );

		console.assert( magic === 'i3dm' );

		// 4 bytes
		const version = dataView.getUint32( 4, true );

		console.assert( version === 1 );

		// 4 bytes
		const byteLength = dataView.getUint32( 8, true );

		console.assert( byteLength === buffer.byteLength );

		// 4 bytes
		const featureTableJSONByteLength = dataView.getUint32( 12, true );

		// 4 bytes
		const featureTableBinaryByteLength = dataView.getUint32( 16, true );

		// 4 bytes
		const batchTableJSONByteLength = dataView.getUint32( 20, true );

		// 4 bytes
		const batchTableBinaryByteLength = dataView.getUint32( 24, true );

		// 4 bytes
		const gltfFormat = dataView.getUint32( 28, true );

		// Feature Table
		const featureTableStart = 32;
		const featureTableBuffer = buffer.slice(
			featureTableStart,
			featureTableStart + featureTableJSONByteLength + featureTableBinaryByteLength,
		);
		const featureTable = new FeatureTable(
			featureTableBuffer,
			0,
			featureTableJSONByteLength,
			featureTableBinaryByteLength,
		);

		// Batch Table
		const batchTableStart = featureTableStart + featureTableJSONByteLength + featureTableBinaryByteLength;
		const batchTableBuffer = buffer.slice(
			batchTableStart,
			batchTableStart + batchTableJSONByteLength + batchTableBinaryByteLength,
		);
		const batchTable = new BatchTable(
			batchTableBuffer,
			featureTable.getData( 'INSTANCES_LENGTH' ),
			0,
			batchTableJSONByteLength,
			batchTableBinaryByteLength,
		);

		const glbStart = batchTableStart + batchTableJSONByteLength + batchTableBinaryByteLength;
		const bodyBytes = new Uint8Array( buffer, glbStart, byteLength - glbStart );

		let glbBytes = null;
		let promise = null;
		let gltfWorkingPath = null;
		if ( gltfFormat ) {

			glbBytes = bodyBytes;
			promise = Promise.resolve();

		} else {

			const externalUri = this.resolveExternalURL( arrayToString( bodyBytes ) );

			//Store the gltf working path
			gltfWorkingPath = getWorkingPath( externalUri );

			promise = fetch( externalUri, this.fetchOptions )
				.then( res => {

					if ( ! res.ok ) {

						throw new Error( `I3DMLoaderBase : Failed to load file "${ externalUri }" with status ${ res.status } : ${ res.statusText }` );

					}

					return res.arrayBuffer();

				} )
				.then( buffer => {

					glbBytes = new Uint8Array( buffer );

				} );

		}

		return promise.then( () => {

			return {
				version,
				featureTable,
				batchTable,
				glbBytes,
				gltfWorkingPath
			};

		} );

	}

}

