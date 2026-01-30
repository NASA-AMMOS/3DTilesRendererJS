import { Color } from 'three';
import { LAYER_COLORS, DEFAULT_LAYER_ORDER } from './layerColors.js';

const _color = /* @__PURE__ */ new Color();

export class VectorTileStyler {

	constructor( options = {} ) {

		this.filter = options.filter || ( () => true );
		this._layerOrder = options.layerOrder || DEFAULT_LAYER_ORDER;
		this._styles = {};

		const colorsToSet = Object.assign( {}, LAYER_COLORS, options.styles || {} );
		for ( const key in colorsToSet ) {

			_color.set( colorsToSet[ key ] );
			this._styles[ key ] = {
				hex: _color.getHex(),
				css: _color.getStyle()
			};

		}

	}

	getColor( layerName, format = 'hex' ) {

		const style = this._styles[ layerName ] || this._styles[ 'default' ];
		return format === 'css' ? style.css : style.hex;

	}

	getLayerOrder() {

		return this._layerOrder;

	}

	sortLayers( layerNames ) {

		return [ ...layerNames ].sort( ( a, b ) => {

			let idxA = this._layerOrder.indexOf( a );
			let idxB = this._layerOrder.indexOf( b );
			if ( idxA === - 1 ) idxA = 0;
			if ( idxB === - 1 ) idxB = 0;
			return idxA - idxB;

		} );

	}

	shouldIncludeFeature( feature, layerName ) {

		return this.filter( feature, layerName );

	}

}
