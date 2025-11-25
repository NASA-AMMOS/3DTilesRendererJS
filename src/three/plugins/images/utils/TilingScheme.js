import { MathUtils } from 'three';

function doBoundsIntersect( a, b ) {

	const [ aMinX, aMinY, aMaxX, aMaxY ] = a;
	const [ bMinX, bMinY, bMaxX, bMaxY ] = b;

	return ! ( aMinX >= bMaxX || aMaxX <= bMinX || aMinY >= bMaxY || aMaxY <= bMinY );

}

// Class for storing and querying a tiling scheme including a bounds, origin, and negative tile indices.
// Assumes that tiles are split into four child tiles at each level.

// Projection Bounds: The full extent of content representable by the projection.
// Content Bounds: The range within the content bounds contains relevant, loadable, and renderable data.
// Tile Bounds: The per-layer extent covered by the tiles to be loaded. This range may be larger than
// both the projection and content bounds.
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

	get aspectRatio() {

		const { pixelWidth, pixelHeight } = this.getLevel( this.maxLevel );
		return pixelWidth / pixelHeight;

	}

	constructor() {

		this.flipY = false;
		this.pixelOverlap = 0;

		// The origin and bounds
		this._contentBounds = null;
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
			tileBounds = null,
		} = options;

		const {
			pixelWidth = tilePixelWidth * tileCountX,
			pixelHeight = tilePixelHeight * tileCountY,
		} = options;

		levels[ level ] = {
			// The pixel resolution of each tile.
			tilePixelWidth,
			tilePixelHeight,

			// The total pixel resolution of the final image at this level. These numbers
			// may not be a round multiple of the tile width.
			pixelWidth,
			pixelHeight,

			// Or the total number of tiles that can be loaded at this level.
			tileCountX,
			tileCountY,

			// The bounds covered by the extent of the tiles at this loaded. The actual content covered by the overall tileset
			// may be a subset of this range (eg there may be unused space).
			tileBounds,
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

	// bounds representing the contentful region of the image
	setContentBounds( minX, minY, maxX, maxY ) {

		this._contentBounds = [ minX, minY, maxX, maxY ];

	}

	setProjection( projection ) {

		this.projection = projection;

	}

	// query functions
	getTileAtPoint( bx, by, level, normalized = false ) {

		const { flipY } = this;
		const { tileCountX, tileCountY, tileBounds } = this.getLevel( level );
		const xStride = 1 / tileCountX;
		const yStride = 1 / tileCountY;

		if ( ! normalized ) {

			[ bx, by ] = this.toNormalizedPoint( bx, by );

		}

		if ( tileBounds ) {

			const normalizedBounds = this.toNormalizedRange( tileBounds );
			bx = MathUtils.mapLinear( bx, normalizedBounds[ 0 ], normalizedBounds[ 2 ], 0, 1 );
			by = MathUtils.mapLinear( by, normalizedBounds[ 1 ], normalizedBounds[ 3 ], 0, 1 );

		}

		const tx = Math.floor( bx / xStride );
		let ty = Math.floor( by / yStride );

		if ( flipY ) {

			ty = tileCountY - 1 - ty;

		}

		return [ tx, ty ];

	}

	getTilesInRange( minX, minY, maxX, maxY, level, normalized = false ) {

		// check if the range is outside the content bounds
		const range = [ minX, minY, maxX, maxY ];
		const contentBounds = this.getContentBounds( normalized );
		let tileBounds = this.getLevel( level ).tileBounds;
		if ( ! doBoundsIntersect( range, contentBounds ) ) {

			return [ 0, 0, - 1, - 1 ];

		}

		// check if the range is outside the tile bounds
		if ( tileBounds ) {

			if ( normalized ) {

				tileBounds = this.toNormalizedRange( tileBounds );

			}

			if ( ! doBoundsIntersect( range, contentBounds ) ) {

				return [ 0, 0, - 1, - 1 ];

			}

		}

		const [ clampedMinX, clampedMinY, clampedMaxX, clampedMaxY ] = this.clampToContentBounds( range, normalized );
		const minTile = this.getTileAtPoint( clampedMinX, clampedMinY, level, normalized );
		const maxTile = this.getTileAtPoint( clampedMaxX, clampedMaxY, level, normalized );

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
			MathUtils.clamp( minTileX, 0, tileCountX - 1 ),
			MathUtils.clamp( minTileY, 0, tileCountY - 1 ),
			MathUtils.clamp( maxTileX, 0, tileCountX - 1 ),
			MathUtils.clamp( maxTileY, 0, tileCountY - 1 ),
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

	// returns the UV range associated with the content in the given tile
	getTileContentUVBounds( x, y, level ) {

		const [ minU, minV, maxU, maxV ] = this.getTileBounds( x, y, level, true, true );
		const [ fullMinU, fullMinV, fullMaxU, fullMaxV ] = this.getTileBounds( x, y, level, true, false );
		return [
			MathUtils.mapLinear( minU, fullMinU, fullMaxU, 0, 1 ),
			MathUtils.mapLinear( minV, fullMinV, fullMaxV, 0, 1 ),
			MathUtils.mapLinear( maxU, fullMinU, fullMaxU, 0, 1 ),
			MathUtils.mapLinear( maxV, fullMinV, fullMaxV, 0, 1 ),
		];

	}

	getTileBounds( x, y, level, normalized = false, clampToProjection = true ) {

		const { flipY, pixelOverlap, projection } = this;
		const { tilePixelWidth, tilePixelHeight, pixelWidth, pixelHeight, tileBounds } = this.getLevel( level );

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

		let bounds = [ tileLeft, tileTop, tileRight, tileBottom ];
		if ( tileBounds ) {

			const normBounds = this.toNormalizedRange( tileBounds );
			bounds[ 0 ] = MathUtils.mapLinear( bounds[ 0 ], 0, 1, normBounds[ 0 ], normBounds[ 2 ] );
			bounds[ 2 ] = MathUtils.mapLinear( bounds[ 2 ], 0, 1, normBounds[ 0 ], normBounds[ 2 ] );
			bounds[ 1 ] = MathUtils.mapLinear( bounds[ 1 ], 0, 1, normBounds[ 1 ], normBounds[ 3 ] );
			bounds[ 3 ] = MathUtils.mapLinear( bounds[ 3 ], 0, 1, normBounds[ 1 ], normBounds[ 3 ] );

		}

		if ( clampToProjection ) {

			bounds = this.clampToProjectionBounds( bounds, true );

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

	toCartographicPoint( x, y ) {

		const { projection } = this;
		const result = [ x, y ];
		if ( this.projection ) {

			result[ 0 ] = projection.convertProjectionToLongitude( result[ 0 ] );
			result[ 1 ] = projection.convertProjectionToLatitude( result[ 1 ] );

		} else {

			throw new Error( 'TilingScheme: Projection not available.' );

		}

		return result;

	}

	toCartographicRange( range ) {

		return [
			...this.toCartographicPoint( range[ 0 ], range[ 1 ] ),
			...this.toCartographicPoint( range[ 2 ], range[ 3 ] ),
		];

	}

	clampToContentBounds( range, normalized = false ) {

		const result = [ ...range ];
		const [ minX, minY, maxX, maxY ] = this.getContentBounds( normalized );
		result[ 0 ] = MathUtils.clamp( result[ 0 ], minX, maxX );
		result[ 1 ] = MathUtils.clamp( result[ 1 ], minY, maxY );
		result[ 2 ] = MathUtils.clamp( result[ 2 ], minX, maxX );
		result[ 3 ] = MathUtils.clamp( result[ 3 ], minY, maxY );

		return result;

	}

	clampToProjectionBounds( range, normalized = false ) {

		const result = [ ...range ];
		const { projection } = this;
		let clampBounds;

		if ( normalized || ! projection ) {

			clampBounds = [ 0, 0, 1, 1 ];

		} else {

			clampBounds = projection.getBounds();

		}

		const [ minX, minY, maxX, maxY ] = clampBounds;
		result[ 0 ] = MathUtils.clamp( result[ 0 ], minX, maxX );
		result[ 1 ] = MathUtils.clamp( result[ 1 ], minY, maxY );
		result[ 2 ] = MathUtils.clamp( result[ 2 ], minX, maxX );
		result[ 3 ] = MathUtils.clamp( result[ 3 ], minY, maxY );

		return result;

	}

}

