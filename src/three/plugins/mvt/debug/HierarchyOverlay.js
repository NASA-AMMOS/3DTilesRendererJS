import { Group } from 'three';
import { EllipsoidRegionHelper, EllipsoidRegionLineHelper } from '../../objects/EllipsoidRegionHelper.js';
import { ColorManager } from './ColorManager.js';

const ColorMode = {
	NONE: 0,
	LEVEL: 1,
	TILE: 2,
};

// height range of the displayed region volumes in meters, placed near typical terrain height
const REGION_MIN_HEIGHT = 600;
const REGION_MAX_HEIGHT = 700;

// height range in meters used on flattened surfaces where the ground sits exactly at zero
const PLANAR_REGION_MIN_HEIGHT = 10;
const PLANAR_REGION_MAX_HEIGHT = 50;

export class HierarchyOverlay {

	get ColorMode() {

		return ColorMode;

	}

	constructor() {

		this.enabled = false;
		this._wasEnabled = false;
		this.hierarchy = null;
		this.tiles = null;
		this.tiling = null;
		this.colorMode = ColorMode.NONE;

		this._regions = {};
		this._onToggleCallback = ( { x, y, level, visible } ) => {

			const key = `${ x }_${ y }_${ level }`;
			if ( visible ) {

				const { tiles, tiling } = this;
				const { surface, group } = tiles;
				const [ minLon, minLat, maxLon, maxLat ] = tiling.getTileBounds( x, y, level, false, false );

				// scale the meter heights into world units on a flattened surface
				const heightScale = surface.isEllipsoid ? 1 : surface.scale.x / ( 2 * Math.PI * tiles.ellipsoid.radius.x );

				// TODO: it may be better to implement a true helper class for this later.
				// region-like adapter so the helpers generate the volume through the surface
				const region = {
					latStart: minLat, latEnd: maxLat,
					lonStart: minLon, lonEnd: maxLon,
					heightStart: ( surface.isEllipsoid ? REGION_MIN_HEIGHT : PLANAR_REGION_MIN_HEIGHT ) * heightScale,
					heightEnd: ( surface.isEllipsoid ? REGION_MAX_HEIGHT : PLANAR_REGION_MAX_HEIGHT ) * heightScale,
					getCartographicToPosition: ( lat, lon, height, target ) => surface.getCartographicToPosition( lat, lon, height, target ),
					getCartographicToNormal: ( lat, lon, target ) => surface.getCartographicToNormal( lat, lon, target ),
				};

				const lineHelper = new EllipsoidRegionLineHelper( region );
				const meshHelper = new EllipsoidRegionHelper( region );

				lineHelper.material.depthWrite = false;
				lineHelper.material.depthTest = false;
				lineHelper.material.transparent = true;

				meshHelper.material.transparent = true;
				meshHelper.material.opacity = 0.1;
				meshHelper.material.depthWrite = false;

				const groupHelper = new Group();
				groupHelper.add( lineHelper, meshHelper );
				group.add( groupHelper );

				groupHelper.updateMatrixWorld( true );
				this._regions[ key ] = {
					helper: groupHelper,
					x, y, level,
				};

			} else {

				const { helper } = this._regions[ key ];
				helper.children.forEach( c => c.dispose() );
				helper.removeFromParent();
				delete this._regions[ key ];

			}

		};

	}

	update() {

		const { enabled, hierarchy, _regions } = this;
		if ( enabled !== this._wasEnabled ) {

			this._wasEnabled = enabled;

			if ( enabled ) {

				hierarchy.getVisibleTiles().forEach( tile => {

					this._onToggleCallback( tile );

				} );

				hierarchy.addEventListener( 'toggle', this._onToggleCallback );

			} else {

				this.dispose();

			}

		}

		if ( enabled ) {

			for ( const key in _regions ) {

				const { x, y, level, helper } = _regions[ key ];
				helper.children.forEach( child => {

					const { color } = child.material;
					switch ( this.colorMode ) {

						case ColorMode.NONE:
							color.set( 0xffffff );
							break;

						case ColorMode.LEVEL:
							ColorManager.getColor( level, color );
							break;

						case ColorMode.TILE:
							ColorManager.getColor( x, y, level, color );
							break;

					}

				} );

			}

		}

	}

	dispose() {

		const { hierarchy } = this;
		hierarchy.getVisibleTiles().forEach( tile => {

			this._onToggleCallback( { ...tile, visible: false } );

		} );

		hierarchy.removeEventListener( 'toggle', this._onToggleCallback );

	}

}
