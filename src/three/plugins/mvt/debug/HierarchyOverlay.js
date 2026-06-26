import { Group } from 'three';
import { EllipsoidRegion } from '3d-tiles-renderer/three';
import { EllipsoidRegionHelper, EllipsoidRegionLineHelper } from '../../objects/EllipsoidRegionHelper.js';
import { ColorManager } from './ColorManager.js';

const ColorMode = {
	NONE: 0,
	LEVEL: 1,
	TILE: 2,
};

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

				const { ellipsoid, group } = this.tiles;
				const [ minLon, minLat, maxLon, maxLat ] = this.tiling.getTileBounds( x, y, level, false, false );

				const region = new EllipsoidRegion( ...ellipsoid.radius, minLat, maxLat, minLon, maxLon, 600, 700 );
				const lineHelper = new EllipsoidRegionLineHelper( region );
				lineHelper.material.depthWrite = false;
				lineHelper.material.depthTest = false;
				lineHelper.material.transparent = true;

				const meshHelper = new EllipsoidRegionHelper( region );
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
