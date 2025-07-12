export class GoogleAttributionsManager {

	constructor() {

		this.creditsCount = {};

	}

	_adjustAttributions( line, add ) {

		const creditsCount = this.creditsCount;
		const tokens = line.split( /;/g );
		for ( let i = 0, l = tokens.length; i < l; i ++ ) {

			const t = tokens[ i ];
			if ( ! ( t in creditsCount ) ) {

				creditsCount[ t ] = 0;

			}

			creditsCount[ t ] += add ? 1 : - 1;

			if ( creditsCount[ t ] <= 0 ) {

				delete creditsCount[ t ];

			}

		}

	}

	addAttributions( line ) {

		this._adjustAttributions( line, true );

	}

	removeAttributions( line ) {

		this._adjustAttributions( line, false );

	}

	toString() {

		// attribution guidelines: https://developers.google.com/maps/documentation/tile/create-renderer#display-attributions

		const sortedByCount = Object.entries( this.creditsCount ).sort( ( a, b ) => {

			const countA = a[ 1 ];
			const countB = b[ 1 ];
			return countB - countA; // Descending order

		} );

		return sortedByCount.map( pair => pair[ 0 ] ).join( '; ' );

	}

}
