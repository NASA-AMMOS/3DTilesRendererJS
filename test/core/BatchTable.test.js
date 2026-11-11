import { BatchTable } from '../../src/core/renderer/utilities/BatchTable.js';

// Builds a batch table from a JSON header and a binary body. The header is padded with
// spaces so the binary body starts on an 8 byte boundary, as the 3D Tiles spec requires.
function createBatchTable( count, header, binaryBody ) {

	let json = JSON.stringify( header );
	while ( json.length % 8 !== 0 ) {

		json += ' ';

	}

	const headerBytes = new TextEncoder().encode( json );
	const bodyBytes = new Uint8Array( binaryBody );
	const bytes = new Uint8Array( headerBytes.byteLength + bodyBytes.byteLength );
	bytes.set( headerBytes, 0 );
	bytes.set( bodyBytes, headerBytes.byteLength );

	return new BatchTable( bytes.buffer, count, 0, headerBytes.byteLength, bodyBytes.byteLength );

}

describe( 'BatchTable', () => {

	it( 'should return the components of a binary VEC3 property for the given id.', () => {

		// mirrors the batch table of the CesiumJS "BatchedWithBatchTableBinary" test tile: a binary
		// DOUBLE VEC3 "cartographic" property, a binary UNSIGNED_BYTE SCALAR "code" property and the
		// same positions stored as JSON "Longitude", "Latitude" and "Height" arrays
		const count = 10;
		const longitudes = [];
		const latitudes = [];
		const heights = [];
		const codes = [];
		for ( let i = 0; i < count; i ++ ) {

			longitudes.push( - 1.31968 + i * 1e-6 );
			latitudes.push( 0.698874 + i * 1e-6 );
			heights.push( 6.1558 + i );
			codes.push( 200 + i );

		}

		const codeByteOffset = count * 3 * 8;
		const binaryBody = new ArrayBuffer( codeByteOffset + count );
		const cartographicArray = new Float64Array( binaryBody, 0, count * 3 );
		for ( let i = 0; i < count; i ++ ) {

			cartographicArray.set( [ longitudes[ i ], latitudes[ i ], heights[ i ] ], i * 3 );

		}

		new Uint8Array( binaryBody, codeByteOffset, count ).set( codes );

		const batchTable = createBatchTable( count, {
			Longitude: longitudes,
			Latitude: latitudes,
			Height: heights,
			cartographic: { byteOffset: 0, componentType: 'DOUBLE', type: 'VEC3' },
			code: { byteOffset: codeByteOffset, componentType: 'UNSIGNED_BYTE', type: 'SCALAR' },
		}, binaryBody );

		for ( let id = 0; id < count; id ++ ) {

			const data = batchTable.getDataFromId( id );
			expect( data.Longitude ).toEqual( longitudes[ id ] );
			expect( data.code ).toEqual( codes[ id ] );
			expect( data.cartographic ).toEqual( [ longitudes[ id ], latitudes[ id ], heights[ id ] ] );

		}

	} );

	it( 'should return the components of binary VEC2 and VEC4 properties for the given id.', () => {

		const binaryBody = new ArrayBuffer( 16 );
		new Uint16Array( binaryBody, 0, 4 ).set( [ 1, 2, 3, 4 ] );
		new Uint8Array( binaryBody, 8, 8 ).set( [ 10, 20, 30, 40, 50, 60, 70, 80 ] );

		const batchTable = createBatchTable( 2, {
			uv: { byteOffset: 0, componentType: 'UNSIGNED_SHORT', type: 'VEC2' },
			color: { byteOffset: 8, componentType: 'UNSIGNED_BYTE', type: 'VEC4' },
		}, binaryBody );

		expect( batchTable.getDataFromId( 0 ) ).toEqual( { uv: [ 1, 2 ], color: [ 10, 20, 30, 40 ] } );
		expect( batchTable.getDataFromId( 1 ) ).toEqual( { uv: [ 3, 4 ], color: [ 50, 60, 70, 80 ] } );

	} );

	it( 'should return JSON array and binary SCALAR properties for the given id.', () => {

		const binaryBody = new ArrayBuffer( 12 );
		new Float32Array( binaryBody, 0, 3 ).set( [ 1.5, 2.5, 3.5 ] );

		const batchTable = createBatchTable( 3, {
			name: [ 'first', 'second', 'third' ],
			height: { byteOffset: 0, componentType: 'FLOAT', type: 'SCALAR' },
		}, binaryBody );

		expect( batchTable.getDataFromId( 0 ) ).toEqual( { name: 'first', height: 1.5 } );
		expect( batchTable.getDataFromId( 1 ) ).toEqual( { name: 'second', height: 2.5 } );
		expect( batchTable.getDataFromId( 2 ) ).toEqual( { name: 'third', height: 3.5 } );

	} );

	it( 'should merge the result into the provided target object.', () => {

		const batchTable = createBatchTable( 2, {
			name: [ 'first', 'second' ],
		}, new ArrayBuffer( 8 ) );

		const target = {};
		batchTable.getDataFromId( 0, target );
		expect( target ).toEqual( { name: 'first' } );

		batchTable.getDataFromId( 1, target );
		expect( target ).toEqual( { name: 'second' } );

	} );

	it( 'should throw when the feature id is out of bounds.', () => {

		const batchTable = createBatchTable( 2, {}, new ArrayBuffer( 8 ) );

		expect( () => batchTable.getDataFromId( - 1 ) )
			.toThrow( 'BatchTable: id value "-1" out of bounds for "2" features number.' );
		expect( () => batchTable.getDataFromId( 2 ) )
			.toThrow( 'BatchTable: id value "2" out of bounds for "2" features number.' );

	} );

	it( 'should return the full property array for the given key.', () => {

		const binaryBody = new ArrayBuffer( 12 );
		new Float32Array( binaryBody, 0, 3 ).set( [ 1.5, 2.5, 3.5 ] );

		const batchTable = createBatchTable( 3, {
			height: { byteOffset: 0, componentType: 'FLOAT', type: 'SCALAR' },
		}, binaryBody );

		expect( batchTable.getPropertyArray( 'height' ) ).toEqual( new Float32Array( [ 1.5, 2.5, 3.5 ] ) );
		expect( batchTable.getPropertyArray( 'missing' ) ).toBe( null );

	} );

	it( 'should parse the batch table hierarchy extension and merge inherited properties.', () => {

		const binaryBody = new ArrayBuffer( 8 );
		new Uint16Array( binaryBody, 0, 3 ).set( [ 10, 20, 5 ] );

		const batchTable = createBatchTable( 3, {
			extensions: {
				'3DTILES_batch_table_hierarchy': {
					classes: [
						{
							name: 'Building',
							length: 2,
							instances: {
								height: { byteOffset: 0, componentType: 'UNSIGNED_SHORT' },
							},
						},
						{
							name: 'Room',
							length: 1,
							instances: {
								floor: { byteOffset: 4, componentType: 'UNSIGNED_SHORT' },
							},
						},
					],
					classIds: [ 0, 0, 1 ],
					parentCounts: [ 0, 1, 1 ],
					parentIds: [ 0, 1 ],
					instancesLength: 3,
				},
			},
		}, binaryBody );

		expect( Object.keys( batchTable.extensions ) ).toEqual( [ '3DTILES_batch_table_hierarchy' ] );

		expect( batchTable.getDataFromId( 0 ) ).toEqual( {
			'3DTILES_batch_table_hierarchy': { Building: { height: 10 } },
		} );

		expect( batchTable.getDataFromId( 1 ) ).toEqual( {
			'3DTILES_batch_table_hierarchy': { Building: { height: 20 } },
		} );

		// the room inherits the height of the building it belongs to
		expect( batchTable.getDataFromId( 2 ) ).toEqual( {
			'3DTILES_batch_table_hierarchy': { Building: { height: 20 }, Room: { floor: 5 } },
		} );

	} );

} );
