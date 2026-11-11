import { FeatureTable } from '../../src/core/renderer/utilities/FeatureTable.js';

// Builds a feature table from a JSON header and a binary body. The header is padded with
// spaces so the binary body starts on an 8 byte boundary, as the 3D Tiles spec requires.
function createFeatureTable( header, binaryBody ) {

	let json = JSON.stringify( header );
	while ( json.length % 8 !== 0 ) {

		json += ' ';

	}

	const headerBytes = new TextEncoder().encode( json );
	const bodyBytes = new Uint8Array( binaryBody );
	const bytes = new Uint8Array( headerBytes.byteLength + bodyBytes.byteLength );
	bytes.set( headerBytes, 0 );
	bytes.set( bodyBytes, headerBytes.byteLength );

	return new FeatureTable( bytes.buffer, 0, headerBytes.byteLength, bodyBytes.byteLength );

}

describe( 'FeatureTable', () => {

	it( 'should parse the JSON header and expose the binary body offsets.', () => {

		const header = { RTC_CENTER: [ 0, 0, 0 ] };
		const binaryBody = new ArrayBuffer( 8 );
		const featureTable = createFeatureTable( header, binaryBody );

		expect( featureTable.header ).toEqual( header );
		expect( featureTable.buffer ).toBeInstanceOf( ArrayBuffer );
		expect( featureTable.binOffset ).toBe( featureTable.buffer.byteLength - binaryBody.byteLength );
		expect( featureTable.binLength ).toBe( binaryBody.byteLength );

	} );

	it( 'should return an empty header when the header length is zero.', () => {

		const featureTable = new FeatureTable( new ArrayBuffer( 8 ), 0, 0, 8 );

		expect( featureTable.header ).toEqual( {} );
		expect( featureTable.getKeys() ).toEqual( [] );
		expect( featureTable.getData( 'height', 1 ) ).toBe( null );

	} );

	it( 'should return the header key names excluding extensions.', () => {

		const featureTable = createFeatureTable( { height: [ 1 ], extensions: {} }, new ArrayBuffer( 8 ) );

		expect( featureTable.getKeys() ).toEqual( [ 'height' ] );

	} );

	it( 'should return JSON scalars and arrays directly.', () => {

		const featureTable = createFeatureTable( {
			version: 1,
			positions: [ 1, 2, 3 ],
		}, new ArrayBuffer( 8 ) );

		expect( featureTable.getData( 'version', 1 ) ).toBe( 1 );
		expect( featureTable.getData( 'positions', 3 ) ).toEqual( [ 1, 2, 3 ] );

	} );

	it( 'should return null for keys that are not in the table.', () => {

		const featureTable = createFeatureTable( {}, new ArrayBuffer( 8 ) );

		expect( featureTable.getData( 'missing', 1 ) ).toBe( null );

	} );

	it( 'should read binary SCALAR properties of every integer component type.', () => {

		const binaryBody = new ArrayBuffer( 16 );
		new Int8Array( binaryBody, 0, 2 ).set( [ - 1, 2 ] );
		new Uint8Array( binaryBody, 2, 2 ).set( [ 7, 8 ] );
		new Int16Array( binaryBody, 4, 2 ).set( [ - 2, 3 ] );
		new Uint16Array( binaryBody, 8, 2 ).set( [ 1, 2 ] );
		new Int32Array( binaryBody, 12, 1 ).set( [ - 3 ] );

		const featureTable = createFeatureTable( {
			b: { byteOffset: 0, componentType: 'BYTE', type: 'SCALAR' },
			bu: { byteOffset: 2, componentType: 'UNSIGNED_BYTE', type: 'SCALAR' },
			s: { byteOffset: 4, componentType: 'SHORT', type: 'SCALAR' },
			us: { byteOffset: 8, componentType: 'UNSIGNED_SHORT', type: 'SCALAR' },
			i: { byteOffset: 12, componentType: 'INT', type: 'SCALAR' },
		}, binaryBody );

		expect( featureTable.getData( 'b', 2 ) ).toEqual( new Int8Array( [ - 1, 2 ] ) );
		expect( featureTable.getData( 'bu', 2 ) ).toEqual( new Uint8Array( [ 7, 8 ] ) );
		expect( featureTable.getData( 's', 2 ) ).toEqual( new Int16Array( [ - 2, 3 ] ) );
		expect( featureTable.getData( 'us', 2 ) ).toEqual( new Uint16Array( [ 1, 2 ] ) );
		expect( featureTable.getData( 'i', 1 ) ).toEqual( new Int32Array( [ - 3 ] ) );

	} );

	it( 'should read binary SCALAR properties of every unsigned and floating component type.', () => {

		const integerBody = new ArrayBuffer( 16 );
		new Uint32Array( integerBody, 0, 2 ).set( [ 4, 5 ] );
		new Float32Array( integerBody, 8, 2 ).set( [ 1.5, - 2.5 ] );

		const integerTable = createFeatureTable( {
			ui: { byteOffset: 0, componentType: 'UNSIGNED_INT', type: 'SCALAR' },
			f: { byteOffset: 8, componentType: 'FLOAT', type: 'SCALAR' },
		}, integerBody );

		expect( integerTable.getData( 'ui', 2 ) ).toEqual( new Uint32Array( [ 4, 5 ] ) );
		expect( integerTable.getData( 'f', 2 ) ).toEqual( new Float32Array( [ 1.5, - 2.5 ] ) );

		const doubleBody = new ArrayBuffer( 16 );
		new Float64Array( doubleBody, 0, 2 ).set( [ 0.25, - 0.75 ] );

		const doubleTable = createFeatureTable( {
			d: { byteOffset: 0, componentType: 'DOUBLE', type: 'SCALAR' },
		}, doubleBody );

		expect( doubleTable.getData( 'd', 2 ) ).toEqual( new Float64Array( [ 0.25, - 0.75 ] ) );

	} );

	it( 'should read binary VEC2, VEC3 and VEC4 properties.', () => {

		const binaryBody = new ArrayBuffer( 56 );
		new Float32Array( binaryBody, 0, 6 ).set( [ 1, 2, 3, 4, 5, 6 ] );
		new Float32Array( binaryBody, 24, 4 ).set( [ 1, 2, 3, 4 ] );
		new Float32Array( binaryBody, 40, 4 ).set( [ 9, 10, 11, 12 ] );

		const featureTable = createFeatureTable( {
			positions: { byteOffset: 0, componentType: 'FLOAT', type: 'VEC3' },
			uvs: { byteOffset: 24, componentType: 'FLOAT', type: 'VEC2' },
			color: { byteOffset: 40, componentType: 'FLOAT', type: 'VEC4' },
		}, binaryBody );

		expect( featureTable.getData( 'positions', 2 ) ).toEqual( new Float32Array( [ 1, 2, 3, 4, 5, 6 ] ) );
		expect( featureTable.getData( 'uvs', 2 ) ).toEqual( new Float32Array( [ 1, 2, 3, 4 ] ) );
		expect( featureTable.getData( 'color', 1 ) ).toEqual( new Float32Array( [ 9, 10, 11, 12 ] ) );

	} );

	it( 'should use the default component type and type when the header does not specify them.', () => {

		const binaryBody = new ArrayBuffer( 24 );
		new Float32Array( binaryBody, 0, 6 ).set( [ 1, 2, 3, 4, 5, 6 ] );

		const featureTable = createFeatureTable( {
			positions: { byteOffset: 0 },
		}, binaryBody );

		expect( featureTable.getData( 'positions', 2, 'FLOAT', 'VEC3' ) ).toEqual( new Float32Array( [ 1, 2, 3, 4, 5, 6 ] ) );

	} );

	it( 'should throw when the header type conflicts with the default type.', () => {

		const binaryBody = new ArrayBuffer( 8 );
		const featureTable = createFeatureTable( {
			uvs: { byteOffset: 0, componentType: 'FLOAT', type: 'VEC2' },
		}, binaryBody );

		expect( () => featureTable.getData( 'uvs', 1, 'FLOAT', 'VEC3' ) )
			.toThrow( 'FeatureTable: Specified type does not match expected type.' );

	} );

	it( 'should throw when reading outside of the binary body.', () => {

		const binaryBody = new ArrayBuffer( 8 );
		new Float32Array( binaryBody, 0, 2 ).set( [ 1, 2 ] );

		const featureTable = createFeatureTable( {
			height: { byteOffset: 0, componentType: 'FLOAT', type: 'SCALAR' },
		}, binaryBody );

		// two floats exactly fill the 8 byte binary body
		expect( featureTable.getData( 'height', 2 ) ).toEqual( new Float32Array( [ 1, 2 ] ) );

		// reading past the whole underlying buffer fails in the typed array constructor
		expect( () => featureTable.getData( 'height', 3 ) ).toThrow( RangeError );

		// a read that fits the buffer but not the declared binary body length is rejected
		// with the validation error, by constructing a table whose binLength is 4 bytes
		// shorter than the binary data that actually follows the header
		let headerJson = JSON.stringify( {
			height: { byteOffset: 0, componentType: 'FLOAT', type: 'SCALAR' },
		} );
		while ( headerJson.length % 8 !== 0 ) {

			headerJson += ' ';

		}
		const headerBytes = new TextEncoder().encode( headerJson );
		const bytes = new Uint8Array( headerBytes.byteLength + 8 );
		bytes.set( headerBytes, 0 );
		bytes.set( new Uint8Array( binaryBody ), headerBytes.byteLength );

		const shortTable = new FeatureTable( bytes.buffer, 0, headerBytes.byteLength, 4 );

		expect( shortTable.getData( 'height', 1 ) ).toEqual( new Float32Array( [ 1 ] ) );
		expect( () => shortTable.getData( 'height', 2 ) )
			.toThrow( 'FeatureTable: Feature data read outside binary body length.' );

	} );

	it( 'should throw when the feature type or component type is not provided and no defaults are given.', () => {

		const featureTable = createFeatureTable( {
			noType: { byteOffset: 0, componentType: 'FLOAT' },
			noComponentType: { byteOffset: 0, type: 'SCALAR' },
			unknownType: { byteOffset: 0, componentType: 'FLOAT', type: 'TUPLE' },
			unknownComponentType: { byteOffset: 0, componentType: 'QUAD', type: 'SCALAR' },
		}, new ArrayBuffer( 8 ) );

		expect( () => featureTable.getData( 'noType', 1 ) )
			.toThrow( 'FeatureTable : Feature type not provided for "noType".' );
		expect( () => featureTable.getData( 'noComponentType', 1 ) )
			.toThrow( 'FeatureTable : Feature component type not provided for "noComponentType".' );
		expect( () => featureTable.getData( 'unknownType', 1 ) )
			.toThrow( 'FeatureTable : Feature type not provided for "unknownType".' );
		expect( () => featureTable.getData( 'unknownComponentType', 1 ) )
			.toThrow( 'FeatureTable : Feature component type not provided for "unknownComponentType".' );

	} );

	it( 'should return a slice of the binary body.', () => {

		const binaryBody = new Uint8Array( [ 1, 2, 3, 4 ] );
		const featureTable = createFeatureTable( {}, binaryBody.buffer );

		const slice = featureTable.getBuffer( 1, 2 );

		expect( slice ).toBeInstanceOf( ArrayBuffer );
		expect( Array.from( new Uint8Array( slice ) ) ).toEqual( [ 2, 3 ] );
		expect( slice.byteLength ).toBe( 2 );

	} );

} );
