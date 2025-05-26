// Class for storing and querying a tiling scheme including a bounds, origin, and negative tile indices.
// Assumes that tiles are split into four child tiles at each level.
export class TilingScheme {

	// TODO: this all relies on bounds which re not reliable or well defined at the moment
	// are bounds in pixels?
	// The width of the bounds range
	get boundsWidth() {

		return this.bounds[ 2 ] - this.bounds[ 0 ];

	}

	get boundsHeight() {

		return this.bounds[ 3 ] - this.bounds[ 1 ];

	}

	// The width of an individual tile
	get tileWidth() {

		return this.boundsWidth / this.tileCountX;

	}

	get tileHeight() {

		return this.boundsHeight / this.tileCountY;

	}

	// The minimum tile index
	get minTileX() {

		return ( this.bounds[ 0 ] - this.origin[ 0 ] ) / this.tileWidth;

	}

	get minTileY() {

		return ( this.bounds[ 0 ] - this.origin[ 0 ] ) / this.tileWidth;

	}

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

		// TODO: add overlap? Pixel information?

		// The number of tiles on each axis
		this.tileCountX = 1;
		this.tileCountY = 1;

		// pixel information
		this.pixelWidth = 1;
		this.pixelHeight = 1;
		this.tilePixelWidth = 1;
		this.tilePixelHeight = 1;

		// The origin and bounds
		this.bounds = [ 0, 0, 1, 1 ];
		this.origin = [ 0, 0 ];

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

		// TODO

		this.origin[ 0 ] = x;
		this.origin[ 1 ] = y;

	}

	setBounds( minX, minY, maxX, maxY ) {

		// TODO

		this.bounds[ 0 ] = minX;
		this.bounds[ 1 ] = minY;
		this.bounds[ 2 ] = maxX;
		this.bounds[ 3 ] = maxY;

	}

	// tile index query functions
	getTileAtBoundsPoint( x, y, level, target = [] ) {

		// TODO

		const levelMultiplier = 2 ** level;
		const tileWidth = this.tileWidth / levelMultiplier;
		const tileHeight = this.tileHeight / levelMultiplier;

		const relativeX = x - this.origin[ 0 ];
		const relativeY = y - this.origin[ 1 ];

		target[ 0 ] = Math.floor( relativeX / tileWidth );
		target[ 1 ] = Math.floor( relativeY / tileHeight );
		return target;

	}

	getTileExists( tx, ty, level ) {

		const { levelCount, minLevel } = this;
		const { tileCountX, tileCountY } = this.getLevel( level );
		return tx < tileCountX && ty < tileCountY && level < levelCount && level >= minLevel;

	}

	// pixel dimensions query function
	getNormalizedTileSpan( x, y, level, pixelOverlap = 0, flipY = false ) {

		const { pixelWidth, pixelHeight, tilePixelWidth, tilePixelHeight } = this.getLevel( level );
		let tileX = tilePixelWidth * x - pixelOverlap;
		let tileY = tilePixelHeight * y - pixelOverlap;
		let tileWidthOverlap = tilePixelWidth + pixelOverlap * 2;
		let tileHeightOverlap = tilePixelHeight + pixelOverlap * 2;

		// adjust the starting position of the tile to the edge of the image
		if ( tileX < 0 ) {

			tileWidthOverlap += tileX;
			tileX = 0;

		}

		if ( tileY < 0 ) {

			tileHeightOverlap += tileY;
			tileY = 0;

		}

		// clamp the dimensions to the edge of the image
		if ( tileX + tileWidthOverlap > pixelWidth ) {

			tileWidthOverlap = pixelWidth - tileX;

		}

		if ( tileY + tileHeightOverlap > pixelHeight ) {

			tileHeightOverlap = pixelHeight - tileY;

		}

		if ( flipY ) {

			let centerY = tileY + tileHeightOverlap / 2;
			centerY = pixelHeight - centerY;

			tileY = centerY - tileHeightOverlap / 2;

		}

		return [
			tileX / pixelWidth,
			tileY / pixelHeight,
			( tileX + tileWidthOverlap ) / pixelWidth,
			( tileY + tileHeightOverlap ) / pixelHeight,
		];

	}

}

