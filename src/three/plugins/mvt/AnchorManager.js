import { TextAnchorAnnotation } from './annotations/TextAnchorAnnotation.js';

// true if the cartographic point lies within the tile range ( all radians )
function rangeContains( range, lat, lon ) {

	const [ minLon, minLat, maxLon, maxLat ] = range;
	return lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat;

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

			const anchor = new TextAnchorAnnotation( id );
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
