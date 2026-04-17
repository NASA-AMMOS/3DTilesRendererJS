// PNTS File Format
// https://github.com/CesiumGS/3d-tiles/blob/master/specification/TileFormats/PointCloud/README.md

import { BatchTable } from '../utilities/BatchTable.js';
import { FeatureTable } from '../utilities/FeatureTable.js';
import { readMagicBytes } from '../utilities/LoaderUtils.js';
import { LoaderBase } from './LoaderBase.js';

/**
 * Base loader for the PNTS (Point Cloud) tile format. Parses the PNTS binary
 * structure and extracts the feature and batch tables containing point positions,
 * colors, and normals. Extend this class to integrate PNTS loading into a specific
 * rendering engine.
 *
 * @extends LoaderBase
 */
export class PNTSLoaderBase extends LoaderBase {

	/**
	 * Parses a PNTS buffer and returns the raw tile data.
	 * @param {ArrayBuffer} buffer
	 * @returns {Promise<{ version: string, featureTable: FeatureTable, batchTable: BatchTable }>}
	 */
	parse( buffer ) {

		const dataView = new DataView( buffer );

		// 28-byte header

		// 4 bytes
		const magic = readMagicBytes( dataView );

		console.assert( magic === 'pnts' );

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

		// Feature Table
		const featureTableStart = 28;
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
			featureTable.getData( 'BATCH_LENGTH' ) || featureTable.getData( 'POINTS_LENGTH' ),
			0,
			batchTableJSONByteLength,
			batchTableBinaryByteLength,
		);

		return Promise.resolve( {

			version,
			featureTable,
			batchTable,

		} );

	}

}

