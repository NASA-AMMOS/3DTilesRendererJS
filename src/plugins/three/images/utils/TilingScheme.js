// Class for storing and querying a tiling scheme including a bounds, origin, and negative tile indices.
// Assumes that tiles are split into four child tiles at each level.
export class TilingScheme {

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

	constructor() {

		// TODO: add overlap? Pixel information?

		// The number of tiles on each axis
		this.tileCountX = 1;
		this.tileCountY = 1;
		this.levels = 0;

		// pixel information
		this.pixelWidth = 1;
		this.pixelHeight = 1;
		this.tilePixelWidth = 1;
		this.tilePixelHeight = 1;

		// The origin and bounds
		this.bounds = [ 0, 0, 1, 1 ];
		this.origin = [ 0, 0 ];

	}

	// bounds setters
	setOrigin( x, y ) {

		this.origin[ 0 ] = x;
		this.origin[ 1 ] = y;

	}

	setBounds( minX, minY, maxX, maxY ) {

		this.bounds[ 0 ] = minX;
		this.bounds[ 1 ] = minY;
		this.bounds[ 2 ] = maxX;
		this.bounds[ 3 ] = maxY;

	}

	// tile index query functions
	getTileAtBoundsPoint( x, y, level, target = [] ) {

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

		if ( level >= this.levels ) {

			return false;

		}

		const levelMultiplier = 2 ** level;
		const minTileX = this.minTileX * levelMultiplier;
		const minTileY = this.minTileY * levelMultiplier;
		const tileCountX = this.tileCountX * levelMultiplier;
		const tileCountY = this.tileCountY * levelMultiplier;

		// check if we're outside the tile count at the given level
		const nx = tx - minTileX;
		const ny = ty - minTileY;
		if ( ! ( nx >= 0 && nx < tileCountX && ny >= 0 && ny < tileCountY ) ) {

			return false;

		}

		// check if we're outside the pixel range at the given level
		const levelWidth = this.getPixelWidthAtLevel( level );
		const levelHeight = this.getPixelHeightAtLevel( level );
		const { tilePixelWidth, tilePixelHeight } = this;
		if ( nx * tilePixelWidth > levelWidth || ny * tilePixelHeight > levelHeight ) {

			return false;

		}

		return true;

	}

	// pixel dimensions query function
	getPixelWidthAtLevel( level ) {

		const { levels, pixelWidth } = this;
		const maxLevel = levels - 1;
		const levelFactor = 2 ** - ( maxLevel - level );
		return Math.ceil( pixelWidth * levelFactor );

	}

	getPixelHeightAtLevel( level ) {

		const { levels, pixelHeight } = this;
		const maxLevel = levels - 1;
		const levelFactor = 2 ** - ( maxLevel - level );
		return Math.ceil( pixelHeight * levelFactor );

	}

	getNormalizedTileSpan( x, y, level, pixelOverlap = 0, flipY = false ) {

		const levelWidth = this.getPixelWidthAtLevel( level );
		const levelHeight = this.getPixelHeightAtLevel( level );
		const { tilePixelWidth, tilePixelHeight } = this;

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
		if ( tileX + tileWidthOverlap > levelWidth ) {

			tileWidthOverlap = levelWidth - tileX;

		}

		if ( tileY + tileHeightOverlap > levelHeight ) {

			tileHeightOverlap = levelHeight - tileY;

		}

		if ( flipY ) {

			let centerY = tileY + tileHeightOverlap / 2;
			centerY = levelHeight - centerY;

			tileY = centerY - tileHeightOverlap / 2;

		}

		return [
			tileX / levelWidth,
			tileY / levelHeight,
			( tileX + tileWidthOverlap ) / levelWidth,
			( tileY + tileHeightOverlap ) / levelHeight,
		];

	}

}

