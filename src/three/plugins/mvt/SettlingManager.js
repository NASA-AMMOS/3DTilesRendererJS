/** @import { Camera } from 'three'; */
import { Frustum, Matrix4, Raycaster } from 'three';
import { LineAnnotation } from './annotations/LineAnnotation.js';

const PARALLEL_EPSILON = 1e-10;

const _raycaster = /* @__PURE__ */ new Raycaster();

// check if the given raycaster intersects the provided frustum shape
function rayIntersectsFrustum( raycaster, frustum ) {

	// TODO: this function has some false positives and could be improved
	const { ray } = raycaster;
	const { planes } = frustum;
	let t0 = 0;
	let t1 = raycaster.far;

	for ( let i = 0; i < 6; i ++ ) {

		const plane = planes[ i ];

		// positive plane normal points _inside_ the frustum
		const denom = plane.normal.dot( ray.direction );

		if ( Math.abs( denom ) < PARALLEL_EPSILON ) {

			// parallel to the plane — if origin is outside, the ray never enters
			if ( plane.distanceToPoint( ray.origin ) < 0 ) {

				return false;

			}

		} else {

			const t = ray.distanceToPlane( plane );
			if ( denom > 0 ) {

				// entering plane: null means entry is behind the ray origin, no constraint
				if ( t !== null && t > t0 ) {

					t0 = t;

				}

			} else {

				// exiting plane: null means we already exited before the ray origin
				if ( t === null ) {

					return false;

				}

				if ( t < t1 ) {

					t1 = t;

				}

			}

			if ( t0 > t1 ) {

				return false;

			}

		}

	}

	return true;

}

/**
 * Owns the raycast "settling" of annotation items onto the 3D tile surface. Items are
 * registered (ref-counted, so an item referenced by multiple tiles stays settled until
 * its last reference is removed) and progressively raycast within a per-tick time budget,
 * prioritizing on-screen items.
 * @param {Object} [options={}]
 * @param {Object} [options.tiles=null] - The TilesRenderer; supplies the ellipsoid and group.
 * @param {Camera} [options.camera=null] - Camera used to prioritize on-screen items.
 * @param {number} [options.maxSettleTimeMs=5] - Per-tick raycast time budget.
 * @param {( item: Object ) => boolean} [options.isPrioritized] - Predicate marking items that
 *   should be settled first regardless of frustum ( e.g. already displayed ).
 */
export class SettlingManager {

	get hasPendingWork() {

		return this._queue.size > 0;

	}

	constructor( options = {} ) {

		const {
			tiles = null,
			camera = null,
			maxSettleTimeMs = 5,
			isPrioritized = () => false,
		} = options;

		this.tiles = tiles;
		this.camera = camera;
		this.maxSettleTimeMs = maxSettleTimeMs;
		this._isPrioritized = isPrioritized;

		// item to reference count
		this._refs = new Map();

		// items awaiting resettling
		this._queue = new Set();

		this._needsRebuild = false;
		this._task = null;

		// shared per-tick budget deadline
		this._deadline = 0;

	}

	getItems() {

		return Array.from( this._refs.keys() );

	}

	register( item ) {

		// ref-counted: the same item may be registered by multiple tiles
		const count = this._refs.get( item ) ?? 0;
		this._refs.set( item, count + 1 );
		this._queue.add( item );

	}

	unregister( item ) {

		// drop the reference; the item is only fully removed once no tile wants it
		const count = this._refs.get( item ) ?? 0;
		if ( count <= 1 ) {

			this._refs.delete( item );
			this._queue.delete( item );

		} else {

			this._refs.set( item, count - 1 );

		}

	}

	// flag every registered item for resettling ( e.g. when tile geometry changes )
	markDirty() {

		this._needsRebuild = true;

	}

	update() {

		// rebuild requeues everything that is still registered
		if ( this._needsRebuild ) {

			this._needsRebuild = false;
			for ( const item of this._refs.keys() ) {

				this._queue.add( item );

			}

		}

		// tick the forever-running settling task, giving it a fresh time budget
		if ( this._task === null ) {

			this._task = this._settleGenerator();

		}

		this._task.next();

	}

	_setSettlingRay( lat, lon ) {

		// construct a downward ray at the given cartographic point in the local tiles frame
		const { tiles } = this;
		const { origin, direction } = _raycaster.ray;

		tiles.ellipsoid.getCartographicToPosition( lat, lon, 1e8, origin );
		tiles.ellipsoid.getCartographicToPosition( lat, lon, 0, direction );
		direction.sub( origin ).normalize();

		_raycaster.far = 2 * 1e8;
		_raycaster.firstHitOnly = true;

	}

	_getLocalSettlingRay( item ) {

		// build the prioritization ray; a line uses its midpoint sample as a representative
		// TODO: add "settling" logic on the classes themselves?
		if ( item instanceof LineAnnotation ) {

			// TODO: this is a terrible way of determining the settling ray
			const mid = item.lat.length >> 1;
			this._setSettlingRay( item.lat[ mid ], item.lon[ mid ] );

		} else {

			this._setSettlingRay( item.lat, item.lon );

		}

	}

