export const ColorManager = new ( class {

	constructor() {

		this._cache = {};

	}

	getColor( ...args ) {

		const target = args.pop();
		const key = args.join( '_' );
		const { _cache } = this;
		if ( ! ( key in _cache ) ) {

			target.setHSL( Math.random(), 1, 0.5 );
			_cache[ key ] = target.getHex();

		}

		return target.set( _cache[ key ] );

	}

} )();
