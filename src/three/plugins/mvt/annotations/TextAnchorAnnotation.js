import { OccupancyAnnotation } from '../ScreenOccupationManager.js';

// A text anchor that lays on a give line and stores references to path from different LoDs,
// choosing the best one to "snap" to.
let annotationIndex = 0;
export class TextAnchorAnnotation extends OccupancyAnnotation {

	get lat() {

		return this.getActiveReference().lat;

	}

	get lon() {

		return this.getActiveReference().lon;

	}

	get text() {

		return this.properties.name || '';

	}

	get ready() {

		return this.getActiveReference().line.ready;

	}

	set ready( value ) {}

	get properties() {

		return this.getActiveReference().line.properties;

	}

	set properties( value ) {}

	constructor( id ) {

		super();

		// ensure a unique id since we are deduping them separately
		// An id isn't really needed for the text anchor other than for sort stability and to
		// accommodate the annotation deduping in the screen annotation system.
		// TODO: consider removing the deduping from the screen occupation manager
		this.id = `${ id }_${ annotationIndex ++ }`;

		this.referencePaths = [];
		this._lastUsed = null;

	}

	// overrides
	evaluate() {

		// TODO: update the "active reference" here to avoid iteration every frame
		const { text } = this;
		const { screenPositions } = this.getActiveReference().line;

		if ( ! text ) {

			return false;

		}

		// TODO:
		// 1. March along the path in both directions starting at the anchor, measuring
		// out a distance long enough for all the letters while evaluating occupation.
		// 2. Early out if the angle is too steep, corners too tight, crossing?
		// 3. Determine the text direction by average path direction? Or flip character halfway through?
		// Or early out if it flips? Or by lowest end point?
		// 4. Place the characters along the line, orienting to the path, marking the
		// locations in the grid.

	}

	updateTransform( matrix, resolution, cameraPosition ) {

		// update the screen positions for shared line
		this.getActiveReference().line.updateTransform( matrix, resolution, cameraPosition );

	}

	// anchor functions
	isEmpty() {

		return this.referencePaths.length === 0;

	}

	hasLoD( lod ) {

		return this.referencePaths.find( ref => ref.line.lodLevel === lod );

	}

	getPosition( pos ) {

		const { i0, i1, alpha, line } = this.getActiveReference();
		return pos.lerpVectors( line.positions[ i0 ], line.positions[ i1 ], alpha );

	}

	// the highest-LoD entry whose path is settled, used for placement
	getActiveReference() {

		const { referencePaths, _lastUsed } = this;
		const target = referencePaths[ 0 ] ?? null;
		if ( target?.line.ready ) {

			this._lastUsed = target;
			return target;

		} else {

			let result = target;
			for ( const entry of referencePaths ) {

				if ( entry.line.ready ) {

					result = entry;
					break;

				}

			}

			result = result ?? _lastUsed;

			if ( _lastUsed && _lastUsed.line.ready && _lastUsed.line.lodLevel > result.line.lodLevel ) {

				result = _lastUsed;

			}

			this._lastUsed = result;
			return result;

		}


	}

	// add a reference to the given line, associating this anchor with the provided anchor
	// position index
	addLine( line, slotIndex ) {

		// store the slot and its cartographic position on this specific path
		const slot = line.anchorPositions[ slotIndex ];
		const { referencePaths } = this;

		referencePaths.push( {
			line,
			i0: slot.i0,
			i1: slot.i1,
			alpha: slot.alpha,
			lat: slot.lat,
			lon: slot.lon,
		} );

		// sort in order from most important to least
		referencePaths.sort( ( a, b ) => {

			return b.line.lodLevel - a.line.lodLevel;

		} );

		return slotIndex;

	}

	removeLine( line ) {

		const { referencePaths } = this;
		for ( let i = 0; i < referencePaths.length; i ++ ) {

			if ( referencePaths[ i ].line === line ) {

				referencePaths.splice( i, 1 );
				i --;

			}

		}

	}

}
