const DEFAULT_STYLE = { fill: '#cccccc', stroke: 'transparent', strokeWidth: 1, radius: 2, order: 0, visible: true };

export class VectorTileStyler {

	constructor( options = {} ) {

		this._getStyle = options.getStyle ?? null;

	}

	getStyle( layerName, properties ) {

		return this._getStyle ? this._getStyle( layerName, properties ) : DEFAULT_STYLE;

	}

	sortLayers( layerNames ) {

		return [ ...layerNames ].sort( ( a, b ) => {

			const orderA = this.getStyle( a, null )?.order ?? Infinity;
			const orderB = this.getStyle( b, null )?.order ?? Infinity;
			if ( orderA !== orderB ) return orderA - orderB;
			return a.localeCompare( b );

		} );

	}

}
