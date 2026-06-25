// true if the cartographic point lies within the tile range ( all radians )
function rangeContains( range, lat, lon ) {

	const [ minLon, minLat, maxLon, maxLat ] = range;
	return lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat;

}

/**
 * A persistent anchor annotation for a labeled line ( road ). It tracks the slot it occupies
 * on each associated LoD path — storing the cartographic position per path — and surfaces the
 * position of the active ( highest-LoD settled ) path, so it survives LoD transitions instead
 * of being recreated per tile.
 */
class AnchorAnnotation {

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

/**
 * Owns the persistent set of line-label anchors, indexed by path ( road ) id. As LoD paths
 * load and unload it migrates existing anchors onto the new geometry ( scoped to the loaded
 * tile ) and spawns anchors for any slots not already covered.
 */
export class AnchorManager {

	constructor() {

		// path id -> Anchor[]
		this._anchorsById = new Map();

	}

	// associate a newly loaded path with existing anchors within its tile range, then create
	// anchors for any of the path's slots that no existing anchor claimed
	addLine( line ) {

		const id = line.id;
		const anchors = this._anchorsById.get( id ) ?? [];

		const claimed = new Set();
		const survivors = [];

		// migrate existing anchors that fall within this path's tile range, snapping each to
		// its nearest slot. two anchors snapping to the same slot are duplicates at the same
		// location for the same path, so the later one is dropped
		for ( const anchor of anchors ) {

			// anchors on a different fragment ( outside this tile ) are left untouched
			if ( ! rangeContains( line.range, anchor.lat, anchor.lon ) ) {

				survivors.push( anchor );
				continue;

			}

			const slotIndex = anchor.addLine( line );
			if ( slotIndex < 0 ) {

				// the path has no slot near this anchor; keep it unchanged
				survivors.push( anchor );
				continue;

			}

			if ( claimed.has( slotIndex ) ) {

				// duplicate — another anchor already owns this slot, so drop this one
				continue;

			}

			claimed.add( slotIndex );
			survivors.push( anchor );

		}

		// spawn anchors for slots with no pre-existing anchor
		for ( let i = 0, l = line.anchors.length; i < l; i ++ ) {

			if ( claimed.has( i ) ) {

				continue;

			}

			const anchor = new AnchorAnnotation( id );
			anchor.addLine( line, i );
			claimed.add( i );
			survivors.push( anchor );

		}

		this._anchorsById.set( id, survivors );

	}

	// remove a path; anchors left with no associated paths are dropped
	removeLine( line ) {

		const id = line.id;
		const anchors = this._anchorsById.get( id );
		if ( ! anchors ) {

			return;

		}

		const survivors = [];
		for ( const anchor of anchors ) {

			anchor.removeLine( line );
			if ( anchor.lines.length > 0 ) {

				survivors.push( anchor );

			}

		}

		if ( survivors.length > 0 ) {

			this._anchorsById.set( id, survivors );

		} else {

			this._anchorsById.delete( id );

		}

	}

	// collect every anchor for rendering / debug
	getAnchors( target = [] ) {

		target.length = 0;
		for ( const anchors of this._anchorsById.values() ) {

			for ( const anchor of anchors ) {

				target.push( anchor );

			}

		}

		return target;

	}

}
