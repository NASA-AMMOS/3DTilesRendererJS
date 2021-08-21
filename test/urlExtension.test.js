import { getUrlExtension } from '../src/utilities/urlExtension.js';

describe( 'getUrlExtension', () => {

	it.each( [
		'https://cloud.skylineglobe.com/sg/b3dm/NeveTzedek3.420160/tileset.json',
		'https://cloud.skylineglobe.com/sg/b3dm/NeveTzedek3.420160/tileset.json?foo=bar',
		'https://cloud.skylineglobe.com/sg/b3dm/NeveTzedek3.420160/tileset.json?a.b=c.d',
		'https://cloud.skylineglobe.com/tileset.json',
		'https://cloud.skylineglobe.com//tileset.json',
		'file:///Users/paigemansfield/patricks-code/3DTilesRendererJS/example/b3dmExample.json',
		'foo.json',
		'foo.json?a=b',
		'/foo.json',
	] )( 'parses the json extension out of %s', url => {

		expect( getUrlExtension( url ) ).toBe( 'json' );

	} );

	it.each( [
		'https://cloud.skylineglobe.com/tileset',
		'https://cloud.skylineglobe.com/sg/b3dm/NeveTzedek3.420160/tileset?foo=bar',
		'https://cloud.skylineglobe.com/sg/b3dm/NeveTzedek3.420160/tileset?a.b=c.d',
		'https://cloud.skylineglobe.com/tileset',
		'https://cloud.skylineglobe.com/tileset.',
		'bacon',
	] )( 'returns null for strings that are not URLs with extensions %s', url => {

		expect( getUrlExtension( url ) ).toBeNull();

	} );

} );
