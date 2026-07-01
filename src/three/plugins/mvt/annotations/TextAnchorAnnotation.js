import { Vector3, MathUtils } from 'three';
import { OccupancyAnnotation } from '../ScreenOccupationManager.js';

// screen-space spacing / footprint per character, in pixels
// TODO: This should come from a user setting
const CHARACTER_SIZE = 16;

// reject labels whose projected baseline turns more than this in total ( radians ), since
// sharply curving text becomes hard to read
const MAX_LABEL_ANGLE = Math.PI / 2;

// scratch reused across evaluate() calls ( synchronous, single pass )
const _segIndices = [];
const _segAlphas = [];
const _vec = /* @__PURE__ */ new Vector3();

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

		// per-character advance width provider ( em units ), assigned by the plugin
		this.measureChar = () => 1;

		// cached per-character advance widths ( screen px ) and their total, computed lazily in
		// evaluate() since the text never changes
		this._advances = [];
		this._totalWidth = 0;

	}

	// overrides
	evaluate( handle ) {

		const { text } = this;
		if ( ! text ) {

			return false;

		}

		// TODO: update the "active reference" here to avoid iteration every frame
		const { line } = this.getActiveReference();
		const { cumulativeLen } = line;
		if ( ! line.ready ) {

			return false;

		}

		if ( cumulativeLen.length < 2 ) {

			return false;

		}

		this._updateAdvances();
		_segIndices.length = text.length;
		_segAlphas.length = text.length;

		// lay out and test every character; bail if it can't fit or the baseline curves too sharply
		if ( ! this._layoutCharacters( handle, _segIndices, _segAlphas ) ) {

			return false;

		}

		// it fits: commit occupancy marks, world positions, and baseline angles
		this._placeCharacters( handle, _segIndices, _segAlphas );
		return true;

	}

	// per-character advance widths in screen px ( em fraction × em size ), cached since the text
	// never changes. also caches their total in `_totalWidth`.
	_updateAdvances() {

		const { text, _advances } = this;
		_advances.length = text.length;

		let total = 0;
		for ( let k = 0, l = text.length; k < l; k ++ ) {

			const w = this.measureChar( text[ k ] );
			_advances[ k ] = w;
			total += w;

		}

		this._totalWidth = total;

	}

	// march the characters out from the anchor in both directions, centered, measuring and testing
	// each one so a string that doesn't fit leaves no marks behind. records per-character segment
	// index / alpha into the module scratch. returns the reading-direction flip on success, or
	// null if the label can't be placed.
	// TODO: also reject foreshortened paths ( tiny screen-space segments )
	_layoutCharacters( handle, outputIndices, outputAlphas ) {

		const { _advances, _totalWidth } = this;
		const { line, i0, i1, alpha } = this.getActiveReference();
		const { cumulativeLen, screenPositions } = line;
		const anchorOffset = MathUtils.lerp( cumulativeLen[ i0 ], cumulativeLen[ i1 ], alpha );

		const pointCount = screenPositions.length;
		const totalLength = cumulativeLen[ cumulativeLen.length - 1 ];
		const length = _advances.length;
		const radius = CHARACTER_SIZE / 2;

		let seg = 0;
		let charCursor = 0;
		let prevAngle = 0;
		let totalTurn = 0;
		for ( let i = 0; i < length; i ++ ) {

			// place each character's center along the arc by its advance, centered on the anchor
			const charCenter = charCursor + _advances[ i ] * 0.5 - _totalWidth * 0.5;
			charCursor += _advances[ i ];

			// absolute target position relative to the line
			const target = anchorOffset + charCenter;

			// the path is too short on screen to hold the whole string
			if ( target < 0 || target > totalLength ) {

				return false;

			}

			// advance to the segment containing "target"
			while ( seg < pointCount - 2 && cumulativeLen[ seg + 1 ] < target ) {

				seg ++;

			}

			const segNext = seg + 1;
			const segLength = cumulativeLen[ segNext ] - cumulativeLen[ seg ];
			const segAlpha = segLength > 0 ? ( target - cumulativeLen[ seg ] ) / segLength : 0;

			const p0 = screenPositions[ seg ];
			const p1 = screenPositions[ segNext ];
			_vec.lerpVectors( p0, p1, segAlpha );

			// off-screen in depth, or colliding with an already-placed annotation
			if ( _vec.z < 0 || _vec.z > 1 || handle.test( _vec.x, _vec.y, radius ) ) {

				return false;

			}

			// accumulate the absolute turn between consecutive character tangents and reject
			// paths that curve too sharply across the label to stay readable
			const angle = Math.atan2( p1.y - p0.y, p1.x - p0.x );
			if ( i > 0 ) {

				const delta = Math.atan2( Math.sin( angle - prevAngle ), Math.cos( angle - prevAngle ) );
				totalTurn += Math.abs( delta );
				if ( totalTurn > MAX_LABEL_ANGLE ) {

					return false;

				}

			}

			prevAngle = angle;

			outputIndices[ i ] = seg;
			outputAlphas[ i ] = segAlpha;

		}

		// flip the character-to-slot mapping when the path runs right-to-left on screen so the
		// label always reads left-to-right
		return true;

	}

	// determine the text direction based on the width end points of the string
	_getTextDirection( screenPositions, segIndices, segAlphas ) {

		const ss0 = segIndices[ 0 ];
		const ss1 = ss0 + 1;
		const se0 = segIndices[ segIndices.length - 1 ];
		const se1 = se0 + 1;

		const firstX = _vec.lerpVectors( screenPositions[ ss0 ], screenPositions[ ss1 ], segAlphas[ 0 ] ).x;
		const lastX = _vec.lerpVectors( screenPositions[ se0 ], screenPositions[ se1 ], segAlphas[ segAlphas.length - 1 ] ).x;
		return lastX < firstX;

	}

	// commit a successful layout: mark occupancy and record a world-space position + baseline
	// angle per character, applying the reading-direction flip
	_placeCharacters( handle, segIndices, segAlphas ) {

		const { characterPositions, characterAngles, _advances } = this;
		const { line } = this.getActiveReference();
		const { screenPositions, positions } = line;

		const flip = false;//this._getTextDirection( screenPositions, segIndices, segAlphas );
		const length = _advances.length;
		const radius = CHARACTER_SIZE / 2;

		while ( characterPositions.length < length ) {

			characterPositions.push( new Vector3() );

		}

		characterPositions.length = length;
		characterAngles.length = length;

		for ( let k = 0; k < length; k ++ ) {

			const slot = flip ? length - 1 - k : k;
			const index = segIndices[ slot ];
			const segAlpha = segAlphas[ slot ];

			const p0 = screenPositions[ index ];
			const p1 = screenPositions[ index + 1 ];
			handle.mark( p0.x + ( p1.x - p0.x ) * segAlpha, p0.y + ( p1.y - p0.y ) * segAlpha, radius );

			characterPositions[ k ].lerpVectors( positions[ index ], positions[ index + 1 ], segAlpha );

			// baseline angle from the segment direction ( screen space, y down ), pointing in the
			// reading direction so glyphs stay upright after a flip
			const dx = ( p1.x - p0.x ) * ( flip ? - 1 : 1 );
			const dy = ( p1.y - p0.y ) * ( flip ? - 1 : 1 );
			characterAngles[ k ] = Math.atan2( dy, dx );

		}

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
