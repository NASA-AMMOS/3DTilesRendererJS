export class LoaderBase {

	constructor() {

		this.fetchOptions = {};
		this.workingPath = '';

	}

	load( url ) {

		return fetch( url, this.fetchOptions )
			.then( res => {

				if ( ! res.ok ) {

					throw new Error( `Failed to load file "${ url }" with status ${ res.status } : ${ res.statusText }` );

				}
				return res.arrayBuffer();

			} )
			.then( buffer => {

				if ( this.workingPath === '' ) {

					const splits = url.split( /\\\//g );
					splits.pop();
					this.workingPath = splits.join( '/' );

				}

				return this.parse( buffer );

			} );

	}

	resolveExternalURL( url ) {

		if ( /^[^\\/]/.test( url ) ) {

			return this.workingPath + '/' + url;

		} else {

			return url;

		}

	}

	parse( buffer ) {

	}

}
