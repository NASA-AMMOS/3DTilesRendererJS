import path from 'path';

// Function that properly handles path resolution for parts that have
// a protocol component like "http://".
export function urlJoin( ...args ) {

	const protocolRegex = /^[a-zA-Z]+:\/\//;
	let lastRoot = - 1;
	for ( let i = 0, l = args.length; i < l; i ++ ) {

		if ( protocolRegex.test( args[ i ] ) ) {

			lastRoot = i;

		}

	}

	if ( lastRoot === - 1 ) {

		return path.join( ...args ).replace( /\\/g, '/' );

	} else {

		const parts = lastRoot <= 0 ? args : args.slice( lastRoot );
		const protocol = parts[ 0 ].match( protocolRegex )[ 0 ];
		parts[ 0 ] = parts[ 0 ].substring( protocol.length );

		return ( protocol + path.join( ...parts ) ).replace( /\\/g, '/' );

	}

}
