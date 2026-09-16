// The error target is multiplied by this value to derive the default ceiling when no explicit
// "maxErrorTarget" is provided.
const DEFAULT_ERROR_TARGET_SCALE = 4;

/**
 * Plugin that iteratively raises `TilesRenderer.errorTarget` while the cache is full and the
 * traversal is being denied tiles, then lowers it back to the original value once the cache
 * has room again.
 *
 * When the cache is full `TilesRenderer` cannot queue the tiles the traversal asked for. If the
 * camera then stops moving the scene can stay permanently under refined: nothing is downloading,
 * so nothing new is cached or unloaded, and no further tile is ever requested. The plugin reads
 * `stats.refused` — the number of tiles the last update could not queue because the cache was
 * full — together with `lruCache.isFull()` to detect that state and asks the traversal for fewer,
 * coarser tiles that do fit in the cache.
 *
 * Both conditions must hold continuously for `holdTime` milliseconds before the error target is
 * changed, so a single busy frame during camera movement does not degrade the display. The target
 * is stepped by `factor` at a time, never above `maxErrorTarget` and never below the value the
 * application set, and is stepped back down the same way once the cache is no longer full and no
 * tiles are being refused.
 *
 * Note that raising the error target does not make more tiles load — it makes the traversal ask
 * for fewer, coarser ones. The scene is rendered at a lower quality than requested, which is why
 * every change is reported through `onChange` and, optionally, `console.warn`.
 * @param {Object} [options]
 * @param {number} [options.holdTime=2500] Milliseconds the cache must remain full and refusing tiles before the error target is stepped, and the minimum delay between two steps.
 * @param {number} [options.factor=1.5] Multiplier applied to the error target on each step up, and divided on each step down. Must be greater than 1.
 * @param {number | null} [options.maxErrorTarget=null] Highest error target the plugin is allowed to set. Defaults to four times the error target in use when the plugin is initialized.
 * @param {Function | null} [options.onChange=null] Called with `{ errorTarget, previousErrorTarget, reason }` every time the plugin changes the error target.
 * @param {boolean} [options.logging=false] Whether to log every error target change with `console.warn`.
 */
export class AdaptiveErrorTargetPlugin {

	/**
	 * The highest error target the plugin will set, derived from "maxErrorTarget" or from the
	 * error target the plugin started from.
	 * @type {number}
	 */
	get errorTargetCeiling() {

		const { baseErrorTarget, maxErrorTarget } = this;
		if ( baseErrorTarget === null ) {

			return Infinity;

		}

		return maxErrorTarget === null ? baseErrorTarget * DEFAULT_ERROR_TARGET_SCALE : maxErrorTarget;

	}

	constructor( options = {} ) {

		const {
			holdTime = 2500,
			factor = 1.5,
			maxErrorTarget = null,
			onChange = null,
			logging = false,
		} = options;

		this.name = 'ADAPTIVE_ERROR_TARGET_PLUGIN';
		this.tiles = null;

		/**
		 * Milliseconds the cache must remain full and refusing tiles before the error target is
		 * stepped, and the minimum delay between two steps.
		 * @type {number}
		 * @default 2500
		 */
		this.holdTime = holdTime;

		/**
		 * Multiplier applied to the error target on each step up, and divided on each step down.
		 * @type {number}
		 * @default 1.5
		 */
		this.factor = factor;

		/**
		 * Highest error target the plugin is allowed to set. When null the ceiling is four times
		 * the error target the plugin started from.
		 * @type {number | null}
		 * @default null
		 */
		this.maxErrorTarget = maxErrorTarget;

		/**
		 * Called with `{ errorTarget, previousErrorTarget, reason }` every time the plugin changes
		 * the error target. "reason" is `'cache-full'` when stepping up, `'cache-available'` when
		 * stepping back down.
		 * @type {Function | null}
		 * @default null
		 */
		this.onChange = onChange;

		/**
		 * Whether to log every error target change with `console.warn`.
		 * @type {boolean}
		 * @default false
		 */
		this.logging = logging;

		/**
		 * The error target the plugin steps back down to, ie the last value assigned by the
		 * application. Null before the plugin is initialized.
		 * @type {number | null}
		 */
		this.baseErrorTarget = null;

		this._appliedErrorTarget = null;
		this._lastFrameCount = - 1;
		this._fullSince = - 1;
		this._availableSince = - 1;
		this._timeout = null;
		this._onUpdateAfter = null;

	}

