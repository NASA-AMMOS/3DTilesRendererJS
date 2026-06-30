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

// Takes a set of line or point annotations and "settles" them onto the tile set.
export class SettlingManager {

	get hasPendingWork() {

		return this._queue.size > 0;

	}

	constructor() {

		this.tiles = null;
		this.occupancy = null;
		this.camera = null;
		this.maxSettleTimeMs = 5;

		// items awaiting resettling
		this._queue = new Set();
		this._items = new Set();

		this.needsUpdate = false;
		this._task = null;

		// shared per-tick budget deadline
		this._deadline = 0;

	}

	register( item ) {

		this._items.add( item );
		this._queue.add( item );

	}

	unregister( item ) {

		this._items.delete( item );
		this._queue.delete( item );

	}

	update() {

		// rebuild requeues everything that is still registered
		if ( this.needsUpdate ) {

			this.needsUpdate = false;
			for ( const item of this._items.values() ) {

				this._queue.add( item );

			}

		}

		// tick the forever-running settling task, giving it a fresh time budget
		if ( this._task === null ) {

			this._task = this._settleGenerator();

		}

		this._task.next();

	}

	// deadline
	_deadlineExpired() {

		return performance.now() >= this._deadline;

	}

	_resetDeadline() {

		this._deadline = performance.now() + this.maxSettleTimeMs;

	}

	_getSettlingRay( lat, lon, raycaster ) {

		// construct a downward ray at the given cartographic point in the local tiles frame
		const { tiles } = this;
		const { origin, direction } = raycaster.ray;

		tiles.ellipsoid.getCartographicToPosition( lat, lon, 1e8, origin );
		tiles.ellipsoid.getCartographicToPosition( lat, lon, 0, direction );
		direction.sub( origin ).normalize();

		raycaster.far = 2 * 1e8;
		raycaster.firstHitOnly = true;

	}

	_settleSample( lat, lon, target ) {

		// cast a ray to snap a single cartographic sample onto the surface
		const { tiles } = this;
		const { origin, direction } = _raycaster.ray;

		// build the local ray and transform to world space for raycasting
		this._getSettlingRay( lat, lon, _raycaster );
		origin.applyMatrix4( tiles.group.matrixWorld );
		direction.transformDirection( tiles.group.matrixWorld );

		const hits = _raycaster.intersectObject( tiles.group );
		if ( hits.length > 0 ) {

			target
				.copy( hits[ 0 ].point )
				.applyMatrix4( tiles.group.matrixWorldInverse );

		} else {

			// TODO: we are still seeing some points slip through tile gaps - should we hide them in this case?
			tiles.ellipsoid.getCartographicToPosition( lat, lon, 0, target );

		}

	}

	*_settleGenerator() {

		// runs forever: each pass classifies, bins, and raycasts whatever is in the
		// queue when the pass begins, yielding whenever the per-tick budget is
		// spent. items added after a pass starts are picked up on the next pass.
		const ndcMatrix = new Matrix4();
		const frustum = new Frustum();
		const intersectingFrustum = new Set();
		const settlingBins = [[], [], [], []];

		this._resetDeadline();

		while ( true ) {

			const { _queue, _items, tiles, camera, occupancy } = this;

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

					// visible items are prioritized regardless
					if ( occupancy.visible.has( item ) ) {

						continue;

					}

					if ( item instanceof LineAnnotation ) {

						// check if the middle anchor rays intersects the frustum
						const { anchorPositions } = item;
						const anchorPosition = anchorPositions[ anchorPositions.length >> 1 ];
						const { lat, lon } = anchorPosition;

						this._getSettlingRay( lat, lon, _raycaster );
						if ( rayIntersectsFrustum( _raycaster, frustum ) ) {

							intersectingFrustum.add( item );
							break;

						}


					} else {

						// check if the point projection ray intersects the frustum
						this._getSettlingRay( item.lat, item.lon, _raycaster );
						if ( rayIntersectsFrustum( _raycaster, frustum ) ) {

							intersectingFrustum.add( item );

						}

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

				} else if ( occupancy.visible.has( item ) ) {

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
					if ( ! _items.has( item ) ) {

						continue;

					}

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

	*_settleItem( item ) {

		// TODO: add "settling" logic on the classes themselves?
		if ( item instanceof LineAnnotation ) {

			// drape the line onto the surface
			const { _items } = this;
			const { lat, lon, positions } = item;
			for ( let i = 0, l = lat.length; i < l; i ++ ) {

				// TODO: this could request multiple hits and choose the one with a roughly vertical normal and
				// adjusts the line in the least vertical way
				this._settleSample( lat[ i ], lon[ i ], positions[ i ] );

				if ( this._deadlineExpired() ) {

					yield;
					this._resetDeadline();

					// bail if the item was unregistered while paused
					if ( ! _items.has( item ) ) {

						return;

					}

				}

			}

		} else {

			// settle the point onto the surface
			this._settleSample( item.lat, item.lon, item.position );

		}

		item.ready = true;

	}

}
