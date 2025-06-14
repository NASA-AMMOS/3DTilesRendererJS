// Class for storing and querying a tiling scheme including a bounds, origin, and negative tile indices.
// Assumes that tiles are split into four child tiles at each level.
function clamp( x, min, max ) {

	return Math.min( Math.max( x, min ), max );

}

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

	// prioritize user-set bounds over projection bounds if present
	get rootBounds() {

		return this._rootBounds ?? this.projection?.getBounds() ?? [ 0, 0, 1, 1 ];

	}

	get rootOrigin() {

		const bounds = this.rootBounds;
		return this._rootOrigin ?? [ bounds[ 0 ], bounds[ 1 ] ];

	}

	constructor() {

		this.flipY = false;
		this.pixelOverlap = 0;

		// The origin and bounds
		this._rootBounds = null;
		this._rootOrigin = null;
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

		this._rootOrigin = [ x, y ];

	}

	setBounds( minX, minY, maxX, maxY ) {

		this._rootBounds = [ minX, minY, maxX, maxY ];

	}

	setProjection( projection ) {

		this.projection = projection;

	}

	// query functions
	getTileAtPoint( bx, by, level, normalized = false, clampTiles = true ) {

		const { projection, flipY } = this;
		const { tileCountX, tileCountY } = this.getLevel( level );
		const xStride = 1 / tileCountX;
		const yStride = 1 / tileCountY;

		if ( projection && ! normalized ) {

			bx = projection.convertLongitudeToProjection( bx );
			by = projection.convertLatitudeToProjection( by );

		}

		if ( clampTiles ) {

			bx = clamp( bx, 0, 1 );
			by = clamp( by, 0, 1 );

		}

		let tx = Math.floor( bx / xStride );
		let ty = Math.floor( by / yStride );

		if ( flipY ) {

			ty = tileCountY - 1 - ty;

		}

		if ( clampTiles ) {

			tx = clamp( tx, 0, tileCountX - 1 );
			ty = clamp( ty, 0, tileCountY - 1 );

		}

		return [ tx, ty ];

	}

	getTilesInRange( minX, minY, maxX, maxY, level, normalized = false, clampTiles = true ) {

		const minTile = this.getTileAtPoint( minX, minY, level, normalized, clampTiles );
		const maxTile = this.getTileAtPoint( maxX, maxY, level, normalized, clampTiles );

		if ( this.flipY ) {

			[ minTile[ 1 ], maxTile[ 1 ] ] = [ maxTile[ 1 ], minTile[ 1 ] ];

		}

		return [ ...minTile, ...maxTile ];

	}

	getTileExists( x, y, level ) {

		const [ rminx, rminy, rmaxx, rmaxy ] = this.rootBounds;
		const [ tminx, tminy, tmaxx, tmaxy ] = this.getTileBounds( x, y, level );
		const isDegenerate = tminx >= tmaxx || tminy >= tmaxy;

		return ! isDegenerate && tminx <= rmaxx && tminy <= rmaxy && tmaxx >= rminx && tmaxy >= rminy;

	}

	getFullBounds( normalized = false ) {

		const { projection } = this;
		const bounds = [ ...this.rootBounds ];
		if ( projection && normalized ) {

			bounds[ 0 ] = projection.convertLongitudeToProjection( bounds[ 0 ] );
			bounds[ 1 ] = projection.convertLatitudeToProjection( bounds[ 1 ] );
			bounds[ 2 ] = projection.convertLongitudeToProjection( bounds[ 2 ] );
			bounds[ 3 ] = projection.convertLatitudeToProjection( bounds[ 3 ] );

		}

		return bounds;

	}

	getTileBounds( x, y, level, normalized = false ) {

		const { flipY, pixelOverlap, projection } = this;
		const { tilePixelWidth, tilePixelHeight, pixelWidth, pixelHeight } = this.getLevel( level );

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

}

