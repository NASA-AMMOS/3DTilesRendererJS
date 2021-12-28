// B3DM File Format
// https://github.com/CesiumGS/3d-tiles/blob/master/specification/TileFormats/Batched3DModel/README.md

import { FeatureTable, BatchTable } from '../utilities/FeatureTable.js';
import { LoaderBase } from './LoaderBase.js';

export class B3DMLoaderBase extends LoaderBase {

	parse( buffer ) {

		// TODO: this should be able to take a uint8array with an offset and length
		const dataView = new DataView( buffer );

		// 28-byte header

		// 4 bytes
		const magic =
			String.fromCharCode( dataView.getUint8( 0 ) ) +
			String.fromCharCode( dataView.getUint8( 1 ) ) +
			String.fromCharCode( dataView.getUint8( 2 ) ) +
			String.fromCharCode( dataView.getUint8( 3 ) );

		console.assert( magic === 'b3dm' );

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
			featureTable.getData( 'BATCH_LENGTH' ),
			0,
			batchTableJSONByteLength,
			batchTableBinaryByteLength,
		);

		const glbStart = batchTableStart + batchTableJSONByteLength + batchTableBinaryByteLength;
		const glbBytes = new Uint8Array( buffer, glbStart, byteLength - glbStart );

		return {
			version,
			featureTable,
			batchTable,
			glbBytes,
		};

	}

}

