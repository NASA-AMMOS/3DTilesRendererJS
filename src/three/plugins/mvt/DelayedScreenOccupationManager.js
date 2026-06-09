import { EventDispatcher } from 'three';
import { ScreenOccupationManager } from './ScreenOccupationManager.js';

// Version of the screen occupation manager that delays event firing to
// prevent flickering
export class DelayedScreenOccupationManager extends EventDispatcher {

	// pass through fields
	get camera() {

		return this.manager.camera;

	}

	set camera( v ) {

		this.manager.camera = v;

	}

	get matrix() {

		return this.manager.matrix;

	}

	get resolution() {

		return this.manager.resolution;

	}

	get size() {

		return this.manager.size;

	}

	set size( v ) {

		this.manager.size = v;

	}

	get cells() {

		return this.manager.cells;

	}

	get hasPendingWork() {

		return this._showTimers.size > 0 || this._hideTimers.size > 0;

	}

	get sortCallback() {

		return this.manager.sortCallback;

	}

	set sortCallback( v ) {

		this.manager.sortCallback = v;

	}

	get buffer() {

		return this.manager.buffer;

	}

	set buffer( v ) {

		this.manager.buffer = v;

	}

	constructor() {

		super();

		this.manager = new ScreenOccupationManager();

		this.visible = new Set();
		this.showDelay = 0.5;
		this.hideDelay = 0.5;

		// item -> timer
		this._showTimers = new Map();
		this._hideTimers = new Map();
		this._lastUpdateTime = - 1;

		this.added = new Set();
		this.removed = new Set();

		this.manager.addEventListener( 'change', ( { added, removed } ) => {

			const { _showTimers, _hideTimers, visible } = this;

			// mark timers to visibility
			for ( const item of added ) {

				_hideTimers.delete( item );
				if ( ! visible.has( item ) ) {

					_showTimers.set( item, 0 );

				}

			}

			// mark timers to hidden
			for ( const item of removed ) {

				_showTimers.delete( item );
				if ( visible.has( item ) ) {

					_hideTimers.set( item, 0 );

				}

			}

		} );

	}

	// pass through to the underlying occupation manager
	getById( id ) {

		return this.manager.getById( id );

	}

	register( item ) {

		return this.manager.register( item );

	}

	unregister( item ) {

		this.manager.unregister( item );

	}

	syncItems() {

		this.manager.syncItems();

	}

	update() {

		const now = performance.now() / 1000;
		const dt = this._lastUpdateTime < 0 ? 0 : Math.min( now - this._lastUpdateTime, 0.1 );
		this._lastUpdateTime = now;

		// fires 'changed' synchronously, populating the timers
		this.manager.update();

		const {
			_showTimers,
			_hideTimers,
			visible,
			added,
			removed,
			showDelay,
			hideDelay,
		} = this;

		added.clear();
		removed.clear();

		// increment the timers for added items
		const currTime = performance.now();
		for ( const [ item, elapsed ] of _showTimers ) {

			const next = elapsed + dt;
			if ( next >= showDelay ) {

				_showTimers.delete( item );
				visible.add( item );
				added.add( item );
				item.visibleTime = currTime;

			} else {

				_showTimers.set( item, next );

			}

		}

		// increment the timers for removed items
		for ( const [ item, elapsed ] of _hideTimers ) {

			const next = elapsed + dt;
			if ( next >= hideDelay ) {

				_hideTimers.delete( item );
				visible.delete( item );
				removed.add( item );

			} else {

				_hideTimers.set( item, next );

			}

		}

		for ( const item of visible.values() ) {

			item.visibleDuration = currTime - item.visibleTime;

		}

		if ( added.size > 0 || removed.size > 0 ) {

			this.dispatchEvent( { type: 'change', added, removed } );

		}

	}

}
