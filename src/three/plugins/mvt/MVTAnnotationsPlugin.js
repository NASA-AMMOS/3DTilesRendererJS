import { Group, Matrix4 } from 'three';
import { HierarchicalLock } from './HierarchicalLock.js';
import { ScreenOccupationManager } from './ScreenOccupationManager.js';
import { getMeshesCartographicRange } from '../images/overlays/utils.js';

// TODO:
// - allow for blocking tile loads optionally
// - "fetch data" override needs to be handled differently? Switch to default download
// queue / process queue, instead (generated surface has issue, too)

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

		this.tileInfo = new Map();

		// TODO: add "points" manager for icons
		// TODO: add "text" manager for text
		// TODO: add a "fade" manager for hiding an showing annotations

	}

	setCamera( camera ) {

		this.camera = camera;

	}

	init( tiles ) {

		const { locks, group, overlay, occupancy, tileInfo } = this;

		// init container
		this.tiles = tiles;
		tiles.group.add( group );

		this._onDownloadStart = () => {

			// TODO: use built-in region if available

		};

		// event callbacks
		this._onModelLoad = async ( { tile, scene } ) => {

			// TODO: move to "process model"

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
			const info = {
				range,
				loaded: false,
				disposed: false,
			};

			tileInfo.set( tile, info );

			let promises = [];

			// TODO: lock all related MVT sub tiles in a 2x2 pattern

			await Promise.all( promises );

			info.loaded = true;
			if ( info.disposed ) {

				return;

			}

			if ( tiles.visibleTiles.has( tile ) ) {

				// TODO: mark all tiles as "active" if visible in a 2x2 pattern

			}


			//


			// TODO: lock necessary sub MVT tile content on load to prepare
			// - do not delay tiles
			// - do not "lock" sub tile content until it's loaded
			// - what happens if only one of the sub tiles is loaded / locked? Display parent + children?

		};

		this._onModelDispose = ( { tile } ) => {

			const info = tileInfo.get( tile );
			const { range } = info;

			// TODO: unlock all MVT sub tiles in a 2x2 pattern

			tileInfo.delete( tile );
			info.disposed = true;

		};

		this._onVisibilityChange = ( { tile, visible } ) => {

			const { loaded, range } = tileInfo.get( tile );
			if ( loaded ) {

				// TODO: mark all tiles as "active" if visible in a 2x2 pattern
				if ( visible ) {

					// locks.markActive( x, y, l );

				} else {

					// locks.markInactive( x, y, l );

				}


			}

		};

		this._onUpdateAfter = () => {

			// update visible text, points based on screen space conflicts
			occupancy.update();

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
		tiles.addEventListener( 'load-model', this._onModelLoad );
		tiles.addEventListener( 'dispose-model', this._onModelDispose );

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
		this.tiles.removeEventListener( 'load-model', this._onModelLoad );
		this.tiles.removeEventListener( 'dispose-model', this._onModelDispose );

		this.tiles.forEachLoadedModel( ( scene, tile ) => {

			this._onVisibilityChange( { scene, tile, visible: false } );

		} );

	}

	async processTileModel( scene, tile ) {

		// TODO: await content

	}

}
