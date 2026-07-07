import { Vector3, MathUtils } from 'three';
import { OccupancyAnnotation } from '../ScreenOccupationManager.js';

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

	get ready() {

		return this.getActiveReference().line.ready;

	}

	set ready( value ) {}

	get properties() {

		return this.getActiveReference().line.properties;

	}

	set properties( value ) {}

	get enabled() {

		return this.getActiveReference().line.enabled;

	}

	set enabled( value ) {}

	get text() {

		return this.getActiveReference().line.text;

	}

	constructor( id ) {

		super();

		// ensure a unique id since we are deduping them separately
		// An id isn't really needed for the text anchor other than for sort stability and to
		// accommodate the annotation deduping in the screen annotation system.
		// TODO: consider removing the deduping from the screen occupation manager
		this.id = `${ id }_${ annotationIndex ++ }`;

		this.referencePaths = [];
		this._activeReference = null;

		// local position & angle per character
		this.characterPositions = [];
		this.characterAngles = [];

		// per-character advance width provider (pixels)
		this.measureChar = () => 1;

		// total advance width of the label ( screen px ) and per-character footprint radius,
		// recomputed each layout ( individual advances come from the cached measureChar )
		this._totalWidth = 0;
		this._charRadius = 1;

	}

	// overrides
	// "force" places the characters at the current projection even when they don't fit,
	// used to keep a fading-out label laid out (see ScreenOccupationManager.refreshLayout)
	evaluate( handle, force = false ) {

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

		const maxCharWidth = this.measureChar( 'M' );
		this._updateTotalWidth();
		this._charRadius = Math.sqrt( maxCharWidth ** 2 ) / 2;

		_segIndices.length = text.length;
		_segAlphas.length = text.length;

		// lay out and test every character; bail if it can't fit or the baseline curves too sharply
		this._layoutCharacters( handle, _segIndices, _segAlphas, force );
		if ( ! this.valid && ! force ) {

			return false;

		}

		// it fits: commit occupancy marks, world positions, and baseline angles
		this._placeCharacters( handle, _segIndices, _segAlphas );
		return true;

	}

	// sum the label's per-character advance widths ( screen px ) into `_totalWidth`; the individual
	// widths come straight from the cached measureChar during layout
	_updateTotalWidth() {

		const { text } = this;
		let total = 0;
		for ( let k = 0, l = text.length; k < l; k ++ ) {

			total += this.measureChar( text[ k ] );

		}

		this._totalWidth = total;

	}

	// determine the reading direction based on the positioning of the end points
	_getTextDirection() {

		const { _totalWidth } = this;
		const { line, i0, i1, alpha } = this.getActiveReference();
		const { cumulativeLen, screenPositions } = line;
		const anchorOffset = MathUtils.lerp( cumulativeLen[ i0 ], cumulativeLen[ i1 ], alpha );

		// the label is centered on the anchor, so its ends sit half a total-width to each side
		const halfWidth = _totalWidth * 0.5;
		const startOffset = anchorOffset - halfWidth;
		const endOffset = anchorOffset + halfWidth;

		let startIndex = 0;
		let startAlpha = 0;
		let endIndex = cumulativeLen.length - 2;
		let endAlpha = 1;
		for ( let i = 0, l = cumulativeLen.length - 2; i < l; i ++ ) {

			const n = i + 1;

			const l0 = cumulativeLen[ i ];
			const l1 = cumulativeLen[ n ];

			if ( startOffset >= l0 && startOffset <= l1 ) {

				startIndex = i;
				startAlpha = MathUtils.mapLinear( startOffset, l0, l1, 0, 1 );

			}

			if ( endOffset >= l0 && endOffset <= l1 ) {

				endIndex = i;
				endAlpha = MathUtils.mapLinear( endOffset, l0, l1, 0, 1 );

			}

		}

		const firstX = _vec.lerpVectors( screenPositions[ startIndex ], screenPositions[ startIndex + 1 ], startAlpha ).x;
		const lastX = _vec.lerpVectors( screenPositions[ endIndex ], screenPositions[ endIndex + 1 ], endAlpha ).x;
		return lastX < firstX;

	}

	// march the characters out from the anchor in both directions, centered, measuring and testing
	// each one so a string that doesn't fit leaves no marks behind. records per-character segment
	// index / alpha into the module scratch. returns the reading-direction flip on success, or
	// null if the label can't be placed.
	// TODO: also reject foreshortened paths (tiny screen-space segments)
	_layoutCharacters( handle, outputIndices, outputAlphas, force = false ) {

		const { text, _totalWidth, _charRadius } = this;
		const { line, i0, i1, alpha } = this.getActiveReference();
		const { cumulativeLen, screenPositions } = line;
		const anchorOffset = MathUtils.lerp( cumulativeLen[ i0 ], cumulativeLen[ i1 ], alpha );
		const flip = this._getTextDirection();
		this.valid = true;

		const pointCount = screenPositions.length;
		const totalLength = cumulativeLen[ cumulativeLen.length - 1 ];
		const length = text.length;

		let seg = 0;
		let charCursor = 0;
		let prevAngle = 0;
		let totalTurn = 0;
		for ( let i = 0; i < length; i ++ ) {

			// place each character's center along the arc by its advance, centered on the anchor
			const slot = flip ? length - 1 - i : i;
			const advance = this.measureChar( text[ slot ] );
			const charCenter = charCursor + advance * 0.5 - _totalWidth * 0.5;
			charCursor += advance;

			// absolute target position relative to the line
			const target = anchorOffset + charCenter;

			// the path is too short on screen to hold the whole string (forced layout extrapolates
			// past the ends instead of bailing)
			if ( target < 0 || target > totalLength ) {

				this.valid = false;
				if ( ! force ) break;

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
			if ( ! force && ( _vec.z < 0 || _vec.z > 1 || handle.test( _vec.x, _vec.y, _charRadius ) ) ) {

				this.valid = false;
				if ( ! force ) break;

			}

			// accumulate the absolute turn between consecutive character tangents and reject
			// paths that curve too sharply across the label to stay readable
			const angle = Math.atan2( p1.y - p0.y, p1.x - p0.x );
			if ( i > 0 ) {

				const delta = Math.atan2( Math.sin( angle - prevAngle ), Math.cos( angle - prevAngle ) );
				totalTurn += Math.abs( delta );
				if ( totalTurn > MAX_LABEL_ANGLE ) {

					this.valid = false;
					if ( ! force ) break;

				}

			}

			prevAngle = angle;

			outputIndices[ slot ] = seg;
			outputAlphas[ slot ] = segAlpha;

		}

		return this.valid;

	}

	// commit a successful layout: mark occupancy and record a world-space position + baseline
	// angle per character, applying the reading-direction flip
	_placeCharacters( handle, segIndices, segAlphas ) {

		const { characterPositions, characterAngles, text, _charRadius } = this;
		const { line } = this.getActiveReference();
		const { screenPositions, positions } = line;

		const flip = this._getTextDirection();
		const length = text.length;

		while ( characterPositions.length < length ) {

			characterPositions.push( new Vector3() );

		}

		characterPositions.length = length;
		characterAngles.length = length;

		for ( let i = 0; i < length; i ++ ) {

			// the layout already applied the flip when storing per-character data, so index it
			// straight; flip only affects the baseline angle's sign below
			const index = segIndices[ i ];
			const segAlpha = segAlphas[ i ];

			const p0 = screenPositions[ index ];
			const p1 = screenPositions[ index + 1 ];
			handle.mark( p0.x + ( p1.x - p0.x ) * segAlpha, p0.y + ( p1.y - p0.y ) * segAlpha, _charRadius );

			characterPositions[ i ].lerpVectors( positions[ index ], positions[ index + 1 ], segAlpha );

			// baseline angle from the segment direction ( screen space, y down ), pointing in the
			// reading direction so glyphs stay upright after a flip
			const dx = ( p1.x - p0.x ) * ( flip ? - 1 : 1 );
			const dy = ( p1.y - p0.y ) * ( flip ? - 1 : 1 );
			characterAngles[ i ] = Math.atan2( dy, dx );

		}

	}

	updateTransform( matrix, resolution, cameraPosition ) {

		// update the screen positions for shared line
		this.updateActiveReference();
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

		return this._activeReference;

	}

	updateActiveReference() {

		const { referencePaths, _activeReference } = this;
		const target = referencePaths[ 0 ] ?? null;
		if ( target?.line.ready ) {

			this._activeReference = target;
			return target;

		} else {

			let result = target;
			for ( const entry of referencePaths ) {

				if ( entry.line.ready ) {

					result = entry;
					break;

				}

			}

			result = result ?? _activeReference;

			if ( _activeReference && _activeReference.line.ready && _activeReference.line.lodLevel > result.line.lodLevel ) {

				result = _activeReference;

			}

			this._activeReference = result;
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

		this.updateActiveReference();

	}

	removeLine( line ) {

		const { referencePaths } = this;
		for ( let i = 0; i < referencePaths.length; i ++ ) {

			if ( referencePaths[ i ].line === line ) {

				referencePaths.splice( i, 1 );
				i --;

			}

		}

		this.updateActiveReference();

	}

}
