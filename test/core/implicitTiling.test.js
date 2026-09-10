import { TilesRendererBase } from '../../src/core/renderer';
import { SUBTREELoader } from '../../src/core/plugins/SUBTREELoader.js';
import { ImplicitTilingPlugin } from '../../src/core/plugins/ImplicitTilingPlugin.js';

const WORKING_PATH = 'https://example.com/tileset';
const HEADER_LENGTH = 24;

// Encodes a subtree json and an optional binary chunk into the binary ".subtree" layout so the two
// forms of the same subtree can be compared against each other.
function encodeSubtreeBinary( json, binaryChunk = new Uint8Array( 0 ) ) {

	const jsonChunk = new TextEncoder().encode( JSON.stringify( json ) );
	const paddedJsonLength = Math.ceil( jsonChunk.byteLength / 8 ) * 8;

	const buffer = new ArrayBuffer( HEADER_LENGTH + paddedJsonLength + binaryChunk.byteLength );
	const view = new DataView( buffer );
	const bytes = new Uint8Array( buffer );

	bytes.set( new TextEncoder().encode( 'subt' ), 0 );
	view.setUint32( 4, 1, true );
	view.setBigUint64( 8, BigInt( paddedJsonLength ), true );
	view.setBigUint64( 16, BigInt( binaryChunk.byteLength ), true );

	bytes.set( jsonChunk, HEADER_LENGTH );
	bytes.fill( 0x20, HEADER_LENGTH + jsonChunk.byteLength, HEADER_LENGTH + paddedJsonLength );
	bytes.set( binaryChunk, HEADER_LENGTH + paddedJsonLength );

	return buffer;

}

// A quadtree root with two levels per subtree, which gives five tile availability bits and
// sixteen child subtree bits. The subtree template is held at ".subtree" by default so that the
// payload format is the only thing that differs between the two runs of a comparison.
function createRootTile( { contentUri = 'content/{level}/{x}/{y}.b3dm', subtreesUri = 'subtrees/{level}/{x}/{y}.subtree' } = {} ) {

	const root = {
		geometricError: 100,
		refine: 'REPLACE',
		boundingVolume: {
			box: [ 0, 0, 0, 100, 0, 0, 0, 100, 0, 0, 0, 100 ],
		},
		content: {
			uri: contentUri,
		},
		implicitTiling: {
			subdivisionScheme: 'QUADTREE',
			subtreeLevels: 2,
			availableLevels: 4,
			subtrees: {
				uri: subtreesUri,
			},
		},
		children: [],
	};

	root.implicitTilingData = {
		root,
		subtreeIdx: 0,
		x: 0,
		y: 0,
		z: 0,
		level: 0,
	};

	return root;

}

// Availability stored inline, so the subtree references no buffers at all.
function createConstantSubtreeJson() {

	return {
		tileAvailability: { constant: 1 },
		contentAvailability: [ { constant: 1 } ],
		childSubtreeAvailability: { constant: 0 },
	};

}

// Availability stored as bitstreams in a single external buffer.
function createExternalBufferSubtreeJson() {

	return {
		buffers: [ { uri: 'availability.bin', byteLength: 24 } ],
		bufferViews: [
			{ buffer: 0, byteOffset: 0, byteLength: 1 },
			{ buffer: 0, byteOffset: 8, byteLength: 1 },
			{ buffer: 0, byteOffset: 16, byteLength: 2 },
		],
		tileAvailability: { bitstream: 0 },
		contentAvailability: [ { bitstream: 1 } ],
		childSubtreeAvailability: { bitstream: 2 },
	};

}

// The same availability, but held in the subtree's own binary chunk instead of an external file.
// Dropping the buffer uri is the only difference.
function createInternalBufferSubtreeJson() {

	const json = createExternalBufferSubtreeJson();
	delete json.buffers[ 0 ].uri;
	return json;

}

// The contents of the buffer above. Bits are read from the least significant end.
function createAvailabilityBuffer() {

	const bytes = new Uint8Array( 24 );

	// tiles: the subtree root, plus the first and third tile of the level below it
	bytes[ 0 ] = 0b01011;

	// content: only on those two child tiles
	bytes[ 8 ] = 0b01010;

	// child subtrees: one under each of those two child tiles, at bit 2 and bit 9
	bytes[ 16 ] = 0b00000100;
	bytes[ 17 ] = 0b00000010;

	return bytes;

}

function stubAvailabilityFetch() {

	vi.stubGlobal( 'fetch', vi.fn( async () => ( {
		ok: true,
		status: 200,
		arrayBuffer: async () => createAvailabilityBuffer().buffer,
	} ) ) );

}

// Flattens the expanded tiles into something comparable. The tiles hold parent links and a
// reference back to the implicit root, so they cannot be compared directly.
function summarize( tile ) {

	const { level, x, y, z, subtreeIdx } = tile.implicitTilingData;
	return {
		level,
		x,
		y,
		z,
		subtreeIdx,
		geometricError: tile.geometricError,
		boundingVolume: tile.boundingVolume,
		content: tile.content ? tile.content.uri : null,
		children: tile.children.map( summarize ),
	};

}

