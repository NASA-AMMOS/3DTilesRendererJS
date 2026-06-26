import { TextAnchorAnnotation } from './annotations/TextAnchorAnnotation.js';

// true if the cartographic point lies within the tile range
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

		this._anchorsById = new Map();
		this._linesById = new Map();
		this._scheduled = false;

	}

	// retrieve all lines
	getLines() {

		const res = [];
		this._linesById.forEach( value => {

			value.forEach( line => {

				res.push( line );

			} );

		} );

		return res;

	}

	// retrieve all anchors
	getAnchors() {

		const target = [];
		this._anchorsById.forEach( anchors => {

			anchors.forEach( anchor => {

				target.push( anchor );

			} );

		} );

		return target;

	}

	// associate a newly loaded path with existing anchors within its tile range, then create
	// anchors for any of the path's slots that no existing anchor claimed
	addLine( line ) {

		// TODO: is it possible to have disjoint road paths with common ids?
		// TODO: lets snap to the nearest point instead of replacing an existing point?
		const { _anchorsById, _linesById } = this;

		const id = line.id;
		if ( ! _anchorsById.has( id ) ) {

			_anchorsById.set( id, new Set() );

		}

		if ( ! _linesById.has( id ) ) {

			_linesById.set( id, new Set() );

		}

		_linesById.get( id ).add( line );

		const existingAnchors = _anchorsById.get( id );
		const slotsClaimed = new Set();

		existingAnchors.forEach( anchor => {

			// anchors on a different fragment ( outside this tile ) are left untouched
			if ( rangeContains( line.range, anchor.lat, anchor.lon ) ) {

				const slotIndex = anchor.addLine( line );
				slotsClaimed.add( slotIndex );

			}

		} );

		// spawn anchors for slots with no pre-existing anchor
		for ( let i = 0, l = line.anchorCount; i < l; i ++ ) {

			if ( slotsClaimed.has( i ) ) {

				continue;

			}

			const anchor = new TextAnchorAnnotation( id );
			anchor.addLine( line, i );
			if ( rangeContains( line.range, anchor.lat, anchor.lon ) ) {

				slotsClaimed.add( i );
				existingAnchors.add( anchor );

			}

		}

	}

	// remove a path; anchors left with no associated paths are dropped
	removeLine( line ) {

		const { _anchorsById, _linesById } = this;
		const id = line.id;

		_linesById.get( id ).delete( line );
		if ( _linesById.get( id ).size === 0 ) {

			_linesById.delete( id );

		}

		const existingAnchors = _anchorsById.get( id );
		if ( ! existingAnchors ) {

			// this can happen if a line has no anchors added
			return;

		}

		existingAnchors.forEach( anchor => {

			anchor.removeLine( line );

		} );

		// run a delayed cleanup in case there are other lines etc that will be
		// added / removed from the manager and anchors.
		this.scheduleCleanup();

	}

	scheduleCleanup() {

		if ( ! this._scheduled ) {

			// queue a cleanup task
			this._scheduled = true;
			queueMicrotask( () => {

				this._scheduled = false;

				// iterate over all anchor sets
				const { _anchorsById } = this;
				_anchorsById.forEach( ( anchors, id ) => {

					anchors.forEach( anchor => {

						if ( anchor.referencePaths.length === 0 ) {

							anchors.delete( anchor );

						}

					} );

					// remove any empty anchor lists
					if ( anchors.size === 0 ) {

						_anchorsById.delete( id );

					}

				} );

			} );

		}

	}

}
