/** @import { TilesRenderer } from '3d-tiles-renderer/playcanvas' */
import { Vec3 } from 'playcanvas';
import { copyMatrix, createMatrix, multiplyMatrices, transformPoint } from '../renderer/math/MatrixUtils.js';

const SPHERE_SEGMENTS = 32;
const REGION_SEGMENTS = 8;

const _tilesetToWorld = /* @__PURE__ */ createMatrix();
const _tilesetTransform = /* @__PURE__ */ createMatrix();
const _point = /* @__PURE__ */ new Vec3();
const _start = /* @__PURE__ */ new Vec3();
const _end = /* @__PURE__ */ new Vec3();

/**
 * Plugin that draws the bounding volumes of the visible tiles as lines, to help debug tile
 * selection and culling. Each tile gets a random color. The lines are drawn with
 * `AppBase#drawLineArrays` every frame the app renders, so they need the camera to render the
 * immediate layer, which it does by default.
 */
export class DebugTilesPlugin {

	/**
	 * @param {Object} [options]
	 * @param {boolean} [options.displayBoxBounds=false] - Draw the `box` bounding volumes.
	 * @param {boolean} [options.displaySphereBounds=false] - Draw the `sphere` bounding volumes.
	 * @param {boolean} [options.displayRegionBounds=false] - Draw the `region` bounding volumes.
	 * @param {boolean} [options.displayParentBounds=false] - Also draw the bounding volumes of
	 * the ancestors of the visible tiles.
	 * @param {boolean} [options.enabled=true] - Whether the plugin draws anything.
	 */
	constructor( options ) {

		options = {
			displayBoxBounds: false,
			displaySphereBounds: false,
			displayRegionBounds: false,
			displayParentBounds: false,
			enabled: true,
			...options,
		};

		this.name = 'DEBUG_TILES_PLUGIN';
		this.tiles = null;

		this.displayBoxBounds = options.displayBoxBounds;
		this.displaySphereBounds = options.displaySphereBounds;
		this.displayRegionBounds = options.displayRegionBounds;
		this.displayParentBounds = options.displayParentBounds;
		this.enabled = options.enabled;

		this._positions = [];
		this._colors = [];
		this._tileColors = new WeakMap();
		this._drawTiles = new Set();
		this._onPrerender = null;

	}

	/**
	 * @param {TilesRenderer} tiles
	 */
	init( tiles ) {

		this.tiles = tiles;
		this._onPrerender = () => this._draw();
		tiles.app.on( 'prerender', this._onPrerender );

	}

	dispose() {

		this.tiles.app.off( 'prerender', this._onPrerender );

	}

	_draw() {

		const { tiles, displayBoxBounds, displaySphereBounds, displayRegionBounds } = this;
		if ( ! this.enabled || ! ( displayBoxBounds || displaySphereBounds || displayRegionBounds ) ) {

			return;

		}

		// the lines are computed in 64-bit in the tileset frame, and only the small world space
		// results near the camera are passed to the engine
		copyMatrix( tiles.group.getWorldTransform().data, _tilesetToWorld );
		multiplyMatrices( _tilesetToWorld, tiles.getTilesetTransform( _tilesetTransform ), _tilesetToWorld );

		// the visible tiles, and their ancestors if requested
		const drawTiles = this._drawTiles;
		drawTiles.clear();
		tiles.visibleTiles.forEach( tile => {

			drawTiles.add( tile );
			if ( this.displayParentBounds ) {

				for ( let parent = tile.parent; parent && ! drawTiles.has( parent ); parent = parent.parent ) {

					drawTiles.add( parent );

				}

			}

		} );

		this._positions.length = 0;
		this._colors.length = 0;
		drawTiles.forEach( tile => {

			const boundingVolume = tile.engineData.boundingVolume;
			if ( ! boundingVolume ) {

				return;

			}

			const color = this._getColor( tile );
			const { obb, sphere, region } = boundingVolume;
			if ( displayBoxBounds && obb ) {

				this._addBox( obb.points, color );

			}

			if ( displaySphereBounds && sphere ) {

				this._addSphere( sphere.center, sphere.radius, color );

			}

			if ( displayRegionBounds && region ) {

				this._addRegion( region, color );

			}

		} );

		if ( this._positions.length > 0 ) {

			tiles.app.drawLineArrays( this._positions, this._colors, true );

		}

	}

