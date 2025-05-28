// Class for storing and querying a tiling scheme including a bounds, origin, and negative tile indices.
// Assumes that tiles are split into four child tiles at each level.
export class TilingScheme {

	get levelCount() {

		return this._levels.length;

	}

	get maxLevel() {

		return this.levelCount - 1;

	}

	get minLevel() {

		const levels = this._levels;
		for ( let i = 0; i < levels.length; i ++ ) {

			if ( levels[ i ] !== null ) {

				return i;

			}

		}

		return - 1;

	}

	constructor() {

		this.flipY = false;
		this.pixelOverlap = 0;

		// The origin and bounds
		this.rootBounds = [ 0, 0, 1, 1 ];
		this.rootOrigin = [ 0, 0 ];
		this.projection = null;

		this._levels = [];

	}

	// build the zoom levels
	setLevel( level, options = {} ) {

		const levels = this._levels;
		while ( levels.length < level ) {

			levels.push( null );

		}

		const {
			tilePixelWidth = 256,
			tilePixelHeight = 256,
			tileCountX = 2 ** level,
			tileCountY = 2 ** level,
		} = options;

		const {
			pixelWidth = tilePixelWidth * tileCountX,
			pixelHeight = tilePixelHeight * tileCountY,
		} = options;

		levels[ level ] = {
			tilePixelWidth,
			tilePixelHeight,
			pixelWidth,
			pixelHeight,
			tileCountX,
			tileCountY,
		};

	}

	generateLevels( levels, rootTileX, rootTileY, options = {} ) {

		const {
			minLevel = 0,
			tilePixelWidth = 256,
			tilePixelHeight = 256,
		} = options;

		const maxLevel = levels - 1;
		const {
			pixelWidth = tilePixelWidth * rootTileX * ( 2 ** maxLevel ),
			pixelHeight = tilePixelHeight * rootTileY * ( 2 ** maxLevel ),
		} = options;
		for ( let level = minLevel; level < levels; level ++ ) {

			const invLevel = levels - level - 1;
			const levelPixelWidth = Math.ceil( pixelWidth * ( 2 ** - invLevel ) );
			const levelPixelHeight = Math.ceil( pixelHeight * ( 2 ** - invLevel ) );
			const tileCountX = Math.ceil( levelPixelWidth / tilePixelWidth );
			const tileCountY = Math.ceil( levelPixelHeight / tilePixelHeight );

			this.setLevel( level, {
				tilePixelWidth,
				tilePixelHeight,
				pixelWidth: levelPixelWidth,
				pixelHeight: levelPixelHeight,
				tileCountX,
				tileCountY,
			} );

		}

	}

	getLevel( level ) {

		return this._levels[ level ];

	}

	// bounds setters
	setOrigin( x, y ) {

		this.rootOrigin[ 0 ] = x;
		this.rootOrigin[ 1 ] = y;

	}

	setBounds( minX, minY, maxX, maxY ) {

		this.rootBounds[ 0 ] = minX;
		this.rootBounds[ 1 ] = minY;
		this.rootBounds[ 2 ] = maxX;
		this.rootBounds[ 3 ] = maxY;

	}

	setProjection( projection ) {

		if ( this._levels.length > 0 ) {

			throw new Error();

		}

		this.projection = projection;

		const bounds = projection.getBounds();
		this.setBounds( ...bounds );
		this.setOrigin( bounds[ 0 ], bounds[ 1 ] );

	}

	// query functions
	getTileAtPoint( bx, by, level ) {

		const { tileCountX, tileCountY, projection } = this.getLevel( level );
		const xStride = 1 / tileCountX;
		const yStride = 1 / tileCountY;

		bx = projection.convertLongitudeToValue( bx );
		by = projection.convertLatitudeToValue( by );

		return [
			Math.floor( bx / xStride ),
			Math.floor( by / yStride ),
		];

	}

	getTileExists( x, y, level, LOG ) {

		const [ rminx, rminy, rmaxx, rmaxy ] = this.rootBounds;
		const [ tminx, tminy, tmaxx, tmaxy ] = this.getTileBounds( x, y, level, LOG );
		const isDegenerate = tminx >= tmaxx || tminy >= tmaxy;

		return ! isDegenerate && tminx <= rmaxx && tminy <= rmaxy && tmaxx >= rminx && tmaxy >= rminy;

	}

	getTileBounds( x, y, level, normalized = false ) {

		const { flipY, pixelOverlap } = this;
		const { tilePixelWidth, tilePixelHeight, pixelWidth, pixelHeight, projection } = this.getLevel( level );

		let tileLeft = tilePixelWidth * x - pixelOverlap;
		let tileTop = tilePixelHeight * y - pixelOverlap;
		let tileRight = tileLeft + tilePixelWidth + pixelOverlap * 2;
		let tileBottom = tileTop + tilePixelHeight + pixelOverlap * 2;

		// clamp
		tileLeft = Math.max( tileLeft, 0 );
		tileTop = Math.max( tileTop, 0 );
		tileRight = Math.min( tileRight, pixelWidth );
		tileBottom = Math.min( tileBottom, pixelHeight );

		// normalized
		tileLeft = tileLeft / pixelWidth;
		tileRight = tileRight / pixelWidth;
		tileTop = tileTop / pixelHeight;
		tileBottom = tileBottom / pixelHeight;

		// invert y
		if ( flipY ) {

			const extents = ( tileBottom - tileTop ) / 2;
			const centerY = ( tileTop + tileBottom ) / 2;
			const invCenterY = 1.0 - centerY;

			tileTop = invCenterY - extents;
			tileBottom = invCenterY + extents;

		}

		const bounds = [ tileLeft, tileTop, tileRight, tileBottom ];
		if ( projection && ! normalized ) {

			bounds[ 0 ] = projection.convertProjectionToLongitude( bounds[ 0 ] );
			bounds[ 1 ] = projection.convertProjectionToLatitude( bounds[ 1 ] );
			bounds[ 2 ] = projection.convertProjectionToLongitude( bounds[ 2 ] );
			bounds[ 3 ] = projection.convertProjectionToLatitude( bounds[ 3 ] );

		}

		return bounds;

	}

	offsetTileIndices( x, y, level ) {

		const { tileCountX, tileCountY, projection, rootBounds, rootOrigin } = this.getLevel( level );
		const xStride = 1 / tileCountX;
		const yStride = 1 / tileCountY;
		let originDeltaX = rootOrigin[ 0 ] - rootBounds[ 0 ];
		let originDeltaY = rootOrigin[ 1 ] - rootBounds[ 1 ];

		if ( projection ) {

			originDeltaX = projection.convertProjectionToLongitude( rootOrigin[ 0 ] ) - projection.convertProjectionToLongitude( rootBounds[ 0 ] );
			originDeltaY = projection.convertProjectionToLatitude( rootOrigin[ 1 ] ) - projection.convertProjectionToLatitude( rootBounds[ 1 ] );

		}

		const tileOffsetX = Math.round( originDeltaX / xStride );
		const tileOffsetY = Math.round( originDeltaY / yStride );

		return [ x - tileOffsetX, y - tileOffsetY ];

	}

}

