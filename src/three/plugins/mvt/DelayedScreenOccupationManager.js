import { EventDispatcher } from 'three';
import { ScreenOccupationManager } from './ScreenOccupationManager.js';

export class DelayedScreenOccupationManager extends EventDispatcher {

	get camera() {

		return this._inner.camera;

	}

	set camera( v ) {

		this._inner.camera = v;

	}

	get matrix() {

		return this._inner.matrix;

	}

	get resolution() {

		return this._inner.resolution;

	}

	get size() {

		return this._inner.size;

	}

	set size( v ) {

		this._inner.size = v;

	}

	get cells() {

		return this._inner.cells;

	}

	getById( id ) {

		return this._inner.getById( id );

	}

	get sortCallback() {

		return this._inner.sortCallback;

	}

	set sortCallback( v ) {

		this._inner.sortCallback = v;

	}

	get buffer() {

		return this._inner.buffer;

	}

	set buffer( v ) {

		this._inner.buffer = v;

	}

	constructor() {

		super();

		this._inner = new ScreenOccupationManager();

		this.visible = new Set();
		this.showDelay = 0.5;
		this.hideDelay = 0.5;

		// item -> timer
		this._showTimers = new Map();
		this._hideTimers = new Map();
		this._lastUpdateTime = - 1;

		this.added = new Set();
		this.removed = new Set();

		this._inner.addEventListener( 'added', ( { items } ) => {

			const { _showTimers, _hideTimers, visible } = this;
			for ( const item of items ) {

				_hideTimers.delete( item );
				if ( ! visible.has( item ) ) {

					_showTimers.set( item, 0 );

				}

			}

		} );

		this._inner.addEventListener( 'removed', ( { items } ) => {

			const { _showTimers, _hideTimers, visible } = this;
			for ( const item of items ) {

				_showTimers.delete( item );
				if ( visible.has( item ) ) {

					_hideTimers.set( item, 0 );

				}

			}

		} );

	}

	register( item ) {

		return this._inner.register( item );

	}

	unregister( item ) {

		this._inner.unregister( item );

	}

	update() {

		const now = performance.now() / 1000;
		const dt = this._lastUpdateTime < 0 ? 0 : Math.min( now - this._lastUpdateTime, 0.1 );
		this._lastUpdateTime = now;

		// fires 'added'/'removed' synchronously, populating the timers
		this._inner.update();

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

		for ( const [ item, elapsed ] of _showTimers ) {

			const next = elapsed + dt;
			if ( next >= showDelay ) {

				_showTimers.delete( item );
				visible.add( item );
				added.add( item );

			} else {

				_showTimers.set( item, next );

			}

		}

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

		if ( added.size > 0 || removed.size > 0 ) {

			this.dispatchEvent( { type: 'change', added, removed } );

		}

	}

}
