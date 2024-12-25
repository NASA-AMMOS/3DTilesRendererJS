import { MathUtils } from 'three';

const { clamp } = MathUtils;
export class FadeManager {

	constructor() {

		this.duration = 250;
		this.fadeCount = 0;
		this._lastTick = - 1;
		this._fadeState = new Map();
		this.onFadeComplete = null;
		this.onFadeStart = null;
		this.onFadeSetComplete = null;
		this.onFadeSetStart = null;

	}

	// delete the object from the fade, reset the material data
	deleteObject( object ) {

		if ( ! object ) {

			return;

		}

		this.completeFade( object );

	}

	// Ensure we're storing a fade timer for the provided object
	// Returns whether a new state had to be added
	guaranteeState( object ) {

		const fadeState = this._fadeState;
		if ( fadeState.has( object ) ) {

			return false;

		}

		const state = {
			fadeInTarget: 0,
			fadeOutTarget: 0,
			fadeIn: 0,
			fadeOut: 0,
		};

		fadeState.set( object, state );

		return true;

	}

	// Force the fade to complete in the direction it is already trending
	completeFade( object ) {

		const fadeState = this._fadeState;
		if ( ! fadeState.has( object ) ) {

			return;

		}

		const visible = fadeState.get( object ).fadeOutTarget === 0;

		fadeState.delete( object );

		// fire events
		this.fadeCount --;

		if ( this.onFadeComplete ) {

			this.onFadeComplete( object, visible );

		}

		if ( this.fadeCount === 0 && this.onFadeSetComplete ) {

			this.onFadeSetComplete();

		}

	}

	completeAllFades() {

		this._fadeState.forEach( ( value, key ) => {

			this.completeFade( key );

		} );

	}

	forEachObject( cb ) {

		this._fadeState.forEach( ( info, object ) => {

			cb( object, info );

		} );

	}

	// Fade the object in
	fadeIn( object ) {

		const noState = this.guaranteeState( object );
		const state = this._fadeState.get( object );
		state.fadeInTarget = 1;
		state.fadeOutTarget = 0;
		state.fadeOut = 0;

		// Fire events
		if ( noState ) {

			this.fadeCount ++;
			if ( this.fadeCount === 1 && this.onFadeSetStart ) {

				this.onFadeSetStart();

			}

			if ( this.onFadeStart ) {

				this.onFadeStart( object );

			}

		}

	}

	// Fade the object out
	fadeOut( object ) {

		const noState = this.guaranteeState( object );
		const state = this._fadeState.get( object );
		state.fadeOutTarget = 1;

		// Fire events and initialize state
		if ( noState ) {

			state.fadeInTarget = 1;
			state.fadeIn = 1;

			this.fadeCount ++;
			if ( this.fadeCount === 1 && this.onFadeSetStart ) {

				this.onFadeSetStart();

			}

			if ( this.onFadeStart ) {

				this.onFadeStart( object );

			}

		}

	}

	isFading( object ) {

		return this._fadeState.has( object );

	}

	isFadingOut( object ) {

		const state = this._fadeState.get( object );
		return state && state.fadeOutTarget === 1;

	}

	// Tick the fade timer for each actively fading object
	update() {

		// clamp delta in case duration is really small or 0
		const time = window.performance.now();
		if ( this._lastTick === - 1 ) {

			this._lastTick = time;

		}

		const delta = clamp( ( time - this._lastTick ) / this.duration, 0, 1 );
		this._lastTick = time;

		const fadeState = this._fadeState;
		fadeState.forEach( ( state, object ) => {

			// tick the fade values
			const {
				fadeOutTarget,
				fadeInTarget,
			} = state;

			let {
				fadeOut,
				fadeIn,
			} = state;

			const fadeInSign = Math.sign( fadeInTarget - fadeIn );
			fadeIn = clamp( fadeIn + fadeInSign * delta, 0, 1 );

			const fadeOutSign = Math.sign( fadeOutTarget - fadeOut );
			fadeOut = clamp( fadeOut + fadeOutSign * delta, 0, 1 );

			state.fadeIn = fadeIn;
			state.fadeOut = fadeOut;

			// Check if the fade in and fade out animations are complete
			const fadeOutComplete = fadeOut === 1 || fadeOut === 0;
			const fadeInComplete = fadeIn === 1 || fadeIn === 0;

			// If they are or the fade out animation is further along than the
			// fade in animation then mark the fade as completed for this tile
			if ( ( fadeOutComplete && fadeInComplete ) || fadeOut >= fadeIn ) {

				this.completeFade( object );

			}

		} );

	}

}
