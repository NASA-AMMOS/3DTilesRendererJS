export class GoogleMapsTilesCredits {

	constructor() {

		this.creditsCount = {};

	}

	_adjustCredits( line, add ) {

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

	addCredits( line ) {

		this._adjustCredits( line, true );

	}

	removeCredits( line ) {

		this._adjustCredits( line, false );

	}

	toString() {

		const tokens = Object.keys( this.creditsCount ).sort();
		return tokens.join( ', ' );

	}

}
