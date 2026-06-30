import { Vector3 } from 'three';
import { OccupancyAnnotation } from '../ScreenOccupationManager.js';

// screen-space spacing / footprint per character, in pixels
const CHARACTER_SIZE = 10;

// scratch reused across evaluate() calls ( synchronous, single pass )
const _cumulative = [];
const _segIndices = [];
const _segAlphas = [];

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

		// tiles.group local position per character, filled by evaluate()
		this.characterPositions = [];

		// screen-space baseline angle per character ( radians ), filled by evaluate()
		this.characterAngles = [];

	}

	// overrides
	evaluate( handle ) {

		const { text } = this;
		if ( ! text ) {

			return false;

		}

		// TODO: update the "active reference" here to avoid iteration every frame
		const { line, i0, alpha } = this.getActiveReference();
		if ( ! line.ready ) {

			return false;

		}

		const { screenPositions, positions } = line;
		const sampleCount = positions.length;
		if ( sampleCount < 2 ) {

			return false;

		}

		// cumulative 2d screen-space arc length per sample
		_cumulative.length = sampleCount;
		_cumulative[ 0 ] = 0;
		for ( let i = 1; i < sampleCount; i ++ ) {

			const a = screenPositions[ i - 1 ];
			const b = screenPositions[ i ];
			const dx = b.x - a.x;
			const dy = b.y - a.y;
			_cumulative[ i ] = _cumulative[ i - 1 ] + Math.sqrt( dx * dx + dy * dy );

		}

		const totalLength = _cumulative[ sampleCount - 1 ];

		// arc length of the anchor along the screen-projected path
		const anchorLength = _cumulative[ i0 ] + alpha * ( _cumulative[ i0 + 1 ] - _cumulative[ i0 ] );

		// march the characters out from the anchor in both directions, centered. measure and
		// test every character first so a string that doesn't fit leaves no marks behind.
		// TODO: early out on tight corners / steep angles
		const length = text.length;
		const halfChar = ( length - 1 ) * 0.5;
		const radius = CHARACTER_SIZE / 2;

		let seg = 0;
		let firstX = 0;
		let lastX = 0;
		for ( let k = 0; k < length; k ++ ) {

			const target = anchorLength + ( k - halfChar ) * CHARACTER_SIZE;

			// the path is too short on screen to hold the whole string
			if ( target < 0 || target > totalLength ) {

				return false;

			}

			// advance to the segment containing "target" ( monotonic across k )
			while ( seg < sampleCount - 2 && _cumulative[ seg + 1 ] < target ) {

				seg ++;

			}

			const segLength = _cumulative[ seg + 1 ] - _cumulative[ seg ];
			const segAlpha = segLength > 0 ? ( target - _cumulative[ seg ] ) / segLength : 0;

			const a = screenPositions[ seg ];
			const b = screenPositions[ seg + 1 ];
			const sx = a.x + ( b.x - a.x ) * segAlpha;
			const sy = a.y + ( b.y - a.y ) * segAlpha;
			const sz = a.z + ( b.z - a.z ) * segAlpha;

			// off-screen in depth, or colliding with an already-placed annotation
			if ( sz < 0 || sz > 1 || handle.test( sx, sy, radius ) ) {

				return false;

			}

			// track the screen x of the path ends to decide reading direction below
			if ( k === 0 ) {

				firstX = sx;

			}

			lastX = sx;

			_segIndices[ k ] = seg;
			_segAlphas[ k ] = segAlpha;

		}

		// it fits: mark occupancy and record a world-space position per character
		const { characterPositions, characterAngles } = this;
		while ( characterPositions.length < length ) {

			characterPositions.push( new Vector3() );

		}

		characterPositions.length = length;
		characterAngles.length = length;

		// flip the character-to-slot mapping when the path runs right-to-left on screen so the
		// label always reads left-to-right
		const flip = lastX < firstX;
		for ( let k = 0; k < length; k ++ ) {

			const slot = flip ? length - 1 - k : k;
			const index = _segIndices[ slot ];
			const segAlpha = _segAlphas[ slot ];

			const a = screenPositions[ index ];
			const b = screenPositions[ index + 1 ];
			handle.mark( a.x + ( b.x - a.x ) * segAlpha, a.y + ( b.y - a.y ) * segAlpha, radius );

			characterPositions[ k ].lerpVectors( positions[ index ], positions[ index + 1 ], segAlpha );

			// baseline angle from the segment direction ( screen space, y down ), pointing in the
			// reading direction so glyphs stay upright after a flip
			const dx = ( b.x - a.x ) * ( flip ? - 1 : 1 );
			const dy = ( b.y - a.y ) * ( flip ? - 1 : 1 );
			characterAngles[ k ] = Math.atan2( dy, dx );

		}

		return true;

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
