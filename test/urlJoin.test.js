import { urlJoin } from '../src/utilities/urlJoin.js';

describe( 'urlJoin', () => {

	it( 'should behave like path.join if no protocol is present', () => {

		expect(
			urlJoin( 'path', 'to', 'file.json' )
		).toBe( 'path/to/file.json' );

		expect(
			urlJoin( 'path//', 'to/other/', 'file.json' )
		).toBe( 'path/to/other/file.json' );

		expect(
			urlJoin( '//path', 'to', 'file.json' )
		).toBe( '//path/to/file.json' );

	} );

	it( 'should handle protocols correctly.', () => {

		expect(
			urlJoin( 'http://path', 'to', 'file.json' )
		).toBe( 'http://path/to/file.json' );

		expect(
			urlJoin( 'http://path', 'http://path2', 'to', 'file.json' )
		).toBe( 'http://path2/to/file.json' );

		expect(
			urlJoin( 'https://path', 'to', 'file.json' )
		).toBe( 'https://path/to/file.json' );

		expect(
			urlJoin( 'ftp://path', 'to', 'file.json' )
		).toBe( 'ftp://path/to/file.json' );

		expect(
			urlJoin( 'ftp://http://path', 'to', 'file.json' )
		).toBe( 'ftp://http:/path/to/file.json' );

	} );

} );
