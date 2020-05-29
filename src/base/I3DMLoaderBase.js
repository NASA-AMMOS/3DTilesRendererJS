// I3DM File Format
// https://github.com/CesiumGS/3d-tiles/blob/master/specification/TileFormats/Instanced3DModel/README.md

import { arrayToString } from '../utilities/arrayToString.js';

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

		// 32-byte header

		// 4 bytes
		const magic =
			String.fromCharCode( dataView.getUint8( 0 ) ) +
			String.fromCharCode( dataView.getUint8( 1 ) ) +
			String.fromCharCode( dataView.getUint8( 2 ) ) +
			String.fromCharCode( dataView.getUint8( 3 ) );

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
		const featureTable = new FeatureTable( buffer, featureTableStart, featureTableJSONByteLength, featureTableBinaryByteLength );

		// Batch Table
		const BATCH_ID = featureTable.getData( 'BATCH_ID', 'UNSIGNED_SHORT' );
		let maxBatchId = - 1;
		for ( let i = 0, l = BATCH_ID.length; i < l; i ++ ) {

			maxBatchId = Math.max( BATCH_ID[ i ], maxBatchId );

		}

		const batchLength = maxBatchId === - 1 ? 0 : maxBatchId + 1;
		const batchTableStart = featureTableStart + featureTableJSONByteLength + featureTableBinaryByteLength;
		const batchTable = new BatchTable( buffer, batchLength, batchTableStart, batchTableJSONByteLength, batchTableBinaryByteLength );

		const glbStart = batchTableStart + batchTableJSONByteLength + batchTableBinaryByteLength;
		const bodyBytes = new Uint8Array( buffer, glbStart, byteLength - glbStart );

		// TODO: Consider just loading the data here rather than making the follow on function load it.
		let glbBytes = null;
		let externalUri = null;
		if ( gltfFormat ) {

			glbBytes = bodyBytes;

		} else {

			externalUri = arrayToString( bodyBytes );

		}

		return {
			version,
			featureTable,
			batchTable,
			glbBytes,
			externalUri,
		};

	}

}

