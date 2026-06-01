import { Group } from 'three';
import { HierarchicalLock } from './HierarchicalLock.js';
import { ScreenOccupationManager } from './ScreenOccupationManager.js';

export class MVTAnnotationsPlugin {

	constructor( options = {} ) {

		const {
			overlay,
			camera = null,
			scene = null,
		} = options;

		this.overlay = overlay;
		this.locks = new HierarchicalLock();
		this.occupancy = new ScreenOccupationManager();
		this.scene = scene;
		this.camera = camera;
		this.group = new Group();

		// TODO: add "points" manager for icons
		// TODO: add "text" manager for text
		// TODO: add "collision" manager for screen space organization
		// TODO: add a "fade" manager for hiding an showing annotations

	}

	setCamera( camera ) {

		this.camera = camera;
		// TODO

	}

	init( tiles ) {

		const { locks, group, overlay } = this;
		this.tiles = tiles;
		tiles.group.add( group );

		this._onUpdateAfter = () => {

			// TODO: update visible text, points based on screen space conflicts.

		};

		// TODO: calculate "visible" regions and "lock" them on the overlay, similar to
		// the image overlay plugin.

		// TODO: register for region visibility toggle events for the overlay, locking and
		// unlocking sub tiles associated with those regions

		locks.addEventListener( 'toggle', ( { x, y, level, active } ) => {

			// TODO: add / remove items from the group or associated managers, "settling"
			// them as they are added

		} );

		tiles.addEventListener( 'after-update', this._onUpdateAfter );

	}

	dispose() {

		this.group.removeFromParent();
		this.tiles.removeEventListener( 'after-update', this._onUpdateAfter );

	}

}
