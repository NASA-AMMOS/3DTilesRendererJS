import { getUrlExtension } from '../src/utilities/urlExtension.js';

describe( 'getUrlExtension', () => {

	it.each( [
		'https://nasa.gov/foo/bar/baz.qux/tileset.json',
		'https://nasa.gov/foo/bar/baz.qux/tileset.json?foo=bar',
		'https://nasa.gov/foo/bar/baz.qux/tileset.json?a.b=c.d',
		'https://nasa.gov/tileset.json',
		'https://nasa.gov//tileset.json',
		'file:///Users/JaneScientist/code/3DTilesRendererJS/example/b3dmExample.json',
		'foo.json',
		'/foo/bar.json',
		'foo.json?a=b',
		'/foo.json',
		'/foo/bar.json',
	] )( 'parses the json extension out of %s', url => {

		expect( getUrlExtension( url ) ).toBe( 'json' );

	} );

	it.each( [
		'https://nasa.gov',
		'https://nasa.gov/',
		'https://nasa.gov/tileset',
		'https://nasa.gov/sg/b3dm/NeveTzedek3.420160/tileset?foo=bar',
		'https://nasa.gov/sg/b3dm/NeveTzedek3.420160/tileset?a.b=c.d',
		'https://nasa.gov/tileset',
		'https://nasa.gov/tileset.',
		'Pleiades',
	] )( 'returns null for strings that are not URLs with extensions %s', url => {

		expect( getUrlExtension( url ) ).toBeNull();

	} );

} );
