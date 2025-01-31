import {
	Ray,
	Raycaster,
	Matrix4,
	EventDispatcher,
} from 'three';
import { SceneObserver } from './SceneObserver.js';
import { Ellipsoid } from '../../src/three/math/Ellipsoid.js';

const _ray = /* @__PURE__ */ new Ray();
const _raycaster = /* @__PURE__ */ new Raycaster();
export class QueryManager extends EventDispatcher {

	constructor() {

		super();

		// settings
		this.autoRun = true;

		// queries
		this.queryMap = new Map();
		this.index = 0;

		// jobs
		this.queued = new Set();
		this.scheduled = false;
		this.duration = 1;

		// scene
		this.objects = [];
		this.observer = new SceneObserver();
		this.ellipsoid = new Ellipsoid();
		this.frame = new Matrix4();

		// register to mark items as dirty
		const queueAll = ( () => {

			let queued = false;
			return () => {

				if ( ! queued ) {

					queued = true;
					queueMicrotask( () => {

						this.queryMap.forEach( q => this._enqueue( q ) );

						queued = false;

					} );

				}

			};

		} )();

		this.observer.addEventListener( 'childadded', queueAll );
		this.observer.addEventListener( 'childremoved', queueAll );

	}

	// job runner
	_enqueue( info ) {

		this.queued.add( info );
		this._scheduleRun();

	}

	_runJobs() {

		const { queued, duration } = this;
		const start = performance.now();
		for ( const item in queued ) {

			if ( queued.size === 0 || performance.now() - start > duration ) {

				return;

			}

			queued.delete( item );
			this._updateQuery( item );

		}

		if ( queued.size !== 0 ) {

			this._scheduleRun();

		}

	}

	_scheduleRun() {

		if ( this.autoRun && ! this.scheduled ) {

			this.scheduled = true;
			requestAnimationFrame( () => {

				this.scheduled = false;
				this._runJobs();

			} );

		}

	}

	_updateQuery( item ) {

		const { queued, ellipsoid, frame } = this;

		let ray;
		if ( item.ray ) {

			ray = item.ray;

		} else {

			const { lat, lon } = item;
			ellipsoid.getCartographicToPosition( lat, lon, 1e3, _ray.origin ).applyMatrix4( frame );
			ellipsoid.getCartographicToNormal( lat, lon, _ray.direction ).transformDirection( frame );

		}

		_raycaster.ray.copy( ray );
		item.callback( _raycaster.intersectObjects( this.objects )[ 0 ] || null );
		queued.delete( item );


	}

	runIfNeeded( index ) {

		const { queued } = this;
		const item = this.queryMap.get( index );
		if ( queued.has( item ) ) {

			this._updateQuery( item );

		}

	}

	// set the scene used for query
	setScene( ...objects ) {

		const { observer } = this;
		observer.dispose();
		objects.forEach( o => observer.observe( o ) );
		this.objects = objects;

	}

	// register query callbacks
	registerRayQuery( ray, callback ) {

		const index = this.index ++;
		const item = {
			ray: ray.clone(),
			callback,
		};

		this.queryMap.set( index, item );
		return index;

	}

	registerLatLonQuery( lat, lon, callback ) {

		const index = this.index ++;
		const item = {
			lat, lon,
			callback,
		};

		this.queryMap.set( index, item );
		return index;

	}

	unregisterQuery( index ) {

		const { queued, queryMap } = this;
		const item = queryMap.get( index );
		queued.delete( item );

	}

	// dispose of everything
	dispose() {

		this.queryMap.clear();
		this.queued.clear();
		this.objects.length = 0;
		this.observer.dispose();

	}

}
