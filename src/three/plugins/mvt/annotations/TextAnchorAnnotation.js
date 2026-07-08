import { Vector2, Vector3, MathUtils } from 'three';
import { OccupancyAnnotation } from '../ScreenOccupationManager.js';

// reject labels whose projected baseline curves tighter than this radius in screen px at any
// glyph, since sharply curving text becomes hard to read
const MIN_LABEL_RADIUS = 40;

const _segIndices = [];
const _segAlphas = [];
const _vec = /* @__PURE__ */ new Vector3();

// trailing two glyph screen positions and edge vectors, reused for the three-point curvature estimate
const _prevPos = /* @__PURE__ */ new Vector2();
const _prevPrevPos = /* @__PURE__ */ new Vector2();
const _ab = /* @__PURE__ */ new Vector2();
const _ac = /* @__PURE__ */ new Vector2();
const _bc = /* @__PURE__ */ new Vector2();

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

		this.displayed = false;
		this.referencePaths = [];
		this._activeReference = null;

		// transient slot { i0, i1, alpha, lat, lon } the anchor is snapped to on the active line
		// while it drifts across an LoD swap, overriding its associated anchor slot. Cleared on the
		// next appearance (see onShown) so it re-derives evenly-spaced, surviving the fade-out first
		this._snapped = null;
		this._flippedTextDir = false;

		// local position & angle per character
		this.characterPositions = [];
		this.characterAngles = [];
		this.characterWidths = [];

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
		this._charRadius = maxCharWidth / 2;
		this._flippedTextDir = this._getTextDirection();

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

	// update the list of character widths and total width of the label
	// TODO: move to the line class
	updateCharacterWidthCache() {

		const { text, characterWidths } = this;
		characterWidths.length = text.length;
		let total = 0;
		for ( let i = 0, l = text.length; i < l; i ++ ) {

			const width = this.measureChar( text[ i ] );
			characterWidths[ i ] = width;
			total += width;

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
	// index / alpha into the module scratch. Sets the "valid" field indicating whether the current
	// characters can be displayed or not.
	// TODO: also reject foreshortened paths (tiny screen-space segments)
	_layoutCharacters( handle, outputIndices, outputAlphas, force = false ) {

		const { text, _totalWidth, _charRadius, characterWidths } = this;
		const { line, i0, i1, alpha } = this.getActiveReference();
		const { cumulativeLen, screenPositions } = line;
		const anchorOffset = MathUtils.lerp( cumulativeLen[ i0 ], cumulativeLen[ i1 ], alpha );
		const flip = this._flippedTextDir;
		this.valid = true;

		const pointCount = screenPositions.length;
		const totalLength = cumulativeLen[ cumulativeLen.length - 1 ];
		const length = text.length;

		let seg = 0;
		let charCursor = 0;
		for ( let i = 0; i < length; i ++ ) {

			// place each character's center along the arc by its advance, centered on the anchor
			const slot = flip ? length - 1 - i : i;
			const advance = characterWidths[ slot ];
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
			if ( _vec.z < 0 || _vec.z > 1 || handle.test( _vec.x, _vec.y, _charRadius ) ) {

				this.valid = false;
				if ( ! force ) break;

			}

			// estimate local curvature from the last three glyph positions using Menger curvature / circumradius
			// and reject the label if the baseline bends too tightly
			if ( i >= 2 ) {

				// get the segments
				_ab.subVectors( _prevPos, _prevPrevPos );
				_ac.subVectors( _vec, _prevPrevPos );
				_bc.subVectors( _vec, _prevPos );

				// curvature = 2 * area / ( |AB| * |BC| * |CA| ) = 1 / circumradius
				const area = Math.abs( _ab.cross( _ac ) );
				const denom = _ab.length() * _bc.length() * _ac.length();
				const curvature = denom > 0 ? 2 * area / denom : 0;

				// reject when the baseline curves tighter than the minimum readable radius
				if ( curvature > 1 / MIN_LABEL_RADIUS ) {

					this.valid = false;
					if ( ! force ) break;

				}

			}

			_prevPrevPos.copy( _prevPos );
			_prevPos.copy( _vec );

			outputIndices[ slot ] = seg;
			outputAlphas[ slot ] = segAlpha;

		}

	}

	// commit a successful layout: mark occupancy and record a world-space position + baseline
	// angle per character, applying the reading-direction flip
	_placeCharacters( handle, segIndices, segAlphas ) {

		const { characterPositions, characterAngles, text, _charRadius } = this;
		const { line } = this.getActiveReference();
		const { screenPositions, positions } = line;

		const flip = this._flippedTextDir;
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

		const { line, i0, i1, alpha } = this.getActiveReference();
		return pos.lerpVectors( line.positions[ i0 ], line.positions[ i1 ], alpha );

	}

	// the highest-LoD entry whose path is settled, used for placement - return the "snapped" or
	// active line reference
	getActiveReference() {

		return this._snapped ?? this._activeReference;

	}

	updateActiveReference() {

		const { referencePaths, _activeReference, displayed } = this;

		// pick the active line reference. The highest-LoD path is the desired "target" but until it settles
		// we hold the current LoD rather than hopping through intermediate LoDs as they settle.
		let result;
		const target = referencePaths[ 0 ] ?? null;
		if ( target && target.line.ready ) {

			// desired path settled
			result = target;

		} else if ( _activeReference && _activeReference.line.ready && ( referencePaths.includes( _activeReference ) || this.displayed ) ) {

			// desired path not settled yet: stay on the current LoD
			result = _activeReference;

		} else {

			result = target ?? _activeReference;

		}

		// when the active line changes under a displayed label, snap it onto the new line at the
		// nearest point so it stays coherent across the LoD swap instead of jumping to the new line's
		// associated anchor.
		if ( result && _activeReference && result !== _activeReference ) {

			if ( displayed ) {

				// only snap if it's visible
				const { lat, lon } = this._snapped ?? _activeReference;
				this._snapped = this._snapToLine( result.line, lat, lon );

			} else {

				// otherwise remove the snapped reference
				this._snapped = null;

			}

		}

		this._activeReference = result;
		return result;

	}

	// find the nearest point on the given line in cartographic lat / lon  to the supplied
	// position, returning a line-reference used to keep a displayed label coherent
	// when the active LoD swaps.
	_snapToLine( line, lat, lon ) {

		const { lat: lats, lon: lons } = line;
		if ( lats.length < 2 ) {

			return null;

		}

		let bestDist = Infinity;
		let bestI0 = 0;
		let bestI1 = 1;
		let bestAlpha = 0;
		let bestLat = lats[ 0 ];
		let bestLon = lons[ 0 ];
		for ( let i = 0, l = lats.length - 1; i < l; i ++ ) {

			const lat0 = lats[ i ];
			const lon0 = lons[ i ];
			const dLat = lats[ i + 1 ] - lat0;
			const dLon = lons[ i + 1 ] - lon0;

			// project the point onto the segment, clamped to its ends
			const lenSq = dLat * dLat + dLon * dLon;
			const t = lenSq > 0 ? MathUtils.clamp( ( ( lat - lat0 ) * dLat + ( lon - lon0 ) * dLon ) / lenSq, 0, 1 ) : 0;

			const projLat = lat0 + dLat * t;
			const projLon = lon0 + dLon * t;

			// calculate the distance
			const eLat = lat - projLat;
			const eLon = lon - projLon;
			const dist = eLat * eLat + eLon * eLon;
			if ( dist < bestDist ) {

				bestDist = dist;
				bestI0 = i;
				bestI1 = i + 1;
				bestAlpha = t;
				bestLat = projLat;
				bestLon = projLon;

			}

		}

		return {
			line,
			i0: bestI0,
			i1: bestI1,
			alpha: bestAlpha,
			lat: bestLat,
			lon: bestLon,
		};

	}

	// clear the transient snapped slot when a fresh display begins so the label re-derives
	// from its evenly-spaced associated anchor. Deferred to the next appearance (rather than at
	// hide) so the snap survives the glyph fade-out and doesn't reflow the fading label.
	onShown() {

		this.displayed = true;
		this._snapped = null;

	}

	onHidden() {

		this.displayed = false;

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
