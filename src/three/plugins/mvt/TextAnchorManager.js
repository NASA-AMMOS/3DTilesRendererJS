import { TextAnchorAnnotation } from './annotations/TextAnchorAnnotation.js';

// true if the cartographic point lies within the tile range
function rangeContains( range, lat, lon ) {

	const [ minLon, minLat, maxLon, maxLat ] = range;
	return lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat;

}

// Manages the set of anchors per
export class TextAnchorManager {

	constructor() {

		this.added = new Set();
		this.removed = new Set();

		this._anchorsById = new Map();
		this._linesById = new Map();
		this._scheduled = false;

	}

	reset() {

		this.added.clear();
		this.removed.clear();

	}

	update() {

		// TODO: gather the removed items here instead of scheduling

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

	// add a set of lines
	// NOTE: This is is designed to be called with all lines from a single tile at once
	addLines( lines ) {

		const { _anchorsById, _linesById, added } = this;
		const newLineMap = new Map();
		lines.forEach( line => {

			if ( ! newLineMap.has( line.id ) ) {

				newLineMap.set( line.id, [] );

			}

			newLineMap.get( line.id ).push( line );

		} );

		// for each new line
		newLineMap.forEach( ( newLines, id ) => {

			// create the sets if they don't exist yet for these sets of lines
			if ( ! _anchorsById.has( id ) ) {

				_anchorsById.set( id, new Set() );

			}

			if ( ! _linesById.has( id ) ) {

				_linesById.set( id, new Set() );

			}

			const { range, lodLevel } = newLines[ 0 ];

			// For each existing anchor, match it to the closest new anchor in the relevant set
			const anchorSet = _anchorsById.get( id );
			anchorSet.forEach( anchor => {

				// find the closest anchor in the set of lines
				let bestDist = Infinity;
				let bestLine = null;
				let bestIndex = - 1;
				if (
					! rangeContains( range, anchor.lat, anchor.lon ) ||
					anchor.referencePaths.find( ref => ref.line.lodLevel === lodLevel )
				) {

					// TODO: it may be best to allow for the same anchor to associate with multiple references?
					return;

				}

				newLines.forEach( line => {

					line.anchorPositions.forEach( ( anchorPosition, index ) => {

						if ( anchorPosition.ref === null ) {

							// TODO: should we use a consistent canonical position here? Or the current "best"?
							// TODO: does it make sense to "snap" this anchor to the closest line point, instead? Avoiding
							// a jump? But then we will slowly accumulate anchors. Or we can "snap" at first and then revert once
							// it hides? Or slide towards the goal (probably uncomfortable)?
							const dLat = anchor.lat - anchorPosition.lat;
							const dLon = anchor.lon - anchorPosition.lon;
							const dist = dLat * dLat + dLon * dLon;
							if ( dist < bestDist ) {

								bestDist = dist;
								bestLine = line;
								bestIndex = index;

							}

						}

					} );

				} );

				// save the reference
				if ( bestLine ) {

					anchor.addLine( bestLine, bestIndex );
					bestLine.anchorPositions[ bestIndex ].ref = anchor;

				}

			} );

			// Then, add any anchors that need to be created
			newLines.forEach( line => {

				line.anchorPositions.forEach( ( anchorPosition, index ) => {

					if ( anchorPosition.ref === null ) {

						const anchor = new TextAnchorAnnotation( id );
						anchor.addLine( line, index );
						if ( rangeContains( line.range, anchor.lat, anchor.lon ) ) {

							anchorPosition.ref = anchor;
							anchorSet.add( anchor );
							added.add( anchor );

						}

					}

				} );

			} );

		} );

		// finally, add the lines to the set
		newLineMap.forEach( ( lines, id ) => {

			const lineSet = _linesById.get( id );
			lines.forEach( line => {

				lineSet.add( line );

			} );

		} );

	}

	// remove a path; anchors left with no associated paths are dropped
	deleteLine( line ) {

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
				const { _anchorsById, removed } = this;
				_anchorsById.forEach( ( anchors, id ) => {

					anchors.forEach( anchor => {

						if ( anchor.referencePaths.length === 0 ) {

							anchors.delete( anchor );
							removed.add( anchor );

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
