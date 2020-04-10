// https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/specification/TileFormats/Batched3DModel/README.md

// convert an array of numbers to a string
function arrayToString( array ) {

	let str = '';
	for ( let i = 0, l = array.length; i < l; i ++ ) {

		str += String.fromCharCode( array[ i ] );

	}

	return str;

}

export class B3DMLoaderBase {

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
		const featureTable = { ...jsonFeatureTable };

		// const binFeatureTableData = new Uint8Array( buffer, featureTableStart + featureTableJSONByteLength, featureTableBinaryByteLength );
		// TODO: dereference the json feature table data in to the binary array.
		// https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/specification/TileFormats/FeatureTable/README.md#json-header
		// TODO: The feature table contains data with implicit stride and data types, which means we can't parse it into arrays
		// unless they are specified ahead of time?s

		// Batch Table
		const batchTableStart = featureTableStart + featureTableJSONByteLength + featureTableBinaryByteLength;

		const jsonBatchTableData = new Uint8Array( buffer, batchTableStart, batchTableJSONByteLength );
		const jsonBatchTable = batchTableJSONByteLength === 0 ? {} : JSON.parse( arrayToString( jsonBatchTableData ) );
		const batchTable = { ...jsonBatchTable };

		// dereference the json batch table data in to the binary array.
		// https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/specification/TileFormats/FeatureTable/README.md#json-header
		// const binBatchTableData = new Uint8Array( buffer, batchTableStart + batchTableJSONByteLength, batchTableBinaryByteLength );
		const batchLength = jsonFeatureTable.BATCH_LENGTH;
		for ( const key in jsonBatchTable ) {

			const feature = jsonBatchTable[ key ];
			if ( Array.isArray( feature ) ) {

				batchTable[ key ] = {

					type: 'SCALAR',
					stride: 1,
					data: feature,

				};

			} else {

				let stride;
				let data;
				const arrayStart = batchTableStart + batchTableJSONByteLength;
				const arrayLength = batchLength * stride + feature.byteOffset;
				switch ( feature.type ) {

					case 'SCALAR':
						stride = 1;
						break;

					case 'VEC2':
						stride = 2;
						break;

					case 'VEC3':
						stride = 3;
						break;

					case 'VEC4':
						stride = 4;
						break;

				}

				switch( feature.componentType ) {

					case 'BYTE':
						data = new Int8Array( buffer, arrayStart, arrayLength );
						break;

					case 'UNSIGNED_BYTE':
						data = new Uint8Array( buffer, arrayStart, arrayLength );
						break;

					case 'SHORT':
						data = new Int16Array( buffer, arrayStart, arrayLength );
						break;

					case 'UNSIGNED_SHORT':
						data = new Uint16Array( buffer, arrayStart, arrayLength );
						break;

					case 'INT':
						data = new Int32Array( buffer, arrayStart, arrayLength );
						break;

					case 'UNSIGNED_INT':
						data = new Uint32Array( buffer, arrayStart, arrayLength );
						break;

					case 'FLOAT':
						data = new Float32Array( buffer, arrayStart, arrayLength );
						break;

					case 'DOUBLE':
						data = new Float64Array( buffer, arrayStart, arrayLength );
						break;

				}

				batchTable[ key ] = {

					type: feature.type,
					stride,
					data,

				};

			}

		}

		const glbStart = batchTableStart + batchTableJSONByteLength + batchTableBinaryByteLength;
		const glbBytes = new Uint8Array( buffer, glbStart, byteLength - glbStart );
		// TODO: Understand how to apply the batchId semantics
		// https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/specification/TileFormats/Batched3DModel/README.md#binary-gltf

		return {
			version,
			featureTable,
			batchTable,
			glbBytes,
		};

	}

}

