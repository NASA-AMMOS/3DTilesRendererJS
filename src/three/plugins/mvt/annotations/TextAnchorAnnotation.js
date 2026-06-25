/**
 * A persistent anchor annotation for a labeled line ( road ). It tracks the slot it occupies
 * on each associated LoD path — storing the cartographic position per path — and surfaces the
 * position of the active ( highest-LoD settled ) path, so it survives LoD transitions instead
 * of being recreated per tile.
 */
export class TextAnchorAnnotation {

	// cartographic position ( radians ) surfaced from the active path
	get lat() {

		// TODO: return "best" entry if there isn't one "ready"...
		const entry = this._referenceEntry();
		return entry !== null ? entry.lat : 0;

	}

	get lon() {

		const entry = this._referenceEntry();
		return entry !== null ? entry.lon : 0;

	}

	constructor( id ) {

		this.id = id;

		// associated paths, each `{ line, i0, i1, alpha, lat, lon }` — the slot this anchor
		// occupies on that LoD's path, with its cartographic position on that path
		this.lines = [];

	}

	// the highest-LoD entry whose path is settled, used for placement. null if none are ready
	getActiveEntry() {

		let active = null;
		for ( const entry of this.lines ) {

			if ( ! entry.line.ready ) {

				continue;

			}

			if ( active === null || entry.line.lodLevel > active.line.lodLevel ) {

				active = entry;

			}

		}

		return active;

	}

	// associate a path, snapping to the nearest of its precomputed anchor slots ( or the
	// given slotIndex ). returns the claimed slot index, or -1 if the path has no slots
	addLine( line, slotIndex = - 1 ) {

		if ( slotIndex < 0 ) {

			slotIndex = this._nearestSlot( line );

		}

		if ( slotIndex < 0 ) {

			return - 1;

		}

		// store the slot and its cartographic position on this specific path
		// TODO: insert in order or sort
		const slot = line.anchors[ slotIndex ];
		this.lines.push( {
			line,
			i0: slot.i0,
			i1: slot.i1,
			alpha: slot.alpha,
			lat: slot.lat,
			lon: slot.lon,
		} );
		return slotIndex;

	}

	removeLine( line ) {

		const { lines } = this;
		for ( let i = lines.length - 1; i >= 0; i -- ) {

			if ( lines[ i ].line === line ) {

				lines.splice( i, 1 );

			}

		}

	}

	// the entry defining the anchor's current position: the active ( settled ) path if any,
	// else the highest-LoD path ( cartographic position is valid before settling )
	_referenceEntry() {

		const active = this.getActiveEntry();
		if ( active !== null ) {

			return active;

		}

		let best = null;
		for ( const entry of this.lines ) {

			if ( best === null || entry.line.lodLevel > best.line.lodLevel ) {

				best = entry;

			}

		}

		return best;

	}

	// index of the path's anchor slot nearest this anchor's current position ( -1 if none )
	_nearestSlot( line ) {

		// TODO: this is an issue
		const ref = this._referenceEntry();
		if ( ref === null ) {

			return - 1;

		}

		const { lat, lon } = ref;
		const { anchors } = line;
		let best = - 1;
		let bestDist = Infinity;
		for ( let i = 0, l = anchors.length; i < l; i ++ ) {

			const a = anchors[ i ];
			const dLat = a.lat - lat;
			const dLon = a.lon - lon;
			const d = dLat * dLat + dLon * dLon;
			if ( d < bestDist ) {

				bestDist = d;
				best = i;

			}

		}

		return best;

	}

}
