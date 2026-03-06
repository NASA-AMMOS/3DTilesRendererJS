import { XYZImageSource } from './XYZImageSource.js';
import { MVTLoaderBase } from '../../../../core/renderer/loaders/MVTLoaderBase.js';
import { VectorTileStyler } from '../../../renderer/utils/VectorTileStyler.js';
import { VectorTileCanvasRenderer } from '../../../renderer/utils/VectorTileCanvasRenderer.js';

export class MVTImageSource extends XYZImageSource {

	constructor( options = {} ) {

		super( options );

		this.loader = new MVTLoaderBase();
		this.tileDimension = options.tileDimension || 512;

		this._styler = new VectorTileStyler( {
			filter: options.filter,
			styles: options.styles
		} );

		this._renderer = new VectorTileCanvasRenderer( this._styler, {
			tileDimension: this.tileDimension
		} );

	}

	async processBufferToTexture( buffer ) {

		const { vectorTile } = await this.loader.parse( buffer );
		return this._renderer.render( vectorTile );

	}

}
