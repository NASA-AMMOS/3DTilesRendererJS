// PNTS File Format
// https://github.com/CesiumGS/3d-tiles/blob/master/specification/TileFormats/PointCloud/README.md

import { BatchTable } from "../utilities/FeatureTable";

export class I3DMLoaderBase {

	constructor() {

		this.fetchOptions = {};

	}

	load( url ) {

		return fetch( url, this.fetchOptions )
			.then( res => res.arrayBuffer() )
			.then( buffer => this.parse( buffer ) );

	}

	parse( buffer ) {

		const dataView = new DataView( buffer );

		// 28-byte header

		// 4 bytes
		const magic =
			String.fromCharCode( dataView.getUint8( 0 ) ) +
			String.fromCharCode( dataView.getUint8( 1 ) ) +
			String.fromCharCode( dataView.getUint8( 2 ) ) +
			String.fromCharCode( dataView.getUint8( 3 ) );

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
		const featureTable = new FeatureTable( buffer, featureTableStart, featureTableJSONByteLength, featureTableBinaryByteLength );

		// Batch Table
		const batchLength = featureTable.getData( 'BATCH_LENGTH' ) || 0;
		const batchTableStart = featureTableStart + featureTableJSONByteLength + featureTableBinaryByteLength;
		const batchTable = new BatchTable( buffer, batchLength, batchTableStart, batchTableJSONByteLength, batchTableBinaryByteLength );

		return {
			version,
			featureTable,
			batchTable,
		};

	}

}

