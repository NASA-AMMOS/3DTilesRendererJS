import {
	Raycaster,
	Matrix4,
	EventDispatcher,
	Vector3,
	Ray,
	Line3,
	Vector2,
} from 'three';
import { SceneObserver } from './SceneObserver.js';
import { Ellipsoid } from '../../three/math/Ellipsoid.js';

const _raycaster = /* @__PURE__ */ new Raycaster();
const _line0 = /* @__PURE__ */ new Line3();
const _line1 = /* @__PURE__ */ new Line3();
const _params = /* @__PURE__ */ new Vector2();
const _direction = /* @__PURE__ */ new Vector3();
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

						this.queryMap.forEach( item => this._enqueue( item ) );
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

		const { queued, cameras, duration } = this;
		const start = performance.now();

		// Iterate over all cameras
		cameras.forEach( camera => {

			_direction.set( 0, 0, - 1 ).transformDirection( camera.matrixWorld );

			_line0.start.setFromMatrixPosition( camera.matrixWorld );
			_line0.end.addVectors( _direction, _line0.start );

			for ( let i = 0, l = queued.length; i < l; i ++ ) {

				const info = queued[ i ];
				const { ray } = info;

				// find the distance between camera ray and projection ray
				_line1.start.copy( ray.origin );
				ray.at( 1, _line1.end );
				closestPointLineToLine( _line0, _line1, _params );

				// save the values for sorting
				// prioritize displaying points that are from rays pointing in the same direction as
				// the camera.
				// TODO: might be better to rely on the previous hit point for an update to determine update order
				info.distance = _params.x * ( 1.0 - Math.abs( _direction.dot( ray.direction ) ) );

			}

		} );

		// sort the items if necessary
		if ( cameras.length !== 0 ) {

			queued.sort( ( a, b ) => b.distance - a.distance );

		}

		// update all the positions
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

		_raycaster.ray.copy( item.ray );
		_raycaster.far = 'lat' in item ? 1e4 + Math.max( ...this.ellipsoid.radius ) : Infinity;
		item.callback( _raycaster.intersectObjects( this.objects )[ 0 ] || null );

	}

	// add and remove cameras used for sorting
	addCamera( camera ) {

		const { queryMap, cameras } = this;
		cameras.add( camera );
		queryMap.forEach( o => this._enqueue( o ) );

	}

	deleteCamera( camera ) {

		const { cameras } = this;
		cameras.delete( camera );

	}

	// run the given item index if possible
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

	// update the ellipsoid and frame based on a tiles renderer, updating the item rays only if necessary
	setEllipsoidFromTilesRenderer( tilesRenderer ) {

		const { queryMap, ellipsoid, frame } = this;
		if (
			! ellipsoid.radius.equals( tilesRenderer.ellipsoid.radius ) ||
			! frame.equals( tilesRenderer.group.matrixWorld )
		) {

			ellipsoid.copy( tilesRenderer.ellipsoid );
			frame.copy( tilesRenderer.group.matrixWorld );

			// update the query rays for any item specified via lat / lon
			queryMap.forEach( o => {

				if ( 'lat' in o ) {

					const { lat, lon, ray } = o;
					ellipsoid.getCartographicToPosition( lat, lon, 1e4, ray.origin ).applyMatrix4( frame );
					ellipsoid.getCartographicToNormal( lat, lon, ray.direction ).transformDirection( frame ).multiplyScalar( - 1 );

				}

				this._enqueue( o );

			} );


		}

	}

	// register query callbacks
	registerRayQuery( ray, callback ) {

		const index = this.index ++;
		const item = {
			ray: ray.clone(),
			callback,
			queued: false,
			distance: - 1,
		};

		this.queryMap.set( index, item );
		this._enqueue( item );
		return index;

	}

	registerLatLonQuery( lat, lon, callback ) {

		const { ellipsoid, frame } = this;
		const index = this.index ++;

		const ray = new Ray();
		ellipsoid.getCartographicToPosition( lat, lon, 1e4, ray.origin ).applyMatrix4( frame );
		ellipsoid.getCartographicToNormal( lat, lon, ray.direction ).transformDirection( frame ).multiplyScalar( - 1 );

		const item = {
			ray: ray.clone(),
			lat, lon,
			callback,
			queued: false,
			distance: - 1,
		};

		this.queryMap.set( index, item );
		this._enqueue( item );
		return index;

	}

	unregisterQuery( index ) {

		const { queued, queryMap } = this;
		const item = queryMap.get( index );
		if ( item && item.queued ) {

			item.queued = false;
			queued.splice( queued.indexOf( item ), 1 );

		}

	}

	// dispose of everything
	dispose() {

		this.queryMap.clear();
		this.queued.length = 0;
		this.objects.length = 0;
		this.observer.dispose();

	}

}

// copied from three-mesh-bvh
const closestPointLineToLine = ( function () {

	// https://github.com/juj/MathGeoLib/blob/master/src/Geometry/Line.cpp#L56
	const dir1 = new Vector3();
	const dir2 = new Vector3();
	const v02 = new Vector3();
	return function closestPointLineToLine( l1, l2, result ) {

		const v0 = l1.start;
		const v10 = dir1;
		const v2 = l2.start;
		const v32 = dir2;

		v02.subVectors( v0, v2 );
		dir1.subVectors( l1.end, l1.start );
		dir2.subVectors( l2.end, l2.start );

		// float d0232 = v02.Dot(v32);
		const d0232 = v02.dot( v32 );

		// float d3210 = v32.Dot(v10);
		const d3210 = v32.dot( v10 );

		// float d3232 = v32.Dot(v32);
		const d3232 = v32.dot( v32 );

		// float d0210 = v02.Dot(v10);
		const d0210 = v02.dot( v10 );

		// float d1010 = v10.Dot(v10);
		const d1010 = v10.dot( v10 );

		// float denom = d1010*d3232 - d3210*d3210;
		const denom = d1010 * d3232 - d3210 * d3210;

		let d, d2;
		if ( denom !== 0 ) {

			d = ( d0232 * d3210 - d0210 * d3232 ) / denom;

		} else {

			d = 0;

		}

		d2 = ( d0232 + d * d3210 ) / d3232; // eslint-disable-line

		result.x = d;
		result.y = d2;

	};

} )();