	*_settleGenerator() {

		// runs forever: each pass classifies, bins, and raycasts whatever is in the
		// queue when the pass begins, yielding whenever the per-tick budget is
		// spent. items added after a pass starts are picked up on the next pass.

		// per-generator scratch reused across passes. kept local ( rather than as
		// module temps ) because a pass can span multiple frames across yields, so
		// shared temps could be clobbered by another manager instance between ticks.
		const ndcMatrix = new Matrix4();
		const frustum = new Frustum();
		const intersectingFrustum = new Set();
		const settlingBins = [[], [], [], []];

		// the shared budget deadline is reset to a fresh window each time the pass resumes
		// after a yield.
		this._resetDeadline();

		while ( true ) {

			const { _queue, _refs, tiles, camera } = this;

			// classify non-prioritized items by whether their ray intersects the frustum
			if ( camera !== null ) {

				// the frustum may change across the generator calls but it's assumed
				// to not be significant.
				ndcMatrix
					.copy( tiles.group.matrixWorld )
					.premultiply( camera.matrixWorldInverse )
					.premultiply( camera.projectionMatrix );

				frustum.setFromProjectionMatrix( ndcMatrix );

				for ( const item of _queue ) {

					// prioritized items ( e.g. already displayed ) are handled regardless
					if ( this._isPrioritized( item ) ) {

						continue;

					}

					// check if the projection ray intersects the frustum
					this._getLocalSettlingRay( item );
					if ( rayIntersectsFrustum( _raycaster, frustum ) ) {

						intersectingFrustum.add( item );

					}

					if ( this._deadlineExpired() ) {

						yield;
						this._resetDeadline();

					}

				}

			}

			// bin items by priority tier
			for ( const item of _queue ) {

				const inFrustum = intersectingFrustum.has( item );
				let tier = 0;
				if ( ! item.ready && inFrustum ) {

					tier = 3;

				} else if ( this._isPrioritized( item ) ) {

					tier = 2;

				} else if ( inFrustum ) {

					tier = 1;

				}

				settlingBins[ tier ].push( item );

				if ( this._deadlineExpired() ) {

					yield;
					this._resetDeadline();

				}

			}

			// settle items, draining the highest priority bin first
			for ( let t = settlingBins.length - 1; t >= 0; t -- ) {

				const bin = settlingBins[ t ];
				while ( bin.length > 0 ) {

					const item = bin.pop();
					_queue.delete( item );

					// skip items that were unregistered while queued
					if ( ! _refs.has( item ) ) {

						continue;

					}

					// settle the item; a long line yields mid-settle ( inline, only when the
					// budget is spent ) so its samples spread across ticks
					yield* this._settleItem( item );

					// yield between items once the budget is spent
					if ( this._deadlineExpired() ) {

						yield;
						this._resetDeadline();

					}

				}

			}

			// clear the working state for the next pass
			intersectingFrustum.clear();
			settlingBins.forEach( bins => bins.length = 0 );

			// always yield at the end of a pass so an empty queue can't busy-spin
			yield;
			this._resetDeadline();

		}

	}

	_settleSample( lat, lon, target ) {

		// cast a ray to snap a single cartographic sample onto the surface
		const { tiles } = this;
		const { origin, direction } = _raycaster.ray;

		// build the local ray and transform to world space for raycasting
		this._setSettlingRay( lat, lon );
		origin.applyMatrix4( tiles.group.matrixWorld );
		direction.transformDirection( tiles.group.matrixWorld );

		const hits = _raycaster.intersectObject( tiles.group, true );
		if ( hits.length > 0 ) {

			hits[ 0 ].point.applyMatrix4( tiles.group.matrixWorldInverse );
			target.copy( hits[ 0 ].point );

		} else {

			// TODO: we are still seeing some points slip through tile gaps
			tiles.ellipsoid.getCartographicToPosition( lat, lon, 0, target );

		}

	}

	*_settleItem( item ) {

		// drape the item onto the surface. A point is a single sample; a line is many and
		if ( item instanceof LineAnnotation ) {

			const { lat, lon, positions } = item;
			for ( let i = 0, l = lat.length; i < l; i ++ ) {

				// bail if the item was unregistered while paused
				if ( ! this._refs.has( item ) ) {

					return;

				}

				// TODO: this could request multiple hits and choose the one with a roughly vertical normal and
				// adjusts the line in the least vertical way
				this._settleSample( lat[ i ], lon[ i ], positions[ i ] );

				if ( this._deadlineExpired() ) {

					yield;
					this._resetDeadline();

				}

			}

		} else {

			this._settleSample( item.lat, item.lon, item.position );

		}

		item.ready = true;

	}

	_deadlineExpired() {

		return performance.now() >= this._deadline;

	}

	_resetDeadline() {

		this._deadline = performance.now() + this.maxSettleTimeMs;

	}

}
