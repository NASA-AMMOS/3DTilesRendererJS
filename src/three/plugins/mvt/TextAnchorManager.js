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
export class TextAnchorManager {

	constructor() {

		// path id -> Anchor[]
		this._anchorsById = new Map();

	}

	// associate a newly loaded path with existing anchors within its tile range, then create
	// anchors for any of the path's slots that no existing anchor claimed
	addLine( line ) {

		// TODO: is it possible to have disjoint road paths with common ids?
		// TODO: lets snap to the nearest point instead of replacing an existing point?
		const { _anchorsById } = this;

		const id = line.id;
		if ( ! _anchorsById.has( id ) ) {

			_anchorsById.set( id, [] );

		}

		const existingAnchors = _anchorsById.get( id );
		const slotsClaimed = new Set();

		// migrate existing anchors that fall within this path's tile range, snapping each to
		// its nearest slot. two anchors snapping to the same slot are duplicates at the same
		// location for the same path, so the later one is dropped
		for ( const anchor of existingAnchors ) {

			// anchors on a different fragment ( outside this tile ) are left untouched
			if ( rangeContains( line.range, anchor.lat, anchor.lon ) ) {

				const slotIndex = anchor.addLine( line );
				slotsClaimed.add( slotIndex );

			}

		}

		// spawn anchors for slots with no pre-existing anchor
		for ( let i = 0, l = line.anchors.length; i < l; i ++ ) {

			if ( slotsClaimed.has( i ) ) {

				continue;

			}

			const anchor = new TextAnchorAnnotation( id );
			anchor.addLine( line, i );
			slotsClaimed.add( i );
			existingAnchors.push( anchor );


		}

	}

	// remove a path; anchors left with no associated paths are dropped
	removeLine( line ) {

		const id = line.id;
		const existingAnchors = this._anchorsById.get( id );

		for ( let i = 0, l = existingAnchors.length; i < l; i ++ ) {

			const anchor = existingAnchors[ i ];
			anchor.removeLine( line );
			if ( anchor.referencePaths.length === 0 ) {

				existingAnchors.splice( i, 1 );
				i --;
				l --;

			}

		}

		if ( existingAnchors.length === 0 ) {

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
