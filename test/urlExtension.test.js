import { getUrlExtension } from '../src/utilities/urlExtension.js';

describe( 'getUrlExtension', () => {

	it.each( [
		'https://nasa.gov/foo/bar.baz/tileset.json',
		'https://nasa.gov/foo/bar.baz/tileset.json?foo=bar',
		'https://nasa.gov/foo/bar.baz/tileset.json?a.b=c.d',
		'https://nasa.gov/foo/bar.baz/tileset.json?a.b=c.d#e.f',
		'https://nasa.gov/tileset.json',
		'https://nasa.gov//tileset.json',
		'file:///Users/JaneScientist/code/3DTilesRendererJS/example/b3dmExample.json',
		'foo.json',
		'/foo/bar.json',
		'foo.json?a=b',
		'/foo.json',
		'/foo/bar.json',
		'png.svg.json'
	] )( 'parses extensions (%s)', url => {

		expect( getUrlExtension( url ) ).toBe( 'json' );

	} );

	it.each( [
		'https://nasa.gov',
		'https://nasa.gov/',
		'https://nasa.gov/tileset',
		'https://nasa.gov/foo/bar.baz/tileset?foo=bar',
		'https://nasa.gov/foo/bar.baz/tileset?a.b=c.d',
		'https://nasa.gov/tileset',
		'https://nasa.gov/tileset.',
		'Pleiades',
		'.',
		'..',
		'',
		undefined,
	] )( 'returns null for values that are not URLs with extensions (%s)', url => {

		expect( getUrlExtension( url ) ).toBeNull();

	} );

} );