	// a stable random color per tile
	_getColor( tile ) {

		let color = this._tileColors.get( tile );
		if ( ! color ) {

			color = hslToRgb( Math.random(), 0.5 + Math.random() * 0.5, 0.375 + Math.random() * 0.25 );
			this._tileColors.set( tile, color );

		}

		return color;

	}

	// adds a line between two points in the tileset frame
	_addLine( start, end, color ) {

		const positions = this._positions;
		const colors = this._colors;
		transformPoint( _tilesetToWorld, start.x, start.y, start.z, _point );
		positions.push( _point.x, _point.y, _point.z );
		transformPoint( _tilesetToWorld, end.x, end.y, end.z, _point );
		positions.push( _point.x, _point.y, _point.z );
		colors.push( color[ 0 ], color[ 1 ], color[ 2 ], 1, color[ 0 ], color[ 1 ], color[ 2 ], 1 );

	}

	// the 12 edges of a box from its 8 corners, indexed by the bits of the corner's min / max axes
	_addBox( points, color ) {

		for ( let i = 0; i < 8; i ++ ) {

			for ( let bit = 1; bit < 8; bit <<= 1 ) {

				if ( ( i & bit ) === 0 ) {

					const j = i | bit;
					_start.set( points[ i * 3 ], points[ i * 3 + 1 ], points[ i * 3 + 2 ] );
					_end.set( points[ j * 3 ], points[ j * 3 + 1 ], points[ j * 3 + 2 ] );
					this._addLine( _start, _end, color );

				}

			}

		}

	}

	// three circles around the axes of the tileset frame
	_addSphere( center, radius, color ) {

		for ( let axis = 0; axis < 3; axis ++ ) {

			for ( let i = 0; i < SPHERE_SEGMENTS; i ++ ) {

				const a0 = i / SPHERE_SEGMENTS * Math.PI * 2;
				const a1 = ( i + 1 ) / SPHERE_SEGMENTS * Math.PI * 2;
				setCirclePoint( center, radius, axis, a0, _start );
				setCirclePoint( center, radius, axis, a1, _end );
				this._addLine( _start, _end, color );

			}

		}

	}

	// the outline of a region: its four edges at the minimum and maximum height, which curve with
	// the ellipsoid, and the four vertical edges at its corners
	_addRegion( region, color ) {

		const { latStart, latEnd, lonStart, lonEnd, heightStart, heightEnd } = region;
		for ( const height of [ heightStart, heightEnd ] ) {

			for ( let i = 0; i < REGION_SEGMENTS; i ++ ) {

				const t0 = i / REGION_SEGMENTS;
				const t1 = ( i + 1 ) / REGION_SEGMENTS;
				const lon0 = lonStart + ( lonEnd - lonStart ) * t0;
				const lon1 = lonStart + ( lonEnd - lonStart ) * t1;
				const lat0 = latStart + ( latEnd - latStart ) * t0;
				const lat1 = latStart + ( latEnd - latStart ) * t1;

				for ( const lat of [ latStart, latEnd ] ) {

					region.getCartographicToPosition( lat, lon0, height, _start );
					region.getCartographicToPosition( lat, lon1, height, _end );
					this._addLine( _start, _end, color );

				}

				for ( const lon of [ lonStart, lonEnd ] ) {

					region.getCartographicToPosition( lat0, lon, height, _start );
					region.getCartographicToPosition( lat1, lon, height, _end );
					this._addLine( _start, _end, color );

				}

			}

		}

		for ( const lat of [ latStart, latEnd ] ) {

			for ( const lon of [ lonStart, lonEnd ] ) {

				region.getCartographicToPosition( lat, lon, heightStart, _start );
				region.getCartographicToPosition( lat, lon, heightEnd, _end );
				this._addLine( _start, _end, color );

			}

		}

	}

}

function setCirclePoint( center, radius, axis, angle, target ) {

	const c = Math.cos( angle ) * radius;
	const s = Math.sin( angle ) * radius;
	switch ( axis ) {

		case 0: return target.set( center.x, center.y + c, center.z + s );
		case 1: return target.set( center.x + c, center.y, center.z + s );
		default: return target.set( center.x + c, center.y + s, center.z );

	}

}

function hslToRgb( h, s, l ) {

	const a = s * Math.min( l, 1 - l );
	const channel = n => {

		const k = ( n + h * 12 ) % 12;
		return l - a * Math.max( - 1, Math.min( k - 3, 9 - k, 1 ) );

	};

	return [ channel( 0 ), channel( 8 ), channel( 4 ) ];

}
