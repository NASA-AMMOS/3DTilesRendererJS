import { Group, Matrix4 } from 'three';
import { HierarchicalLock } from './HierarchicalLock.js';
import { ScreenOccupationManager } from './ScreenOccupationManager.js';
import { getMeshesCartographicRange } from '../images/overlays/utils.js';

const _matrix = /* @__PURE__ */ new Matrix4();
export class MVTAnnotationsPlugin {

	get camera() {

		return this.occupancy.camera;

	}

	set camera( v ) {

		this.occupancy.camera = v;

	}

	constructor( options = {} ) {

		this.priority = Infinity;
		this.name = 'MVT_ANNOTATIONS_PLUGIN';

		const {
			overlay,
			camera = null,
			scene = null,
		} = options;

		this.overlay = overlay;

		this.locks = new HierarchicalLock();
		this.occupancy = new ScreenOccupationManager();
		this.group = new Group();

		this.scene = scene;
		this.camera = camera;

		// TODO: add "points" manager for icons
		// TODO: add "text" manager for text
		// TODO: add a "fade" manager for hiding an showing annotations

	}

	setCamera( camera ) {

		this.camera = camera;

	}

	init( tiles ) {

		const { locks, group, overlay, occupancy } = this;

		// init container
		this.tiles = tiles;
		tiles.group.add( group );

		// event callbacks
		this._onVisibilityChange = ( { scene, visible } ) => {

			// TODO: this currently only work with ellipsoidal projection
			let meshes = [];
			scene.updateMatrixWorld();
			scene.traverse( c => {

				if ( c.isMesh ) {

					meshes.push( c );

				}

			} );

			_matrix.identity();
			if ( scene.parent !== null ) {

				_matrix.copy( tiles.group.matrixWorldInverse );

			}

			// TODO: why are we passing range vs region here?
			const { range } = getMeshesCartographicRange( meshes, tiles.ellipsoid, _matrix, overlay.projection );
			overlay.setRegionVisible( range, visible );

			// TODO: lock necessary sub MVT tile content on load to prepare
			// - do not delay tiles
			// - do not "lock" sub tile content until it's loaded
			// - what happens if only one of the sub tiles is loaded / locked? Display parent + children?

		};

		this._onUpdateAfter = () => {

			// update visible text, points based on screen space conflicts
			occupancy.update();

		};

		this._onRegionChange = ( { range, visible } ) => {

			// TODO: iterate over tiles within region, mark locks

			if ( visible ) {

				// locks.lock( x, y, l );

			} else {

				// locks.unlock( x, y, l );

			}

		};

		this._onLockToggle = ( { x, y, level, active } ) => {

			// TODO:
			// - retrieve the associated tile annotations
			// - add / remove items from the group or associated managers, "settling"
			// them as they are added

		};

		// register events
		locks.addEventListener( 'toggle', this._onLockToggle );
		tiles.addEventListener( 'after-update', this._onUpdateAfter );
		tiles.addEventListener( 'tile-visibility-change', this._onVisibilityChange );
		overlay.addEventListener( 'region-visibility-change', this._onRegionChange );

		//

		// late initialization
		tiles.forEachLoadedModel( ( scene, tile ) => {

			this._onVisibilityChange( { scene, tile, visible: true } );

		} );

	}

	dispose() {

		this.group.removeFromParent();
		this.locks.removeEventListener( 'toggle', this._onLockToggle );
		this.tiles.removeEventListener( 'after-update', this._onUpdateAfter );
		this.tiles.removeEventListener( 'tile-visibility-change', this._onVisibilityChange );
		this.overlay.removeEventListener( 'region-visibility-change', this._onRegionChange );

		this.tiles.forEachLoadedModel( ( scene, tile ) => {

			this._onVisibilityChange( { scene, tile, visible: false } );

		} );

	}

}
