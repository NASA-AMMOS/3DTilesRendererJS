import { Group, Box3, Box3Helper, BoxGeometry, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import { EllipsoidRegion } from '3d-tiles-renderer/three';
import { EllipsoidRegionHelper, EllipsoidRegionLineHelper } from '../../objects/EllipsoidRegionHelper.js';
import { ColorManager } from './ColorManager.js';

const ColorMode = {
	NONE: 0,
	LEVEL: 1,
	TILE: 2,
};

// height range of the displayed region volumes in meters on the earth ellipsoid, where the
// band is placed near the typical terrain height so it hugs the surface
const REGION_MIN_HEIGHT = 600;
const REGION_MAX_HEIGHT = 700;

// height range used on flattened surfaces where the ground sits exactly at zero
const PLANAR_REGION_MIN_HEIGHT = 10;
const PLANAR_REGION_MAX_HEIGHT = 50;

const _min = /* @__PURE__ */ new Vector3();
const _max = /* @__PURE__ */ new Vector3();
const _box = /* @__PURE__ */ new Box3();

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

				const { ellipsoid, surface, group } = this.tiles;
				const [ minLon, minLat, maxLon, maxLat ] = this.tiling.getTileBounds( x, y, level, false, false );

				let lineHelper, meshHelper;
				if ( surface.isProjectedSurface ) {

					// the tile bounds form an axis-aligned box on a flattened surface, with the
					// display heights scaled from meters to the world size of the plane
					const heightScale = surface.scale.x / ( 2 * Math.PI * ellipsoid.radius.x );
					surface.getCartographicToPosition( minLat, minLon, PLANAR_REGION_MIN_HEIGHT * heightScale, _min );
					surface.getCartographicToPosition( maxLat, maxLon, PLANAR_REGION_MAX_HEIGHT * heightScale, _max );
					_box.makeEmpty();
					_box.expandByPoint( _min );
					_box.expandByPoint( _max );

					lineHelper = new Box3Helper( _box.clone() );
					lineHelper.material.depthWrite = false;
					lineHelper.material.depthTest = false;
					lineHelper.material.transparent = true;

					meshHelper = new Mesh(
						new BoxGeometry( ..._box.getSize( _min ).toArray() ),
						new MeshBasicMaterial( { transparent: true, opacity: 0.1, depthWrite: false } ),
					);
					_box.getCenter( meshHelper.position );
					meshHelper.dispose = () => {

						meshHelper.geometry.dispose();
						meshHelper.material.dispose();

					};

				} else {

					const region = new EllipsoidRegion( ...ellipsoid.radius, minLat, maxLat, minLon, maxLon, REGION_MIN_HEIGHT, REGION_MAX_HEIGHT );
					lineHelper = new EllipsoidRegionLineHelper( region );
					lineHelper.material.depthWrite = false;
					lineHelper.material.depthTest = false;
					lineHelper.material.transparent = true;

					meshHelper = new EllipsoidRegionHelper( region );
					meshHelper.material.transparent = true;
					meshHelper.material.opacity = 0.1;
					meshHelper.material.depthWrite = false;

				}

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
