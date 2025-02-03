import {
	Raycaster,
	Matrix4,
	EventDispatcher,
} from 'three';
import { SceneObserver } from './SceneObserver.js';
import { Ellipsoid } from '../../three/math/Ellipsoid.js';

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
		this.queued = [];
		this.scheduled = false;
		this.duration = 1;

		// scene
		this.objects = [];
		this.observer = new SceneObserver();
		this.ellipsoid = new Ellipsoid();
		this.frame = new Matrix4();

		// cameras for sorting
		this.cameras = new Set();

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

		if ( ! info.queued ) {

			this.queued.push( info );
			info.queued = true;
			this._scheduleRun();

		}

	}

	_runJobs() {

		const { queued, duration } = this;
		const start = performance.now();
		while ( queued.length !== 0 && performance.now() - start < duration ) {

			const item = queued.pop();
			item.queued = false;
			this._updateQuery( item );

		}

		if ( queued.length !== 0 ) {

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

		const { ellipsoid, frame } = this;

		if ( item.ray ) {

			_raycaster.ray.copy( item.ray );

		} else {

			const { lat, lon } = item;
			const ray = _raycaster.ray;
			ellipsoid.getCartographicToPosition( lat, lon, 1e4, ray.origin ).applyMatrix4( frame );
			ellipsoid.getCartographicToNormal( lat, lon, ray.direction ).transformDirection( frame ).multiplyScalar( - 1 );

		}

		item.callback( _raycaster.intersectObjects( this.objects )[ 0 ] || null );

	}

	addCamera( camera ) {

		const { queryMap, cameras } = this;
		cameras.add( camera );
		queryMap.forEach( o => this._enqueue( o ) );

	}

	deleteCamera( camera ) {

		const { cameras } = this;
		cameras.delete( camera );

	}

	runIfNeeded( index ) {

		const { queryMap, queued } = this;
		const item = queryMap.get( index );
		if ( item.queued ) {

			this._updateQuery( item );
			item.queued = false;
			queued.splice( queued.indexOf( item ), 1 );

		}

	}

	// set the scene used for query
	setScene( ...objects ) {

		const { observer } = this;
		observer.dispose();
		objects.forEach( o => observer.observe( o ) );
		this.objects = objects;
		this._scheduleRun();

	}

	setEllipsoidFromTilesRenderer( tilesRenderer ) {

		const { queryMap, ellipsoid, frame } = this;
		if (
			! ellipsoid.radius.equals( tilesRenderer.ellipsoid.radius ) ||
			! frame.equals( tilesRenderer.group.matrixWorld )
		) {

			ellipsoid.copy( tilesRenderer.ellipsoid );
			frame.copy( tilesRenderer.group.matrixWorld );
			queryMap.forEach( o => this._enqueue( o ) );

		}

	}

	// register query callbacks
	registerRayQuery( ray, callback ) {

		const index = this.index ++;
		const item = {
			ray: ray.clone(),
			callback,
			queued: false,
		};

		this.queryMap.set( index, item );
		this._enqueue( item );
		return index;

	}

	registerLatLonQuery( lat, lon, callback ) {

		const index = this.index ++;
		const item = {
			lat, lon,
			callback,
			queued: false,
		};

		this.queryMap.set( index, item );
		this._enqueue( item );
		return index;

	}

	unregisterQuery( index ) {

		const { queued, queryMap } = this;
		const item = queryMap.get( index );
		if ( item.queued ) {

			item.queued = false;
			queued.splice( queued.indexOf( item ), 1 );

		}

	}

	// dispose of everything
	dispose() {

		this.queryMap.clear();
		this.queued.length = 0
		this.objects.length = 0;
		this.observer.dispose();

	}

}