async function parseSubtree( payload, options ) {

	const tile = createRootTile( options );
	const loader = new SUBTREELoader( tile );
	loader.workingPath = WORKING_PATH;

	await loader.parse( payload );

	return summarize( tile );

}

describe( 'SUBTREELoader', () => {

	afterEach( () => {

		vi.unstubAllGlobals();

	} );

	it( 'should report the same version and an empty internal buffer as the binary form', () => {

		const json = createConstantSubtreeJson();
		const loader = new SUBTREELoader( createRootTile() );

		const fromJson = loader.parseJson( json );
		const fromBinary = loader.parseBuffer( encodeSubtreeBinary( createConstantSubtreeJson() ) );

		expect( fromJson.version ).toBe( fromBinary.version );
		expect( fromJson.subtreeJson ).toBe( json );
		expect( fromJson.subtreeByte.byteLength ).toBe( 0 );

	} );

	it( 'should expand a subtree with constant availability the same way from json and from binary', async () => {

		vi.stubGlobal( 'fetch', vi.fn() );

		const fromJson = await parseSubtree( createConstantSubtreeJson() );
		const fromBinary = await parseSubtree( encodeSubtreeBinary( createConstantSubtreeJson() ) );

		expect( fromJson ).toEqual( fromBinary );
		expect( fetch ).not.toHaveBeenCalled();

		// the root gets a child holding its content, and that child gets one tile per quadrant
		expect( fromJson.children ).toHaveLength( 1 );
		expect( fromJson.children[ 0 ].content ).toBe( 'content/0/0/0.b3dm' );
		expect( fromJson.children[ 0 ].children.map( child => child.content ) ).toEqual( [
			'content/1/0/0.b3dm',
			'content/1/1/0.b3dm',
			'content/1/0/1.b3dm',
			'content/1/1/1.b3dm',
		] );

	} );

	it( 'should expand a subtree with an external bitstream the same way from json and from binary', async () => {

		const requestedUrls = [];
		vi.stubGlobal( 'fetch', vi.fn( async url => {

			requestedUrls.push( url.toString() );
			return {
				ok: true,
				status: 200,
				arrayBuffer: async () => createAvailabilityBuffer().buffer,
			};

		} ) );

		const fromJson = await parseSubtree( createExternalBufferSubtreeJson() );
		const fromBinary = await parseSubtree( encodeSubtreeBinary( createExternalBufferSubtreeJson() ) );

		expect( fromJson ).toEqual( fromBinary );

		// both forms resolve the buffer uri against the subtree it came from
		expect( requestedUrls ).toEqual( [
			'https://example.com/tileset/subtrees/0/0/availability.bin',
			'https://example.com/tileset/subtrees/0/0/availability.bin',
		] );

		// two of the four child tiles are unavailable, and each available one has a child subtree
		const contentTile = fromJson.children[ 0 ];
		expect( contentTile.content ).toBe( null );
		expect( contentTile.children.map( child => child.content ) ).toEqual( [
			'content/1/0/0.b3dm',
			'content/1/0/1.b3dm',
		] );
		expect( contentTile.children.map( child => child.children[ 0 ].content ) ).toEqual( [
			'subtrees/2/0/1.subtree',
			'subtrees/2/1/2.subtree',
		] );

	} );

	it( 'should expand a subtree the same way from an external buffer and from a binary chunk', async () => {

		stubAvailabilityFetch();

		const fromJson = await parseSubtree( createExternalBufferSubtreeJson() );
		const fromBinary = await parseSubtree( encodeSubtreeBinary( createInternalBufferSubtreeJson(), createAvailabilityBuffer() ) );

		expect( fromJson ).toEqual( fromBinary );

		// only the json form has a buffer to go and fetch, the other reads its own chunk
		expect( fetch ).toHaveBeenCalledTimes( 1 );

	} );

	it( 'should throw if an external buffer cannot be loaded', async () => {

		vi.stubGlobal( 'fetch', vi.fn( async () => ( { ok: false, status: 404 } ) ) );

		await expect( parseSubtree( createExternalBufferSubtreeJson() ) ).rejects.toThrow( /404/ );

	} );

	it( 'should fill in a json subtrees template the same way as a binary one', async () => {

		const json = createConstantSubtreeJson();
		json.childSubtreeAvailability = { constant: 1 };

		const summary = await parseSubtree( json, { subtreesUri: 'subtrees/{level}/{x}/{y}.json' } );
		const leaf = summary.children[ 0 ].children[ 0 ];

		expect( leaf.children[ 0 ].content ).toBe( 'subtrees/2/0/0.json' );

	} );

} );

