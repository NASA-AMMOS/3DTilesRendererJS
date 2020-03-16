// https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/specification/TileFormats/Batched3DModel/README.md

// convert an array of numbers to a string
function arrayToString( array ) {

	let str = '';
	for ( let i = 0, l = array.length; i < l; i ++ ) {

		str += String.fromCharCode( array[ i ] );

	}

	return str;

}

class B3DMLoader {

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

		const jsonFeatureTableData = new Uint8Array( buffer, featureTableStart, featureTableJSONByteLength );
		const jsonFeatureTable = featureTableJSONByteLength === 0 ? {} : JSON.parse( arrayToString( jsonFeatureTableData ) );

		// const binFeatureTableData = new Uint8Array( buffer, featureTableStart + featureTableJSONByteLength, featureTableBinaryByteLength );
		// TODO: dereference the json feature table data in to the binary array.
		// https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/specification/TileFormats/FeatureTable/README.md#json-header

		// Batch Table
		const batchTableStart = featureTableStart + featureTableJSONByteLength + featureTableBinaryByteLength;

		const jsonBatchTableData = new Uint8Array( buffer, batchTableStart, batchTableJSONByteLength );
		const jsonBatchTable = batchTableJSONByteLength === 0 ? {} : JSON.parse( arrayToString( jsonBatchTableData ) );

		// const binBatchTableData = new Uint8Array( buffer, batchTableStart + batchTableJSONByteLength, batchTableBinaryByteLength );
		// TODO: dereference the json batch table data in to the binary array.
		// https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/specification/TileFormats/FeatureTable/README.md#json-header

		const glbStart = batchTableStart + batchTableJSONByteLength + batchTableBinaryByteLength;
		const glbBytes = new Uint8Array( buffer, glbStart, byteLength - glbStart );
		// TODO: Understand how to apply the batchId semantics
		// https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/specification/TileFormats/Batched3DModel/README.md#binary-gltf

		return {
			version,
			featureTable: jsonFeatureTable,
			batchTable: jsonBatchTable,
			glbBytes,
		};

	}

}

export { B3DMLoader };
