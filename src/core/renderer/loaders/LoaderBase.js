import { getWorkingPath } from '../utilities/LoaderUtils.js';

export class LoaderBase {

	constructor() {

		this.fetchOptions = {};
		this.workingPath = '';

	}

	load( ...args ) {

		console.warn( 'Loader: "load" function has been deprecated in favor of "loadAsync".' );
		return this.loadAsync( ...args );

	}

	loadAsync( url ) {

		return fetch( url, this.fetchOptions )
			.then( res => {

				if ( ! res.ok ) {

					throw new Error( `Failed to load file "${ url }" with status ${ res.status } : ${ res.statusText }` );

				}
				return res.arrayBuffer();

			} )
			.then( buffer => {

				if ( this.workingPath === '' ) {

					this.workingPath = getWorkingPath( url );

				}

				return this.parse( buffer );

			} );

	}

	resolveExternalURL( url ) {

		return new URL( url, this.workingPath ).href;

	}

	parse( buffer ) {

		throw new Error( 'LoaderBase: Parse not implemented.' );

	}

}