describe( 'ImplicitTilingPlugin', () => {

	it( 'should treat a subtree content uri as unrenderable in either format', () => {

		const renderer = new TilesRendererBase();
		renderer.registerPlugin( new ImplicitTilingPlugin() );

		const jsonTile = { content: { uri: 'subtrees/1/0/0.json' }, children: [] };
		const binaryTile = { content: { uri: 'subtrees/1/0/0.subtree' }, children: [] };

		renderer.preprocessNode( jsonTile, WORKING_PATH, null );
		renderer.preprocessNode( binaryTile, WORKING_PATH, null );

		expect( jsonTile.internal.hasUnrenderableContent ).toBe( true );
		expect( jsonTile.internal.hasRenderableContent ).toBe( false );
		expect( binaryTile.internal.hasUnrenderableContent ).toBe( true );
		expect( binaryTile.internal.hasRenderableContent ).toBe( false );

	} );

	it( 'should route json content to the subtree loader only for implicit tiles', async () => {

		const plugin = new ImplicitTilingPlugin();
		plugin.init( { fetchOptions: {} } );

		const tile = createRootTile();
		tile.internal = { basePath: WORKING_PATH };

		await plugin.parseTile( createConstantSubtreeJson(), tile, 'json' );

		expect( tile.children ).toHaveLength( 1 );
		expect( tile.children[ 0 ].children ).toHaveLength( 4 );

		// json on a tile outside an implicit tileset is left alone
		const otherTile = {
			content: { uri: 'model.json' },
			children: [],
			internal: { basePath: WORKING_PATH },
		};

		expect( plugin.parseTile( {}, otherTile, 'json' ) ).toBeUndefined();
		expect( otherTile.children ).toHaveLength( 0 );

		// so is json inside an implicit tileset that serves its content as json, since there is
		// nothing left to tell the two apart with
		const jsonContentTile = createRootTile( { contentUri: 'content/{level}/{x}/{y}.json' } );
		jsonContentTile.internal = { basePath: WORKING_PATH };

		expect( plugin.parseTile( {}, jsonContentTile, 'json' ) ).toBeUndefined();
		expect( jsonContentTile.children ).toHaveLength( 0 );

	} );

	it( 'should clear the generated children when a json subtree tile is disposed', () => {

		const removed = [];
		const plugin = new ImplicitTilingPlugin();
		plugin.init( { processNodeQueue: { remove: tile => removed.push( tile ) } } );

		const child = { children: [] };
		const tile = {
			content: { uri: 'subtrees/1/0/0.json' },
			implicitTilingData: { root: createRootTile(), level: 1, x: 0, y: 0, z: 0, subtreeIdx: 0 },
			children: [ child ],
		};

		plugin.disposeTile( tile );

		expect( tile.children ).toHaveLength( 0 );
		expect( removed ).toEqual( [ child ] );

		// json on a tile outside an implicit tileset keeps its children
		const otherChild = { children: [] };
		const otherTile = {
			content: { uri: 'model.json' },
			children: [ otherChild ],
		};

		plugin.disposeTile( otherTile );

		expect( otherTile.children ).toEqual( [ otherChild ] );
		expect( removed ).toEqual( [ child ] );

	} );

} );

describe( 'ImplicitTilesetWithJsonSubtree', () => {

	// The tileset and subtree below are the sample data from CesiumGS/cesium at
	// Specs/Data/Cesium3DTiles/Implicit/ImplicitTilesetWithJsonSubtree, which the issue links to
	// as an example of the json subtree format.
	const CESIUM_ROOT = {
		boundingVolume: {
			region: [ - 1.3197209591796106, 0.6988424218, - 1.3196390408203893, 0.6989055782, 0, 88 ],
		},
		content: {
			uri: 'content/{level}/{x}/{y}.b3dm',
		},
		implicitTiling: {
			subdivisionScheme: 'QUADTREE',
			subtreeLevels: 2,
			availableLevels: 2,
			subtrees: {
				uri: 'subtrees/{level}.{x}.{y}.json',
			},
		},
		geometricError: 70,
		refine: 'ADD',
	};

	const CESIUM_SUBTREE = {
		tileAvailability: { constant: 1 },
		contentAvailability: [ { constant: 1 } ],
		childSubtreeAvailability: { constant: 0 },
	};

	it( 'should expand the sample tileset to its five content tiles', async () => {

		const plugin = new ImplicitTilingPlugin();
		plugin.init( { fetchOptions: {} } );

		const root = JSON.parse( JSON.stringify( CESIUM_ROOT ) );
		root.children = [];
		root.internal = { basePath: WORKING_PATH };
		root.implicitTilingData = { root, subtreeIdx: 0, x: 0, y: 0, z: 0, level: 0 };

		await plugin.parseTile( CESIUM_SUBTREE, root, 'json' );

		const uris = [];
		const walk = tile => {

			if ( tile !== root && tile.content ) uris.push( tile.content.uri );
			tile.children.forEach( walk );

		};

		walk( root );

		expect( uris ).toEqual( [
			'content/0/0/0.b3dm',
			'content/1/0/0.b3dm',
			'content/1/1/0.b3dm',
			'content/1/0/1.b3dm',
			'content/1/1/1.b3dm',
		] );

	} );

} );
