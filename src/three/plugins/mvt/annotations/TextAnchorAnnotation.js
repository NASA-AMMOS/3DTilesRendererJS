/**
 * A persistent anchor annotation for a labeled line ( road ). It tracks the slot it occupies
 * on each associated LoD path — storing the cartographic position per path — and surfaces the
 * position of the active ( highest-LoD settled ) path, so it survives LoD transitions instead
 * of being recreated per tile.
 */
export class TextAnchorAnnotation {

	// cartographic position ( radians ) surfaced from the active path
	get lat() {

		return this.getActiveReference().lat;

	}

	get lon() {

		return this.getActiveReference().lon;

	}

	get ready() {

		return this.getActiveReference()?.line.ready || false;

	}

	constructor( id ) {

		this.id = id;

		// associated paths, each `{ line, i0, i1, alpha, lat, lon }` — the slot this anchor
		// occupies on that LoD's path, with its cartographic position on that path
		this.referencePaths = [];
		this._lastUsed = null;

	}

	getPosition( pos ) {

		const { i0, i1, alpha, line } = this.getActiveReference();
		return pos.lerpVectors( line.positions[ i0 ], line.positions[ i1 ], alpha );

	}

	// the highest-LoD entry whose path is settled, used for placement. null if none are ready
	getActiveReference() {

		const { referencePaths, _lastUsed } = this;
		const target = referencePaths[ 0 ] ?? null;
		if ( target?.ready ) {

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

			if ( _lastUsed && _lastUsed.line.lodLevel > result.line.lodLevel ) {

				result = _lastUsed;

			}

			this._lastUsed = result;
			return result;

		}


	}

	hasLine( line ) {

		return Boolean( this.lines.find( item => item.line === line ) );

	}

	// associate a path, snapping to the nearest of its precomputed anchor slots ( or the
	// given slotIndex ). returns the claimed slot index, or -1 if the path has no slots
	addLine( line, slotIndex = - 1 ) {

		if ( slotIndex < 0 ) {

			slotIndex = this._nearestSlot( line );

		}

		// store the slot and its cartographic position on this specific path
		// TODO: insert in order or sort
		const slot = line.anchors[ slotIndex ];
		const { referencePaths } = this;
		referencePaths.push( {
			line,
			i0: slot.i0,
			i1: slot.i1,
			alpha: slot.alpha,
			lat: slot.lat,
			lon: slot.lon,
		} );

		referencePaths.sort( ( a, b ) => {

			return a.line.lodLevel - b.line.lodLevel;

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

	// index of the path's anchor slot nearest this anchor's current position ( -1 if none )
	_nearestSlot( line ) {

		// TODO: this is an issue
		const { lat, lon } = this.getActiveReference();
		const { anchors } = line;
		let best = - 1;
		let bestDist = Infinity;
		for ( let i = 0, l = anchors.length; i < l; i ++ ) {

			const anchor = anchors[ i ];
			const dLat = anchor.lat - lat;
			const dLon = anchor.lon - lon;
			const d = dLat * dLat + dLon * dLon;
			if ( d < bestDist ) {

				bestDist = d;
				best = i;

			}

		}

		return best;

	}

}
