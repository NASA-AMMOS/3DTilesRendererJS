import { XYZImageSource } from './XYZImageSource.js';
import { MVTLoaderBase } from '../../../../core/renderer/loaders/MVTLoaderBase.js';
import { VectorTileStyler } from '../../../renderer/utils/VectorTileStyler.js';
import { VectorTileCanvasRenderer } from '../../../renderer/utils/VectorTileCanvasRenderer.js';

export class MVTImageSource extends XYZImageSource {

	constructor( options = {} ) {

		super( options );

		this.loader = new MVTLoaderBase();
		this.tileDimension = options.tileDimension || 512;

		// Use composed styler and renderer
		this._styler = new VectorTileStyler( {
			filter: options.filter,
			styles: options.styles
		} );

		this._renderer = new VectorTileCanvasRenderer( this._styler, {
			tileDimension: this.tileDimension
		} );

	}

	// Legacy API: expose filter for backward compatibility
	get filter() {

		return this._styler.filter;

	}

	set filter( fn ) {

		this._styler.filter = fn;

	}

	async processBufferToTexture( buffer ) {

		const { vectorTile } = await this.loader.parse( buffer );
		return this._renderer.render( vectorTile );

	}

	_createCanvas( width, height ) {

		return this._renderer._createCanvas( width, height );

	}

	_createEmptyTexture() {

		return this._renderer.createEmptyTexture();

	}

}