	init( tiles ) {

		this.tiles = tiles;
		this.baseErrorTarget = tiles.errorTarget;
		this._appliedErrorTarget = tiles.errorTarget;

		this._onUpdateAfter = () => {

			this._checkCachePressure();

		};

		tiles.addEventListener( 'update-after', this._onUpdateAfter );

	}

	dispose() {

		const { tiles } = this;

		tiles.removeEventListener( 'update-after', this._onUpdateAfter );
		clearTimeout( this._timeout );
		this._timeout = null;

		// restore the application error target unless it has been changed from the outside since
		// the last step
		if ( this.baseErrorTarget !== null && tiles.errorTarget === this._appliedErrorTarget ) {

			tiles.errorTarget = this.baseErrorTarget;

		}

	}

	// Private Functions
	_checkCachePressure() {

		const { tiles, holdTime } = this;
		const { lruCache, stats, frameCount } = tiles;

		clearTimeout( this._timeout );
		this._timeout = null;

		// the update may have been skipped by a plugin, in which case the stats still describe an
		// older traversal and must not be counted as a new sample
		if ( frameCount === this._lastFrameCount ) {

			return;

		}

		this._lastFrameCount = frameCount;

		// adopt an error target assigned from outside the plugin as the new base value so the
		// scene is never refined beyond what the application asked for
		if ( tiles.errorTarget !== this._appliedErrorTarget ) {

			this.baseErrorTarget = tiles.errorTarget;
			this._appliedErrorTarget = tiles.errorTarget;
			this._fullSince = - 1;
			this._availableSince = - 1;

		}

		const time = performance.now();
		const refused = stats.refused > 0;
		const full = lruCache.isFull();

		if ( refused && full ) {

			this._availableSince = - 1;
			if ( this._fullSince === - 1 ) {

				this._fullSince = time;

			}

			const elapsed = time - this._fullSince;
			if ( elapsed >= holdTime ) {

				this._fullSince = time;
				this._setErrorTarget( Math.min( this.errorTargetCeiling, tiles.errorTarget * this.factor ), 'cache-full' );

			} else {

				this._scheduleCheck( holdTime - elapsed );

			}

		} else if ( ! refused && ! full ) {

			this._fullSince = - 1;
			if ( this._availableSince === - 1 ) {

				this._availableSince = time;

			}

			if ( tiles.errorTarget > this.baseErrorTarget ) {

				const elapsed = time - this._availableSince;
				if ( elapsed >= holdTime ) {

					this._availableSince = time;
					this._setErrorTarget( Math.max( this.baseErrorTarget, tiles.errorTarget / this.factor ), 'cache-available' );

				} else {

					this._scheduleCheck( holdTime - elapsed );

				}

			}

		} else {

			// the cache is full but satisfying the traversal, or tiles were refused by a cache that
			// has since been unloaded: neither state is confirmed so the current target is held
			this._fullSince = - 1;
			this._availableSince = - 1;

		}

	}

	_setErrorTarget( errorTarget, reason ) {

		const { tiles } = this;
		const previousErrorTarget = tiles.errorTarget;
		if ( errorTarget === previousErrorTarget ) {

			return;

		}

		tiles.errorTarget = errorTarget;
		this._appliedErrorTarget = errorTarget;

		if ( this.logging ) {

			console.warn( `AdaptiveErrorTargetPlugin: error target changed from ${ previousErrorTarget } to ${ errorTarget } (${ reason }).` );

		}

		if ( this.onChange ) {

			this.onChange( { errorTarget, previousErrorTarget, reason } );

		}

		// the new target is only read by the next traversal, which may otherwise never run if the
		// camera is not moving
		tiles.dispatchEvent( { type: 'needs-update' } );

	}

	_scheduleCheck( delay ) {

		// request a new traversal once the hold time has elapsed so the cache state can be sampled
		// again even when the renderer is only updated on change
		this._timeout = setTimeout( () => {

			this._timeout = null;
			this.tiles.dispatchEvent( { type: 'needs-update' } );

		}, delay );

	}

}
