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
	get contentBounds() {

		return this._contentBounds ?? this.projection?.getBounds() ?? [ 0, 0, 1, 1 ];

	}

	// TODO: remove this?
	get rootOrigin() {

		const bounds = this.contentBounds;
		return this._rootOrigin ?? [ bounds[ 0 ], bounds[ 1 ] ];

	}

	get aspectRatio() {

		const { pixelWidth, pixelHeight } = this.getLevel( this.maxLevel );
		return pixelWidth / pixelHeight;

	}

	constructor() {

		this.flipY = false;
		this.pixelOverlap = 0;

		// The origin and bounds
		this._contentBounds = null;
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
			bounds = null,
			origin = null,
		} = options;

		const {
			pixelWidth = tilePixelWidth * tileCountX,
			pixelHeight = tilePixelHeight * tileCountY,
		} = options;

		// TODO: Can we remove some of these? Or infer them elsewhere? How should tileCountX be interpreted when origin and bounds
		// are present? Or pixelWidth?
		// It's possible that we can have "contentTileCount" and an "totalTileCount" for describing the number of tiles in and out
		// of the local bounds.
		// TODO: First step is removing or simplifying or understanding any portion of the code that uses this layer tile count.
		levels[ level ] = {
			// The pixel resolution of each tile.
			tilePixelWidth,
			tilePixelHeight,

			// The total pixel resolution of the final image at this level. These numbers
			// may not be a round multiple of the tile width.
			pixelWidth,
			pixelHeight,

			// The total number of tiles needed to cover the full range of data in the projection.
			tileCountX,
			tileCountY,

			// The origin is used as the origin at which to start counting tiles. The bounds is
			// used to describe the range that tiles cover which may be outside the content range.
			origin,
			bounds,
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

		// TODO: is this necessary? TMS doesn't use it
		this._rootOrigin = [ x, y ];

	}

	// bounds representing the contentful region of the image
	setContentBounds( minX, minY, maxX, maxY ) {

		// TODO: rename this to "setContentBounds"
		this._contentBounds = [ minX, minY, maxX, maxY ];

	}

	setProjection( projection ) {

		this.projection = projection;

	}

	// query functions
	getTileAtPoint( bx, by, level, normalized = false ) {

		// TODO: this needs to transform the point to the local bounds of the layer (if present)
		// and return the tile indices for that layer
		// TODO: separate the set of tile-index functions from the root content bounds functions
		// for clarity
		const { projection, flipY } = this;
		const { tileCountX, tileCountY } = this.getLevel( level );
		const xStride = 1 / tileCountX;
		const yStride = 1 / tileCountY;

		if ( projection && ! normalized ) {

			bx = projection.convertLongitudeToProjection( bx );
			by = projection.convertLatitudeToProjection( by );

		}

		const tx = Math.floor( bx / xStride );
		let ty = Math.floor( by / yStride );

		if ( flipY ) {

			ty = tileCountY - 1 - ty;

		}

		return [ tx, ty ];

	}

	// TODO: this needs to transform the point to the local bounds of the layer (if present)
	// and return the tile indices for that layer
	getTilesInRange( minX, minY, maxX, maxY, level, normalized = false ) {

		const minTile = this.getTileAtPoint( minX, minY, level, normalized, false );
		const maxTile = this.getTileAtPoint( maxX, maxY, level, normalized, false );

		if ( this.flipY ) {

			[ minTile[ 1 ], maxTile[ 1 ] ] = [ maxTile[ 1 ], minTile[ 1 ] ];

		}

		const { tileCountX, tileCountY } = this.getLevel( level );
		const [ minTileX, minTileY ] = minTile;
		const [ maxTileX, maxTileY ] = maxTile;

		if ( maxTileX < 0 || maxTileY < 0 || minTileX >= tileCountX || minTileY >= tileCountY ) {

			return [ 0, 0, - 1, - 1 ];

		}

		return [
			clamp( minTileX, 0, tileCountX - 1 ),
			clamp( minTileY, 0, tileCountY - 1 ),
			clamp( maxTileX, 0, tileCountX - 1 ),
			clamp( maxTileY, 0, tileCountY - 1 ),
		];

	}

	getTileExists( x, y, level ) {

		const [ rminx, rminy, rmaxx, rmaxy ] = this.contentBounds;
		const [ tminx, tminy, tmaxx, tmaxy ] = this.getTileBounds( x, y, level );
		const isDegenerate = tminx >= tmaxx || tminy >= tmaxy;

		// TODO: is supporting "just touch" correct?
		return ! isDegenerate && tminx <= rmaxx && tminy <= rmaxy && tmaxx >= rminx && tmaxy >= rminy;

	}

	getContentBounds( normalized = false ) {

		const { projection } = this;
		const bounds = [ ...this.contentBounds ];
		if ( projection && normalized ) {

			bounds[ 0 ] = projection.convertLongitudeToProjection( bounds[ 0 ] );
			bounds[ 1 ] = projection.convertLatitudeToProjection( bounds[ 1 ] );
			bounds[ 2 ] = projection.convertLongitudeToProjection( bounds[ 2 ] );
			bounds[ 3 ] = projection.convertLatitudeToProjection( bounds[ 3 ] );

		}

		return bounds;

	}

	// TODO: this needs to resolve a tile relative to the level origin / bounds but return a bounds
	// relative to the content bounds & root origin
	getTileBounds( x, y, level, normalized = false, clampToContent = true ) {

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
		if ( clampToContent ) {

			// clamp the bounds to the content of the tiled image
			for ( let i = 0; i < 4; i ++ ) {

				bounds[ i ] = clamp( bounds[ i ], 0, 1 );

			}

		}

		if ( projection && ! normalized ) {

			bounds[ 0 ] = projection.convertProjectionToLongitude( bounds[ 0 ] );
			bounds[ 1 ] = projection.convertProjectionToLatitude( bounds[ 1 ] );
			bounds[ 2 ] = projection.convertProjectionToLongitude( bounds[ 2 ] );
			bounds[ 3 ] = projection.convertProjectionToLatitude( bounds[ 3 ] );

		}

		return bounds;

	}

	toNormalizedPoint( x, y ) {

		const { projection } = this;
		const result = [ x, y ];
		if ( this.projection ) {

			result[ 0 ] = projection.convertLongitudeToProjection( result[ 0 ] );
			result[ 1 ] = projection.convertLatitudeToProjection( result[ 1 ] );

		}

		return result;

	}

	toNormalizedRange( range ) {

		return [
			...this.toNormalizedPoint( range[ 0 ], range[ 1 ] ),
			...this.toNormalizedPoint( range[ 2 ], range[ 3 ] ),
		];

	}

	clampToBounds( range, normalized = false ) {

		const result = [ ...range ];
		const { projection } = this;
		if ( normalized || ! projection ) {

			result[ 0 ] = clamp( result[ 0 ], 0, 1 );
			result[ 1 ] = clamp( result[ 1 ], 0, 1 );
			result[ 2 ] = clamp( result[ 2 ], 0, 1 );
			result[ 3 ] = clamp( result[ 3 ], 0, 1 );

		} else {

			const [ minX, minY, maxX, maxY ] = projection.getBounds();
			result[ 0 ] = clamp( result[ 0 ], minX, maxX );
			result[ 1 ] = clamp( result[ 1 ], minY, maxY );
			result[ 2 ] = clamp( result[ 2 ], minX, maxX );
			result[ 3 ] = clamp( result[ 3 ], minY, maxY );

		}

		return result;

	}

}

