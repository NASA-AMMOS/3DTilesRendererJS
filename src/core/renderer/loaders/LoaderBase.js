import { getWorkingPath } from '../utilities/LoaderUtils.js';

/**
 * Base class for all 3D Tiles content loaders. Handles fetching and parsing tile content.
 */
export class LoaderBase {

	constructor() {

		/**
		 * Options passed to `fetch` when loading tile content.
		 * @type {Object}
		 */
		this.fetchOptions = {};

		/**
		 * Base URL used to resolve relative external URLs.
		 * @type {string}
		 */
		this.workingPath = '';

	}

	/**
	 * @deprecated Use `loadAsync` instead.
	 * @param {string} url
	 * @returns {Promise<any>}
	 */
	load( ...args ) {

		console.warn( 'Loader: "load" function has been deprecated in favor of "loadAsync".' );
		return this.loadAsync( ...args );

	}

	/**
	 * Fetches and parses content from the given URL.
	 * @param {string} url
	 * @returns {Promise<any>}
	 */
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

	/**
	 * Resolves a relative URL against `workingPath`.
	 * @param {string} url
	 * @returns {string}
	 */
	resolveExternalURL( url ) {

		return new URL( url, this.workingPath ).href;

	}

	/**
	 * Parses a raw buffer into a tile result object. Must be implemented by subclasses.
	 * @param {ArrayBuffer} buffer
	 * @returns {any}
	 */
	parse( buffer ) {

		throw new Error( 'LoaderBase: Parse not implemented.' );

	}

}
