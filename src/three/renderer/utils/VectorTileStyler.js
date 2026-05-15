export class VectorTileStyler {

	constructor( options = {} ) {

		const { styles = {}, filter = () => true } = options;

		this.filter = filter;
		this._styles = {
			...styles,
			default: { fill: '#cccccc', stroke: 'transparent', strokeWidth: 1, radius: 2, order: 0, visible: true, ...styles.default },
		};

	}

	getStyle( layerName ) {

		const styles = this._styles;
		const defaultStyle = styles.default;
		if ( layerName in styles ) {

			return { ...defaultStyle, ...styles[ layerName ] };

		} else {

			return defaultStyle;

		}

	}

	sortLayers( layerNames ) {

		const styles = this._styles;
		const defaultOrder = styles.default.order;

		return [ ...layerNames ].sort( ( a, b ) => {

			const orderA = styles[ a ]?.order ?? defaultOrder;
			const orderB = styles[ b ]?.order ?? defaultOrder;
			if ( orderA !== orderB ) {

				return orderA - orderB;

			} else {

				return a.localeCompare( b );

			}

		} );

	}

	shouldIncludeFeature( feature, layerName ) {

		return this.filter( feature, layerName );

	}

}
